# Five-preview semantic audit — 19 November 2026 (data-center overhead services and telecom mast frames)

## Selection and exclusions

Reviewed the current rendered previews for five infrastructure assets: `overhead-cable-ladder`, `liquid-cooling-manifold` and `overhead-coolant-header` (data-center-infrastructure), and `lattice-mast-section` and `mast-outrigger-frame` (telecom-infrastructure). These source paths are absent from the open catalog PR #1507 diff. Searches for each ID returned no open issue or PR, and no earlier ledger under `artifacts/catalog-demos/` names them. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `bd99908d5`, and all its non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `overhead-cable-ladder` | Two side rails and thirteen rungs read as a ladder tray. Two identical cylindrical caps sit on the hangers: the left cap is amber, the right cap is blue-grey (`hanger-cap-right` uses `steel`). Each "ceiling hanger" is a solid 620 mm plate across the tray, which would block the cable route. | Selected: map `hanger-cap-right` to `polymer` like `hanger-cap-left`. Hanger geometry limit noted, not corrected. |
| `liquid-cooling-manifold` | Two horizontal headers with five drops between two end slabs read as a manifold. The left end slab is amber (`support-base-left` uses `polymer`); the identical right slab is blue-grey (`steel`). The "support feet" are full-height end plates. The five branch valves have the pipe color and do not stand out. | Material mismatch confirmed in the preview. Not corrected in this round. |
| `overhead-coolant-header` | Two pipes with five drops and five flat clamp plates read as a pipe header. The left hanger is amber (`polymer`); the identical right hanger is blue-grey (`steel`). The hangers are solid end plates, not brackets. | Material mismatch confirmed in the preview. Not corrected in this round. |
| `lattice-mast-section` | Four legs, two X-braced faces and a base plate read as a mast segment. One leg (`leg-a`) is teal `powderCoat`; the other three legs are grey `galvanizedSteel`. `leg-a` is the only `powderCoat` part. The description says "end flanges"; the model has one flange at the bottom. | Material mismatch confirmed in the preview. A correction must keep the `powderCoat` control effective. Not corrected in this round. |
| `mast-outrigger-frame` | Two rails, two cross members, a central socket and two upright plates read as a ballast frame. The front cross member is grey (`galvanizedSteel`); the identical rear cross member is teal (`powderCoat`). The two "braces" stand 230 mm from the socket axis and do not touch the 88 mm radius socket. | Material mismatch confirmed in the preview. Brace geometry limit noted. Not corrected in this round. |

## Correction

The default preview assigned `hanger-cap-left` to `polymer` (#c99b35) and `hanger-cap-right` to `steel` (#4f7485). The two caps have the same size and the same role. `hanger-cap-left` was the only `polymer` part, so a change of that cap to steel would leave the polymer control with no effect. The source now gives both caps the `polymer` control. `steel` still colors the two side rails, thirteen cross rungs and two hangers, so both color controls and both presets stay effective. Geometry, bounds, the 292-triangle mesh and the 2,200-triangle budget are unchanged.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at `hanger-cap-right`; it passes after the correction (1/1). It also checks that the side rails, end rungs and hangers keep the painted steel finish.
- ESLint is clean. The data-center-infrastructure kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 166 files / 236 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and bounds match the before row.

The MP4 documents local source, software-rendered catalog previews and the GLB color regression. It does not claim simulation, deployment, load capacity, compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
