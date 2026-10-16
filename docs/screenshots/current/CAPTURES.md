# Current interface captures

These are browser screenshots, not rendered concept art. No screenshot contains private account information. No product source was changed for this documentation refresh.

Source main: `89a5e4c92bbcdedcefc66d13fa882db0fd832ef1` (merged PR #15).

| File | Capture scope | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| overview.png | Fresh local reference-demo page; fictional entries and photos; no persistence or AI calls | 1536 × 1024 | `525c352c0e0ba97167b91cce1a57376cb5346bb348ce40f3d3f191aabfe94170` |
| chat.png | Existing actual browser capture of production components in the temporary QA harness; explicit synthetic responses, not a signed-in account | 1536 × 1163 | `7818ecae0e782f774dad561de0539f8ef8245d4de4f454341c3a9481527b9b5d` |
| journal.png | Existing actual browser capture of production components in the temporary QA harness; explicit synthetic responses, not a signed-in account | 1536 × 1205 | `1467b23a0d8e5e31f192b5d1ab627c33e84d0e606a7c72e685b9961519bc1e54` |
| memories.png | Existing actual browser capture of production components in the temporary QA harness; explicit synthetic responses, not a signed-in account | 1536 × 1171 | `cf33f87647130315a0d9d1b979c87b28920a894bae4241aeb113f6886499761a` |
| reflections.png | Existing actual browser capture of production components in the temporary QA harness; explicit synthetic responses, not a signed-in account | 1536 × 1024 | `ef9ba06ea44a572339991fe6c87e8cba1cc1f5dd176e5cc0ec8d722beaaf341c` |

Overview was captured at a 1536 × 1024 viewport from the existing `/?demo=reference` route after confirming five navigation links and zero writes. The four component captures were taken during the PR #15 acceptance run, using the exact UI and supplied Playing/Reading assets now on main. Their visible synthetic-data labels are retained. The temporary QA route was removed before the product build and is not a current product route.

The Chat image shows the actual empty state, not a successful model response. The Journal draft, Memories timeline and Reflections choices contain synthetic Chinese text. The reference-demo photographs are supplied showcase assets, not user uploads; this checkout has no photo-upload feature. Connection indicators are render states, not service-health evidence.

The current README no longer embeds the old green UI screenshots. Historical files under `docs/screenshots` and technical/acceptance records elsewhere in `docs/` are retained.
