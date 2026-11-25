# Five-preview material audit — 25 November 2026 (postal conveyors)

## Selection and exclusions

`gh pr list --state open` returned no open pull request and `gh issue list` returned no
issue naming these asset IDs. The earlier postal-logistics work was the structural
quality-promotion wave
`artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/`; it added the
material knobs and presets but did not review part-level material choice. No semantic
material audit of this kit exists in `artifacts/catalog-demos/`.

Five assets of the parcel-handling line were taken from the rendered previews and read
at part level:

| Asset | Preview observation | Result |
|---|---|---|
| `barcode-tunnel-scanner` | The portal floor is the carrying belt, but it rendered in the same blue-grey `paintedSteel` (#596e83) as the arch walls. Palette puts `belt`, `arch-left`, `arch-right` and `arch-top` in one zone, and the asset has no rubber control. Every other belt in the kit is dark rubber. | Selected and corrected: the belt now has a `beltRubber` control (#2c3134) and both presets set it. |
| `package-induction-conveyor` | Belt renders dark (#2c3134) through `beltRubber`; the source comment states an induction belt is a dark PVC/rubber carcass, not a painted steel sheet. | Checked and cleared; no change. |
| `parcel-belt-diverter` | Belt renders dark rubber; side walls, pusher arm and paddle carry the paint. | Checked and cleared; no change. |
| `powered-roller-conveyor` | Roller bed: stainless rollers (#bbc4c4), painted side frames, structural-steel bed frame and legs. There is no belt on a roller conveyor, so no rubber zone is expected. | Checked and cleared; no change. |
| `conveyor-transfer-bridge` | Stainless transfer rollers under a painted bridge deck, structural-steel rails and legs, amber alignment stop. A bridge has rollers, not a belt. | Checked and cleared; no change. |

## Correction

The scanner is one machine in a kit of conveyors. A parcel is carried through the scan
opening on a belt; the belt is a rubber carcass, while the arch, roof and legs are steel.
Before the fix the belt and the arch shared `paintedSteel`, so the belt rendered as a
blue-grey steel floor and the `highVisibility` preset turned it orange along with the
arch. The sibling conveyors already carry the rule in their own sources
(`package-induction-conveyor`, `parcel-belt-diverter`, `crossbelt-sorter-section`).

`barcode-tunnel-scanner` now has a fifth colour control, `beltRubber` (default #2c3134),
used by the single `belt` part. The weathered preset sets #3d4140 and the
highVisibility preset keeps #2c3134, matching the sibling conveyors. The arch walls and
roof stay `paintedSteel`, the legs `structuralSteel`, the scan heads `stainlessSteel` and
the side windows `instrumentGlass`. Geometry is untouched: 720 triangles against a
1,800 budget.

The header comment now says what makes the object a tunnel scanner (arch, two scan
heads, side windows, belt through the opening) instead of one line of placeholder text,
and the description lists the five material controls.

## Verification and scope

- `tests/integration/catalog/barcodeTunnelScannerBeltMaterial.test.ts` fails on the
  pre-fix source (no `beltRubber` control) and passes after the fix. It also checks the
  exported GLB colours of the belt, two arch walls, one leg and one side window.
- ESLint clean on `catalog/kits/postal-logistics/` and on the new test.
- Postal-logistics quality gate: 52/52 assets pass.
- Full catalog integration suite: see `verification/catalog-suite.txt`.
- The regenerated `catalog/index.json` changes one row: its description, its
  `sourceSha256`, one new parameter and preset entry, and `belt` moving from
  `paintedSteel` to `beltRubber`.
- The previews are local software renders of the exported low-poly GLB at default
  knobs. They do not claim simulation, deployment or hardware acceptance.
