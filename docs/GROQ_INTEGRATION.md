# Groq integration

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
