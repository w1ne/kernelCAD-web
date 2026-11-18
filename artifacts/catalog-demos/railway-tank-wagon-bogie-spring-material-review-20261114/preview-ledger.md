# Five-preview ledger — 2026-11-14 (railway)

PR #1258 was open at baseline head `56913987d`. At baseline, 14 of 16 reported checks had passed and `catalog-index` and `test-shard (3)` were still running; none had failed. No earlier ledger under `artifacts/catalog-demos/` or report under `docs/quality/` names any `railway` asset. Open-issue search for `railway` and open-PR search for `tank-wagon` returned no results. Merged PRs #1298, #1305, #1307 and #1308 touch other assets.

All five checked-in default previews were opened (`samples/`, `previews/before/tank-wagon.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `railway/tank-wagon` | 4,902 / 6,500 | `4d2e8c1ac6c7425119b0834fd849559d4f588cba9ed4b9007ed0d6b224b522a8` | `3b8cedf39f34b217cc2e28bfc3c8e0985ec9650f6891b05611bda75a35e160d6` | **Material defect, corrected.** The 12 `spring-*` parts are the coil-spring nests in the bolster window of the two three-piece freight bogies. They used `stainlessSteel`, the control labelled "Stainless fittings", so they rendered bright silver (`#b8c1c2`) between the dark side frames and followed every fittings colour change. Freight-bogie springs are carbon spring steel and belong to the running gear. The focused `render inspect` view shows them (`previews/before/inspect-bogie-*.png`). Recorded, not corrected: the inspector reports `mechanism.interpenetration` on the bogie (badge present before and after). |
| `railway/hopper-wagon` | 272 / 1,800 | `581cf3e4655e162f5ad25372d910f41d6239935a22145d5133c7f6d7c49d8e08` | `b6b91b303836d695f5960f39d6fe1d7270032e2fb8386e792f3101d4dfc39cea` | **Geometry defect, recorded and not corrected.** All four wheels are at `y = -165`; the far side has no wheels. The 330 mm deep rectangular body hides the sloped bays, so the silhouette reads as a boxcar, not a hopper. Materials are coherent with the controls. Needs a geometry round, not a material fix. |
| `railway/buffer-stop` | 184 / 1,800 | `d06837547ca77d2616288f403fc5536bc08cbe31bd2934d319c94709cb940789` | `f47730747be45c871ee3fc830c30303277e9c9a8ce93a07f79985feb46dd7870` | Reads as a buffer stop: rails on concrete sleepers, two posts, crossbeam and two buffer pads. Pads use `rubber`; many buffer stops use sprung steel heads, but elastomer pads also exist. Not counted as a defect. |
| `railway/track-switch-lever` | 136 / 1,800 | `cb601c360ca71b2b5d12f3680e404eb743cdd348d85c5db974e5ed8cf38dd033` | `7ceb2d06e09be1d54a995fbd7676bfa6e269f406f2ccae28debff47b66fb0fe9` | Reads as a ground lever on a base with a rubber grip, counterweight and connecting rod. Materials are coherent. No defect recorded. |
| `railway/inspection-trolley` | 248 / 1,800 | `c5e99f2d31d8aeddefbacecd4145494a980fcc737073c39519bfa50872cedb07` | `f52179c51bcdb29be98115001f94377d5ae928b4abddc8cc224c6e6c3385e05c` | Reads as a small four-wheel trolley with a timber seat, tool box and handlebar. The whole handlebar uses `rubber`; a real bar is steel with rubber grips at the ends. Minor; not corrected in this round. Wheels are flat discs without flanges. |

## Correction

Only `tank-wagon` is changed. The 12 `spring-*` parts now use `railSteel`, the "Rail and running gear steel" control already used by the side frames, bolsters and wheels. Geometry, part names, triangle count (4,902), all four colour controls and the three presets are unchanged. Manway, valves, ladders, railings and placard boards keep `stainlessSteel`.

Regression: `tests/integration/catalog/tankWagonBogieSpringMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (`spring-a--1--180` not in the `railSteel` zone) and passes after the fix.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/tank-wagon.png`. 137 pixels differ (difference > 8 on any channel), all inside the bogie area (bounding box x 134-406, y 233-312). The white spring patches on both bogies become dark running-gear steel. Enlarged crops: `previews/{before,after}/tank-wagon-bogie-crop.png`.
- Focused views from `npx kernelcad render inspect catalog/kits/railway/tank-wagon.kcad.ts <out> --focus <bogie a springs, side frames, wheels, bolster>`: `previews/{before,after}/inspect-bogie-{front,iso}.png`.
- Review MP4 (21 s): `railway-tank-wagon-bogie-spring-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before focused bogie view, after default preview) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- `railway/hopper-wagon` needs far-side wheels and a hopper silhouette.
- Check the other railway wagons (`freight-boxcar`, `flatbed-wagon`, `lumber-wagon`) for one-sided wheel sets.
