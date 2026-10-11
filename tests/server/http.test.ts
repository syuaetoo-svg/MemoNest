import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { serviceConfig } from "../../src/lib/server/config";
import {
  ApiError,
  assertOrigin,
  authenticated,
  body,
  databaseError,
  verifyOperationIdentity,
  route,
} from "../../src/lib/server/http";

function environment(
  values: Record<string, string | undefined>,
  check: () => Promise<void> | void,
) {
  const prior = Object.fromEntries(
    Object.keys(values).map((name) => [name, process.env[name]]),
  );
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  return Promise.resolve()
    .then(check)
    .finally(() => {
      for (const [name, value] of Object.entries(prior)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    });
}
test("missing configuration fails closed and privileged keys are rejected", async () => {
  await environment(
    { SUPABASE_URL: undefined, SUPABASE_PUBLISHABLE_KEY: undefined },
    async () => {
      assert.equal(serviceConfig(), null);
      await assert.rejects(
        authenticated(),
        (error: unknown) =>
          error instanceof ApiError &&
          error.status === 503 &&
          error.code === "CONFIG_REQUIRED",
      );
    },
  );
  await environment(
    {
      SUPABASE_URL: "https://test-project.invalid",
      SUPABASE_PUBLISHABLE_KEY: "sb_secret_TEST_ONLY",
      APP_URL: "https://app.invalid",
    },
    () => {
      assert.equal(serviceConfig(), null);
    },
  );
  await environment(
    {
      SUPABASE_URL: "https://test-project.invalid",
      SUPABASE_PUBLISHABLE_KEY: `test.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.test`,
      APP_URL: "https://app.invalid",
    },
    () => {
      assert.equal(serviceConfig(), null);
    },
  );
});
test("Origin enforcement and sanitized error responses never echo database details", async () => {
  await environment({ APP_URL: "https://app.invalid" }, async () => {
    assert.doesNotThrow(() =>
      assertOrigin(
        new Request("https://app.invalid/api/x", {
          headers: { Origin: "https://app.invalid" },
        }),
      ),
    );
    assert.throws(
      () =>
        assertOrigin(
          new Request("https://app.invalid/api/x", {
            headers: { Origin: "https://attacker.invalid" },
          }),
        ),
      (e: unknown) => e instanceof ApiError && e.status === 403,
    );
    assert.throws(
      () => assertOrigin(new Request("https://app.invalid/api/x")),
      (e: unknown) => e instanceof ApiError && e.status === 403,
    );
    const handler = route(async () => {
      databaseError({ message: "PRIVATE_DATABASE_ERROR_MARKER" });
      return new Response();
    });
    const response = await handler(new Request("https://app.invalid/api/x"), {
      params: Promise.resolve({}),
    });
    assert.equal(response.status, 503);
    assert.ok(
      !(await response.text()).includes("PRIVATE_DATABASE_ERROR_MARKER"),
    );
  });
});
test("JSON stream limits cover requests without declared Content-Length", async () => {
  const request = (text: string, type = "application/json") =>
    new Request("https://app.invalid/api/x", {
      method: "POST",
      headers: { "Content-Type": type },
      body: text,
    });
  await assert.rejects(
    body(
      request(JSON.stringify({ text: "x".repeat(70000) })),
      z.object({ text: z.string() }),
    ),
    (e: unknown) => e instanceof ApiError && e.status === 413,
  );
  await assert.rejects(
    body(request("not-json"), z.object({ text: z.string() })),
    (e: unknown) => e instanceof ApiError && e.status === 400,
  );
  await assert.rejects(
    body(request("{}", "text/plain"), z.object({ text: z.string() })),
    (e: unknown) => e instanceof ApiError && e.status === 415,
  );
  assert.deepEqual(
    await body(request('{"text":"fictional"}'), z.object({ text: z.string() })),
    { text: "fictional" },
  );
});

test("stale account markers cannot write or terminate another account session", () => {
  const request = (path: string, marker?: string) =>
    new Request(`https://app.invalid${path}`, {
      method: "POST",
      headers: marker ? { "X-MemoNest-User": marker } : {},
    });
  for (const path of ["/api/journal-entries", "/api/auth/logout"]) {
    assert.doesNotThrow(() =>
      verifyOperationIdentity(request(path, "user-a"), "user-a"),
    );
    assert.throws(
      () => verifyOperationIdentity(request(path, "user-a"), "user-b"),
      (e: unknown) => e instanceof ApiError && e.code === "SESSION_CHANGED",
    );
    assert.throws(
      () => verifyOperationIdentity(request(path), "user-a"),
      (e: unknown) => e instanceof ApiError && e.status === 409,
    );
  }
});
