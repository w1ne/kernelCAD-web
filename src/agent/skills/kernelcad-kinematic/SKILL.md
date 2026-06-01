---
name: kernelcad-kinematic
description: Use when verifying whether a moving assembly is buildable — sampled-pose collision sweeps across joint ranges, IK reachability for end-effector targets, mounting-hole fastener consistency, and static-load capacity on cantilever-shaped parts. Loads alongside kernelcad-authoring to gate design-time mechanism feasibility.
---

# kernelcad-kinematic — feasibility gates for moving assemblies

## Units (read this first)

Joint angles throughout the kinematic API are **degrees for revolute joints**
and **millimetres for prismatic joints**. This matches the unit convention
used by `arm.mate(..., 'revolute', { limitsDeg })`, `arm.mate(..., 'prismatic', { limitsMm })`,
and `arm.solvedModel({poses})` — there is no degree-vs-radian split anywhere
on the user-facing surface.

That includes the IK seed: `kinematic.checkReachable({ seed: { shoulder: 60 } })`
means 60 degrees, not 60 radians and not 60 of anything else. Authors porting
code from URDF / MoveIt / ROS — where radians are conventional — must convert
(`deg = rad * 180 / Math.PI`) before passing values to this API.

A small seed value like `0.3` is interpreted as 0.3°, which is effectively
zero — fine as a "near rest pose" hint, but not the ~17° you'd get if you
were thinking in radians.

## When to load

Load this skill whenever the user asks any of:

- "Will this arm hit itself?" / "Does this mechanism clear across its motion?"
- "Can this robot reach this point?" / "Is this target in the workspace?"
- "Will these mounting holes line up?" / "Are the bolt patterns compatible?"
- "Will this bracket hold this load?" / "What's the safety factor?"

Do NOT load this skill for static CAD authoring (use `kernelcad-authoring`) or
for visualization (use the renderer). This skill is feasibility-checking only.

## The 4 entry points

All four live under the `kinematic.*` namespace exposed to every `.kcad.ts`
script. The same surface is reachable from host code via `import * as kinematic from
'src/kinematic'`. Every entry returns a `Promise<…Result>` envelope carrying
`source: 'local'`.

| Call | Question answered | Key diagnostics |
|------|-------------------|-----------------|
| `kinematic.checkMountingHoleConsistency(arm)` | Do fastener holes match across all mates? | `kinematic.mounting-hole.diameter-mismatch` (K9) |
| `kinematic.checkSweptCollision(arm, opts)` | Does any link pair penetrate across the swept range? | `kinematic.collision.swept` (K1), `kinematic.collision.swept.sample-density-warning` (K2) |
| `kinematic.checkReachable(arm, opts)` | Can the end-effector reach this target? | `kinematic.unreachable` (K3, axis-discriminated), `kinematic.reachability.iteration-cap-hit` (K4), `kinematic.solver.unsupported-config` (K5) |
| `kinematic.checkLoadCapacity(arm, loads, opts)` | Will any beam-shaped element exceed yield under these loads? | `kinematic.load-exceeds-yield` (K6), `kinematic.load.beam-not-applicable` (K7), `kinematic.no-material-declared` (K8) |

## MCP tools (one per facade entry)

Every facade entry has a paired MCP tool that accepts the same shape from an
agent context. The tools load the `.kcad.ts` source, run it, capture the
named assembly off the script's session, and dispatch to the facade.

- `check_mounting_hole_consistency` — wraps the facade; accepts `file` or `code`
- `check_swept_collision` — wraps the facade; accepts `file|code`, `joint`, `range`, `collision_tolerance_mm3`
- `check_reachable` — wraps the facade; accepts `file|code`, `tip_link`, `target_position`, `target_orientation`, `prefer_solver`, `max_iterations`, `seed`
- `check_load_capacity` — wraps the facade; accepts `file|code`, `loads`, `materials`, `mode`, `safety_factor_threshold`
- `validate_assembly` (extended) — composes all four when called with `gates: ['kinematic']`

## Recovery loop — code → nextAction → repair

Every emitted diagnostic carries a structured `nextAction` field describing
the smallest repair likely to clear the gate. Use the table below to pick a
repair, edit the `.kcad.ts` source, then re-run the same `kinematic.check*`
call to confirm.

