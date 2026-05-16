# Task: Repair Loop — Fixed Variant (Gate 1 silent)

This is the *fixed* variant of the repair-loop pair. It takes the same
two-plate fastened-mate skeleton as `kinematic-grounding-repair-loop-
broken` and repairs the single defect — both mounting holes are now
Ø5 mm. Gate 1 (`assembly.mounting-hole.mismatch`) stays silent.

The companion task `kinematic-grounding-repair-loop-broken` ships the
broken form. Together they exercise the gate's discriminative power.

Functional requirements:

- Two `box(20, 20, 5)` parts.
- Ø5 mm through-hole on side A's `'top'`, Ø5 mm through-hole on side B's
  `'bottom'` (matched).
- Topology-bound face-center connectors on both sides; `fastened` mate.
- Call `arm.solvedModel({})` (default `'error'` mode under
  `kernelcad evaluate`).

The script must evaluate cleanly with no kinematic-grounding diagnostic
of any severity.

Z-up, millimetres.
