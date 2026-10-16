import { z } from "zod";

export const uuid = z.uuid();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "请选择有效日期")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= "2100-12-31"
    );
  }, "日期须在 1900–2100 年内且真实存在");
export const entryInput = z
  .object({
    title: z.string().trim().max(120),
    body: z.string().trim().min(1, "请写下正文").max(10000),
    eventDate: date,
  })
  .strict();
export const createEntryInput = entryInput.extend({ requestId: uuid });
export const editEntryInput = entryInput.extend({
  expectedVersion: z.number().int().positive(),
});
export const deleteEntryInput = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();
export const grantInput = z
  .object({
    entryId: uuid,
    sourceVersion: z.number().int().positive(),
    summary: z.string().trim().min(1).max(1200),
    requestId: uuid,
    confirmed: z.literal(true),
  })
  .strict();
export const replaceMemoryInput = grantInput.extend({
  expectedMemoryVersion: z.number().int().positive(),
});
export const credentialsInput = z
  .object({
    email: z.email().max(254),
    password: z.string().min(8, "密码至少 8 位").max(128),
  })
  .strict();
export const confirmInput = z.union([
  z.object({ tokenHash: z.string().min(1).max(512) }).strict(),
  z.object({ code: z.string().min(1).max(512) }).strict(),
]);
export const journalFields =
  "id,title,body,event_date,version,undo_until,created_at,updated_at";
export const memoryFields =
  "id,journal_entry_id,source_version,summary,version,status,created_at,invalidated_at,character_id";

export const entryOutput = z.object({
  id: uuid,
  title: z.string(),
  body: z.string(),
  event_date: z.iso.date(),
  version: z.number().int(),
  undo_until: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const memoryOutput = z.object({
  id: uuid,
  journal_entry_id: uuid,
  source_version: z.number().int(),
  summary: z.string(),
  version: z.number().int(),
  status: z.enum(["active", "revoked", "invalidated", "deleted"]),
  created_at: z.string(),
  invalidated_at: z.string().nullable(),
  character_id: uuid,
});
export type Entry = {
  id: string;
  title: string;
  body: string;
  event_date: string;
  version: number;
  undo_until: string;
  created_at: string;
  updated_at: string;
};
export type Memory = {
  id: string;
  journal_entry_id: string;
  source_version: number;
  summary: string;
  version: number;
  status: "active" | "revoked" | "invalidated" | "deleted";
  created_at: string;
  invalidated_at: string | null;
  character_id: string;
};
export type EntryDraft = z.infer<typeof entryInput>;
export function entryTitle(entry: Pick<Entry, "title" | "body">) {
  return entry.title || entry.body.split(/\n/)[0].slice(0, 32);
}
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
