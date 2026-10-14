# MemoNest / Warm Liquid Glass — full-site delivery

Scope: continue the existing visual-redesign checkout. This warm system supersedes the earlier ice-blue system. Homepage, chat, journal writing, timeline, memory management, period review, detail, account and privacy layouts have now been redesigned. Existing record editor controls receive icons because the editor also appears inside the chat draft flow. No API, database, authentication or business-state changes.

## Materials and layers
- Champagne-apricot reading surface, peach/coral transition space, deep cocoa/rose character alcove.
- GlassSurface exposes reading / peach / dark materials. Existing Card wraps GlassSurface. Existing Button delegates to GlassButton, preserving its props and native semantics.
- Shared --glass-fill, --glass-rim and --glass-shadow: tint, reflective rim, directional highlight, inset thickness and suspended shadow. Blur is limited to surface boundaries, never animated.
- Navigation, bubbles, fields and dialogs use the same material and focus language. Fields and consent explanations use denser transmission for readability.
- Increased-contrast and unsupported-blur fallbacks. All motion respects prefers-reduced-motion.

## Typography and icons
- Self-hosted Smiley Sans: Chinese display headings. Noto Sans SC / DM Sans at medium weight: controls and reading. Cormorant Garamond italic: a short atmosphere line.
- Font licenses remain in public/fonts. No external runtime font request.
- Lucide icons use 1.8px strokes, 16–17px controls and 6–8px text gaps. Controls retain accessible names and at least 44px hit areas.
- Icons represent actual actions: paper plane send, sparkle AI draft/memory, bookmark selection, book record, link citations, calendar date, save, edit, trash, cancel and profile.

## Xiaoqi asset and motion
- Every instance now shares public/brand/xiaoqi-warm.webp (768px, 108340 bytes, alpha preserved). No randomized page-specific characters.
- Original source retained locally at public/brand/xiaoqi-warm-source.png (not included in the GitHub delivery); the runtime WebP is tracked. Generated once using the built-in image_gen tool; no API keys used. Sharp already present in the project compresses the asset; no dependency added.
- Next/Image supplies responsive versions. Brand mark and message avatar reuse the same asset.
- idle: 6s breathing; thinking: masked warm inner light; reply: restrained 650ms movement and 900ms ripple; welcome: 1.4s greeting then breathing.
- Animations use transforms/opacity; no continuous blur. Decorative character has empty alt and aria-hidden wrapper.

### Final generation prompt
Use case: stylized-concept. Asset type: one reusable transparent-background 3D mascot cutout for MemoNest website, not a UI mockup. Primary request: Xiaoqi, an original gentle liquid-glass cat, a small living droplet with naturally integrated rounded cat ears, plump continuous pear-shaped body, two subtle little feet and one curled transparent liquid tail on the right. Frontal slight three-quarter portrait, centered full body with clear space around silhouette. Expression: very small dark cocoa curved happy eyes, a tiny delicate mouth, no huge eyes. Material is physically convincing optically clear sculpted liquid glass with thickness, real volumetric refraction, see-through interior, polished curved surface, sharp studio softbox specular highlights, realistic Fresnel rim, champagne gold edges and restrained internal peach/coral/pearl-pink iridescent caustics. Glass is mostly colorless and transparent with just hints of warm peach, not opaque orange. High-end physically based 3D product render, luxurious clean brand mascot. Light from large softboxes overhead and left, gentle warm rim light. Very subtle 2-3 tiny bubbles inside, no drawn outlines, no illustrated strokes, no fur, no plush or plastic toy, no clothing, no accessories. One consistent adorable character, no additional characters. Actual transparent alpha background, no floor, no room, no circle, no pedestal, no lettering, no watermark, no UI. Rounded ears grow from body without seams. Keep design simple and identifiable at small size. Square composition.

## Browser evidence
- Homepage and anonymous chat screenshots: actual local routes served by existing project.
- Chat workspace screenshots: the actual ChatWorkspace component rendered in a temporary browser QA route. Synthetic text and explicit Playwright mock transport, clearly labeled as test conversation / not a real AI response. Not evidence of live model integration. No private record read or production authentication bypass.
- Test route removed before final production build.
- Desktop 1440px and mobile 390px captures in ../visual-comparison/final-warm. Layout checks also cover 320, 768 and 1024px.
- Browser checked consent gating, thinking/reply state, permission disclosure, local image loading, icon coverage, no horizontal overflow, reduced motion, and no script errors. Four font families confirmed loaded.
- Core tests: 21/21; server/AI tests: 33/33; core browser tests: 4/4. Lint, TypeScript and production Webpack build passed. UX browser tests: 38/38. Total existing regression checks: 96 passed.

## Delivery boundaries
Local checkout has no Git metadata and git is not on PATH. GitHub connector is used to submit reviewed source/assets to existing branch design/liquid-glass-20261015 and PR #15. No replacement project, new branch or duplicate PR. No merge and no README edits. The existing PR is updated without merging to main. Public deployment is pending identification and connection of the existing hosting project.


