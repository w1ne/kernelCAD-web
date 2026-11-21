# Five-preview semantic audit — 19 November 2026 (grid-substation yard and civil items)

## Selection and exclusions

Reviewed the current rendered previews for five grid-substation yard and civil assets: `substation-yard-barrier-section`, `substation-transformer-fire-wall`, `substation-precast-cable-trench`, `substation-portable-work-canopy`, and `substation-yard-light-mast`. These source paths are absent from the open catalog PR #1507 diff. Searches for each ID returned no open issue or PR, and no earlier ledger under `artifacts/catalog-demos/` names them. PR #1258 was checked first; it is merged. PR #1507 was open and mergeable at the audit base commit `e43b16e27`; its `build-and-checks` job was still in progress, and the other reported jobs had passed or were skipped by path filters. The five previews and matching source snapshots are retained under `samples/`.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `substation-yard-barrier-section` | Yellow top rail, four grey uprights, lower rail and one diagonal brace read as a removable barrier panel. The two end feet differ: one is grey concrete, the other is blue-grey like the steel rails (`foot-2` uses `galvanizedSteel`). | Selected: map `foot-2` to `concrete` like `foot`. |
| `substation-transformer-fire-wall` | Four tall concrete slabs on steel feet. The slabs are 1,560 mm wide at a 3,060 mm pitch, so 1,500 mm gaps separate them, and the top cap spans only two slabs. It reads as four separate panels, not a continuous fire separation wall. | Geometry defect noted. No material mismatch. Not corrected in this round. |
| `substation-precast-cable-trench` | Open-topped concrete trough with end lips reads as a trench segment. The four `cableJacket` cable runs in the source are not visible in the preview, so the cable-jacket control has no visible effect from this view. | Noted. Not corrected in this round. |
| `substation-portable-work-canopy` | Four posts, a perimeter frame and a flat rigid blue-grey cover. The flat 180 mm slab cover makes the object read as a large table more than a canopy. Post and cover materials agree with the description. | Silhouette limit noted. No material mismatch. |
| `substation-yard-light-mast` | Tapered pole on a base plate with a short outreach arm and a small lamp head reads as a light mast. The complete luminaire block uses the `glass` control; there is no separate housing. | Minor material simplification noted. Not corrected in this round. |

## Correction

The description names "two end feet", and the source gives the first foot the `concrete` control (#92938b). The second foot, `foot-2`, used `galvanizedSteel` (#7f8c92), so the two feet of one barrier panel rendered in two different materials. The source now gives both feet the `concrete` control. `galvanizedSteel` still colors the lower rail, four uprights and the diagonal brace, and `safetyYellow` still colors the upper rail, so all three color controls and both presets stay effective. Geometry, bounds, the 124-triangle mesh and the 1,800-triangle budget are unchanged.

Two geometry limits of the same asset are recorded and not corrected here: `foot` is a plain block and `foot-2` is a chamfered block, and both feet end at z = 150 mm while the uprights start at z = 230 mm, so the panel does not touch its feet.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at `foot-2`; it passes after the correction (1/1). It also checks that the lower rail and end uprights keep the galvanized steel finish.
- ESLint is clean. The grid-substation kit quality gate passes 80/80 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 164 files / 234 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and bounds match the before row.

The MP4 documents local source, software-rendered catalog previews and the GLB color regression. It does not claim simulation, deployment, load capacity, compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
