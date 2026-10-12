# Groq integration

MemoNest's current AI server uses OpenAI Responses API. Groq support must preserve authenticated requests, explicit user consent, source/citation validation, memory access controls, and existing OpenAI compatibility.

## Server-only configuration

- `GROQ_API_KEY` is a secret and must never be committed or exposed to the browser.
- `GROQ_MODEL` should name a model available on the user's Groq account.
- A configured Groq provider should be preferred over OpenAI, without silently falling back to paid OpenAI calls on errors.
- Configure the key in local `.env.local` or deployment environment secrets, not GitHub source.

## Acceptance criteria

1. Existing OpenAI behavior remains unchanged if Groq is not configured.
2. Groq API requests use a documented compatible endpoint and validate JSON against existing Zod schemas.
3. All AI actions still require consent and enforce user-specific source and memory access.
4. UI consent copy accurately identifies the selected provider.
5. Provider errors, timeouts, rate limits and invalid structured responses fail safely.
6. Tests cover provider selection and errors; live integration is not claimed until tested with a valid Groq key.

## Verified compatibility (documentation only)

Groq documents the OpenAI-compatible Responses endpoint `https://api.groq.com/openai/v1/responses` and strict structured JSON output for `openai/gpt-oss-20b`. References:

- https://console.groq.com/docs/responses-api
- https://console.groq.com/docs/structured-outputs

This documentation check is **not** a successful live request. Real API behavior must be tested after securely configuring a valid key.

## Deployment sequence (when the Vercel account is available)

1. Merge the AI feature PR into `main`, then merge this Groq feature after its CI checks pass and review is complete.
2. Import the GitHub repository into Vercel and select the Next.js framework.
3. Set server-side `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the exact public `APP_URL` origin.
4. Set `GROQ_API_KEY` from the secret store and `GROQ_MODEL=openai/gpt-oss-20b`. Do not paste any key in GitHub, issues, PR comments, or client-side `NEXT_PUBLIC_*` variables.
5. Deploy, then verify sign-in, one-user journal CRUD, another-user isolation, consent gating, AI chat, confirmed journal draft, and grounded review citations.
6. Verify a revoked key and provider rate-limit return safe user-facing errors, without logging user content or secrets.

Do not mark live deployment or the two-account RLS checks complete until actually observed.
