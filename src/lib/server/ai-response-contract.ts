import { z } from "zod";
import type { AiProviderConfig } from "./ai-provider-config";

// Groq's strict Structured Outputs model list, checked 2026-10-12.
// Other models use JSON mode plus the same server-side Zod/evidence checks.
const groqStrictModels = new Set([
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
]);

export function responseRequest<T>(
  config: Pick<AiProviderConfig, "provider" | "model">,
  instructions: string,
  input: unknown,
  schema: z.ZodType<T>,
) {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });
  const strict = config.provider !== "groq" || groqStrictModels.has(config.model);
  const reasoning = config.provider === "groq" &&
    ["openai/gpt-oss-20b", "openai/gpt-oss-120b"].includes(config.model);
  return {
    model: config.model,
    store: false,
    max_output_tokens: 3500,
    // Avoid spending the small output budget entirely on reasoning.
    ...(reasoning ? { reasoning: { effort: "low" } } : {}),
    instructions: strict ? instructions :
      `${instructions}\n只输出符合以下 JSON Schema 的 JSON 对象，不要 Markdown：\n${JSON.stringify(jsonSchema)}`,
    input: JSON.stringify(input),
    text: {
      format: strict
        ? { type: "json_schema", name: "memonest", strict: true, schema: jsonSchema }
        : { type: "json_object" },
    },
  };
}

export class AiResponseError extends Error {
  constructor(public category: "incomplete" | "invalid_envelope" | "refusal" | "empty_output" | "invalid_json" | "invalid_schema") {
    super(category);
  }
}

const envelope = z.object({
  status: z.string(),
  error: z.unknown().optional(),
  output: z.array(z.object({
    type: z.string(),
    role: z.string().optional(),
    status: z.string().optional(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })),
});

export function parseResponse<T>(payload: unknown, schema: z.ZodType<T>): T {
  const parsed = envelope.safeParse(payload);
  if (!parsed.success) throw new AiResponseError("invalid_envelope");
  if (parsed.data.status !== "completed" || parsed.data.error != null)
    throw new AiResponseError("incomplete");
  const parts: string[] = [];
  for (const item of parsed.data.output) {
    if (item.type !== "message") continue; // Never expose reasoning traces.
    if ((item.role && item.role !== "assistant") || (item.status && item.status !== "completed"))
      throw new AiResponseError("incomplete");
    for (const part of item.content || []) {
      if (part.type === "refusal") throw new AiResponseError("refusal");
      if (part.type === "output_text" && part.text) parts.push(part.text);
    }
  }
  if (!parts.length) throw new AiResponseError("empty_output");
  let value: unknown;
  try { value = JSON.parse(parts.join("")); }
  catch { throw new AiResponseError("invalid_json"); }
  const result = schema.safeParse(value);
  if (!result.success) throw new AiResponseError("invalid_schema");
  return result.data;
}
