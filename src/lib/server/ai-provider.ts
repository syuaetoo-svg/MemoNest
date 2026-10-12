import "server-only";
import { z } from "zod";
import { ApiError } from "./http";
import { resolveAiProvider } from "./ai-provider-config";

export function aiConfigured() {
  return resolveAiProvider(process.env) !== null;
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
  const config = resolveAiProvider(process.env)!;
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
      // Log only safe metadata; never log bodies, prompts, keys or headers.
      console.error("[ai-provider] upstream failure", {
        provider: config.provider,
        status: response.status,
      });
      const limited = response.status === 429;
      const badRequest = response.status === 400 || response.status === 422;
      const authFailure = response.status === 401 || response.status === 403;
      throw new ApiError(
        limited ? 429 : 503,
        limited ? "AI_RATE_LIMIT" : badRequest ? "AI_BAD_REQUEST" : authFailure ? "AI_AUTH_FAILED" : "AI_UNAVAILABLE",
        limited ? "模型请求达到限额，请稍后重试。" :
          badRequest ? "模型请求格式未被服务商接受，请检查服务端请求结构。" :
          authFailure ? "模型服务认证失败，请检查密钥权限。" :
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
    console.error("[ai-provider] response processing failed", {
      provider: config.provider,
      category: error instanceof SyntaxError ? "invalid_json" :
        error instanceof Error && error.name === "TimeoutError" ? "timeout" : "processing_error",
    });
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
