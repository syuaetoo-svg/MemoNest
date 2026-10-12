/** Server-only AI provider selection. No network requests or secret logging. */
export type AiProviderConfig = {
  url: string;
  key: string;
  model: string;
  provider: "groq" | "openai";
};

export function resolveAiProvider(env: NodeJS.ProcessEnv): AiProviderConfig | null {
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
