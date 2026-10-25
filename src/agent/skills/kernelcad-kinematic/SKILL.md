---
name: kernelcad-kinematic
description: Use when verifying whether a moving assembly is buildable — sampled-pose collision sweeps across joint ranges, IK reachability for end-effector targets, mounting-hole fastener consistency, and static-load capacity on cantilever-shaped parts, and closed-loop linkages (four-bar, slider-crank, scissor, over-center latch) with branch-flip and lockup findings. Loads alongside kernelcad-authoring to gate design-time mechanism feasibility.
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

## The 6 entry points

All six live under the `kinematic.*` namespace exposed to every `.kcad.ts`
script. The same surface is reachable from host code via `import * as kinematic from
'src/kinematic'`. Every entry returns a `Promise<…Result>` envelope carrying
`source: 'local'`.

| Call | Question answered | Key diagnostics |
|------|-------------------|-----------------|
| `kinematic.checkMountingHoleConsistency(arm)` | Do fastener holes match across all mates? | `kinematic.mounting-hole.diameter-mismatch` (K9) |
| `kinematic.checkSweptCollision(arm, opts)` | Does any link pair penetrate across the swept range? | `kinematic.collision.swept` (K1), `kinematic.collision.swept.sample-density-warning` (K2) |
| `kinematic.checkReachable(arm, opts)` | Can the end-effector reach this target? | `kinematic.unreachable` (K3, axis-discriminated), `kinematic.reachability.iteration-cap-hit` (K4), `kinematic.solver.unsupported-config` (K5, analytical IK on a chain that is not closed-form solvable) |
| `kinematic.checkLoadCapacity(arm, loads, opts)` | Will any beam-shaped element exceed yield under these loads? | `kinematic.load-exceeds-yield` (K6), `kinematic.load.beam-not-applicable` (K7), `kinematic.no-material-declared` (K8) |
| `kinematic.checkStaticHold(arm, opts)` | Can the declared actuator hold this joint against gravity? | `assembly.joint.static-hold.exceeded`, `assembly.joint.static-hold.margin-low`, `kinematic.static-hold.no-actuator-declared` |
| `kinematic.sweepTolerance({ code\|file, params, gates })` | Does the mechanism still pass the standard gates across a param's tolerance range? | `kinematic.sweep-tolerance.combo-cap-exceeded` (plus whatever the swept gates emit per combo) |

### `checkStaticHold` — gravitational holding torque vs actuator capacity

Per actuated joint (revolute/prismatic with a declared `actuator: { torqueNm
| forceN }` on `arm.revolute(...)`/`arm.prismatic(...)`), samples a pose grid
(or an explicit `opts.pose`) and computes the gravitational torque/force the
actuator must supply to hold the downstream mass still, using real mass
properties (volume and center of mass from the part's declared `density`/`material`,
same substrate as `inspect({ of: 'mass' })`). Reports the worst pose,
required torque/force, declared capacity, and margin percent.
`opts.minTorqueMarginPct` (default 20) is a floor, not a hard pass/fail — a
joint that clears capacity but misses the margin still returns `ok: true`
with a `margin-low` warn diagnostic; only an actually-exceeded joint flips
`ok: false`. v1 assumes rigid links and a single uniform gravity vector; pair
with `checkLoadCapacity` for applied external loads.

### `sweepTolerance` — tolerance-stackup gate sweep

Declares one or more `param()` names as `{ values: [...] }` or `{ min, max,
steps }`, expands the cartesian product (capped at 64 combos —
`kinematic.sweep-tolerance.combo-cap-exceeded` fires and truncates past the
cap), and re-evaluates the script per combo via the same `set_param` +
`evaluate_script` path an agent would use manually. Per combo, runs
`interference` + `mountingHoles` + `jointAxis` (all default on, fold out of
one `validateAssemblyWithMates` call) and `reachable` when
`gates.reachable: { tipLink, targetPosition, targetOrientation? }` is
declared. Returns `results[]` (one row per combo: `{ combo, gates,
diagnostics }`) and `firstFailure[gateName]` — the first combo, in
declaration order, where that gate failed. Hole diameters bound through a
ParamRef (`.hole({ diameter: someParam })`) resolve to the combo's evaluated
value, so sweeping that diameter produces a real pass/fail envelope.

