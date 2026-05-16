# Task: Repair Loop — Broken Variant (Gate 1)

This is the *broken* variant of the repair-loop pair. It mirrors the
mounting-hole-mismatch demonstration: two `box(20, 20, 5)` plates joined
by a `fastened` mate with mismatching hole diameters (Ø5 on side A,
Ø6 on side B). Gate 1 (`assembly.mounting-hole.mismatch`) fires.

The companion task `kinematic-grounding-repair-loop-fixed` ships the
*repaired* form — both holes Ø5 — and demonstrates the same fixture
under the gate's silence. Together they exercise the gate's
discriminative power: same kinematic skeleton, single-parameter change,
opposite gate outcome.

Functional requirements (same as `kinematic-grounding-mounting-hole-
mismatch` — author the broken form):

- Two `box(20, 20, 5)` parts.
- Ø5 mm through-hole on side A's `'top'`, Ø6 mm through-hole on side B's
  `'bottom'`.
- Topology-bound face-center connectors on both sides; `fastened` mate.
- Call `arm.solvedModel({}, { validate: 'warn' })`. Assert that
  `scene.warnings` contains `'assembly.mounting-hole.mismatch'`.

The script must evaluate cleanly — a clean evaluate means the gate fired.

Z-up, millimetres.
