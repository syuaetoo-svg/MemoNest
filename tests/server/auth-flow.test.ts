import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmInput } from "../../src/lib/core/contracts";
import { confirmationFromQuery } from "../../src/lib/core/auth-confirmation";
import { registrationOutcome, signupFailure, confirmSession } from "../../src/lib/server/auth-outcomes";
import { ApiError } from "../../src/lib/server/http";

test("signup acceptance never claims user creation, mail delivery or email verification", () => {
  const pending = registrationOutcome(false);
  assert.equal(pending.authenticated, false);
  assert.equal(pending.registrationStatus, "confirmation_required_or_existing");
  assert.equal(pending.emailDelivery, "unverified");
  assert.match(pending.message, /邮件是否送达尚未确认/);
  assert.equal("user" in pending, false);
  assert.equal(registrationOutcome(true).registrationStatus, "authenticated");
  assert.equal(registrationOutcome(true).emailDelivery, "unverified");
});

test("SMTP restrictions and rate limits have safe actionable categories without account enumeration", () => {
  assert.equal(signupFailure({ code: "email_address_not_authorized", status: 400 }).code, "SIGNUP_EMAIL_RESTRICTED");
  assert.equal(signupFailure({ code: "over_email_send_rate_limit", status: 429 }).status, 429);
  assert.equal(signupFailure({ code: "email_provider_disabled" }).code, "SIGNUP_DISABLED");
  assert.equal(signupFailure({ status: 500 }).code, "SIGNUP_SERVICE_UNAVAILABLE");
  for (const code of ["email_exists", "user_already_exists", "UNKNOWN_PRIVATE_MARKER"]) {
    const failure = signupFailure({ code, status: 400 });
    assert.equal(failure.code, "SIGNUP_FAILED");
    assert.equal(failure.message.includes(code), false);
  }
});

test("confirmation query accepts exactly one email token or PKCE code and ignores open redirect targets", () => {
  assert.deepEqual(confirmationFromQuery({ type: "email", token_hash: "synthetic-token", next: "https://evil.invalid" }), { tokenHash: "synthetic-token" });
  assert.deepEqual(confirmationFromQuery({ code: "synthetic-code" }), { code: "synthetic-code" });
  for (const query of [{}, { code: "x", token_hash: "y", type: "email" }, { type: "recovery", token_hash: "x" }, { code: "x", error: "expired" }, { code: "x".repeat(513) }, { code: ["x", "y"] }]) assert.equal(confirmationFromQuery(query), null);
  assert.equal(confirmInput.safeParse({ tokenHash: "x", code: "y" }).success, false);
  assert.equal(confirmInput.safeParse({ code: "x", next: "https://evil.invalid" }).success, false);
});

test("email confirmation calls verifyOtp only and requires an actual session", async () => {
  const calls: string[] = [];
  const auth = {
    verifyOtp: async (input: { token_hash: string; type: "email" }) => { calls.push("otp"); assert.deepEqual(input, { token_hash: "synthetic-token", type: "email" }); return { data: { session: {} }, error: null }; },
    exchangeCodeForSession: async () => { throw Error("wrong confirmation method"); },
  };
  assert.deepEqual(await confirmSession(auth, { tokenHash: "synthetic-token" }), { authenticated: true });
  assert.deepEqual(calls, ["otp"]);
  await assert.rejects(confirmSession({ ...auth, verifyOtp: async () => ({ data: { session: null }, error: null }) }, { tokenHash: "synthetic-token" }), (e: unknown)=>e instanceof ApiError && e.code === "CONFIRM_FAILED");
});

test("PKCE confirmation exchanges code once; missing verifier/provider failures never claim authentication", async () => {
  let calls = 0;
  const auth = {
    verifyOtp: async () => { throw Error("wrong confirmation method"); },
    exchangeCodeForSession: async (code: string) => { calls++; assert.equal(code, "synthetic-code"); return { data: { session: {} }, error: null }; },
  };
  assert.deepEqual(await confirmSession(auth, { code: "synthetic-code" }), { authenticated: true });
  assert.equal(calls, 1);
  await assert.rejects(confirmSession({ ...auth, exchangeCodeForSession: async () => ({ data: { session: null }, error: new Error("PRIVATE_UPSTREAM_MARKER") }) }, { code: "synthetic-code" }), (e: unknown)=>e instanceof ApiError && e.code === "CONFIRM_FAILED" && !e.message.includes("PRIVATE_UPSTREAM_MARKER"));
});
