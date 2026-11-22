# Industrial plant preview ledger — 2026-11-13

Five rendered `industrial-plant` previews were selected after checking the open
issues, pull requests, and recent semantic-review bundles. No open item specifically
targets these five assets. PR #1258 is the existing catalog feature PR for this
branch; the electric chain hoist was not the subject of an earlier targeted fix.

| Asset | Default mesh | Visual review | Disposition |
| --- | ---: | --- | --- |
| `axial-flow-fan` | 344 tris; 0.625 × 0.6422 × 0.216 m | Reads as a short axial fan with a circular shroud, visible blades, hub, and low stand. The steel blades and yellow outer pieces are visually distinct. | No material mismatch found. |
| `industrial-boiler` | 3,880 tris; 5.67 × 5.26 × 2.48 m | Reads as a horizontal packaged boiler with burner, stack, piping, valves, and support frame. The blue shell, dark base/stack, and red valve controls are separated. | No material mismatch found. |
| `palletizer-robot-cell` | 254 tris; 0.957105 × 0.7546 × 0.74 m | The preview shows the safety floor and panels, but the robot arm is blocky and does not read clearly as a six-axis arm at thumbnail scale. | No material mismatch found. Silhouette concern recorded for a separate review. |
| `forklift-truck` | 3,388 tris; 3.11 × 2.35 × 1.14 m | Reads as a counterbalance forklift with overhead guard, mast, forks, tyres, and LPG bottle. Body paint, dark frame/tyres, and pale bottle are separated. | No material mismatch found. |
| `electric-chain-hoist` | 192 tris; 0.448 × 0.441 × 0.25 m | The vertical load-chain primitive is safety yellow while the asset's other steel pieces use neutral gray. Official KITO material documentation describes an electric-hoist load chain as nickel-plated steel. | Corrected `chain` to the existing `steel` control. The overall silhouette still reads as a box below a plate; this color-only review does not correct that separate geometry weakness. |

The live kernelCAD detail route and preview were checked before editing. The route
returned HTTP 200 and the public PNG SHA-256 matched the branch's before preview.
The branch remains undeployed, so this baseline check does not verify a post-deploy
page.
