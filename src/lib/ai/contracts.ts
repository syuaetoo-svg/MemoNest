import { z } from "zod";
import { uuid } from "@/lib/core/contracts";

const message = z
  .object({ id: uuid, text: z.string().trim().min(1).max(2000) })
  .strict();
const messages = z
  .array(message)
  .min(1)
  .max(12)
  .refine(
    (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
    "消息不能重复",
  )
  .refine(
    (rows) => rows.reduce((n, row) => n + row.text.length, 0) <= 12000,
    "请开始一段新对话",
  );
export const chatInput = z
  .object({ consent: z.literal(true), messages })
  .strict();
export const draftInput = chatInput;
export const reviewInput = z
  .object({
    consent: z.literal(true),
    entries: z
      .array(
        z.object({ id: uuid, version: z.number().int().positive() }).strict(),
      )
      .min(1)
      .max(8)
      .refine(
        (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
        "记录不能重复",
      ),
  })
  .strict();
export const citation = z
  .object({
    sourceId: z.string().min(1).max(100),
    quote: z.string().min(1).max(1200),
  })
  .strict();
export const chatOutput = z
  .object({
    reply: z.string().min(1).max(3000),
    citations: z.array(citation).max(3),
  })
  .strict();
export const draftOutput = z
  .object({
    title: z.string().max(120),
    body: z.string().max(10000),
    evidence: z.array(citation).max(12),
    note: z.string().max(400),
  })
  .strict();
export const reviewOutput = z
  .object({
    title: z.string().min(1).max(120),
    moments: z
      .array(
        z
          .object({
            text: z.string().min(1).max(1500),
            evidence: z.array(citation).min(1).max(8),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    reflection: z.string().max(500),
  })
  .strict();
export type Source = {
  id: string;
  text: string;
  entryId?: string;
  version?: number;
};
export type Citation = z.infer<typeof citation>;
export type DraftResult = z.infer<typeof draftOutput>;
export type ChatResult = z.infer<typeof chatOutput> & { sources: Source[] };
export type ReviewResult = z.infer<typeof reviewOutput> & { sources: Source[] };

// A matching ID alone is not evidence. Quotations must occur in the allowed source.
export function citationsValid(citations: Citation[], sources: Source[]) {
  return citations.every((item) =>
    sources.some(
      (source) =>
        source.id === item.sourceId &&
        item.quote.trim().length > 0 &&
        source.text.includes(item.quote),
    ),
  );
}
export function selectMemories<T extends { summary: string }>(
  rows: T[],
  question: string,
): T[] {
  const text = question.toLowerCase();
  const words = [...text.matchAll(/[a-z0-9]{2,}|[\p{Script=Han}]+/gu)].flatMap(([word]) =>
    /[\p{Script=Han}]/u.test(word)
      ? Array.from({ length: Math.max(0, word.length - 1) }, (_, i) => word.slice(i, i + 2))
      : [word],
  );
  const tokens = [...new Set(words)];
  const ranked = rows
    .map((row, index) => ({
      row,
      index,
      score: tokens.filter((token) => row.summary.toLowerCase().includes(token))
        .length,
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  let budget = 0;
  return ranked
    .filter(({ row }) => {
      if (budget + row.summary.length > 2400) return false;
      budget += row.summary.length;
      return true;
    })
    .slice(0, 3)
    .map(({ row }) => row);
}
