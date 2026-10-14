import { test } from "node:test";
import assert from "node:assert/strict";
import { generate } from "../../src/lib/server/ai-provider";
import { chatOutput } from "../../src/lib/ai/contracts";
import { ApiError } from "../../src/lib/server/http";

test("Groq responses parse output_text and distinguish denied access from transport failure", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.GROQ_API_KEY;
  const oldModel = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = "test-secret";
  delete process.env.GROQ_MODEL;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.groq.com/openai/v1/responses");
      assert.equal(new Headers(options?.headers).get("authorization"), "Bearer test-secret");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, "openai/gpt-oss-20b");
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      return Response.json({ status: "completed", output: [
        { type: "reasoning", content: [] },
        { type: "message", content: [{ type: "output_text", text: JSON.stringify({ reply: "你好", citations: [] }) }] },
      ] });
    };
    assert.deepEqual(await generate("test", {}, chatOutput), { reply: "你好", citations: [] });
    globalThis.fetch = async () => Response.json({ error: { message: "Forbidden test-secret private prompt" } }, { status: 403 });
    await assert.rejects(generate("private prompt", {}, chatOutput), (error: unknown) => {
      assert(error instanceof ApiError);
      assert.equal(error.code, "AI_ACCESS_DENIED");
      assert(!error.message.includes("test-secret"));
      assert(!error.message.includes("private prompt"));
      return true;
    });
    globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
    await assert.rejects(generate("test", {}, chatOutput), (error: unknown) => error instanceof ApiError && error.code === "AI_NETWORK_UNAVAILABLE");
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = oldModel;
  }
});
