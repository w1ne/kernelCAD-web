# Five-preview ledger — 2026-11-15 (mining shaft, crushing and conveying equipment)

Lane PR #1406 was open at round start. Its CI checks had passed, and only `catalog-index` was still pending. Selection: `mining` has 50 assets, and 21 of them are named in an earlier ledger or test. The five assets below are not named in any ledger under `artifacts/catalog-demos/`, in `docs/quality/asset-semantic-ledger-2026-11-10.json`, or in any test under `tests/integration/catalog/`. No open PR or issue touches them. The history of `shaft-headframe` is the original wave (#1224), the quality promotion `9c2869764` and the rebuild `8c52d4602`.

All five checked-in default previews were opened (`samples/`, `previews/before/shaft-headframe.png`), and the colour assignment of each part in each source was read.

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `mining/shaft-headframe` | 3,564 / 4,500 | `947fbbbf8b860cba78fadb567b9c908e7d50ba712c0e5611ef90bfca63c79c69` | `153a5614a6e252dd8300d65551987390701aa424c14b6ff136b4f4575213888d` | **Material defect, corrected.** `skip-body` is the ore skip, a welded steel bucket hoisted in the shaft. It used `cladding`, the control labelled "Cage and winder-house cladding" (`#d9cfb8`). The skip rendered in the same cream as the winder-house walls. With the `highVisibility` preset, the skip turned the safety orange of the building cladding. Its own bail (`skip-bail`) and the cage crosshead already used `structuralSteel`. |
| `mining/impact-crusher-module` | 3,574 / 4,200 | `a703d44f20dee9d8eeabe0cf3f850a8f589c19ff5901d43a1942135228f7add1` | `98895344f9f0f30500c349b7abcbd2369322126e5d98781f96aa5e50452945fc` | No clear material defect. Orange crusher coating on housing and hood; dark module steel; manganese blow bars; rubber V-belts and conveyor belt. Minor: `motor-body` and its fins use the crusher coating (a plant-matched paint is plausible), and `motor-shaft` uses the `manganeseSteel` "wear parts" control although a motor shaft is not a wear part. The shaft is almost hidden between the sheave and the motor. |
| `mining/tailings-filter-press` | 3,180 / 3,800 | `fda14597914dbee8c78cca72b0ba23766b0cb11d80a034a00097304144f625c5` | `669e00a7de6edab1d27b23b85f242cdaed5f746fb1def2a1107c921d8714ad50` | No material defect. Blue coated heads, side bars and closing cylinder; chrome ram and side-bar rails; grey polypropylene plates; steel structure and walkways; concrete cake bay with cake piles. The `feed-pipe` uses rubber, which matches a rubber-lined slurry line. |
| `mining/conveyor-take-up-station` | 2,864 / 4,400 | `b7bde6018570895a3c1c472192677f042ad90d45e8ec5f7702db5b3aa5e43be9` | `cf0c9d86610b691fca697d6a12f635c670abd0976a56d720f6bc95ea1776dbd1` | No material defect. Grey frame steel tower and guide rails; green painted pulleys, carriage and return idlers; black belt; concrete counterweight in a steel frame; yellow ladder, handrails and fence. |
| `mining/crusher-transfer-chute` | 3,716 / 4,200 | `8636c28ac8c883aef874a5af4ffb6e67b2c6790c1dfb3e664c2a609253add356` | `cff6292d3a5357cb2f60fb2acc950dd34dab52e1166d2b3df082fe1309111a12` | No material defect. Orange chute paint on hood, chute, spoon, doors and dust duct; light wear liners; dark frame steel tower and stringers; black belts; blue head motor; yellow rails and ladder. |

## Correction

Only `shaft-headframe` is changed. `skip-body` now uses `structuralSteel` (`#3f6e7a`, "Headframe steel"), the same control as its bail. The cage body and the winder-house walls keep `cladding`, which is what the control label names. The four colour controls, their defaults and the three presets are unchanged. Geometry, part names and triangle count (3,564) are unchanged. A source comment now says the skip is painted steel. `scripts/checkCatalogQuality.py --kit mining`: 50/50 pass.

Regression: `tests/integration/catalog/shaftHeadframeSkipMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (`skip-body should be headframe steel`, see `verification/test-before.txt`) and passes after the fix.

Source SHA-256 after: `cd95c5be55c08260432c06e779da7000ba2d0c23f00632a6fbc2c109332a2727`. Preview SHA-256 after: `8087d54f7feba1a46234a4c1dc8c527947b6cc1feac4f5eb552180cb576cce28`.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/shaft-headframe.png`. 774 pixels differ (difference > 8 on any channel), all inside the skip region (bounding box x 96-117, y 197-244). Enlarged crops: `previews/{before,after}/skip-crop.png`. Before, the skip shows as a cream box inside the tower; after, it shows as a steel box with its bail.
- Inspection views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-front.png`, and `previews/before/inspect-focus-iso.png` (`--focus skip-body,skip-bail,cage-body`), which shows the skip in the same cream as the cage. The inspector reports `mechanism.interpenetration` both before and after; this change does not affect it.
- Review MP4 (24.6 s): `shaft-headframe-skip-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after inspect front at 15 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Defects noted but not changed in this round

- `shaft-headframe`: the caged ladder (`ladder-stile-*`, `ladder-rung-*`, `ladder-hoop-*`) and the sheave-deck handrails also use `cladding`. They are steel, so with `highVisibility` they turn the building's orange. This is a second part role; it is left for a later round so that this change stays one defect.
- `impact-crusher-module`: `motor-shaft` uses the manganese wear-parts control.
