# Mining semantic preview review · 2026-11-18

## Formal five-asset sample

The public preview and detail routes returned HTTP 200 for every sample below.
Their served PNG SHA256 values matched the checked-in PNGs at the audit time.
All five targets were checked against 8 open issues and all 6 open pull requests;
none was named or path-targeted. Full overlap evidence is in
[`verification/open-target-check.json`](verification/open-target-check.json).

| Asset | Preview assessment | Result |
| --- | --- | --- |
| `mining/belt-magnet-separator` | Recognizable cross-belt separator on the conveyor line. | No selected defect. |
| `mining/crusher-discharge-conveyor` | Recognizable inclined belt conveyor with loading chute, trestles, walkway and covers. The idler finish was wrong in source. | One material-role correction: 46 idler rollers now use `frameSteel`. |
| `mining/flotation-cell-bank` | Recognizable row of flotation cells and access structure. | No selected defect. |
| `mining/mine-sump-pump` | Recognizable pump and sump installation. | No selected defect. |
| `mining/radial-stacker` | Recognizable radial conveyor and stacker structure. | No selected defect. |

See [`samples/`](samples/) for the five checked PNGs. The before/after focused
idler images are under [`focused/`](focused/); the ordinary preview is under
[`before/`](before/) and is regenerated in the working tree.

## Excluded preliminary scope check

Before formalizing the mining sample, five `farm-machinery` previews were
glanced at: combine, grain cart, high-clearance sprayer tractor, bale-wrapper
and sugar-beet harvester. Some silhouettes looked weak, but these were outside
the requested industrial/manufacturing sample and did not provide a clear
material-role mismatch. They are recorded as an excluded scope check, not as
part of the five-asset audit and not as a verified defect.

## Selected source finding

The conveyor has 14 three-roll troughing idler sets (42 roller parts) and four
return rollers. Each roller was assigned the same `drivePaint` control as the
painted drive, chute and belt covers; adjacent idler structures used
`frameSteel`. The focused view shows the former green finish and the corrected
steel-grey finish on the same 3-roll geometry. The normal catalog preview's
default `cover=covered` choice hides most carry idlers, so its wide view remains
an overview; the focused GLB view makes this material check visible.

The exact source and export assertions are in
[`tests/integration/catalog/crusherDischargeConveyorIdlerMaterial.test.ts`](../../../tests/integration/catalog/crusherDischargeConveyorIdlerMaterial.test.ts).
