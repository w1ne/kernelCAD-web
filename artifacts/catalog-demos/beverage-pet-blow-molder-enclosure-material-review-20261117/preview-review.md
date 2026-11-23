# Five-preview audit — 2026-11-17

All five local rendered previews were opened. At selection time, exact ID searches returned no matching open issues or PRs, and none of the five source paths appeared in open catalog PR #1507. Reproduction script and raw result are in `verification/check_open_targets.py` and `verification/open-target-check.json`.

| Asset | Preview observation | Decision |
|---|---|---|
| `pet-blow-molder` | The guarded machine reads as a blow molder, but its large exterior shell shares the gray finish of the visible mold columns and has no separate enclosure control. | Selected: verified material-role mismatch; give the outer body, service doors, and heater enclosure a distinct light-gray coating control. |
| `rotary-filler` | Central rotary bowl, repeated filling heads, bottle silhouettes, and infeed/outfeed conveyors make the filler recognizable. Stainless, polymer, and safety finishes are visually distinct. | No material mismatch found. |
| `case-layer-palletizer` | The lift frame and layer plate are visible, but cases are not modeled in the preview, so its product-handling role is less explicit. | No material mismatch selected; retain as a silhouette-review note. |
| `bottle-rinser-carousel` | Central turret, rotary table, spray pins, and catch basin are visible; individual bottles are absent from this preview. | No material mismatch found; retain as a future recognition check. |
| `case-erector` | Magazine, squaring frame, and folding rails are visible; the formed carton itself is absent. | No material mismatch found. |

The detailed material comparison is kept privately in `kernelCAD-private`; the public handoff describes only kernelCAD asset behavior and local evidence.
