# MemoNest

### A little space for your everyday.

An AI companion for keeping everyday moments: talk with Xiaoqi, shape a thought into a journal entry, and choose what becomes a memory.

**Private by default. English-first interface. Your words stay yours.**

[Overview](#overview) · [Chat](#chat) · [Journal](#journal) · [Memories](#memories) · [Reflections](#reflections)

## Overview

A quiet home for your moments, with a floating navigation capsule, lavender frosted glass, a weekly rhythm and Xiaoqi close by.

![MemoNest Overview with the current white and lavender interface and five-link navigation](docs/screenshots/current/overview.png)

> **About these screenshots:** These are actual local browser captures. Overview uses the reference demo; the other pages show product components with labelled synthetic responses. All content is fictional. Screenshots do not prove live AI or authenticated saving, and demo photos are not an upload feature.

## Chat

Start with a thought. Turn selected words into an editable draft, check its date, then save privately. Replies offer source links when grounded in memory. Chat clears when you leave or refresh.

![Chat with Playing Xiaoqi on the left and Reading Xiaoqi in the central empty state; synthetic browser fixtures](docs/screenshots/current/chat.png)

## Journal

Write without AI. Add a date and optional title, preview, then save privately. Edit or delete saved entries; failed saves retain the draft for retry.

![Journal editor with English labels and an explicitly fictional Chinese draft](docs/screenshots/current/journal.png)

## Memories

Browse and search your private timeline. Separately share an exact summary with Xiaoqi, or revoke access while keeping the entry. Editing or deleting the source invalidates its old memory.

![Memories page showing its private timeline and separate shared-memory navigation with fictional records](docs/screenshots/current/memories.png)

## Reflections

Choose up to eight entries and consent to processing for that request. Reflections link back to source records and quotes. They are not saved automatically and do not grant long-term memory access.

![Reflections record selection and per-request consent before generation; fictional records](docs/screenshots/current/reflections.png)

## Meet Xiaoqi · 小栖

One pearl-white companion, two distinct Chat poses. Supplied transparent assets, no platform or disc. Overview keeps the original sitting pose.

| Playing | Reading Book |
| :---: | :---: |
| <img src="public/brand/xiaoqi-playing.png" width="250" alt="Xiaoqi reaching toward a lavender butterfly"> | <img src="public/brand/xiaoqi-reading.png" width="250" alt="Xiaoqi holding and reading a lavender book"> |
| Chat profile | Chat empty state |

## Keep a moment, on your terms

**Express → Review → Save privately → Share selectively → Reflect.**

| Your choice | What it allows |
| --- | --- |
| Private saving | Stores the entry for your account; no automatic AI access. |
| One-time AI consent | Sends the selected messages or entries to the configured provider for that request. |
| Memory permission | Lets Xiaoqi use a confirmed summary and source version in future chats until revoked or invalidated. |

Revocation cannot recall data already sent to a provider or erase replies already shown. Requests use `store=false`; provider policies can still permit retention. AI output may be wrong and needs review.

## Built with

**Next.js App Router · React · TypeScript · Tailwind CSS · Lucide · Supabase Auth & PostgreSQL · Groq / OpenAI · Zod**

RLS, restricted RPCs, version checks and idempotent writes protect account-scoped data. Memory recall uses keyword matching over authorized summaries.

## Run locally

Use Node.js 24. Follow [Supabase setup](docs/SUPABASE_SETUP.md) and [Groq configuration](docs/GROQ_INTEGRATION.md). Create `.env.local` from `.env.example` only if absent. Never commit credentials or reset existing data.

```bash
npm ci
npm run dev
```

<details>
<summary>Development checks</summary>

```bash
npm run lint
npm run typecheck
npm run test:core
npm run test:server
npm run build
npm run test:core:browser
```

Browser tests require Playwright browsers. Mock tests do not establish live AI or authenticated end-to-end success.

</details>

## Current status

As of **October 17, 2026**:

- Current visuals, English-first UI, unified navigation and both poses: merged in [PR #15](https://github.com/syuaetoo-svg/MemoNest/pull/15).
- Lint, types, build, 61 core/server/AI tests and CI’s isolated browser suite passed. [Acceptance details](docs/NAVIGATION_CHARACTER_ACCEPTANCE.md).
- **Public deployment:** unconfirmed; these are local captures, not a live-demo claim.
- **Hosted end-to-end acceptance:** incomplete. Email confirmation is unresolved; the latest login → live AI → save → memory/revoke → reflection flow has not been reverified. [Investigation](docs/AUTH_EMAIL_DIAGNOSTIC.md).
- **Attachments:** recovery is unverified; this checkout has no upload pipeline. Default covers are display-only.
- **Research:** no validated participants, retention gains or measured product outcomes.

## Product notes & evidence

[Product brief](docs/PRD.md) · [User flow](docs/USER_FLOW.md) · [Research plan](docs/USER_RESEARCH.md) · [UX experiments](docs/UX_EXPERIMENTS.md) · [Screenshot provenance](docs/screenshots/current/CAPTURES.md)

Historical technical documents and acceptance records remain in `docs/`, with their original dates and verification scopes.
