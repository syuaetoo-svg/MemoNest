# Navigation and supplied character actions

## Repository state

Latest main checked: `99be0ed` (PR #14). Design branch before this change: `f94b55b`, 11 commits ahead, no main-only commits. Continue `design/liquid-glass-20261015` and existing PR #15; no merge. Existing unrelated dirty docs, deleted unused airy-glass stylesheet and untracked local files are retained and excluded.

## Root causes and fixes

Overview hardcoded a separate four-link menu, while inner pages used the shared five-link Navigation. Overview now uses the same component/data as all inner pages: Overview / Chat / Journal / Memories / Reflections. The active state includes nested journal detail routes. Responsive rules keep the Overview capsule in flow on narrow screens; inner-page mobile navigation retains the existing bottom capsule. No routes or auth gates were removed.

An additional geometry check found the reference-page stylesheet could override the production notebook dimensions. The production selector is now scoped to `.overview-memory`, preserving its reserved artwork column regardless of stylesheet load order.

## Character assets and locations

| Static path | Original supplied file | Actual use |
| --- | --- | --- |
| `/brand/xiaoqi-playing.png` | `codex-clipboard-56eedd77-32bf-43b2-93d2-e9a2fee78273.png` | Authenticated Chat profile; anonymous Chat welcome panel |
| `/brand/xiaoqi-reading.png` | `codex-clipboard-d353e3d8-7920-47e6-b264-e0d939c82036.png` | Chat central empty state, before the first turn |

Both PNGs were copied byte-for-byte into `public/brand`; alpha ranges 0–255, original dimensions 1017×793 and 965×793. No generation, cropping, stretching or retouching. Full images use `object-fit: contain`, stable paths and only a very soft drop shadow. No disc/base/ripple is added. Overview still uses `/brand/xiaoqi-reference.png` through its original SVG region, unchanged.

## Verification

- ESLint, TypeScript and final webpack production build: passed.
- Existing core suite: 23 passed, including a new assertion of both Chat image paths and absence of the character ripple. Chinese message/AI response fixtures remain unchanged. Server/AI contracts: 38 passed.
- Actual Edge public routes: Overview, Chat, Journal, Memories, Reflections at 1536×1024, 1366×768, 390×844 and 320×844. Twenty screenshots; all five navigation links visible and trial-clickable, exactly one active item, no horizontal overflow, no page errors. Real Overview → Chat navigation succeeds at each width. Only the allowed Overview character introduction contains Chinese UI copy.
- Actual production components in a temporary local QA route with explicitly labelled synthetic browser responses: Chat, editor, Memories and Reflections at all four widths; sixteen screenshots, both Chat actions load, Chinese content retained, zero writes, no overflow/page errors. Temporary route removed before production build. These are not real AI or authenticated account tests.
- Real JournalTimeline with synthetic responses at all four widths: four screenshots, stable 101:71 fallback covers, no Private note placeholder, dividers between rows, working grid toggle, zero writes.
- Overview geometry checks at all four widths: seven lavender gradient circles, original sitting asset, notebook artwork separated from title/subtitle/privacy copy.

Screenshots are in workspace `visual-comparison/navigation-actions` (real public routes), `navigation-action-components` (labelled synthetic component views), and `navigation-covers` (labelled synthetic timeline).

## Boundaries and remaining limits

No database migration/reset, real record modification, attachment replacement, new registration/resend, AI prompt/API change or secret inspection. No new character assets are missing for this round’s two Chat actions. Real account/AI/save/revoke/reflection acceptance is still blocked by the previously documented email-confirmation issue. Uploaded journal photo recovery remains unproven: this checkout has no attachment field/upload pipeline. Default covers do not replace user data, and no original-photo recovery is claimed. Preview is local, not a public deployment.

## Changed files

- `src/components/navigation.tsx`, `src/app/page.tsx`, `src/app/overview.css`: shared menu, responsive/active states and scoped notebook spacing.
- `src/components/glass-companion.tsx`, `src/components/ui.tsx`, `src/components/core/ai.tsx`, `src/app/chat/page.tsx`, `src/app/reference-theme.css`: explicit poses and contained PNG rendering.
- `public/brand/xiaoqi-playing.png`, `public/brand/xiaoqi-reading.png`: supplied transparent assets.
- `tests/core/ai-components.test.tsx`: pose-path regression assertions alongside existing chat/draft behavior checks.
- This report and `docs/ENGLISH_UI_REFINEMENT.md`: current acceptance state.
