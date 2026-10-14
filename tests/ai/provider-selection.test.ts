import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resolveAiProvider, classifyAiUpstreamStatus } from "../../src/lib/server/ai-provider-config";

test("no configured provider means no AI calls", () => {
  assert.equal(resolveAiProvider({}), null);
  assert.equal(resolveAiProvider({ OPENAI_API_KEY: " ", OPENAI_MODEL: "x" }), null);
});

test("Groq is preferred over OpenAI to prevent paid fallback", () => {
  const config = resolveAiProvider({
    GROQ_API_KEY: " groq-secret ",
    OPENAI_API_KEY: "openai-secret",
    OPENAI_MODEL: "gpt-4.1-mini",
  });
  assert.equal(config?.provider, "groq");
  assert.equal(config?.url, "https://api.groq.com/openai/v1/responses");
  assert.equal(config?.key, "groq-secret");
  assert.equal(config?.model, "openai/gpt-oss-20b");
});

test("Groq supports explicit model selection", () => {
  assert.equal(resolveAiProvider({ GROQ_API_KEY: "g", GROQ_MODEL: "openai/gpt-oss-120b" })?.model, "openai/gpt-oss-120b");
});

test("existing OpenAI configuration remains supported", () => {
  const config = resolveAiProvider({ OPENAI_API_KEY: " openai-secret ", OPENAI_MODEL: " gpt-4.1-mini " });
  assert.equal(config?.provider, "openai");
  assert.equal(config?.url, "https://api.openai.com/v1/responses");
  assert.equal(config?.model, "gpt-4.1-mini");
});


test("blank Groq key does not override a valid OpenAI configuration", () => {
  const config = resolveAiProvider({
    GROQ_API_KEY: "  ",
    OPENAI_API_KEY: "openai-secret",
    OPENAI_MODEL: "gpt-4.1-mini",
  });
  assert.equal(config?.provider, "openai");
});

test("an OpenAI key without a model never creates an implicit paid request", () => {
  assert.equal(resolveAiProvider({ OPENAI_API_KEY: "openai-secret" }), null);
});

test("blank Groq model uses the known free-tier-compatible default", () => {
  const config = resolveAiProvider({ GROQ_API_KEY: "groq-secret", GROQ_MODEL: "  " });
  assert.equal(config?.model, "openai/gpt-oss-20b");
});

test("Groq is still selected when OpenAI is only partially configured", () => {
  const config = resolveAiProvider({
    GROQ_API_KEY: "groq-secret",
    OPENAI_API_KEY: "openai-secret",
  });
  assert.equal(config?.provider, "groq");
});

test("upstream errors are classified without leaking response content", () => {
  assert.deepEqual([400, 401, 403, 422, 429, 500].map((status) => classifyAiUpstreamStatus(status).code), [
    "AI_BAD_REQUEST", "AI_AUTH_FAILED", "AI_ACCESS_DENIED", "AI_BAD_REQUEST", "AI_RATE_LIMIT", "AI_UNAVAILABLE",
  ]);
  assert.equal(classifyAiUpstreamStatus(429).status, 429);
  assert.equal(classifyAiUpstreamStatus(401).status, 503);
  assert.equal(classifyAiUpstreamStatus(403).status, 503);
  assert(!classifyAiUpstreamStatus(403).message.includes("密钥"));
});
