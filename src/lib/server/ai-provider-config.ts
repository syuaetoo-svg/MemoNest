/** Server-only AI provider selection. No network requests or secret logging. */
export type AiProviderConfig = {
  url: string;
  key: string;
  model: string;
  provider: "groq" | "openai";
};

export function resolveAiProvider(env: Record<string, string | undefined>): AiProviderConfig | null {
  const groqKey = env.GROQ_API_KEY?.trim();
  if (groqKey) return {
    url: "https://api.groq.com/openai/v1/responses",
    key: groqKey,
    model: env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b",
    provider: "groq",
  };
  const openAiKey = env.OPENAI_API_KEY?.trim();
  const openAiModel = env.OPENAI_MODEL?.trim();
  if (openAiKey && openAiModel) return {
    url: "https://api.openai.com/v1/responses",
    key: openAiKey,
    model: openAiModel,
    provider: "openai",
  };
  return null;
}

/** Map provider HTTP failures without exposing upstream response bodies. */
export function classifyAiUpstreamStatus(status: number) {
  const limited = status === 429;
  const invalid = status === 400 || status === 422;
  const unauthorized = status === 401 || status === 403;
  return {
    status: limited ? 429 : 503,
    code: limited ? "AI_RATE_LIMIT" : invalid ? "AI_BAD_REQUEST" : unauthorized ? "AI_AUTH_FAILED" : "AI_UNAVAILABLE",
    message: limited ? "模型请求达到限额，请稍后重试。" :
      invalid ? "模型请求格式未被服务商接受，请检查服务端请求结构。" :
      unauthorized ? "模型服务认证失败，请检查密钥权限。" :
      "模型服务暂不可用，请稍后重试。内容没有自动保存。",
  };
}
