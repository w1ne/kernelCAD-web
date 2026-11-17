# Preview ledger — 2026-11-15 (postage meter workstation and four service machines)

Lane PR #1406 was open and mergeable at round start (head `3160e5e41`); all completed CI checks had passed and `catalog-index` was pending. The only open PR that touches `catalog/kits/` (#1253) changes `city-street/mailbox`. None of the five assets below is named in a ledger under `artifacts/catalog-demos/`, in `docs/quality/`, or in a test under `tests/integration/catalog/` (`diesel-generator-set` appears only as a render command and a before-source copy from the 2026-11-09/10 industrial-plant rebuilds, not as a material review).

Selection: a source scan matched part names that imply a material (tyre, display/screen/window/lens, belt, hose, seal, paper) against the colour control each part uses. It found 95 name/control mismatches; most are acceptable (lens rims in metal, hose reels in elastomer). The five assets below are the industrial/service ones that had not been reviewed. The checked-in default preview of each one was opened.

| Asset | Triangles / budget | Source SHA-256 | Preview SHA-256 | Observation |
|---|---:|---|---|---|
| `postal-logistics/postage-meter-workstation` | 556 / 1,800 | `cd675812737ed55b1cb350c934fd7f9af7215e9d553f0b8e8c0549914d2f91a2` | `55ec04d304e69ebfeede9cb8882a6da8d3890dddb8cfe2767e6ed210745f7e0f` | **Material defect, corrected (see below).** The `paper-roll` part (the label-tape roll beside the meter, at the left of the counter in the preview) uses `paintedSteel` (`#617780`), so it reads as a dark steel stub. |
| `fire-station/scba-cylinder-fill-bank` | 252 / 1,800 | `1b7d7dbe3aff18942bfe1a0637838fda3b1497a7652ad80e53ceb51b31420a4f` | `792b5609683a131539f40925968411cdab449d9ee51944febc76b8219b1c57ed` | Minor: the `pressure-display` is a flat safety-yellow box (`signalColor`), not gauges or a screen. Silhouette: the fill bank shows no cylinders or fill whips; it reads as a red cabinet with four stainless ports. Not changed. |
| `grid-substation/substation-hydraulic-breaker-service-trolley` | 292 / 1,800 | `32bb489411d8e4118c5f53887ec9bbfd0606854b83764ecaa857e630f0699428` | `17c3a7c94db2592e603ab497b5b8a43cb4b0a031cfe260b6cd6de3e41ba34cf1` | No material defect: powder-coated chassis, rubber casters, stainless handle. Silhouette: the `hose-reel` is a painted box with no drum or hose, and all parts are plain `box`/`cylinder`. Not changed. |
| `fire-station/station-gear-tag-printer` | 176 / 1,800 | `039b5022143666543087397a6c81c25d2369eb0c9b43774d2c121f2ce5af4822` | `a2ace2afccb326a1d4a1ad597dc61b64f1cd781077b77b59f5add661c4fdefc0` | Minor: the `display` uses the safety-yellow `signalColor`, not a screen colour. The `tag-roll` is also safety yellow, which is plausible for gear tags. Not changed. |
| `industrial-plant/diesel-generator-set` | 564 / 1,800 | `1c393c6d47dffd38e0acbc29024e542f1747d4b0b01a6010a4ce5aa0b6d57283` | `0110d3e71efcb5984a44446043cb1a22d7beea1906444014f80c935b7ac55d0a` | No visible material defect: the `control-panel-display` and `exhaust-rain-cap` borrow the dark `radiatorCore` control, which renders as a plausible dark screen and cap. It is a control-naming issue only. Not changed. |

## Correction: postage meter workstation

A postage meter prints indicia on mail pieces or on self-adhesive label tape fed from a paper roll. The roll beside the meter is that label tape, so it must read as paper, not as painted steel. In this asset, `paintedSteel` also colours the countertop, display, scale platform and lower door, so the fix adds a new control and does not rename the old one.

- New control `labelPaper` ("Label tape paper", `#ece7da`). The `paper-roll` part uses it.
- `paintedSteel` (`#617780`) stays on `countertop`, `display`, `scale-platform` and `lower-door`.
- `weathered` preset: adds `labelPaper: '#d8cfb9'` (aged paper). `highVisibility` preset: adds `labelPaper: '#f3f1ea'`, so its safety orange no longer paints the paper roll.
- The meta description now lists "label tape paper". A source comment says why.
- Geometry, part names and the triangle count (556) are unchanged. `python3 scripts/checkCatalogQuality.py --kit postal-logistics`: 52/52 pass. `scripts/checkCatalogAsset.ts`: minUpM 0, 556 / 1,800 triangles.

Compatibility: the existing parameter keys are kept. A saved `paintedSteel` override still applies to the counter, display, platform and door; it no longer colours the paper roll.

Regression: `tests/integration/catalog/postageMeterPaperMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (the colour controls are `paintedSteel, polymer, structuralSteel, stainlessSteel`; see `verification/test-before.txt`) and passes after the fix. It also checks that the counter, display, platform and door keep `paintedSteel`, and that the cabinet, meter base and meter head keep their colours.

Source SHA-256 after: `789d1dfbaee36699141f3607c3b9a44176d5cc49264e76531f7777c3cc717f59`. Preview SHA-256 after: `a0d09218fbb4a8a3a2532d0fcdc869649cc8edff97fd618eacd71f350270de69`.

### Evidence

- Default catalog preview, before and after: `previews/{before,after}/postage-meter-workstation.png`. 712 pixels differ (difference > 8 on any channel), all inside the box x 156-190, y 148-175, which is the roll. Before, the roll is dark grey; after, it is off-white. The roll is small (95 mm long, 45 mm radius), so the change is small but clear in the preview.
- Inspection views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-{iso,front,right}.png`. The roll is visible in the front view (off-white after the fix) and is hidden behind the meter in the iso view. Both before and after views carry a `MECHANISM BROKEN · mechanism.interpenetration` badge. This comes from the existing geometry, not from this change.
- Review MP4 (21.1 s): `postage-meter-paper-roll-review.mp4`, built by `make_demo.sh`. Two decoded frames (before preview at 2 s, after preview at 19 s) were opened and read correctly.
- The other four default previews: `samples/`.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview.

## Defects noted but not changed in this round

- `postage-meter-workstation`: the `display` is also drawn in `paintedSteel`. It reads as a dark panel, which is acceptable for an off screen.
- `scba-cylinder-fill-bank`: no cylinders or fill whips; the display is a safety-yellow box.
- `substation-hydraulic-breaker-service-trolley`: the hose reel is a box with no drum or hose.
- `station-gear-tag-printer`: display drawn in the safety colour.
- `diesel-generator-set`: display and rain cap reuse the `radiatorCore` control.
- Carried over from the earlier 2026-11-15 ledger: `barcode-tunnel-scanner` belt still drawn in `paintedSteel`; `tray-induction-loader` display drawn in `paintedSteel`.