## MCP tools (one per facade entry)

Every facade entry has a paired MCP tool that accepts the same shape from an
agent context. The tools load the `.kcad.ts` source, run it, capture the
named assembly off the script's session, and dispatch to the facade.

- `verify({ check: 'mounting-holes' })` — wraps the facade; accepts `file` or `code`
- `verify({ check: 'assembly-path', file|code, assembly?, directions?, disassemblyOrder?, sequence?, threadedFasteners? })` — continuous mesh straight-removal check along six world axes plus explicit vectors; per-part valid directions/blockers and three-way states (removable / blocked / unknown), optional greedy order/stuck set, and a `sequence: true` build plan (reverse blocking-graph peel) with a model stamp. Threaded fasteners are `unknown: non-straight-path` until P2. Contact is conservative; no rotation, inferred axes or hardware certification.
- `verify({ check: 'swept-collision' })` — wraps the facade; accepts `file|code`, `joint`, `range`, `collision_tolerance_mm3`
- `verify({ check: 'reachable' })` — wraps the facade; accepts `file|code`, `tip_link`, `target_position`, `target_orientation`, `prefer_solver`, `max_iterations`, `seed`
- `verify({ check: 'load-capacity' })` — wraps the facade; accepts `file|code`, `loads`, `materials`, `mode`, `safety_factor_threshold`
- `verify({ check: 'static-hold' })` — wraps the facade; accepts `file|code`, `joint`, `pose`, `gravity`, `min_torque_margin_pct`, `range_samples`
- `verify({ check: 'physics' })` — full mechanism truth with physics engine: kinematic disconnect / interference / DOF checks plus static equilibrium and drop-on-release under gravity; accepts `file|code`, `assembly`, `physics: false` to skip physics engine. Returns `{ ok, mechanism, failures, coverage }`.
- `verify({ check: 'motion-load' })` — mate assemblies: loads on every `mechanicalJoint` along the animationView tracks (gravity + inertia + external forces passed as motion_loads), or quasi-static over the joint limits (motion_mode: 'range'). Reports peak torque vs `torqueNm` (margin < 1x error, < 2x warning), actuator-shaft axial / radial / bending loads (checked only against `radialLimitN` / `axialLimitN`), the radial load per support (up to two coaxial supports, each at the station where it bears on the shaft: its connector on the joint axis, else the middle of its material nearest the shaft; an ambiguous station is a warning, not a number), the worst pose and a torque-vs-time series. Same calculator as static-hold. Use `supports: { '<joint>': ['servo'] }` to see the shaft side load without a bushing. Declare a purchased part's mass with `arm.part(name, shape, { massKg })`.
- `sweep_tolerance` — standalone tool (not a `verify` check — it surveys an envelope rather than gating one state); accepts `file|code`, `params`, `gates`
- `verify({ check: 'assembly' })` (extended) — composes the four `verify`-routed checks when called with `gates: ['kinematic']`

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
| K5 `kinematic.solver.unsupported-config` | `rewrite-feature` | Switch `preferSolver: 'numeric'`: the closed-form solver takes serial spherical-wrist chains only (closed loops go through the numeric path) |
| `kinematic.loop.lockup` | `rewrite-feature` | The loop cannot close past the named pose (dead point / range limit). Limit the driven range to the last closed pose, or change link lengths |
| `kinematic.loop.branch-flip` | `rewrite-feature` | The loop went over center (or a `loopMode` pin could not hold). If intended, that pose IS the over-center point; else narrow the range or pin the branch |
| `kinematic.loop.mobility-mismatch` | `fix-arg` (`poses`) | Drive exactly as many loop joints as `mobility` reports (`solve_mates` → `loop.mobility[].independent` lists a valid set) |
| `kinematic.loop.branch-ambiguous` | `rewrite-feature` | The loop is modeled flat/straight; add `arm.loopMode(loop, { joint, sign })` or model it away from the singular pose |
| K6 `kinematic.load-exceeds-yield` | `rewrite-feature` | Thicken the cross-section, change material, shorten the moment arm |
| K7 `kinematic.load.beam-not-applicable` | `fix-arg` (`crossSection`) | Add the part's `crossSection` declaration; only beam-shaped parts qualify for the closed-form path |
| K8 `kinematic.no-material-declared` | `fix-arg` (`opts.materials`) | Add `materials: { partName: { material: 'steel' \| 'aluminum' \| 'pla' \| 'abs' \| 'pet' } }` for every loaded part |
| K9 `kinematic.mounting-hole.diameter-mismatch` | `fix-arg` | Set both connectors' hole diameter to the same value |
| `assembly.joint.static-hold.exceeded` | `rewrite-feature` | Increase the actuator torque/force to the value named in the message, or shorten/lighten the downstream link |
| `assembly.joint.static-hold.margin-low` | `rewrite-feature` | Increase the actuator torque/force for the requested margin, or shorten/lighten the downstream link |
| `kinematic.static-hold.no-actuator-declared` | `fix-arg` (`actuator`) | Add `actuator: { torqueNm }` (revolute) / `{ forceN }` (prismatic) to the joint declaration |
| `mechanism.load.torque-exceeded` / `mechanism.load.torque-margin-low` | `rewrite-feature` | Stronger actuator, lighter/shorter links, or slower motion (aim for 2x) |
| `mechanism.load.side-load-exceeded` | `rewrite-feature` | Add a coaxial bushing/bearing and list it in the mechanicalJoint `supports` |
| `mechanism.load.not-resolved` | `fix-arg` (`supports`) | At most two coaxial supports at different heights; no closed loop through the joint; a support that touches the shaft at two stations or not at all: name the part that bears (the bushing), or add a connector on the joint axis where it bears |
| `kinematic.sweep-tolerance.combo-cap-exceeded` | `fix-arg` (`params`) | Narrow the swept ranges/values, or split the sweep into multiple calls |

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

