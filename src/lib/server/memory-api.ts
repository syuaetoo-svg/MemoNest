import "server-only";
import { z } from "zod";
import {
  grantInput,
  replaceMemoryInput,
  uuid,
  memoryFields,
  memoryOutput,
  type Memory,
} from "@/lib/core/contracts";
import {
  authenticated,
  body,
  databaseError,
  json,
  route,
  ApiError,
} from "./http";
function publicMemory(raw: unknown): Memory {
  return memoryOutput.parse(raw);
}
export const listMemories = route(async (request) => {
  const { client, user } = await authenticated(request);
  const url = new URL(request.url);
  const entryId = url.searchParams.get("entryId");
  if (entryId && !uuid.safeParse(entryId).success)
    throw new ApiError(400, "INVALID_INPUT", "来源 ID 无效");
  let query = client
    .from("memories")
    .select(memoryFields)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(31);
  if (entryId) query = query.eq("journal_entry_id", entryId);
  const cursor = url.searchParams.get("cursor");
  if (cursor) {
    try {
      if (cursor.length > 512) throw new Error();
      const c = z
        .object({ created: z.iso.datetime({ offset: true }), id: uuid })
        .strict()
        .parse(JSON.parse(Buffer.from(cursor, "base64url").toString()));
      query = query.or(
        `created_at.lt.${c.created},and(created_at.eq.${c.created},id.lt.${c.id})`,
      );
    } catch {
      throw new ApiError(400, "INVALID_INPUT", "分页游标无效，请重新加载");
    }
  }
  const { data, error } = await query;
  databaseError(error);
  const rows = (data || []) as unknown as Memory[];
  const memories = rows.slice(0, 30);
  const last = memories.at(-1);
  const nextCursor =
    rows.length > 30 && last
      ? Buffer.from(
          JSON.stringify({ created: last.created_at, id: last.id }),
        ).toString("base64url")
      : null;
  return json({ memories, nextCursor });
});
export const grantMemory = route(async (request) => {
  const { client } = await authenticated(request);
  const input = await body(request, grantInput);
  const { data, error } = await client
    .rpc("mn_grant_memory", {
      p_entry_id: input.entryId,
      p_source_version: input.sourceVersion,
      p_summary: input.summary,
      p_key: input.requestId,
    })
    .single();
  databaseError(error);
  return json({ memory: publicMemory(data) }, 201);
});
export const replaceMemory = route(async (request, context) => {
  const { client } = await authenticated(request);
  const { id } = await context.params;
  if (!uuid.safeParse(id).success)
    throw new ApiError(404, "NOT_FOUND", "内容不存在或你无权访问");
  const input = await body(request, replaceMemoryInput);
  const { data, error } = await client
    .rpc("mn_grant_memory", {
      p_entry_id: input.entryId,
      p_source_version: input.sourceVersion,
      p_summary: input.summary,
      p_key: input.requestId,
      p_replace_id: id,
      p_expected_memory_version: input.expectedMemoryVersion,
    })
    .single();
  databaseError(error);
  return json({ memory: publicMemory(data) });
});
export const revokeMemory = route(async (request, context) => {
  const { client } = await authenticated(request);
  const { id } = await context.params;
  if (!uuid.safeParse(id).success)
    throw new ApiError(404, "NOT_FOUND", "内容不存在或你无权访问");
  const { error } = await client.rpc("mn_revoke_memory", { p_id: id });
  databaseError(error);
  return json({ revoked: true });
});
// Permission boundary for future AI context; no model invocation or private-entry reads.
export const memoryContext = route(async (request) => {
  const { client } = await authenticated(request);
  const { data, error } = await client.rpc("mn_recall_memories");
  databaseError(error);
  return json({ character: "xiaoqi", memories: data });
});
