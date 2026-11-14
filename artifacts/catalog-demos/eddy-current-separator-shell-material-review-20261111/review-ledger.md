# Five-preview semantic audit ledger

**Date:** 2026-11-11
**Kit:** `recycling-facility`

| Asset | Rendered preview review |
|---|---|
| `primary-shredder` | Reads as a slow-speed twin-shaft primary shredder: flared feed hopper, cutter shafts, paired drives, elevated frame, and discharge conveyor are visible. Materials are distinguishable; no correction found. |
| `twin-shaft-shredder` | Reads as an open twin-shaft shear shredder with interleaved cutters, large hopper, drives, cabinet and chute. Body, drive, cutter and safety finishes are plausible; no correction found. |
| `product-pelletizer` | Reads as a plastics strand-pelletizing line: feed hopper, extruder barrel, water bath, cutter and collection bin are visible. Process and material colors are plausible; no correction found. |
| `air-classifier` | Reads as an air-classification line with feed belt, expansion chamber, blower, cyclone duct, access ladder and discharge. Material separation is clear; no correction found. |
| `eddy-current-separator` | Reads as an ECS with feeder pan, belt, head pulley, splitter, chutes and collection bins. Before the correction, its outer shell was red under a “Magnetic rotor shell” label. It is now charcoal for the nonconductive composite shell; this was the sole material mismatch found. |

`horizontal-baler` was excluded because the open-PR search matched it to PR #1258. Exact-name open issue/PR searches found no active target for the five audited assets above.

The four unaffected source previews were opened and checked. The eddy-current separator's before and after previews are in `previews/`. All five are local software-rendered catalog previews; they do not establish process performance or physical acceptance.