## Range-based vs timeline-based motion verification

Two interference checks cover motion, answering different questions — pick by
what you are validating:

- **Range-based swept collision (this skill)** —
  `kinematic.checkSweptCollision(arm, opts)` / the `verify({ check: 'swept-collision' })` MCP
  tool sweep ONE joint across its full `range` at a sample density and ask "is
  any pose in this joint's whole envelope a collision?" Use it as a feasibility
  gate while designing the mechanism — it does not care about timing, easing,
  or how multiple joints move together.

- **Timeline-based animation verification (`kernelcad-authoring`)** —
  `kernelcad animate` / the `capture_animation` MCP tool verify the specific
  multi-track poses an `animationView({...})` timeline actually visits
  (keyframe times + segment midpoints, eases and dwells included), then capture
  the MP4/frames. Use it to confirm a particular authored MOTION (several joints
  moving on a shared timeline) stays clear and to produce the motion artifact.

Both reuse the mechanism-validity interference rule (overlap > 0.01 mm³ and thicker than 0.01 mm; thinner is face contact) and honor
declared `solvedModel({ ignore })` pairs, so a pose clean under one is judged by
the same rule under the other. Range-based proves the joint's envelope is safe;
timeline-based proves the choreographed cycle is safe and renders it.

## Non-robotics mechanism coverage

These four calls work on any moving assembly, not just robot arms:

- **Linkages** — 4-bar, slider-crank, scissor jacks, toggle clamps: author
  the real closed loop with mates and drive only the input joint (see
  "Closed loops" below; `09-four-bar-loop-swept`)
- **Latches** — over-center, pawl-ratchet (`checkSweptCollision` over the
  latch handle reports the over-center point; `checkReachable` for the
  locking-pin engagement target — `06-over-center-latch-reachable`)
- **Hinges** — laptop clamshell, butterfly knife (`checkSweptCollision` over
  the hinge angle)
- **Gear trains and escapements** — tooth clearance, pawl engagement
  (`checkSweptCollision` over the driven-wheel rotation; `checkLoadCapacity`
  for the spring torque)
- **Scissor jacks** — the true closed loop (two crossed links, two sliders)
  swept over the lift angle (`04-scissor-jack-swept`); do not invent
  `joint.scissorLift`

## Closed loops

Closed mate loops are solved, not refused. The solver builds a spanning tree
from the grounded (first) part; every mate the tree leaves out closes one
loop, and **the loop is named after that mate**. Closure of the cut mate is a
residual (revolute: pivots meet and axes align; prismatic: no rotation, no
off-axis offset; ball: pivots meet; fastened: all six), solved by damped least
squares.

