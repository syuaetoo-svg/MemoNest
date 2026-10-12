import { z } from "zod";

export const reviewInput = z.object({
  entryId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  processingConsent: z.literal(true),
}).strict();

export const reviewOutput = z.object({
  moments: z.array(z.object({
    text: z.string().trim().min(1).max(400),
    quote: z.string().min(1).max(240),
  }).strict()).min(1).max(3),
}).strict();

export type ReviewResult = z.infer<typeof reviewOutput> & {
  source: { id: string; version: number; title: string; eventDate: string };
};
