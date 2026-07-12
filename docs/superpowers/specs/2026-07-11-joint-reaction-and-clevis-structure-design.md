# Joint Reaction and Clevis Structure Design

## Status

Approved for implementation on 2026-07-11.

## Problem

The physical-use-case gate can currently prove that a held object is in sampled
quasi-static equilibrium and that declared actuator torque limits are not
exceeded. It cannot prove how the resulting contact wrench travels through the
mechanism or whether modeled joint hardware can carry it.

The older `jointLoadCapacity` path is not a suitable base for this work. It
uses manually supplied per-part loads, does not propagate loads across joints,
uses inconsistent torque units, and cannot consume the exact pose/contact
evidence in a static certificate. `MateRecord.maxLoad` is also not captured by
the public `Assembly.mate()` API, so source declarations are currently dropped.

## Goals

1. Derive a deterministic reaction wrench at every articulated mate on a
   supported load path from an exact passing static certificate.
2. Compare each reaction with an explicit, unit-bearing declared envelope
   without presenting that declaration as structural proof.
3. Derive a narrow clevis pin/bearing strength certificate from the same
   dimensions used to construct `joint.clevis()` geometry and from explicit
   engineering material properties.
4. Block on ambiguous topology, missing evidence, unsupported load cases, and
   insufficient safety factor.
5. Integrate the new evidence into `review_cad` and `design_loop` so physical
   acceptance cannot bypass it when the new checks are requested.

## Non-Goals

- Finite-element analysis, contact-pressure simulation, fatigue, creep,
  printed-material anisotropy, cap pullout, or fork-root bending.
- Stiffness-based reaction sharing across closed loops or multiple supports.
- Structural certification of custom hand-built hinge geometry from BREP/AABB
  heuristics.
- Repairing or accepting the existing five-finger hand.
- Making the current bar-grasp model pass the structural gate.

## Evidence Pipeline

The pipeline has three independent certificates. A later certificate may only
run from a passing earlier certificate.

1. `PhysicalUseCaseStaticCertificate`: exact common-contact pose, held-object
   force/moment residuals, contact forces, and actuator torque evidence.
2. `PhysicalUseCaseJointReactionCertificate`: reaction wrench at each
   articulated mate on each loaded tree.
3. `PhysicalUseCaseJointStructuralCertificate`: declared-envelope result and,
   when present and applicable, geometry/material-derived clevis checks.

An envelope pass is not a structural pass. The final result reports these
statuses separately.

## Static Contact Evidence

Each `PhysicalUseCaseStaticContactForce` gains explicit semantics:

```ts
interface PhysicalUseCaseStaticContactForce {
  contactA: string;
  contactB: string;
  pointWorldMm: Vec3;
  mechanismPart: string;
  forceOnHeldWorldN: Vec3;
  normalForceN: number;
  tangentialForceN: number;
  normalCapacityN: number;
  friction: number;
}
```

The old ambiguous `force` field is removed from new evidence. The force applied
to the mechanism is exactly `-forceOnHeldWorldN`; it must be negated once and
must not be combined with the held-object load a second time.

## Reaction Solver

### Supported topology

For the exact certificate pose:

1. Solve mates using the certificate's expanded coupled poses.
2. Collapse parts joined by `fastened` mates into rigid groups.
3. Build a graph whose remaining edges are articulated mates.
4. For every group receiving a certified contact force, find its connected
   component.
5. Require exactly one stable rigid group in that loaded component.
6. Require the component to be a tree (`edgeCount === vertexCount - 1`).

Closed loops, parallel articulated paths, zero stable roots, and multiple
stable roots produce `joint-reaction-indeterminate`. The solver must never pick
an arbitrary spanning tree or invent load sharing.

### Wrench propagation

Orient each supported tree away from its stable root. Attach each mechanism
contact force at `pointWorldMm` to the rigid group containing
`mechanismPart`. Traverse child subtrees from leaves to root.

For a subtree wrench expressed about point `q1`, shift it to joint point `q2`
with:

```text
M(q2) = M(q1) + (q1 - q2) x F
```

The reaction reported at an edge is the wrench exerted by the parent side on
the child-side free body, equal to the negative of the child's accumulated
external subtree wrench about the mate origin.

The mate origin is the solved world position of its connector pair. The axis
is the solved, normalized world direction of the parent-side axis connector.
Connector origins must coincide within the existing solver tolerance.

```ts
interface PhysicalUseCaseJointReactionEvidence {
  mateName: string;
  parentPart: string;
  childPart: string;
  pointWorldMm: Vec3;
  axisWorld: Vec3;
  forceWorldN: Vec3;
  momentWorldNmm: Vec3;
  resultantForceN: number;
  resultantMomentNmm: number;
  axialForceN: number;
  radialForceN: number;
  axisMomentNmm: number;
  bendingMomentNmm: number;
}
```

All internal mechanics use N, mm, Nmm, and MPa.

## Declared Envelope

The public mate API gains a unit-explicit capacity namespace:

```ts
interface MateCapacityEnvelope {
  maxResultantForceN: number;
  maxResultantMomentNmm: number;
}

interface MateCapacity {
  envelope?: MateCapacityEnvelope;
  structure?: ClevisStructuralModel;
}

arm.mate(name, a, b, type, {
  capacity: {
    envelope: {
      maxResultantForceN: 120,
      maxResultantMomentNmm: 800,
    },
    structure: clevis.structural,
  },
});
```

Envelope values must be positive and finite. A supplied structural model is
only valid on a revolute mate. Missing either envelope limit is `undeclared`,
not pass.

