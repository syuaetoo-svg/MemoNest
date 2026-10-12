import "server-only";
import { z } from "zod";
import { ApiError } from "./http";

function providerConfig() {
  // Groq is explicitly preferred; failures never trigger a paid OpenAI fallback.
  if (process.env.GROQ_API_KEY?.trim()) return {
    url: "https://api.groq.com/openai/v1/responses",
    key: process.env.GROQ_API_KEY.trim(),
    model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b",
  };
  if (process.env.OPENAI_API_KEY?.trim() && process.env.OPENAI_MODEL?.trim()) return {
    url: "https://api.openai.com/v1/responses",
    key: process.env.OPENAI_API_KEY.trim(),
    model: process.env.OPENAI_MODEL.trim(),
  };
  return null;
}

export function aiConfigured() {
  return providerConfig() !== null;
}
export async function generate<T>(
  instructions: string,
  input: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!aiConfigured())
    throw new ApiError(
      503,
      "AI_NOT_CONFIGURED",
      "小栖暂未连接模型服务。你仍可以直接记录生活。",
    );
  const config = providerConfig()!;
  const timeout = AbortSignal.timeout(45000);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        max_output_tokens: 3500,
        instructions,
        input: JSON.stringify(input),
        text: {
          format: {
            type: "json_schema",
            name: "memonest",
            strict: true,
            schema: z.toJSONSchema(schema, { target: "draft-7" }),
          },
        },
      }),
    });
    if (!response.ok) {
      // Never relay upstream bodies: they can contain inputs, account details or secrets.
      throw new ApiError(
        response.status === 429 ? 429 : 503,
        "AI_UNAVAILABLE",
        "模型服务暂不可用，请稍后重试。内容没有自动保存。",
      );
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new Error("oversize response");
      }
      chunks.push(value);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (payload.status !== "completed") throw new Error("incomplete");
    const text = (payload.output || [])
      .flatMap(
        (item: {
          type: string;
          content?: { type: string; text?: string }[];
        }) => (item.type === "message" ? item.content || [] : []),
      )
      .filter((part: { type: string }) => part.type === "output_text")
      .map((part: { text: string }) => part.text)
      .join("");
    const result = schema.safeParse(JSON.parse(text));
    if (!result.success) throw new Error("invalid output");
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      "AI_GENERATION_FAILED",
      "这次回复未能完成或未通过检查，请重试。也可以直接手写记录。",
    );
  }
}

// Per-process guard only. Public multi-instance releases additionally need edge limits.
const windows = new Map<
  string,
  { start: number; count: number; active: boolean }
>();
export async function withAiLimit<T>(
  userId: string,
  run: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  for (const [key, value] of windows)
    if (!value.active && now - value.start >= 60000) windows.delete(key);
  let window = windows.get(userId);
  if (window?.active || (window && window.count >= 6) || windows.size >= 10000)
    throw new ApiError(
      429,
      "AI_RATE_LIMIT",
      "请求有些密集，请稍等一分钟再试。",
    );
  if (!window) {
    window = { start: now, count: 0, active: false };
    windows.set(userId, window);
  }
  window.count++;
  window.active = true;
  try {
    return await run();
  } finally {
    window.active = false;
  }
}
