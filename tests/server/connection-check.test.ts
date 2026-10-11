import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSupabaseConnection } from "../../src/lib/server/connection-check";

test("read-only connection probe distinguishes config, network, schema and expected denial", async () => {
  const original = { ...process.env };
  try {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    let calls = 0;
    const missing = await checkSupabaseConnection(async () => { calls++; throw new Error("unexpected"); });
    assert.equal(missing.ok, false);
    assert.equal(calls, 0);
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture";
    process.env.APP_URL = "http://localhost:3000";
    const probe = (tableStatus = 403) => checkSupabaseConnection(async (url, init) => {
      assert.equal(init?.method ?? "GET", "GET");
      assert.equal(init?.redirect, "error");
      return String(url).includes("/auth/")
        ? Response.json({ external: { email: true }, mailer_autoconfirm: false })
        : Response.json({ code: tableStatus === 403 ? "42501" : "PGRST205" }, { status: tableStatus });
    });
    const ready = await probe();
    assert.equal(ready.ok, true);
    assert.match(ready.checks.join(""), /不证明登录/);
    assert.equal((await probe(404)).ok, false);
    assert.equal((await probe(200)).ok, false);
    const denied = await checkSupabaseConnection(async () => new Response("credential must not leak", { status: 401 }));
    assert.equal(denied.ok, false);
    assert.doesNotMatch(denied.checks.join(""), /credential must not leak|sb_publishable_fixture/);
    const offline = await checkSupabaseConnection(async () => { throw new Error("secret details"); });
    assert.equal(offline.ok, false);
    assert.doesNotMatch(offline.checks.join(""), /secret details/);
  } finally {
    for (const name of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "APP_URL"]) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});