Legacy `maxLoad: { force, torque }` is accepted only as a deprecated adapter.
`force` maps to N and `torque` maps once from Nm to Nmm. Supplying both
`capacity` and `maxLoad` is invalid. A partial legacy declaration remains
undeclared for the new resultant-envelope gate.

Envelope status is `pass | exceeded | undeclared`. Exceeded and undeclared are
blocking when reaction-capacity review is requested.

## Clevis Structural Descriptor

`joint.clevis()` emits a descriptor from its resolved build dimensions. It is
not reconstructed later from rendered material or BREP heuristics.

```ts
interface StructuralMaterial {
  name: string;
  model: 'isotropic-ductile';
  yieldStrengthMPa: number;
  bearingStrengthMPa: number;
  shearStrengthMPa?: number;
}

interface ClevisStructuralModel {
  kind: 'clevis-double-shear-v1';
  source: 'joint.clevis';
  pinDiameterMm: number;
  boreDiameterMm: number;
  forkPlateThicknessMm: number;
  forkPlateCount: 2;
  tongueThicknessMm: number;
  forkGapMm: number;
  supportSpanMm: number;
  edgeDistanceMm: number;
  materials?: {
    pin: StructuralMaterial;
    fork: StructuralMaterial;
    tongue: StructuralMaterial;
  };
}
```

For resolved clevis style:

- `pinDiameterMm = 2 * pinR`
- `boreDiameterMm = 2 * (pinR + holeClearance)`
- `forkPlateThicknessMm = plateT`
- `tongueThicknessMm = tongueY`
- `forkGapMm = forkGapY`
- `supportSpanMm = forkGapY + plateT`
- `edgeDistanceMm = knuckleR`

PBR material and part density are never treated as strength evidence.

## Clevis Strength Model

The first model applies only when axial force is at most 0.01 N and
perpendicular reaction moment is at most 0.1 Nmm, matching the non-weakenable
default statics residual tolerances. A revolute-axis moment is delegated to
the already-required actuator/transmission evidence and is not attributed to
pin friction.

Given radial reaction `V`, pin diameter `d`, bore diameter `db`, fork plate
thickness `tf`, tongue thickness `tt`, support span `L`, and edge distance `e`:

```text
pin area A                 = pi * d^2 / 4
double-shear pin stress    = V / (2 * A)
center-load pin moment     = V * L / 4
pin bending stress         = 32 * M / (pi * d^3)
pin von Mises stress       = sqrt(bending^2 + 3 * shear^2)
tongue bearing stress      = V / (d * tt)
fork bearing stress        = V / (2 * d * tf)
ligament                   = e - db / 2
tongue tear-out stress     = V / (2 * ligament * tt)
fork tear-out stress       = V / (4 * ligament * tf)
tongue net-section stress  = V / ((2 * e - db) * tt)
fork net-section stress    = V / (2 * (2 * e - db) * tf)
```

Geometry with non-positive area, ligament, or net section is invalid.
`shearStrengthMPa` is used when explicitly declared; otherwise the solver may
derive `yieldStrengthMPa / sqrt(3)` only for the declared
`isotropic-ductile` model and records that assumption. Bearing strength is
always explicit.

Every check reports stress, allowable, and factor of safety (`null` only for
zero stress, meaning unbounded rather than unknown). The use-case
criterion `minJointSafetyFactor` defaults to 2.0 and may only be increased.
The structural status is `pass | failed | input-incomplete |
unsupported-load-case`.

Axial force above 0.01 N, perpendicular reaction moment above 0.1 Nmm, missing materials, and
custom geometry without a `joint.clevis` descriptor are blockers. They are not
silently omitted.

## Diagnostics

New error diagnostics:

- `assembly.physical-use-case.joint-reaction-input-incomplete`
- `assembly.physical-use-case.joint-reaction-indeterminate`
- `assembly.physical-use-case.joint-capacity-undeclared`
- `assembly.physical-use-case.joint-capacity-exceeded`
- `assembly.physical-use-case.joint-structure-input-incomplete`
- `assembly.physical-use-case.joint-structure-unsupported-load-case`
- `assembly.physical-use-case.joint-structure-insufficient`

Diagnostic messages name the use case and mate and include the measured value,
limit, or missing/unsupported evidence. No diagnostic may claim a comparison
was performed when it was not.

## Tool Integration

`review_cad` adds:

- `includePhysicalUseCaseJointReactions`
- `includePhysicalUseCaseJointStructure`
- `physicalUseCaseJointReactionCertificates`
- `physicalUseCaseJointStructuralCertificates`

Structure review implies statics and reactions. Reaction review implies
statics. `design_loop` enables both checks whenever an attempt declares a
physical use case, alongside the existing reachability and statics checks.

## Acceptance Tests

1. A 10 N serial-chain load with 50 mm and 150 mm arms produces 500 Nmm and
   1500 Nmm joint moments.
2. Changing the certified articulated pose changes the derived moment arm.
3. Branch forces combine vectorially and can cancel at an upstream joint.
4. The contact force is negated exactly once and applied at its certified
   midpoint.
5. A fastened group is collapsed; a closed articulated loop and a two-root
   tree are rejected as indeterminate.
6. Public `mate({ capacity })` capture validates and preserves unit-bearing
   values; the legacy Nm adapter converts once.
7. Hand-calculated clevis equation tests cover pass/fail boundaries and invalid
   geometry.
8. `joint.clevis()` emits dimensions identical to its resolved style.
9. A complete clevis fixture passes, then fails when only pin diameter or
   material strength is reduced.
10. Missing descriptor, axial load, and perpendicular moment are blocking.
11. The current bar-grasp example is structurally incomplete/unsupported, not
    green.
12. The current five-finger example retains its reachability rejection.
