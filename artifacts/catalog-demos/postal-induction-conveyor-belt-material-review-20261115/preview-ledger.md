# Preview ledger — 2026-11-15 (postal-logistics conveyors and handling equipment)

Lane PR #1406 was open and mergeable at round start, and all its CI checks had passed. No open PR touches the five assets below; the only open PR that touches `catalog/kits/` (#1253) changes `city-street/mailbox`. An open-issue search for "induction conveyor" returned nothing. None of the five assets is named in any ledger under `artifacts/catalog-demos/`, in `docs/quality/`, or in any test under `tests/integration/catalog/`. The only earlier mentions of `package-induction-conveyor` are in bulk manifests (npm pack listing, live-baseline `assets.json`, the 2026-11-05 postal-logistics promotion audit).

`postal-logistics` had one earlier material review per asset before this round (crossbelt sorter belt, sliding-shoe sorter rail). A source scan listed each part name with its colour control. Five machines were then selected, and the checked-in default preview of each was opened.

| Asset | Triangles / budget | Source SHA-256 | Preview SHA-256 | Observation |
|---|---:|---|---|---|
| `postal-logistics/package-induction-conveyor` | 800 / 1,800 | `2abb2df7304e2d639a2f445230f81cc6e5ea2720a81d3d32605266a9011f6eb7` | `045a0ac63c85b6f0ccada7791eeb2d41300edd53fedb78384a02b5124bb22ad4` | **Material defect, corrected (see below).** The `belt` part, the largest surface in the preview, uses the `paintedSteel` control (`#52758b`), so the belt reads as a blue painted steel sheet. |
| `postal-logistics/barcode-tunnel-scanner` | 720 / 1,800 | `7ea82dedc243ee10dda125922d5a702fcf0cef72f764ba94b82e4be65992972d` | `cc0c2dd46b548836fc79c1d3d4680da18dce006e2d27fb8e08c27c8f67706c3d` | Same source defect: `belt` uses `paintedSteel`. Not fixed here, because `paintedSteel` also colours the arch; a fix needs a new control, not a rename. The defect is not visible in the preview: the belt is inside the closed box, and the "open-sided tunnel" in the description reads as a closed cabinet on legs. |
| `postal-logistics/parcel-belt-diverter` | 828 / 1,800 | `4308ca1c1066b274f45ccb95b4b3ef60c5a9e37e7c7e471f14c271244e36cc97` | `509711143c8f5dc631cca52b116a12a24acabccd72f4748028de5e76251eba00` | Same source defect: `belt` uses `paintedSteel`, which also colours the side walls, pusher arm and paddle. Not fixed in this round (one fix per round); a candidate for the next round. |
| `postal-logistics/handheld-postal-scanner` | 540 / 1,800 | `b25d137caf1bceaf0c03794de33f3ac8dc9f4e0e03fe1a14c13c4fb59772a09b` | `2fe279085ce99bb1a02e208fc45c54d48f7a595ea47453b7052b3b367e009754` | Material: the `handle` uses `paintedSteel`; rugged scanners have moulded polymer grips. This is minor, because the asset has no polymer control. Geometry defect (more serious): the handle, the handle end and the head are three disconnected blocks; the handle floats below the head, so the asset does not read as a pistol-grip scanner. |
| `postal-logistics/postal-sack-loader` | 724 / 1,800 | `79d3377a8bbd063d5e1987d11f46d692ec7f513ce2e83548ee6086cc2fcd42d0` | `410f7183c19268d97a07cf09126031a277dc9204863e8c635ba34c30c64eabbb` | No clear material defect. The `wheel-front` is a painted steel roller, which is plausible for a stand-mounted transport roller. Geometry: the described "low roller deck" shows no rollers in the preview, and the single front wheel is mostly hidden inside the base plate. |

## Correction: package induction conveyor

An induction conveyor feeds parcels to a sorter on a belt with a PVC or rubber carcass, running over idler rollers between steel side rails. A painted blue steel sheet is a slider bed or a table, not a belt. In this asset, `paintedSteel` was used only by `belt`.

- The `paintedSteel` control is replaced by `beltRubber` ("Belt rubber", `#2c3134`). The `belt` uses it.
- `weathered` preset: `beltRubber: '#3d4140'` (it set `paintedSteel: '#68777a'`).
- `highVisibility` preset: it painted the belt safety orange and darkened the frame. It now paints the frame (`structuralSteel`, side rails and legs) `#e36d32` and keeps `stainlessSteel: '#d9e0de'`. A safety-orange frame with a dark belt is a common high-visibility scheme; an orange belt surface is not.
- The meta description now lists "belt rubber". A source comment says why.
- `structuralSteel`, `stainlessSteel` defaults, geometry, part names and triangle count (800) are unchanged. `python3 scripts/checkCatalogQuality.py --kit postal-logistics`: 52/52 pass.

Compatibility: the parameter key changes from `paintedSteel` to `beltRubber`. A saved override of `paintedSteel` on this asset no longer applies; the belt then takes the new default.

Regression: `tests/integration/catalog/inductionConveyorBeltMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (the colour controls are `paintedSteel, structuralSteel, stainlessSteel`; see `verification/test-before.txt`) and passes after the fix. It also checks that the rails and legs keep `structuralSteel` and the rollers keep `stainlessSteel`.

Source SHA-256 after: `793752fd50f3d663fca92148c8826f1d588c77055dfd3abc575bb70c8852b7e7`. Preview SHA-256 after: `239e53825963964cdad4e6baa54350fd9e59a5dc5efadc7728406626f7cadbe9`.

### Evidence

- Default catalog preview, before and after: `previews/{before,after}/package-induction-conveyor.png`. 17,710 pixels differ (difference > 8 on any channel), all inside the box x 101-411, y 73-217, which is the belt. Before, the belt is blue; after, it is near-black.
- Inspection views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-{iso,front,right}.png`.
- Review MP4 (21.1 s): `induction-conveyor-belt-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before iso at 4.5 s, after iso at 15 s) were opened and read correctly.
- The other four default previews: `samples/`.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview.

## Defects noted but not changed in this round

- `package-induction-conveyor` geometry: the five "roller rows" sit on top of the belt surface (z 790 mm, belt top at 790 mm), so they read as bars across the belt, not as rollers under it.
- `barcode-tunnel-scanner` and `parcel-belt-diverter`: belt drawn in `paintedSteel` (see table).
- `handheld-postal-scanner`: disconnected handle; `postal-sack-loader`: no visible rollers.