- **Drive only the input.** Pose values you pass (`solvedModel(poses)`,
  sweep joint, IK) are driven; the other loop mates are solved. Drive as many
  joints as the loop's mobility (rank of the closure Jacobian) — `solve_mates`
  reports `loop.mobility[]` with `mobility`, the spatial Grübler count,
  `drivenDof` and `independent` (a valid set of joints to drive). Over-driven
  loops whose values disagree fail with `kinematic.loop.mobility-mismatch`.
- **Author the as-built pose closed** (mate `pose` values or connector
  origins that already assemble), away from a flat or straight pose. Capture-
  time poses are the seed, never driven.
- **Continuation.** A solve far from the as-built pose marches there in ≤ 5°
  steps; sweeps (`checkSweptCollision`, `motion-load`, IK) seed each pose from
  the previous one. The mechanism stays in the assembly mode it was modeled
  in. Crossing a singular configuration stops the sweep with
  `kinematic.loop.branch-flip` (joint + pose) — it never switches silently.
  A pose the loop cannot reach stops it with `kinematic.loop.lockup`.
- **Pin a branch** with `arm.loopMode(loopName, { joint, sign: '+' | '-' })`
  for a loop modeled flat, or to make "goes over center" a finding: the elbow
  at `joint` (a revolute mate on that loop) must keep its side. `'+'` = the
  turn from the link on the joint's `a` side to the link on its `b` side is
  counter-clockwise about the `a` connector's axis. A sweep that carries the
  elbow straight and over reports `kinematic.loop.branch-flip` at that pose —
  for an over-center latch that pose is the design's over-center point.
- Loads on a joint inside a loop are statically indeterminate: `motion-load`
  poses the loop but reports that joint `mechanism.load.not-resolved`.
- The joint graph (`arm.revolute/.prismatic/.ball`) closes loops too: a part
  with a second parent joint. Child frames sit at their joint, so author the
  links in the assembled configuration (every joint at 0 closes).

## Mechanism delivery — non-bypassable

A mechanism build is **not deliverable** if any of these fail. No `ignore[]` workarounds for joint pairs; no shipping with a render that looks right while the assembly is broken.

1. `kernelcad validate --include-interference` returns CLEAN (this flag also **auto-enables the physics gate**, item 5 — so a deliverable mechanism must hold under gravity too; run `--include-interference --no-include-physics` to assert the kinematic gate alone: interference + disconnect + joint-mesh). `ignore[]` is reserved for true intra-part design contacts (a spring "bolted" to a beam, a captured washer); joint-pair contacts (the parts on either side of a `revolute` / `prismatic` mate) **may not be ignored** — they are the test signal for whether the mechanism is physically realized.
2. Every declared mate passes Gate 6 (mate physical realization): the pin/equivalent feature actually constrains the two parts, the pin stays in both holes at every pose in the mate's limits, and bearing surfaces align. Surfaces an advisory `assembly.mate.not-physically-realized` (`info` severity) only for revolute mates built with `joint.clevis(...)` whose `clevis.structural` is attached as `capacity: { structure }` on the mate; its pin, plate and knuckle dimensions come from that record. Other mates are not evaluated. The merge gates under the physics-grounded loop are `mechanism.disconnect` and `mechanism.interpenetration`, which fire under motion at validate-time. `joint.clevis(...)` passes by construction only when its returned geometry and connectors are actually used.
3. Every revolute joint passes Gate 4 (visual exposure) when it opts in with `exposure: 'exposed'` on the mate: the hinge mechanism reads as a hinge (fork daylight + pin stickout). Mates without the declaration are not checked.
4. The render-inspect loop is followed: a `kernelcad render inspect` pass after every geometry change, with visible issues called out.
5. (Opt-in) `kernelcad validate --include-interference --include-physics` exercises the physics-based gate (criteria 5+6). Adds two failure modes: `mechanism.unstable-under-gravity` (non-finite required torque at a sampled pose → singular kinematic configuration) and `mechanism.drops-on-release` (any joint drifts > 5° or any body translates > 50 mm in a 0.5 s drop-test from rest). Bare revolutes without a closed-loop spring / actuator fail this gate by construction — single-body "spring" parts fastened to one arm produce zero restoring moment around the joint they should brace. The closed-loop tendon API tracked in issue #361 is the kit-level fix.

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
  jointClearanceRadius: shoulder.parentConnector.clearanceRadius,
});
lowerArmPart.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: shoulder.childConnector.origin },
  axis: shoulder.childConnector.axis,
  jointClearanceRadius: shoulder.childConnector.clearanceRadius,
});

