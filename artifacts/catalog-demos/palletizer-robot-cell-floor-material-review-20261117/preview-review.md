# Five-preview ledger — 17 November 2026

| Rendered asset | Preview read | Material review |
| --- | --- | --- |
| `industrial-plant/forklift-truck` | Reads as a counterbalance forklift with overhead guard, mast, L-shaped tines, LPG bottle and dark tyres. | Yellow vehicle body, dark tyres and neutral bottle fittings are visibly distinct. No material mismatch found. |
| `industrial-plant/distillation-column` | Reads as a vertical process tower with staged access platforms, guardrails and a ladder. | Neutral vessel shell and yellow access steel read as separate materials. No material mismatch found. |
| `industrial-plant/centrifugal-pump` | Reads as a base-mounted pump set with a horizontal motor, volute casing, flanged ports and a skid. | Motor, pump casing and base have distinct finishes. No material mismatch found. |
| `industrial-plant/palletizer-robot-cell` | Reads as a fenced robot cell with a pedestal-mounted arm, table and gate; the scene is deliberately low-poly. | Before: the full floor slab inherited `safetyPaint`, making the factory floor yellow. Corrected to a dedicated `concrete` control; the safety-painted posts and pedestal remain orange. |
| `industrial-plant/bucket-elevator` | Reads as a vertical bucket elevator with head and boot housings, a casing and visible buckets through its inspection opening. | Casing, belt and bucket/housing colors separate plausibly. No material mismatch found. |

The five images in `samples/` are the exact previews opened during this round.
The palletizer was also screened during the earlier process-blower review; that
first screen accepted its yellow floor. This follow-up traced the floor slab to
`safetyPaint` and corrected that material assignment. No geometry, dimensions,
catalog ID, triangle count or budget changed.

No open issue or pull request matched any of the five exact asset IDs in its
title or body when checked on 2026-11-17. The open-target searches and PR #1258
status are retained in `verification/`.
