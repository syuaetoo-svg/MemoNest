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
