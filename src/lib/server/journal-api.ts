import "server-only";
import { z } from "zod";
import {
  createEntryInput,
  editEntryInput,
  deleteEntryInput,
  uuid,
  journalFields,
  entryOutput,
  type Entry,
} from "@/lib/core/contracts";
import {
  authenticated,
  body,
  databaseError,
  json,
  route,
  ApiError,
} from "./http";
function publicEntry(raw: unknown): Entry {
  return entryOutput.parse(raw);
}
const cursorSchema = z
  .object({
    date: z.iso.date(),
    created: z.iso.datetime({ offset: true }),
    id: uuid,
  })
  .strict();
export const listEntries = route(async (request) => {
  const { client } = await authenticated(request);
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q") || "";
  if (keyword.length > 200)
    throw new ApiError(400, "INVALID_INPUT", "关键词不能超过 200 字");
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (url.searchParams.has("cursor")) {
    try {
      const token = url.searchParams.get("cursor")!;
      if (token.length > 512) throw new Error();
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(token, "base64url").toString()),
      );
    } catch {
      throw new ApiError(400, "INVALID_INPUT", "分页游标无效，请重新加载列表");
    }
  }
  const { data, error } = await client.rpc("mn_list_entries", {
    p_keyword: keyword,
    p_before_date: cursor?.date ?? null,
    p_before_created: cursor?.created ?? null,
    p_before_id: cursor?.id ?? null,
  });
  databaseError(error);
  const rows = (data || []).map(publicEntry) as Entry[];
  const entries = rows.slice(0, 30);
  const last = entries.at(-1);
  const nextCursor =
    rows.length > 30 && last
      ? Buffer.from(
          JSON.stringify({
            date: last.event_date,
            created: last.created_at,
            id: last.id,
          }),
        ).toString("base64url")
      : null;
  return json({ entries, nextCursor });
});
export const createEntry = route(async (request) => {
  const { client } = await authenticated(request);
  const input = await body(request, createEntryInput);
  const { data, error } = await client
    .rpc("mn_create_entry", {
      p_title: input.title,
      p_body: input.body,
      p_event_date: input.eventDate,
      p_key: input.requestId,
    })
    .single();
  databaseError(error);
  return json({ entry: publicEntry(data) }, 201);
});
export const getEntry = route(async (request, context) => {
  const { client, user } = await authenticated(request);
  const { id } = await context.params;
  if (!uuid.safeParse(id).success)
    throw new ApiError(404, "NOT_FOUND", "内容不存在或你无权访问");
  const { data, error } = await client
    .from("journal_entries")
    .select(journalFields)
    .eq("user_id", user.id)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, "NOT_FOUND", "内容不存在或你无权访问");
  return json({ entry: data });
});
export const editEntry = route(async (request, context) => {
  const { client } = await authenticated(request);
  const { id } = await context.params;
  if (!uuid.safeParse(id).success)
    throw new ApiError(404, "NOT_FOUND", "内容不存在或你无权访问");
  const input = await body(request, editEntryInput);
  const { data, error } = await client
    .rpc("mn_edit_entry", {
      p_id: id,
      p_expected_version: input.expectedVersion,
      p_title: input.title,
      p_body: input.body,
      p_event_date: input.eventDate,
    })
    .single();
  databaseError(error);
  return json({ entry: publicEntry(data) });
});
export const deleteEntry = route(async (request, context) => {
  const { client } = await authenticated(request);
  const { id } = await context.params;
  if (!uuid.safeParse(id).success)
    throw new ApiError(404, "NOT_FOUND", "内容不存在或你无权访问");
  const input = await body(request, deleteEntryInput);
  const { error } = await client.rpc("mn_delete_entry", {
    p_id: id,
    p_expected_version: input.expectedVersion,
  });
  databaseError(error);
  return json({ deleted: true });
});
