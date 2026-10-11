import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// Real embedded PostgreSQL engine; auth.uid/users are fixture stubs only.
// This validates SQL/RLS contracts, NOT Supabase registration or deployed E2E.
test("B2 PostgreSQL migration and permission contracts", async (t) => {
  const db = new PGlite();
  const a = randomUUID(),
    b = randomUUID();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  await db.query("insert into auth.users values ($1),($2)", [a, b]);
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/202610110001_core.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  async function as(id: string | null) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  }
  async function scalar<T>(sql: string, args: unknown[] = []) {
    const r = await db.query<T>(sql, args);
    return r.rows[0];
  }
  type E = { id: string; version: number; body: string; undo_until: Date };
  type M = { id: string; version: number; summary: string };
  const key = randomUUID();
  let entry: E;
  let memory: M;
  await t.test(
    "private save persists, sorted list and idempotent replay do not grant memory",
    async () => {
      await as(a);
      entry = await scalar<E>(
        "select * from public.mn_create_entry($1,$2,$3,$4)",
        ["", "fictional meeting", "2026-04-12", key],
      );
      assert.equal(entry.version, 1);
      assert.equal(
        (
          await scalar<E>("select * from public.mn_create_entry($1,$2,$3,$4)", [
            "",
            "fictional meeting",
            "2026-04-12",
            key,
          ])
        ).id,
        entry.id,
      );
      await assert.rejects(
        db.query("select * from public.mn_create_entry($1,$2,$3,$4)", [
          "",
          "different",
          "2026-04-12",
          key,
        ]),
        /MN_CONFLICT/,
      );
      assert.equal(
        (await db.query("select * from public.mn_recall_memories()")).rows
          .length,
        0,
      );
      assert.equal(
        (
          await scalar<E>("select * from public.journal_entries where id=$1", [
            entry.id,
          ])
        ).body,
        "fictional meeting",
      );
      const later = await scalar<E>(
        "select * from public.mn_create_entry($1,$2,$3,$4)",
        ["later", "walk", "2026-04-19", randomUUID()],
      );
      const list = await db.query<E>("select * from public.mn_list_entries()");
      assert.equal(list.rows[0].id, later.id);
      assert.equal(
        (
          await db.query("select * from public.mn_list_entries($1)", [
            "meeting",
          ])
        ).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from public.mn_list_entries($1)", ["%"])).rows
          .length,
        0,
      );
    },
  );
  await t.test(
    "user B cannot read, mutate, delete or authorize A; anonymous and direct writes denied",
    async () => {
      await as(b);
      assert.equal(
        (
          await db.query("select * from public.journal_entries where id=$1", [
            entry.id,
          ])
        ).rows.length,
        0,
      );
      for (const [sql, args] of [
        [
          "select * from public.mn_edit_entry($1,1,'','intrusion','2026-04-12')",
          [entry.id],
        ],
        ["select public.mn_delete_entry($1,1)", [entry.id]],
        [
          "select * from public.mn_grant_memory($1,1,'intrusion',$2)",
          [entry.id, randomUUID()],
        ],
      ] as [string, unknown[]][])
        await assert.rejects(db.query(sql, args), /MN_NOT_FOUND/);
      await assert.rejects(
        db.query(
          "update public.journal_entries set body='intrusion' where id=$1",
          [entry.id],
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select public.mn_retire_memory($1,'x','revoked')", [
          randomUUID(),
        ]),
        /permission denied/,
      );
      await as(null);
      await assert.rejects(
        db.query("select * from public.journal_entries"),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "select * from public.mn_create_entry('','x','2026-04-12',$1)",
          [randomUUID()],
        ),
        /permission denied/,
      );
    },
  );
  await t.test(
    "undo window enforced even after an edit; stale versions rejected",
    async () => {
      await as(a);
      await assert.rejects(
        db.query(
          "select * from public.mn_grant_memory($1,1,'exact summary',$2)",
          [entry.id, randomUUID()],
        ),
        /MN_UNDO_WINDOW/,
      );
      const updated = await scalar<E>(
        "select * from public.mn_edit_entry($1,1,'','fictional meeting edited','2026-04-12')",
        [entry.id],
      );
      assert.equal(
        new Date(updated.undo_until).getTime(),
        new Date(entry.undo_until).getTime(),
      );
      entry = updated;
      await assert.rejects(
        db.query(
          "select * from public.mn_grant_memory($1,2,'exact summary',$2)",
          [entry.id, randomUUID()],
        ),
        /MN_UNDO_WINDOW/,
      );
      await assert.rejects(
        db.query(
          "select * from public.mn_edit_entry($1,1,'','stale','2026-04-12')",
          [entry.id],
        ),
        /MN_CONFLICT/,
      );
      await db.exec("reset role");
      await db.query(
        "update public.journal_entries set undo_until=clock_timestamp()-interval '1 second' where id=$1",
        [entry.id],
      );
      await as(a);
    },
  );
  await t.test(
    "explicit grant has matching consent; B cannot inspect/revoke it; summary edit creates new consent",
    async () => {
      await as(a);
      const k = randomUUID();
      memory = await scalar<M>(
        "select * from public.mn_grant_memory($1,2,'exact summary',$2)",
        [entry.id, k],
      );
      assert.equal(
        (
          await scalar<M>(
            "select * from public.mn_grant_memory($1,2,'exact summary',$2)",
            [entry.id, k],
          )
        ).id,
        memory.id,
      );
      assert.equal(
        (await db.query("select * from public.mn_recall_memories()")).rows
          .length,
        1,
      );
      await as(b);
      assert.equal(
        (
          await db.query("select * from public.memories where id=$1", [
            memory.id,
          ])
        ).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select * from public.memory_consents")).rows.length,
        0,
      );
      await assert.rejects(
        db.query("select public.mn_revoke_memory($1)", [memory.id]),
        /MN_NOT_FOUND/,
      );
      await as(a);
      const next = await scalar<M>(
        "select * from public.mn_grant_memory($1,2,'new exact summary',$2,$3,1)",
        [entry.id, randomUUID(), memory.id],
      );
      assert.notEqual(next.id, memory.id);
      assert.equal(next.version, 2);
      assert.equal(
        (
          await scalar<M>("select * from public.memories where id=$1", [
            memory.id,
          ])
        ).summary,
        "",
      );
      memory = next;
      assert.equal(
        (await scalar<M>("select * from public.mn_recall_memories()")).summary,
        "new exact summary",
      );
    },
  );
  await t.test(
    "revoke immediately excludes context, clears summary, keeps private record and is repeatable",
    async () => {
      await db.query("select public.mn_revoke_memory($1)", [memory.id]);
      await db.query("select public.mn_revoke_memory($1)", [memory.id]);
      assert.equal(
        (await db.query("select * from public.mn_recall_memories()")).rows
          .length,
        0,
      );
      assert.equal(
        (
          await scalar<M>("select * from public.memories where id=$1", [
            memory.id,
          ])
        ).summary,
        "",
      );
      assert.equal(
        (
          await scalar<E>("select * from public.journal_entries where id=$1", [
            entry.id,
          ])
        ).body,
        "fictional meeting edited",
      );
    },
  );
  await t.test(
    "source edits invalidate grants; deletion clears online content and prevents replay revival",
    async () => {
      memory = await scalar<M>(
        "select * from public.mn_grant_memory($1,2,'another grant',$2)",
        [entry.id, randomUUID()],
      );
      entry = await scalar<E>(
        "select * from public.mn_edit_entry($1,2,'','new private text','2026-04-12')",
        [entry.id],
      );
      assert.equal(
        (await db.query("select * from public.mn_recall_memories()")).rows
          .length,
        0,
      );
      assert.equal(
        (
          await scalar<M>("select * from public.memories where id=$1", [
            memory.id,
          ])
        ).summary,
        "",
      );
      await db.query(
        "select * from public.mn_grant_memory($1,3,'latest grant',$2)",
        [entry.id, randomUUID()],
      );
      await db.query("select public.mn_delete_entry($1,3)", [entry.id]);
      await db.query("select public.mn_delete_entry($1,3)", [entry.id]);
      assert.equal(
        (await db.query("select * from public.mn_recall_memories()")).rows
          .length,
        0,
      );
      assert.equal(
        (
          await db.query("select * from public.journal_entries where id=$1", [
            entry.id,
          ])
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query("select * from public.mn_create_entry($1,$2,$3,$4)", [
          "",
          "fictional meeting",
          "2026-04-12",
          key,
        ]),
        /MN_CONFLICT/,
      );
      await db.exec("reset role");
      assert.equal(
        (
          await scalar<E>("select * from public.journal_entries where id=$1", [
            entry.id,
          ])
        ).body,
        "",
      );
      assert.equal(
        (
          await db.query(
            "select * from public.memories where journal_entry_id=$1 and summary<>''",
            [entry.id],
          )
        ).rows.length,
        0,
      );
    },
  );
  await t.test(
    "SQL rejects empty content and direct consent writes",
    async () => {
      await as(a);
      await assert.rejects(
        db.query(
          "select * from public.mn_create_entry('','   ','2026-04-12',$1)",
          [randomUUID()],
        ),
        /MN_INVALID/,
      );
      await assert.rejects(
        db.query("delete from public.memory_consents"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "read-only deployment metadata check detects missing maintenance and disabled RLS",
    async () => {
      await db.exec("reset role");
      const sql = await readFile(new URL("../../supabase/verify.sql", import.meta.url), "utf8");
      const initial = await db.query<{ check_name: string; passed: boolean }>(sql);
      assert.equal(initial.rows.length, 13);
      assert.deepEqual(initial.rows.filter((row) => !row.passed).map((row) => row.check_name), ["function/public.mn_purge_expired_metadata()"]);
      await db.exec(await readFile(new URL("../../supabase/maintenance.sql", import.meta.url), "utf8"));
      assert.ok((await db.query<{ passed: boolean }>(sql)).rows.every((row) => row.passed));
      await db.exec("begin; alter table public.journal_entries disable row level security");
      const altered = await db.query<{ check_name: string; passed: boolean }>(sql);
      assert.equal(altered.rows.find((row) => row.check_name === "table/journal_entries")?.passed, false);
      await db.exec("rollback");
    },
  );
  await t.test(
    "administrator retention cleanup is not client callable and does not remove live records",
    async () => {
      await db.exec("reset role");
      await db.exec(
        await readFile(
          new URL("../../supabase/maintenance.sql", import.meta.url),
          "utf8",
        ),
      );
      await db.query(
        "update public.memories set invalidated_at=clock_timestamp()-interval '91 days' where status<>'active'",
      );
      await db.query(
        "update public.journal_entries set deleted_at=clock_timestamp()-interval '91 days' where deleted_at is not null",
      );
      await as(a);
      await assert.rejects(
        db.query("select public.mn_purge_expired_metadata()"),
        /permission denied/,
      );
      await db.exec("reset role");
      await db.query("select public.mn_purge_expired_metadata()");
      assert.equal(
        (
          await db.query("select * from public.journal_entries where id=$1", [
            entry.id,
          ])
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.memories where journal_entry_id=$1",
            [entry.id],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.journal_entries where deleted_at is null",
          )
        ).rows.length,
        1,
      );
    },
  );
  await db.close();
});
