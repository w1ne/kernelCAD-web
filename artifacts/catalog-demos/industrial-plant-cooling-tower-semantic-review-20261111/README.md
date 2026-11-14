# Industrial-plant cooling-tower semantic review

**Date:** 2026-11-11
**Asset:** `industrial-plant/evaporative-cooling-tower`
**Change:** Make the two rooftop axial fan rotors visible inside raised shrouds.

## Finding

The before preview showed two raised hubs on the fan deck but no rotor blades,
even though the source described a rooftop fan assembly. The revised scene has
two open shrouds and four broad, separately named blades per fan. A new
`fanBlades` material control separates the blades from the steel and safety
paint, and both existing presets set it. The asset ID and 1,400-triangle budget
are unchanged; the new default preview is **648 triangles**.

| Before | After |
| --- | --- |
| [Rendered preview](previews/before/evaporative-cooling-tower.png) | [Rendered preview](previews/after.png) |

The [five-preview ledger](preview-review.md) records all reviewed assets, the
open-work exclusions, and the four unchanged decisions. It includes the
[before contact sheet](preview-review/contact-sheet-before.png), source
snapshots, and before hashes. Dated official manufacturer comparisons are
retained privately in `kernelCAD-private/docs/competitors/2026-11-11-industrial-cooling-tower-semantic-review.md`.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts evaporative-cooling-tower
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/evaporativeCoolingTowerFidelity.test.ts
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/evaporativeCoolingTowerFidelity.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
bash artifacts/catalog-demos/industrial-plant-cooling-tower-semantic-review-20261111/build-demo.sh
```

The regression reads the exported GLB and checks two hubs, two shrouds, eight
blade bodies, their measured radial reach and height, the material palette,
both presets, ground origin, and triangle budget. The short [MP4](demo.mp4)
compares local software-rendered previews. Its [settings](demo-settings.json),
[capture script](build-demo.sh), [video probe](video-review/video-inspection.json)
and inspected [before](video-review/before-frame.png) / [after](video-review/after-frame.png)
frames are included.

## Verification

The complete catalog integration suite passed: **17 files, 32 tests**. The
focused geometry test passed, and targeted ESLint returned clean. The fresh
index regeneration wrote only the generated index; its changed row has the new
source SHA, preview path, 648-triangle stat, palette and presets. Logs, hashes,
quality results and page-build evidence are recorded in `verification/`.
PR #1258 was green before this correction at `fcadcba8e`; its review list was
empty. This branch is not deployed. The current live source and PNG still match
the pre-edit versions. The local source replay and preview do not establish
deployed behavior, thermal performance, vendor fidelity or physical acceptance.

The structural gate reports **60/60** for industrial-plant and
**2,401/2,402 (99.96%)** catalog-wide; the one unrelated finding is
`standard-components/beam-coupling`. These counts describe the mechanical gate,
not semantic realism. The local page build generated 2,402 asset pages and the
changed detail page shows the new material control, presets, triangle count,
and copied preview.
