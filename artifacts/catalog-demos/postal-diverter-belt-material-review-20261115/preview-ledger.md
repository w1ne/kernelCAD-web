# Preview ledger — 2026-11-15 (postal-logistics diverter and four conveyor-side machines)

Lane PR #1406 was open and mergeable at round start (head `032b6243f`), and all its CI checks had passed. The only open PR that touches `catalog/kits/` (#1253) changes `city-street/mailbox`. The 2026-11-15 induction-conveyor ledger named `parcel-belt-diverter` as the next candidate, but no open issue or PR targets it. The other four assets below are not named in any ledger under `artifacts/catalog-demos/`, in `docs/quality/`, or in any test under `tests/integration/catalog/`. Assets that earlier ledgers had reviewed (`conveyor-merge-module`, `spiral-parcel-chute`, `parcel-singulator`, `telescopic-parcel-conveyor`, `automated-label-applicator`, `mailbag-closing-machine`, `powered-sack-dumper`, `powered-roller-conveyor`) were skipped.

A source scan for `part("...belt...")` across `catalog/kits/` found two belts that still use a painted-steel control: `postal-logistics/barcode-tunnel-scanner` and `postal-logistics/parcel-belt-diverter`. All other belt parts use a belt or polymer control. The checked-in default preview of each asset below was opened.

| Asset | Triangles / budget | Source SHA-256 | Preview SHA-256 | Observation |
|---|---:|---|---|---|
| `postal-logistics/parcel-belt-diverter` | 828 / 1,800 | `4308ca1c1066b274f45ccb95b4b3ef60c5a9e37e7c7e471f14c271244e36cc97` | `509711143c8f5dc631cca52b116a12a24acabccd72f4748028de5e76251eba00` | **Material defect, corrected (see below).** The `belt` part, the largest surface in the preview, uses `paintedSteel` (`#587981`), so the belt reads as one teal painted sheet with the side walls and paddle. |
| `postal-logistics/in-motion-weigh-deck` | 724 / 1,800 | `df1cf58543ee72e3ecb673b0c9754eaef23c92b760944d1375d60290a7cbb93d` | `436a49f1f70aacf883fa2d63cacc30111b242fd91297b624254ff6624e5ac448` | No material defect: a painted weigh deck with stainless rollers and an indicator with a glass display is plausible. Geometry defect: the `weigh-deck` (z 520 mm) floats 400 mm above the `scale-base` (top at 120 mm) with no load cells or supports, so the preview reads as two separate slabs. |
| `postal-logistics/conveyor-drive-unit` | 660 / 1,800 | `3ed6a23792c08c8dbe14d2a2f4c2bad3d89f631ebbf2a51494512f621594be2e` | `3d33a0299a4d82a94cb2de0c10f9ba15fbd0fc3e781098756cb71e280dc3f018` | Minor material question: the motor body, end cap, cooling ribs and gearbox all use `stainlessSteel` (`#bbc4c4`). Most conveyor gear motors are painted cast iron or aluminium; stainless washdown motors exist, so this is not recorded as a defect. Silhouette: the motor is a box, not a ribbed cylinder, and has no output shaft. |
| `postal-logistics/conveyor-transfer-bridge` | 724 / 1,800 | `7a76247b276f2b98ea52c2896ddab01fae088664f3d4ac12adf400c4d7d454de` | `92ae3a1cab4b640f8d770bf36e6d7873e8aff815a89cf02d15007f08306bb138` | No material defect: stainless rollers over a painted bed, structural-steel rails and stand, a safety-amber stop. Geometry: the amber `alignment-stop` (x ±225 mm, y 232-268 mm, z 795-850 mm) spans the far end of the deck but starts 25 mm above the deck top (770 mm) with no bracket, so it reads as a loose floating bar. |
| `postal-logistics/tray-induction-loader` | 660 / 1,800 | `afd8c49958d7f32985010130e96a4d84321d6358244ab8d8547bd7dc9f5065b9` | `df1c3265da3c6c0ab3f7390c681ea6d2cbcca45299c9d13b9334b4f193e2e7fb` | Minor material defect: the `display` uses `paintedSteel`, not a glass control, so the screen is the same colour as a steel panel. It is a 155 x 82 mm face and is hard to see in the preview. Geometry defect (more serious): the `feed-deck` (z 600 mm) floats 515 mm above the `base` (top at 85 mm) with no supports. |

## Correction: parcel belt diverter

A belt diverter carries parcels on a rubber or PVC carrying belt between steel side walls; a pusher arm and paddle move parcels off the side. A painted sheet in the wall colour is not a belt. In this asset, `paintedSteel` also colours the side walls, the pusher arm and the paddle, so the fix adds a new control and does not rename the old one.

- New control `beltRubber` ("Belt rubber", `#2c3134`). The `belt` part uses it.
- `paintedSteel` (`#587981`) stays on `side-left`, `side-right`, `pusher-arm` and `paddle`.
- `weathered` preset: adds `beltRubber: '#3d4140'`. `highVisibility` preset: adds `beltRubber: '#2c3134'`, so the safety-orange `paintedSteel` now paints the walls, arm and paddle but not the belt surface.
- The meta description now lists "belt rubber". A source comment says why.
- Geometry, part names and the triangle count (828) are unchanged. `python3 scripts/checkCatalogQuality.py --kit postal-logistics`: 52/52 pass.

Compatibility: the existing parameter keys are kept. A saved `paintedSteel` override still applies to the walls, arm and paddle; it no longer colours the belt.

Regression: `tests/integration/catalog/diverterBeltMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (the colour controls are `paintedSteel, structuralSteel, stainlessSteel`; see `verification/test-before.txt`) and passes after the fix. It also checks that the walls, arm and paddle keep `paintedSteel`, the supports keep `structuralSteel`, and the actuator and rollers keep `stainlessSteel`.

Source SHA-256 after: `eddaf35dfb9efbd21a45e817cdd704b53ec06e5ae6ccd62b378dc023829d3f19`. Preview SHA-256 after: `f8bcc8454470996dd4aa6b10b2e38713b86a20e8e2c9cff29b82459cafbf120b`.

### Evidence

- Default catalog preview, before and after: `previews/{before,after}/parcel-belt-diverter.png`. 19,016 pixels differ (difference > 8 on any channel), all inside the box x 106-406, y 100-237, which is the belt. Before, the belt is teal; after, it is near-black. The teal walls and paddle are unchanged.
- Inspection views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-{iso,front,right}.png`. Both before and after views carry a `MECHANISM BROKEN · mechanism.interpenetration` badge. This comes from the existing geometry (the pusher arm passes through the right side wall), not from this change.
- Review MP4 (21.1 s): `diverter-belt-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before iso at 4.5 s, after iso at 15 s) were opened and read correctly; the after label was shortened once so that it fits the frame.
- The other four default previews: `samples/`.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview.

## Defects noted but not changed in this round

- `parcel-belt-diverter` geometry: the pusher arm interpenetrates the right side wall, and the three "rollers" (z 735-759 mm) project through the belt top (745 mm), so they read as bars on the belt.
- `barcode-tunnel-scanner`: belt still drawn in `paintedSteel` (hidden inside the closed tunnel in the preview).
- `in-motion-weigh-deck` and `tray-induction-loader`: decks float above their bases with no supports.
- `tray-induction-loader`: display drawn in `paintedSteel`.
- `conveyor-transfer-bridge`: alignment stop floats 25 mm above the deck with no bracket.
