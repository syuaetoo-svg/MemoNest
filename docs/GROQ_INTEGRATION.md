# Groq integration

> Final handoff, 2026-10-12: PR #12 is merged and its CI passed. Normally authenticated local chat returned HTTP 200 with a schema-valid real Groq reply; the project owner also confirmed local drafting/saving, period review and authorized memory reads. These observations predate the PR #12 merge and are not a claim that the complete hosted flow was rerun on the merged commit. Windows proxy startup support remains in open PR #13. The unchecked readiness items and cloud-workspace notes below are historical observations; current acceptance boundaries are recorded in [README](../README.md).

MemoNest's AI server supports Groq-first and OpenAI-compatible Responses API requests. The Groq provider implementation and selection tests have been merged into `main`. Authenticated requests, explicit user consent, source/citation validation, and memory access controls remain mandatory.

## Server-only configuration

- `GROQ_API_KEY` is a secret and must never be committed or exposed to the browser.
- `GROQ_MODEL` should name a model available on the user's Groq account.
- A configured Groq provider should be preferred over OpenAI, without silently falling back to paid OpenAI calls on errors.
- Configure the key in local `.env.local` or deployment environment secrets, not GitHub source.

## Acceptance criteria

1. Existing OpenAI behavior remains unchanged if Groq is not configured.
2. Groq API requests use a documented compatible endpoint and validate JSON against existing Zod schemas.
3. All AI actions still require consent and enforce user-specific source and memory access.
4. UI consent copy names the supported providers. Provider-specific wording should be verified in the deployed configuration.
5. Provider errors, timeouts, rate limits and invalid structured responses fail safely.
6. Tests cover provider selection and errors; live integration is not claimed until tested with a valid Groq key.

## Verified compatibility (documentation only)

Groq documents the OpenAI-compatible Responses endpoint `https://api.groq.com/openai/v1/responses` and strict structured JSON output for `openai/gpt-oss-20b`. References:

- https://console.groq.com/docs/responses-api
- https://console.groq.com/docs/structured-outputs

This documentation check is **not** a successful live request. Real API behavior must be tested after securely configuring a valid key.

## Deployment sequence (when the Vercel account is available)

1. Confirm `main` includes the merged AI feature, Groq provider, and provider regression tests (PRs #6, #8 and #9). Use the latest `main` for deployment; do not deploy from obsolete feature branches.
2. Import the GitHub repository into Vercel and select the Next.js framework.
3. Set server-side `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the exact public `APP_URL` origin.
4. Set `GROQ_API_KEY` from the secret store and `GROQ_MODEL=openai/gpt-oss-20b`. Do not paste any key in GitHub, issues, PR comments, or client-side `NEXT_PUBLIC_*` variables.
5. Deploy, then verify sign-in, one-user journal CRUD, another-user isolation, consent gating, AI chat, confirmed journal draft, and grounded review citations.
6. Verify a revoked key and provider rate-limit return safe user-facing errors, without logging user content or secrets.

Do not mark live deployment or the two-account RLS checks complete until actually observed.

## Current readiness (2026-10-12)

- [x] AI companion feature merged into main (PR #6)
- [x] Groq provider merged into main (PR #8)
- [x] Provider selection regression tests merged into main (PR #9)
- [x] GitHub CI checks for these PRs passed
- [ ] Real Groq request with securely configured key
- [ ] Real Supabase two-account isolation and email confirmation
- [ ] Production deployment and mobile acceptance tests

Do not commit secrets, publish a demo URL before deployment, or mark these outstanding checks complete without evidence.

## 2026-10-12 Responses contract follow-up (after PR #11)

Inspected base `82a0cea`; PR #11 added diagnostics, not a confirmed live fix.
Its main Quality run `38234551689` passed. No open PRs existed at inspection.

Confirmed compatibility defect: `GROQ_MODEL` accepted arbitrary models, while
`generate` always sent `text.format.type=json_schema, strict=true`. Groq documents
strict support for GPT OSS 20B/120B and Qwen 3.8 27B, not e.g. Llama 3.3 70B.
Other models now receive JSON Object mode with explicit schema instructions.
All modes retain the original Zod length/cardinality checks and route-level
source/citation validation. This is not a claim that the reported 503 used Llama;
the original request's model/status is unavailable here.

GPT OSS requests now set `reasoning.effort=low` to reduce reasoning pressure on
the existing 3500-token output budget. This mitigates a possible incomplete
response; no live measurement proves it caused the reported failure.
The default model remains GPT OSS 20B. There is no retry or paid-provider fallback.

Raw REST parsing uses `output[].content[].text`, not SDK-only `output_text`.
Reasoning items are ignored. Refusals, incomplete messages, malformed envelopes,
invalid JSON and schema violations fail closed with distinct safe log categories.
Keys, response bodies, prompts and generated content are never logged.
The existing `store:false`, timeout and response-size limits remain in place.

### Verification in the cloud workspace

- Service tests: 33 passed, including Groq transport fixtures for chat/draft/review.
- Core tests: 21 passed (UI mocks + isolated PGlite; no hosted migration applied).
- Lint, TypeScript and production build: passed (25 routes).
- `npm run test:ai:live`: actually executed; exited 2 with
  `GROQ_RUNTIME_CREDENTIAL_UNAVAILABLE`. No authenticated Groq request was made.
- Real Groq replies, deployed login/database flows and saving generated drafts:
  **not yet verified**. Existing CI success is not live model evidence.

### Reusable real-provider acceptance

`npm run test:ai:live` invokes production chat/draft/review handlers, prompts,
provider transport, response parser and evidence checks with synthetic records.
It makes at most three Groq calls, stopping on first failure. Authentication and
record lookup are fixtures; it never accesses user records or writes a database.
Success therefore proves provider integration, not deployed browser E2E.
It requires runtime-injected credentials, never loads secret files, prints only
stage/status/safe error codes, and exits nonzero on missing credentials/failure.

A manual-only `Groq live provider smoke` Actions workflow runs the same command
using the repository's encrypted `GROQ_API_KEY` secret and optional `GROQ_MODEL`
variable. It does not run on pull requests or ordinary pushes, and does not expose
secrets to normal tests. This workflow was not dispatched in this session; this
connection has no workflow-dispatch capability. No credential rotation or Windows
restart is a prerequisite for reviewing the code fix.
