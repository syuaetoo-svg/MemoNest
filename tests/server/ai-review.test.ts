import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { generateReview, reserveReview, reviewConfig } from "../../src/lib/server/ai-review";
import { reviewInput } from "../../src/lib/core/review";
import { ApiError } from "../../src/lib/server/http";

// Explicit mock provider transport; these tests do not validate live AI quality.
const entry = { title: "虚构测试", body: "今天散步，看见了晚霞。", event_date: "2026-04-12" };
const config = { key: "fixture-not-a-real-key", model: "gpt-4.1-mini" };
function result(content: unknown, finish = "stop") {
  return Response.json({ choices: [{ finish_reason: finish, message: { content: JSON.stringify(content) } }] });
}
test("review consent is explicit, singular, versioned and rejects injected private content", () => {
  const valid = { entryId: randomUUID(), expectedVersion: 1, processingConsent: true };
  assert.equal(reviewInput.safeParse(valid).success, true);
  assert.equal(reviewInput.safeParse({ ...valid, processingConsent: false }).success, false);
  assert.equal(reviewInput.safeParse({ ...valid, userId: randomUUID() }).success, false);
  assert.equal(reviewInput.safeParse({ ...valid, body: "client injected" }).success, false);
});
test("missing key fails explicitly and never falls back to scripted content", () => {
  const old = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    assert.throws(reviewConfig, (e: unknown) => e instanceof ApiError && e.code === "AI_NOT_CONFIGURED");
  } finally {
    if (old === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = old;
  }
});
test("provider receives bounded single-source input, no tools and store=false", async () => {
  const review = await generateReview(entry, config, undefined, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(init?.redirect, "error");
    const input = JSON.parse(init?.body as string);
    assert.equal(input.store, false);
    assert.equal(input.tools, undefined);
    assert.equal(input.max_completion_tokens, 900);
    assert.deepEqual(JSON.parse(input.messages[1].content), { title: entry.title, eventDate: entry.event_date, diary: entry.body });
    return result({ moments: [{ text: "你记录下了一次散步。", quote: "今天散步" }] });
  });
  assert.equal(review.moments[0].quote, "今天散步");
});
test("unfounded quotes, incomplete outputs, provider errors and cancellation fail safely", async () => {
  for (const response of [
    result({ moments: [{ text: "unsupported", quote: "并不存在的事实" }] }),
    result({ moments: [] }),
    result({ moments: [{ text: "x", quote: "今天" }] }, "length"),
    Response.json({ secret: "private-provider-diagnostic" }, { status: 401 }),
    new Response("private-provider-diagnostic".repeat(5000)),
  ]) {
    await assert.rejects(generateReview(entry, config, undefined, async () => response), (e: unknown) => {
      assert.ok(e instanceof ApiError);
      assert.doesNotMatch(e.message, /private-provider-diagnostic|fixture-not-a-real-key/);
      return true;
    });
  }
  await assert.rejects(generateReview(entry, config, undefined, async () => new Response("", { status: 429 })),
    (e: unknown) => e instanceof ApiError && e.status === 429);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(generateReview(entry, config, controller.signal, async () => { throw new Error("aborted"); }),
    (e: unknown) => e instanceof ApiError && e.code === "AI_INTERRUPTED");
  let called = false;
  await assert.rejects(generateReview({ ...entry, body: "x".repeat(6001) }, config, undefined, async () => {
    called = true; throw new Error();
  }), (e: unknown) => e instanceof ApiError && e.code === "REVIEW_TOO_LONG");
  assert.equal(called, false);
});
test("per-process limit bounds concurrent requests, attempts and cooldown", () => {
  const id = randomUUID(), start = Date.now();
  const end = reserveReview(id, start);
  assert.throws(() => reserveReview(id, start), (e: unknown) => e instanceof ApiError && e.status === 429);
  end();
  reserveReview(id, start)();
  reserveReview(id, start)();
  assert.throws(() => reserveReview(id, start + 1), (e: unknown) => e instanceof ApiError && e.status === 429);
  reserveReview(id, start + 60_001)();
});