| Code | `nextAction.kind` | Typical recovery |
|------|------|----|
| K1 `kinematic.collision.swept` | `rewrite-feature` | Inspect `result.collidingPoses[]`; narrow joint limits OR reshape the colliding part OR insert clearance |
| K2 `kinematic.collision.swept.sample-density-warning` | `fix-arg` (`opts.range`) | Halve the step size OR widen the range |
| K3 `kinematic.unreachable` | conditional by `axis` | `axis: 'position' \| 'both'` → restructure (lengthen link, add DOF, move target). `axis: 'orientation'` → relax orientation tolerance or drop the orientation constraint |
| K4 `kinematic.reachability.iteration-cap-hit` | `fix-arg` (`opts.maxIterations`) | Bump iterations OR relax tolerances; inspect `closestApproach` to choose |
| K5 `kinematic.solver.unsupported-config` | `rewrite-feature` | Cut the closed-loop cycle OR switch `preferSolver: 'numeric'`; closed-loop kinematics is a separate slice |
| K6 `kinematic.load-exceeds-yield` | `rewrite-feature` | Thicken the cross-section, change material, shorten the moment arm |
| K7 `kinematic.load.beam-not-applicable` | `fix-arg` (`crossSection`) | Add the part's `crossSection` declaration; only beam-shaped parts qualify for the closed-form path |
| K8 `kinematic.no-material-declared` | `fix-arg` (`opts.materials`) | Add `materials: { partName: { material: 'steel' \| 'aluminum' \| 'pla' \| 'abs' \| 'pet' } }` for every loaded part |
| K9 `kinematic.mounting-hole.diameter-mismatch` | `fix-arg` | Set both connectors' hole diameter to the same value |

## Trade-off note on K2 sparse-sampling

K2 is a signal, not a hard cap. The sweep still ran end-to-end; the warning is
that the (range, step) you supplied falls below the safe floor (36 samples for
revolute, 25 for prismatic) and the sweep may have stepped over a narrow
collision window. Agents can ignore K2 for fast-prototyping iteration; for a
production design review, never ignore K2 — re-run with a tighter step.

## Boundary

This skill is feasibility-checking. CAD authoring stays on
`kernelcad-authoring`. Visualization stays on the renderer. To *fix* a flagged
mechanism, return to `kernelcad-authoring` to edit the `.kcad.ts` source, then
re-run the relevant `kinematic.check*` to confirm.

## Non-robotics mechanism coverage

These four calls work on any moving assembly, not just robot arms:

- **Linkages** — 4-bar, scissor jacks (closed-loop → K5 fires; cut to an
  open chain to use checkSweptCollision)
- **Latches** — over-center, pawl-ratchet (`checkSweptCollision` over the
  latch handle; `checkReachable` for the locking-pin engagement target)
- **Hinges** — laptop clamshell, butterfly knife (`checkSweptCollision` over
  the hinge angle)
- **Watch movements** — gear-train clearance, escapement engagement
  (`checkSweptCollision` over the escape-wheel rotation; `checkLoadCapacity`
  for the mainspring torque)
- **Scissor jacks** — `checkSweptCollision` over the lift parameter; the
  closed-loop variant is rejected by K5 — author the open-chain leg instead

## Mechanism delivery — non-bypassable

A mechanism build is **not deliverable** if any of these fail. No `ignore[]` workarounds for joint pairs; no shipping with a render that looks right while the assembly is broken.

1. `kernelcad validate --include-interference` returns CLEAN. `ignore[]` is reserved for true intra-part design contacts (a spring "bolted" to a beam, a captured washer); joint-pair contacts (the parts on either side of a `revolute` / `prismatic` mate) **may not be ignored** — they are the test signal for whether the mechanism is physically realized.
2. Every declared mate passes Gate 6 (mate physical realization): the pin/equivalent feature actually constrains the two parts, the pin stays in both holes at every pose in the mate's limits, and bearing surfaces align. Surfaces an advisory `assembly.mate.not-physically-realized` (`info` severity; revolute / prismatic only; `fastened` mates are exempt). The merge gates under the physics-grounded loop are `mechanism.disconnect` and `mechanism.interpenetration`, which fire under motion at validate-time. `joint.clevis(...)` passes by construction.
3. Every revolute joint passes Gate 4 (visual exposure): the hinge mechanism reads as a hinge from at least one canonical view.
4. The render-inspect loop is followed: a `kernelcad render inspect` pass after every geometry change, with visible issues called out.

