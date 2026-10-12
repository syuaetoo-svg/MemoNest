import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createReviewRoute } from "../../src/lib/server/review-api";
import { ApiError, authenticated } from "../../src/lib/server/http";

// Handler tests with explicit authenticated/database/provider fixtures, not real login.
test("review route enforces owner/version before sending and rechecks after generation", async () => {
  const oldOrigin = process.env.APP_URL;
  process.env.APP_URL = "http://localhost:3000";
  const userId = randomUUID(), id = randomUUID();
  const entry = { id, title: "test", body: "source", event_date: "2026-04-12", version: 1,
    undo_until: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
  try {
    for (const scenario of ["success", "absent", "stale", "changed", "deleted", "anonymous", "no-consent", "wrong-origin"]) {
      let reads = 0, calls = 0, released = 0;
      const query = {
        select() { return this; },
        eq(field: string, value: string) {
          assert.equal(value, field === "user_id" ? userId : id);
          return this;
        },
        is(field: string, value: unknown) { assert.equal(field, "deleted_at"); assert.equal(value, null); return this; },
        async maybeSingle() {
          reads++;
          return { error: null, data: scenario === "absent" || (scenario === "deleted" && reads === 2)
            ? null : { ...entry, version: scenario === "stale" || (scenario === "changed" && reads === 2) ? 2 : 1 } };
        },
      };
      const handler = createReviewRoute({
        authenticate: (async () => {
          if (scenario === "anonymous") throw new ApiError(401, "AUTH_REQUIRED", "请先登录");
          return { user: { id: userId }, client: { from(table: string) { assert.equal(table, "journal_entries"); return query; } } };
        }) as unknown as typeof authenticated,
        config: () => ({ key: "fixture", model: "test" }),
        generate: async () => { calls++; return { moments: [{ text: "test", quote: "source" }] }; },
        reserve: () => () => { released++; },
      });
      const request = new Request("http://localhost:3000/api/ai/review", {
        method: "POST", headers: { Origin: scenario === "wrong-origin" ? "https://other.invalid" : "http://localhost:3000", "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: id, expectedVersion: 1, processingConsent: scenario !== "no-consent" }),
      });
      const response = await handler(request, { params: Promise.resolve({}) });
      const expected: Record<string, number> = { success: 200, absent: 404, stale: 409, changed: 409, deleted: 404, anonymous: 401, "no-consent": 400, "wrong-origin": 403 };
      assert.equal(response.status, expected[scenario], scenario);
      assert.equal(calls, ["success", "changed", "deleted"].includes(scenario) ? 1 : 0, scenario);
      assert.equal(released, calls, scenario);
      if (scenario === "success") {
        const result = await response.json();
        assert.equal(result.source.id, id);
        assert.equal(result.source.version, 1);
        assert.equal(result.source.body, undefined);
        assert.match(response.headers.get("Cache-Control") || "", /no-store/);
      }
    }
  } finally {
    if (oldOrigin === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = oldOrigin;
  }
});
