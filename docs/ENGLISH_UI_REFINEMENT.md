# English-first UI refinement

This changes interface copy and visual hierarchy, not stored content, AI prompts, business API contracts or database structure.

## Delivered

- English interface copy across Overview, Chat, Journal/editor/detail, Memories, Reflections, account, email confirmation, privacy and relevant dialogs. The existing account page covers account controls; no settings page or new feature was added.
- Shared feedback presentation translates existing API error codes and validation messages. Server response contracts are unchanged. Sign-up feedback still distinguishes an accepted request from confirmed mail delivery or an authenticated session.
- Unified sans-serif title/section/card hierarchy, readable captions and English date formatting. Updated Tailwind inline tokens so utility borders/backgrounds do not retain the old warm palette.
- User entry titles/bodies, messages, AI replies, drafts, summaries, citations and historical data are rendered verbatim. The isolated reference demo retains its Chinese example content while its controls/disclosures are English.
- Existing covers, row dividers, notebook spacing, weekday gradients, glass materials and Infinity + MemoNest branding are retained.
- Removed the code-generated elliptical character ripple. Supplied pearl-white cat artwork and Overview pose are unchanged; only the existing very soft natural image/drop shadow remains.
- Removed the duplicate mascot from Chat’s central empty state. The left character is retained pending matching action artwork. This is **not** completion of the requested pose variations.

## Required matching character artwork — pending

Use the accepted Overview character as the model, preserving eyes, ears, proportions, tail and pearl-white material:

1. Chat profile: subtle head tilt and one front paw raised, listening.
2. Chat empty state: both paws holding a small pale-lavender journal, looking down.
3. Memories, where already used: looking at a photo or holding a memory card.
4. Reflections, where already used: looking back or holding a notebook.

Available assets are seated front/three-quarter/rear views, not these actions. No substitute was generated, mirrored, rotated or represented as a new pose. Pose work waits for matching supplied/confirmed artwork.

## Verification

- ESLint, TypeScript and webpack production build passed.
- Existing core suite: 23 passed, including consent, recovery, draft/save, permission revoke and session isolation. UI selectors were updated to the new English copy, while Chinese input and AI reply fixtures remain Chinese and are asserted unchanged.
- Existing server/AI contracts: 38 passed; these use isolated/mocked transport and are not evidence of a real account AI call.
- Actual Edge: eight public/anonymous routes at 1536 desktop and 390 mobile; no horizontal overflow, page errors or old warm-cat requests. Reduced motion disables character animation.
- Production Chat, Journal, Memories and Reflections components additionally checked at 1536/390/320 in a temporary local QA route using explicitly labelled synthetic browser responses: 12 captures, no overflow, no character ripple, no duplicate Chat empty-state mascot, Chinese input/entry text retained, zero writes. Temporary QA route removed; not shipped.
- Screenshots: workspace `visual-comparison/english-first` (synthetic component views) and `visual-comparison/resumed-reference` (actual public/anonymous pages). Synthetic images are labelled and do not represent real user data or real AI responses.

## Remaining limits

Character action replacements are pending matching assets. Previously documented email-confirmation and original-image-recovery blockers remain; no new registration, resend, migration, private-data inspection or authenticated end-to-end run was performed. Local preview is not a public deployment. PR #15 remains open and unmerged.
