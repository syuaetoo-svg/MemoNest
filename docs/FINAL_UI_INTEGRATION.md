# Reference UI integration — 2026-10-17

## Implemented

- Real Overview journal rows use a reusable, decorative paper/book cover, not a “Private note” placeholder. It is rendered only, never saved into entry data.
- Covers retain a 101:71 aspect ratio in list and grid layouts. List dividers are between rows. The legacy timeline rail is hidden only in Overview.
- Fixed a CSS specificity bug that hid the real journal filter/view toolbar.
- Memory space reserves space for its notebook artwork, including narrow layouts; permission copy remains unchanged.
- Restored soft lavender weekday gradients. Left reading cards use restrained matte translucency; the companion panel retains its existing glass layers.
- Global header uses Infinity + MemoNest. Corrected legacy warm styling for even timeline rows, memory controls, invalidated authorization, inactive memory text, and accessibility fallbacks.
- The confirmed Overview cat asset/pose is unchanged. No new mascot art was generated.

## Image investigation and boundaries

The current journal table (`supabase/migrations/202610110001_core.sql`), `journalFields`/entry contracts, editor and API have no photo/attachment field or upload/storage pipeline. The real Overview explicitly rendered an icon and “Private note”; the sea/desk images belong only to the explicitly labelled reference demo. This is evidence of a rendering placeholder and absent attachment support in this checkout, not evidence of a failed image request or storage denial.

No database, private records, storage objects or credentials were inspected or changed. Original uploaded images cannot be claimed restored without evidence of the version/location that stored them. Do not replace real attachments with the default art or add a migration to simulate recovery.

## Character assets

Available: supplied seated character and front/three-quarter/rear seated views in the supplied sheet. Missing dedicated matching actions: listening/head tilt/paw raise; holding or reading a notebook; holding a memory/photo; looking back. These need matching character artwork before use. None is required to alter the accepted Overview pose, and no new mascot placements were added.

## Verification

- ESLint and TypeScript: passed.
- Core tests: 23 passed; server/AI contracts: 38 passed. These are isolated/mocked checks, not a new real-account acceptance run.
- Production build: Next webpack build passed.
- Actual Edge: eight public/anonymous routes at 1536 desktop and 390 mobile, no overflow, no page errors, no old warm-cat resource; reduced-motion stops mascot animation. Reference page additionally checked at 320.
- Reference artboard measurements: main cards, nav, search, chat, composer and bubbles retain measured target bounds; photo x differs by 1px.
- Real `JournalTimeline` rendered in a temporary local QA route with explicitly labelled synthetic browser responses: 1536/390/320, stable cover ratio, clear dividers, visible toolbar/grid toggle, no “Private note”, no overflow, zero writes. Temporary route removed after capture; not shipped.
- Screenshots under workspace `visual-comparison/reference-fidelity`, `visual-comparison/resumed-reference`, and `visual-comparison/final-integration`. Synthetic screenshots are labelled and are not real user records.

## Still unverified

Original image attachment recovery is unproven because this checkout has no corresponding field/pipeline. Authenticated end-to-end flows remain subject to the previously documented email-confirmation blocker; this visual work does not claim successful login/AI/save/grant/revoke/review using a real session. No registration, email resend or migration was performed in this round. PR #15 remains open, not merged. Local preview is not a public deployment.
