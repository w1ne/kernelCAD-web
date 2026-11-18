# Mining preview ledger — 2026-11-13

Five checked-in mining previews were selected after a search of earlier catalog
review bundles and tests (no prior review names these asset paths) and a check
of open PRs (none modifies `catalog/kits/mining/`). PR #1258 is the umbrella
catalog PR for this branch. The earlier mining fixes (`mine-skip`,
`rock-breaker-boom`, `longwall-shearer`) were excluded.

| Asset | Rendered observation | Result |
| --- | --- | --- |
| `sag-mill` | Coated shell on concrete piers with girth gear guard, pinion, gearbox and motor, feed hopper and discharge trommel. | No material mismatch found. |
| `cone-crusher-module` | Blue crusher on a raised module, V-belt drive, discharge conveyor, yellow handrail and tramp cylinders. | No visible mismatch. Source note: `feed-distributor` uses the knob labelled "Hydraulic cylinder chrome"; it is hidden by ore in the default `loaded` preview. Recorded as a follow-up, not fixed here. |
| `slurry-pump-skid` | Blue volute, knife-gate valve, yellow belt guard, black suction and discharge lines. | No clear mismatch. Black large-bore lines are plausible as slurry hose or HDPE; not changed. |
| `apron-feeder` | Orange girders, grey pans, ore-filled hopper, drive train and discharge chute. | No material mismatch found. |
| `high-pressure-grinding-rolls` | Green frame, studded rolls, twin drives, yellow accumulators. The four horizontal press cylinders render as one bright chrome colour from barrel to rod end. | **Material mismatch. Fixed:** the barrels now use `structuralSteel` (painted steel tube); only the piston rods stay chrome. |

A hydraulic cylinder barrel is painted carbon-steel tube. Hard-chrome plating
is applied to the piston rod, where the seals run. The fix changes the colour
of four parts; geometry and triangle count (5,142) are unchanged.