If any of these fail, iterate the design until they pass. Do not widen `ignore[]`. Do not ship.

### Use `joint.clevis(...)` for revolute joints — do not hand-roll forks

A clevis joint is the canonical revolute-joint hardware: two fork plates on the parent, one tongue on the child, a pin drilled through both knuckles. Hand-rolling these from `box`/`cylinder`/`union` is the leading cause of "every gate green, mechanism falls apart" failures (knuckle alignment drifts, through-hole misaligned across plates, bridge tabs land in the tongue's swing volume).

Use the primitive instead:

```ts
import { joint } from 'kernelcad';

const shoulder = joint.clevis({
  parentBody: basePart.shape,
  childBody: lowerArmPart.shape,
  axis: [0, -1, 0],
  pivotParent: [0, 0, COLUMN_TOP_Z],
  pivotChild: [0, 0, 0],
  limitsDeg: [-10, 110],
  style: { knuckleR: 14, forkGapY: 18, tongueY: 14, plateT: 4, pinR: 3.5 },
});

basePart.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: shoulder.parentConnector.origin },
  axis: shoulder.parentConnector.axis,
});
lowerArmPart.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: shoulder.childConnector.origin },
  axis: shoulder.childConnector.axis,
});

arm.mate('shoulder', 'base.shoulder', 'lower-arm.shoulder', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-10, 110],
});
```

The primitive returns the parent/child geometry to assign back to each part's `Shape` AND the connectors to bind the mate to. Do not pick `origin: [x, y, z]` by hand — bind to the returned connectors, which are kinematically consistent with the pin axis and the tongue/fork through-hole.

Authoring discipline that PAIRS with the primitive:

- Author each part body so the user-supplied `pivotParent` (or the child's part-local origin) sits on (or just below) the body's surface, with clearance for the tongue's rotational sweep. For a vertical revolute axis, the parent body should terminate at least `knuckleR` below the pivot; for a horizontal beam-end joint, the beam should end `knuckleR + body_half_thickness` short of the pivot.
- Set `style.forkGapY > ARM_W` (the child's beam width) so the beam slips through the fork plates' gap without rubbing the inner faces.
- Set `style.tongueY ≈ ARM_W` so the tongue's plate thickness matches the beam — the tongue + beam form a continuous solid.
- For wider swing ranges, the primitive automatically lifts the pivot by `knuckleR · max(|sin|) + 1 mm`; you can opt out with `liftPivot: false` and lift manually.

Worked example: `examples/kinematic/luxo-lamp.kcad.ts` ships with `joint.clevis(...)` at all three revolute joints (shoulder, elbow, wrist) and validates clean with `--include-interference` and zero `ignore[]` entries.

## Cookbook

Six runnable snippets live in `cookbook/`. Each begins with a `// expected:`
header listing the diagnostic codes the run should emit. Snippets are
self-contained `.kcad.ts` files that build their own fixture, run one or two
`kinematic.check*` calls, and assert the expected outcome in-script with
`throw new Error(...)` so a regression fails fast under `kernelcad evaluate`.

1. `01-swept-collision-shoulder.kcad.ts` — 2-DOF arm; K1 fires across the
   colliding band of the shoulder sweep
2. `02-reachable-with-seed.kcad.ts` — 6-DOF spherical-wrist arm reaching a
   nearby target with a seed-pose hint
3. `03-cantilever-beam-stress.kcad.ts` — steel-vs-PLA cantilever beam stress
   (steel passes; PLA fires K6)
4. `04-scissor-jack-swept.kcad.ts` — single-leg cut of a scissor jack swept
   across the lift parameter (the closed-loop variant would emit K5)
5. `05-clamshell-hinge-swept.kcad.ts` — laptop-clamshell hinge across
   [0°, 135°]; K1 fires when the lid touches the table
6. `06-over-center-latch-reachable.kcad.ts` — over-center latch
   locking-pin reachability with self-collision avoidance
