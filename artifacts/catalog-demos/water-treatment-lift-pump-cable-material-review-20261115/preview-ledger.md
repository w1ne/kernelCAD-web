# Preview ledger — 2026-11-15 (submersible lift station pump and four service machines)

Lane PR #1406 was open and mergeable at round start (head `ed3c66428`). All completed CI checks had passed; `catalog-index` and `test-shard (3)` were still running. The only open PR that touches `catalog/kits/` (#1253) changes `city-street/mailbox`. None of the five assets below is named in a ledger under `artifacts/catalog-demos/`, in `docs/quality/`, or in a test under `tests/integration/catalog/`.

Selection: a source scan matched part names that imply a material (belt, tyre, wheel, hose, cable, screen, display, window, paper, roll, seal, pad) against a steel colour control. Assets already named in an earlier ledger were removed. Most of the 43 remaining hits are correct (railway wheels and conveyor rollers are steel). The five assets below are the industrial/service ones with a possible mismatch. The checked-in default preview of each one was opened.

| Asset | Triangles / budget | Source SHA-256 | Preview SHA-256 | Observation |
|---|---:|---|---|---|
| `water-treatment/submersible-lift-station-pump` | 368 / 2,200 | `3454bd0b5fc6903cfd9368baa8bed695d9d43a4d4eabf3515694372d91a07dec` | `aae47fd4ae348ea491bb4d85c221647bf2feeadcdeadf278ad836a9125ed77c4` | **Material defect, corrected (see below).** The `cable` part (the power cable tail above the pump head) uses `coatedSteel` (`#3d8589`). In the preview it merges with the right lifting handle into one teal "L" and reads as a steel rod or antenna. |
| `airfield/lavatory-service-truck` | 324 / 1,800 | `5a636b17ce37c215a6056cd12988321a74d19c7c71c6a2428f80e5a97c8e4aad` | `aec8f5e24f4f7396471c1dee934acd5510106691221b0e92eb08c3e4814de49e` | Minor material issue: the `rear-hose` uses `stainlessSteel`; a waste-service hose is rubber or PVC, and the asset already has a `rubber` control. Larger defects: the hose floats in the air behind the deck, and the overall size is 0.50 × 0.25 × 0.24 m (a truck at about 1:15 scale). Not changed. |
| `postal-logistics/postal-label-printer` | 556 / 1,800 | `79026dec2d6369d365f169917f21d4ae83690e62c0ccb277a18538fa1c120c5b` | `35c4fe0334fd6b2c2bbfc9c762e2b6623e6b114fd4bab900b3c0794665f89e7f` | Minor: the `feed-roll` (label stock) uses `stainlessSteel` and floats above the lid with no support. Same class of defect as the postage meter roll fixed earlier today. Not changed. |
| `postal-logistics/sorting-operator-console` | 720 / 1,800 | `3071c4c2806b1115937927b5887073ddd81094c21ee754378b4925fe491fa327` | `062aab8c75a0d551fbf6f3b9c845c9ba613811770c90db10d2338023e3c5a020` | No material defect: screens use `instrumentGlass`, stands use `structuralSteel`. The keypad uses `paintedSteel`, which is plausible for a steel key plate. Silhouette reads as a console with two monitors and a stack light. Not changed. |
| `shipyard/grit-recovery-hopper` | 336 / 1,800 | `d93f55a6d1948185ac99467d63eb4af68041ba2a56429102899dc593e70ea439` | `5878ff7d7d576158508f7df04fda6d73c1c128a3c6f2d63ce279b1880b5139fb` | No material defect: `screen-deck` is painted (`yardPaint`) with steel ribs, which matches a grizzly screen over a painted hopper. Silhouette reads as a tapered hopper. Not changed. |

## Correction: submersible lift station pump

A submersible lift station pump is lowered into the wet well on guide rails and is fed by a flexible power cable with a black rubber (or PVC) jacket. The cable is not a steel part. In this asset, `coatedSteel` also colours the motor body, pump head, lifting handles and intake slots, so the fix adds a new control and does not rename the old one.

- New control `cableJacket` ("Rubber cable jacket", `#23282b`). The `cable` part uses it.
- `coatedSteel` (`#3d8589`) stays on `motor-body`, `pump-head`, `handle-left`, `handle-right` and `intake-slot-0..5`. `structuralSteel` stays on `intake-base`.
- `weathered` preset: adds `cableJacket: '#33383a'` (faded jacket). `highVisibility` preset: adds `cableJacket: '#1d2124'`, so its safety orange no longer paints the cable.
- The meta description now lists "rubber cable jacket". A source comment says why.
- Geometry, part names and the triangle count (368) are unchanged. `python3 scripts/checkCatalogQuality.py --kit water-treatment`: 50/50 pass. `scripts/checkCatalogAsset.ts`: minUpM 0, 368 / 2,200 triangles.

Compatibility: the existing parameter keys are kept. A saved `coatedSteel` override still applies to the pump body, head, handles and intake; it no longer colours the cable.

Regression: `tests/integration/catalog/liftPumpCableMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (the colour controls are `coatedSteel, structuralSteel`; see `verification/test-before.txt`) and passes after the fix. It also checks that the motor body, pump head, both handles and an intake slot keep `coatedSteel`, and that the intake base keeps `structuralSteel`.

Source SHA-256 after: `e1c98ba27c167e0efdb8532d51554806436fa563d5825119c5283b42c3fd864d`. Preview SHA-256 after: `9e86f2ffedc62810f95978051543db679022ade8b40a3cf5564fc9439310b2aa`.

### Evidence

- Default catalog preview, before and after: `previews/{before,after}/submersible-lift-station-pump.png`. 1,509 pixels differ (difference > 8 on any channel), all inside the box x 282-298, y 51-159, which is the cable. Before, the cable is teal like the handle beside it; after, it is near-black and reads as a separate cable.
- Inspection views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-{iso,front,right}.png`. The cable is visible in the front view (grey-black after the fix). Both before and after views carry a `MECHANISM BROKEN · mechanism.interpenetration` badge. This comes from the existing geometry (handles and cable overlap the pump head), not from this change.
- Review MP4 (21.1 s): `lift-pump-cable-review.mp4`, built by `make_demo.sh`. Two decoded frames (before preview at 2 s, after preview at 19 s) were opened and read correctly.
- The other four default previews: `samples/`.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview.

## Defects noted but not changed in this round

- `submersible-lift-station-pump`: the cable is a straight 300 mm vertical bar from the head, not a slack cable; there is no guide-rail claw or discharge elbow.
- `lavatory-service-truck`: the rear hose is stainless and floats behind the deck; the model is about 0.5 m long.
- `postal-label-printer`: the label feed roll is stainless and floats above the lid.
- Carried over from earlier 2026-11-15 ledgers: `barcode-tunnel-scanner` belt still drawn in `paintedSteel`; `tray-induction-loader` display drawn in `paintedSteel`; `scba-cylinder-fill-bank` has no cylinders.