arm.mate('shoulder', 'base.shoulder', 'lower-arm.shoulder', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-10, 110],
});
```

The primitive returns the parent/child geometry to assign back to each part's `Shape` AND the connectors to bind the mate to. Do not pick `origin: [x, y, z]` by hand — bind to the returned connectors, which are kinematically consistent with the pin axis and the tongue/fork through-hole. Pass each connector's `clearanceRadius` through as `jointClearanceRadius`: the pin clearance bore is drilled through BOTH knuckles (an ISO 286 running fit — the pin floats in air, so pin-in-tongue shared volume is ~0), which means the joint-mesh-gap gate must know the pivot sits in a clearance bore rather than in solid. Omit it and the gate will false-flag the drilled knuckle as a `mechanism.joint-mesh-gap`.

Authoring discipline that PAIRS with the primitive:

- Author each part body so the user-supplied `pivotParent` (or the child's part-local origin) sits on (or just below) the body's surface, with clearance for the tongue's rotational sweep. For a vertical revolute axis, the parent body should terminate at least `knuckleR` below the pivot; for a horizontal beam-end joint, the beam should end `knuckleR + body_half_thickness` short of the pivot.
- Set `style.forkGapY > ARM_W` (the child's beam width) so the beam slips through the fork plates' gap without rubbing the inner faces.
- Set `style.tongueY ≈ ARM_W` so the tongue's plate thickness matches the beam — the tongue + beam form a continuous solid.
- For wider swing ranges, the primitive automatically lifts the pivot by `knuckleR · max(|sin|) + 1 mm`; you can opt out with `liftPivot: false` and lift manually.

Worked example: `examples/kinematic/luxo-lamp.kcad.ts` (a three-revolute arm) ships with `joint.clevis(...)` at all three revolute joints (joint-a, joint-b, joint-c) and validates clean under the **kinematic gate** — interference + disconnect + joint-mesh — with zero `ignore[]` entries. It does **not** pass the physics drop-test: the example's bare revolutes are braced only by single-body springs (zero joint moment), so the first joint drifts ~5° under gravity and `mechanism.drops-on-release` fires (the closed-loop tendon fix is #361 — see item 5 above). Caveat on the invocation: the bare `kernelcad validate --include-interference` CLI flag **auto-enables `--include-physics`** (validate.ts defaults the physics tier on whenever interference is on), so that exact command returns `mechanism: broken` / exit 2 on this example. To run the kinematic gate alone — the gate this example clears — use `kernelcad validate --include-interference --no-include-physics` (verdict `mechanism: real`, exit 0).

## Cookbook

Nine runnable snippets live in `cookbook/`. Each begins with a `// expected:`
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
4. `04-scissor-jack-swept.kcad.ts` — closed-loop scissor jack (two loops,
   mobility 1) swept over the lift angle; platform height checked against
   `L·sin(lift)`
5. `05-clamshell-hinge-swept.kcad.ts` — laptop-clamshell hinge across
   [0°, 135°]; K1 fires when the lid touches the table
6. `06-over-center-latch-reachable.kcad.ts` — over-center draw latch as a
   closed slider-crank: IK drives only the handle; a `loopMode` pin makes
   the over-center point (4.41°) a `kinematic.loop.branch-flip` finding
7. `07-static-hold-servo-arm.kcad.ts` — servo-driven shoulder joint;
   generous actuator passes, undersized actuator fires
   `assembly.joint.static-hold.exceeded`
8. `08-sweep-tolerance-clearance.kcad.ts` — swept clearance-gap param;
   the interference gate flips pass→fail past the closing threshold
9. `09-four-bar-loop-swept.kcad.ts` — closed-loop four-bar driven by the
   crank only; the first crank angle where the rocker hits a stop matches
   the closed form
