import { test } from "node:test";
import assert from "node:assert/strict";
import { chatOutput, draftOutput, reviewOutput } from "../../src/lib/ai/contracts";
import { responseRequest, parseResponse, AiResponseError } from "../../src/lib/server/ai-response-contract";
import { generate } from "../../src/lib/server/ai-provider";
import { ApiError } from "../../src/lib/server/http";

const answer = { reply: "今天的散步听起来很惬意。", citations: [] };
const wrap = (value: unknown) => ({ status: "completed", error: null, output: [
  { type: "reasoning", content: [{ type: "reasoning_text", text: "not public" }] },
  { type: "message", role: "assistant", status: "completed", content: [
    { type: "output_text", text: JSON.stringify(value) },
  ] },
] });

test("Groq Llama uses JSON object mode with schema instructions instead of unsupported strict output", () => {
  const request = responseRequest({ provider: "groq", model: "llama-3.3-70b-versatile" }, "小栖", {}, chatOutput);
  assert.deepEqual(request.text.format, { type: "json_object" });
  assert(request.instructions.includes('"citations"'));
  assert(request.instructions.includes("JSON"));
  assert(!("reasoning" in request));
});

test("Groq GPT OSS uses Responses format and low reasoning; OpenAI stays unchanged", () => {
  for (const model of ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]) {
    const request = responseRequest({ provider: "groq", model }, "小栖", {}, chatOutput);
    assert.equal(request.text.format.strict, true);
    assert.deepEqual(request.reasoning, { effort: "low" });
    assert.equal(request.store, false);
    assert(!("response_format" in request));
    assert(!("messages" in request));
  }
  const request = responseRequest({ provider: "openai", model: "gpt-4.1-mini" }, "original", {}, chatOutput);
  assert.equal(request.instructions, "original");
  assert.equal(request.text.format.strict, true);
  assert(!("reasoning" in request));
});

test("raw REST output extracts only final message text and handles split text parts", () => {
  const payload = wrap(answer);
  const text = JSON.stringify(answer);
  payload.output[1].content = [
    { type: "output_text", text: text.slice(0, 10) },
    { type: "output_text", text: text.slice(10) },
  ];
  assert.deepEqual(parseResponse(payload, chatOutput), answer);
});

test("incomplete, refused, malformed, empty and invalid-schema results fail closed", () => {
  const cases: [unknown, string][] = [
    [{ ...wrap(answer), status: "incomplete" }, "incomplete"],
    [{ ...wrap(answer), error: { message: "private" } }, "incomplete"],
    [{ status: "completed", output: {} }, "invalid_envelope"],
    [{ status: "completed", output: [] }, "empty_output"],
    [{ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] }, "refusal"],
    [{ status: "completed", output: [{ type: "message", status: "incomplete" }] }, "incomplete"],
    [{ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "```json {} ```" }] }] }, "invalid_json"],
    [wrap({ reply: "", citations: [] }), "invalid_schema"],
    [wrap({ ...answer, citations: Array(4).fill({ sourceId: "x", quote: "x" }) }), "invalid_schema"],
  ];
  for (const [payload, category] of cases) {
    assert.throws(() => parseResponse(payload, chatOutput), (e: unknown) => e instanceof AiResponseError && e.category === category);
  }
});

test("Groq transport covers chat, draft, review and HTTP failures without OpenAI fallback", async () => {
  const fetchBefore = globalThis.fetch;
  const env = { ...process.env };
  try {
    process.env.GROQ_API_KEY = "test-only";
    process.env.GROQ_MODEL = "llama-3.3-70b-versatile";
    process.env.OPENAI_API_KEY = "must-not-use";
    process.env.OPENAI_MODEL = "must-not-use";
    const values = [answer,
      { title: "散步", body: "我去公园散步", evidence: [{ sourceId: "source", quote: "公园散步" }], note: "请校对" },
      { title: "生活回顾", moments: [{ text: "散步", evidence: [{ sourceId: "source", quote: "公园散步" }] }], reflection: "有什么感受？" },
    ];
    let current: unknown;
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, "https://api.groq.com/openai/v1/responses");
      const body = JSON.parse(options?.body as string);
      assert.equal(body.text.format.type, "json_object");
      assert.equal(body.store, false);
      assert.equal(options?.redirect, "error");
      return Response.json(wrap(current));
    };
    current = values[0]; assert.deepEqual(await generate("小栖", {}, chatOutput), current);
    current = values[1]; assert.deepEqual(await generate("草稿", {}, draftOutput), current);
    current = values[2]; assert.deepEqual(await generate("回顾", {}, reviewOutput), current);
    assert.equal(calls, 3);
    for (const status of [400, 401, 422, 429, 500]) {
      calls = 0;
      globalThis.fetch = async () => { calls++; return new Response("private upstream content", { status }); };
      await assert.rejects(generate("小栖", {}, chatOutput), (e: unknown) => e instanceof ApiError && !e.message.includes("private"));
      assert.equal(calls, 1);
    }
  } finally {
    globalThis.fetch = fetchBefore;
    for (const key of ["GROQ_API_KEY", "GROQ_MODEL", "OPENAI_API_KEY", "OPENAI_MODEL"]) {
      if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
    }
  }
});
