# MemoNest reference measurement — 1536 × 1024

Source: codex-clipboard-203c1aae-f04f-4002-9996-bfb734903cd1.png.
Coordinates below are measured from the supplied raster; typeface identity, blur and opacity are estimates, not source design tokens. Rectangles use x / y / width / height in CSS pixels at device scale 1.

| Element | Reference bounds | Notes |
|---|---|---|
| Logo icon | 60 / 43 / 47 / 26 | Thin dark infinity-like mark |
| Wordmark | 122 / 44 / 114 / 28 | 24px regular, near #272730 |
| Navigation | 498 / 30 / 508 / 52 | Radius 28; active inset 9 / 7, white 117 × 38 |
| Search | 1141 / 30 / 268 / 52 | Radius 27; 16px muted placeholder |
| Avatar | 1433 / 30 / 52 / 52 | Circular landscape image; source absent |
| Date | 60 / 135 / 190 / 15 | 12px uppercase; tracking about 2.2px |
| H1 | 60 / 164 / 650 / 54 | Approx. 44px regular; near #292930 |
| New entry | 813 / 159 / 155 / 50 | Radius 26; 16px; charcoal fill |
| Your moments panel | 58 / 249 / 911 / 491 | Radius 23; white translucent surface |
| Section title | 91 / 278 / 210 / 38 | Approx. 30px regular |
| Filters | 93 / 328 / 374 / 50 | All entries / This week / Saved; 16px |
| View switch | 839 / 277 / 97 / 49 | Two actual 44px targets; list and grid |
| First photo | 92 / 396 / 202 / 141 | Radius 18; sea sunset; source absent |
| First text | 324 / 415 / 563 / 98 | Date 16px; title 23px; body 18px, line 28 |
| Divider | 92 / 554 / 843 / 1 | Very pale cool gray |
| Second photo | 92 / 568 / 202 / 146 | Radius 18; sunlit desk; source absent |
| Second text | 324 / 585 / 563 / 121 | Chinese content remains Chinese |
| Row menus | 895 / 410 / 32 / 44; 895 / 582 / 32 / 44 | Ellipsis buttons, accessible names |
| Week panel | 58 / 760 / 461 / 192 | Radius 22; title 21px at 91 / 789 |
| Memory panel | 535 / 760 / 434 / 192 | Radius 22; title 21px at 568 / 789 |
| Week circles | y845, each 40 × 40 | Centers approx. 110, 167, 224, 282, 340, 397, 454 |
| Notebook object | 805 / 789 / 126 / 139 | Translucent lavender notebook; source absent |
| Memory toggle | 568 / 888 / 51 / 28 | Demo-only; never a real global permission switch |
| Chat front | 1000 / 188 / 484 / 754 | Radius 28; no internal scrollbar |
| Chat folder tab | 1000 / 154 / 274 / 60 | Rounded stepped upper edge, not a separate opaque rectangle |
| Chat back layers | approx. 1068 / 130 / 338 / 810; 1030 / 225 / 470 / 739 | Small offsets/rotations, faint white rims |
| Chat heading | 1036 / 202 / 240 / 60 | Title 25px; status 17px and 11px lavender dot |
| Chat menu | 1412 / 219 / 46 / 44 | Rounded translucent square |
| Cat visible silhouette | 1298 / 311 / 158 / 187 | Front three-quarter, right tail; milky pearl white, tiny open black eyes, no visible mouth. Soft purple/pink reflections, short separate paws, modest head/body ratio. About 1/3 panel width. No matching independent asset exists. |
| AI bubble | 1026 / 503 / 241 / 89 | 18px / 28px; soft white; tiny lower-left tail |
| User bubble | 1228 / 610 / 230 / 68 | 18px Chinese; pale lavender; lower-right tail |
| Timestamp | 1399 / 690 / 49 / 15 | 12px muted lavender |
| Composer | 1022 / 829 / 441 / 88 | Radius 34; text 18px; send circle 60px at 1384 / 845 |

## Material estimates

- Canvas #FAF9FC, nearly white upper-left; extremely faint pearl pink and lavender below right. Avoid saturated/full-page lavender.
- Reading panels approximately 45–70% white with 18–24px backdrop blur, 1px white rim and a diffuse shadow around 0 16px 40px rgba(100,90,120,.06).
- Chat approximately 25–50% white over a low-saturation gray/lavender environment; bottom diffuse pink-purple light, not opaque solid fill. Back layers must sit behind the front, without diagonal lines crossing foreground content.
- Reading text near #292930; body #7b7e8d; tertiary #a1a0ae. Regular modern sans. Existing self-hosted DM Sans + Noto Sans SC can approximate but are not a verified match to the raster's font.
- First implementation must be captured and geometrically checked against these bounds, then corrected. No always-visible internal scrollbar.

## Assets and data boundaries

Only xiaoqi-warm.webp and its source PNG exist in public/brand. It is a closed-eye clear-glass cat and is prohibited for this target. Remove it from this homepage, do not replace with SVG/emoji/unrelated 3D cat.

Missing source assets: transparent-background matching cat (ideally at least 512px high), original sea photograph, sunlit desk photograph, transparent notebook, and landscape avatar if exact avatar fidelity is required. Do not invent substitute photographs or claim placeholders match the reference.

An explicit ?demo=reference view may render the reference's fictional Chinese records, chat and demo controls, clearly labeled as demo and kept entirely in component state. It must never invoke persistence/AI or modify permissions. Default / keeps actual auth, API-backed components and existing empty states.

## Actual browser verification

Second comparison at 1536 × 1024, scale 1: navigation, search, moments, lower cards, chat, both bubbles and composer match the recorded target rectangles. Photo placeholder left edge differs by 1px. This is geometry evidence, not a claim of identical pixels: photographs, cat, notebook and avatar sources are missing; font identity is unverified.

Actual Edge screenshots retained locally in visual-comparison/reference-fidelity. Desktop reference-demo and default real empty state captured, plus mobile 390/320. No horizontal overflow or page errors. Tested demo filters, list/grid switch, local privacy switch and message input; zero POST requests. Default homepage retains auth-backed components/empty states; journal navigation and removal of homepage-only CSS on the journal route verified.

ESLint and TypeScript passed. Existing core suite: 21 passed. No live authenticated account or real AI call was exercised. No production database operation or migration performed. Missing assets are explicitly labeled and no unrelated substitute imagery is included.
