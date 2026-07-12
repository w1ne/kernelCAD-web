# Joint Reaction and Clevis Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add pose-bound joint reaction, declared envelope, and geometry/material-derived clevis strength certificates to the physical-use-case gate.

**Architecture:** Enrich the existing static contact certificate, derive reaction wrenches through uniquely rooted articulated trees, then evaluate those reactions in two separate layers: declared resultant envelopes and a narrow `joint.clevis` closed-form structural model. `review_cad` and `design_loop` orchestrate the layers and keep ambiguous or unsupported physics blocking.

**Tech Stack:** TypeScript, Vitest, existing Assembly/mate solver, kernelCAD MCP tool schemas.

---

## File Map

- `src/modeling/mates/physicalUseCaseStatics.ts`: make contact force point, sign, and mechanism ownership explicit.
- `src/modeling/mates/physicalUseCaseJointReactions.ts`: exact-pose topology validation and subtree wrench propagation.
- `src/modeling/mates/physicalUseCaseJointReactions.test.ts`: hand-calculated reaction solver tests.
- `src/modeling/mates/mate.ts`: public capacity types and legacy adapter type.
- `src/modeling/capture/assembly.ts`: capture-time capacity validation and preservation.
- `src/modeling/mates/physicalUseCaseJointCapacity.ts`: declared envelope comparison.
- `src/modeling/mates/physicalUseCaseJointCapacity.test.ts`: capacity capture, conversion, and threshold tests.
- `src/modeling/joints/types.ts`: structural material/model types and clevis engineering options.
- `src/modeling/joints/clevis.ts`: emit structural dimensions from resolved build geometry.
- `src/modeling/joints/index.ts`: export new public structural types.
- `src/modeling/mates/clevisJointStructure.ts`: pure closed-form clevis checks.
- `src/modeling/mates/clevisJointStructure.test.ts`: equation, safety-factor, and unsupported-load tests.
- `src/modeling/mates/physicalUseCase.ts`: orchestrate reaction/capacity/structure reviews and map diagnostics.
- `src/agent/mcp/tools/reviewCad.ts`: request and return new certificates.
- `src/agent/mcp/tools/designLoop.ts`: enable both checks for physical-use-case attempts.
- `src/agent/mcp/toolRegistry.ts`: publish new input fields.
- `src/agent/mcp/toolOutputSchemas.ts`: publish new output evidence.
- Existing physical-use-case, MCP, bar-grasp, and five-finger tests: integration/regression coverage.

### Task 1: Exact-Pose Joint Reaction Certificate

**Files:**
- Modify: `src/modeling/mates/physicalUseCaseStatics.ts`
- Create: `src/modeling/mates/physicalUseCaseJointReactions.ts`
- Create: `src/modeling/mates/physicalUseCaseJointReactions.test.ts`
- Modify: `src/modeling/mates/physicalUseCaseStatics.test.ts`

- [x] **Step 1: Write failing tests for explicit static contact evidence**

Update the passing static-certificate assertion to require the actual world
contact point, mechanism part, and unambiguous held-object force:

```ts
expect(certificate.contactForces[0]).toMatchObject({
  pointWorldMm: [50, 0, 0],
  mechanismPart: 'finger',
  forceOnHeldWorldN: expect.any(Array),
});
```

Replace every existing test read of `contact.force` with
`contact.forceOnHeldWorldN` so the ambiguous field can be removed.

- [x] **Step 2: Run the static test and verify RED**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCaseStatics.test.ts
```

Expected: FAIL because `pointWorldMm`, `mechanismPart`, and
`forceOnHeldWorldN` do not exist.

- [x] **Step 3: Add explicit contact fields to static evidence**

Change the public evidence type and `evaluateCandidate()` construction:

```ts
export interface PhysicalUseCaseStaticContactForce {
  readonly contactA: string;
  readonly contactB: string;
  readonly pointWorldMm: Vec3;
  readonly mechanismPart: string;
  readonly forceOnHeldWorldN: Vec3;
  readonly normalForceN: number;
  readonly tangentialForceN: number;
  readonly normalCapacityN: number;
  readonly friction: number;
}
```

Use `safePartName(contact.mechanismRef)` and copy `contact.point`/the solved
held force. Update internal consumers to read `forceOnHeldWorldN`; do not keep
an ambiguous public `force` alias after test migration.

- [x] **Step 4: Run the static test and verify GREEN**

Run the command from Step 2. Expected: all existing statics tests pass with the
new explicit evidence.

- [x] **Step 5: Write failing reaction tests**

Create fixtures around the public reaction review entry point:

```ts
const result = await reviewPhysicalUseCaseJointReactions(
  arm,
  useCase,
  staticCertificate,
);
expect(result.issues).toEqual([]);
expect(result.certificates[0].reactions).toEqual(expect.arrayContaining([
  expect.objectContaining({ mateName: 'distal', resultantMomentNmm: 500 }),
  expect.objectContaining({ mateName: 'proximal', resultantMomentNmm: 1500 }),
]));
```

Add separate tests proving exact-pose moment-arm changes, branch-force vector
cancellation, force negation exactly once, fastened-group collapse, rejection
of an articulated loop, and rejection of two stable roots.

- [x] **Step 6: Run the reaction test and verify RED**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCaseJointReactions.test.ts
```

Expected: FAIL because the module and review function do not exist.

- [x] **Step 7: Implement the minimal reaction solver**

Export these contracts:

```ts
export interface PhysicalUseCaseJointReactionEvidence {
  readonly mateName: string;
  readonly parentPart: string;
  readonly childPart: string;
  readonly pointWorldMm: Vec3;
  readonly axisWorld: Vec3;
  readonly forceWorldN: Vec3;
  readonly momentWorldNmm: Vec3;
  readonly resultantForceN: number;
  readonly resultantMomentNmm: number;
  readonly axialForceN: number;
  readonly radialForceN: number;
  readonly axisMomentNmm: number;
  readonly bendingMomentNmm: number;
}

export type PhysicalUseCaseJointReactionIssue =
  | { readonly kind: 'joint-reaction-input-incomplete'; readonly useCaseName: string; readonly message: string }
  | { readonly kind: 'joint-reaction-indeterminate'; readonly useCaseName: string; readonly message: string };

export interface PhysicalUseCaseJointReactionCertificate {
  readonly useCaseName: string;
  readonly poses: NumericPoses;
  readonly reactions: readonly PhysicalUseCaseJointReactionEvidence[];
}
```

Use union-find to collapse fastened mates, reject any loaded articulated
component that is not a single-root tree, orient it from the stable group, and
accumulate subtree wrenches bottom-up. Resolve joint origins and axes from the
exact solved transforms. Apply `forceOnMechanism = -forceOnHeldWorldN` once.

- [x] **Step 8: Run reaction and statics tests and verify GREEN**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCaseJointReactions.test.ts src/modeling/mates/physicalUseCaseStatics.test.ts
```

Expected: both files pass.

### Task 2: Unit-Bearing Mate Envelope

**Files:**
- Modify: `src/modeling/mates/mate.ts`
- Modify: `src/modeling/capture/assembly.ts`
- Create: `src/modeling/mates/physicalUseCaseJointCapacity.ts`
- Create: `src/modeling/mates/physicalUseCaseJointCapacity.test.ts`
- Modify: `src/modeling/mates/jointLoadCapacity.ts`

- [x] **Step 1: Write failing public capture tests**

Add tests that author and inspect:

```ts
arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
  capacity: {
    envelope: {
      maxResultantForceN: 120,
      maxResultantMomentNmm: 800,
    },
  },
});
expect(arm.__mates()[0].capacity?.envelope).toEqual({
  maxResultantForceN: 120,
  maxResultantMomentNmm: 800,
});
```

Also assert that zero, negative, NaN, or infinite limits throw; supplying both
`capacity` and `maxLoad` throws; and legacy `{ force: 120, torque: 0.8 }`
normalizes to 120 N and 800 Nmm for the new review.

- [x] **Step 2: Run the capacity test and verify RED**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCaseJointCapacity.test.ts
```

Expected: FAIL because `capacity` is not accepted or preserved.

- [x] **Step 3: Add capture types and validation**

Add:

```ts
export interface MateCapacityEnvelope {
  readonly maxResultantForceN: number;
  readonly maxResultantMomentNmm: number;
}

export interface MateCapacity {
  readonly envelope?: MateCapacityEnvelope;
}
```

Extend `MateRecord` and `Assembly.mate()` options with `capacity` and the legacy
`maxLoad`. Validate positive finite envelope fields, reject `capacity` plus
`maxLoad`, and copy nested objects so later caller mutation cannot alter
captured evidence. Keep the old `maxLoad` record only for compatibility with
the old external-load adapter. Task 3 extends `MateCapacity` with structural
evidence after the clevis type exists.

- [x] **Step 4: Write failing envelope comparison tests**

Use hand-built `PhysicalUseCaseJointReactionEvidence` and assert:

```ts
expect(reviewJointReactionCapacity(mate, reaction)).toMatchObject({ status: 'pass' });
expect(reviewJointReactionCapacity(overloadedMate, reaction)).toMatchObject({
  status: 'exceeded',
  forceExceeded: true,
});
expect(reviewJointReactionCapacity(mateWithoutCapacity, reaction)).toMatchObject({
  status: 'undeclared',
});
```

Cover exact threshold equality and one-time legacy Nm-to-Nmm conversion.

- [x] **Step 5: Run the comparison test and verify RED**

Run the command from Step 2. Expected: capture tests pass after Step 3 but the
comparison tests fail because the function is missing.

- [x] **Step 6: Implement the pure envelope comparison**

Return unit-bearing evidence:

```ts
export interface JointReactionCapacityEvidence {
  readonly mateName: string;
  readonly status: 'pass' | 'exceeded' | 'undeclared';
  readonly resultantForceN: number;
  readonly resultantMomentNmm: number;
  readonly maxResultantForceN?: number;
  readonly maxResultantMomentNmm?: number;
  readonly forceExceeded: boolean;
  readonly momentExceeded: boolean;
}
```

Normalize the legacy adapter in one helper. A partial legacy declaration is
`undeclared`; it must never synthesize an infinite counterpart. Mark the old
manual external-load checker as deprecated in its JSDoc and remove any message
that says a load was exceeded when no comparison ran.

- [x] **Step 7: Run capacity tests and verify GREEN**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCaseJointCapacity.test.ts src/modeling/mates/jointLoadCapacity.test.ts
```

Expected: both files pass.

### Task 3: Geometry-Derived Clevis Strength

**Files:**
- Modify: `src/modeling/joints/types.ts`
- Modify: `src/modeling/joints/clevis.ts`
- Modify: `src/modeling/joints/index.ts`
- Modify: `src/modeling/joints/clevis.test.ts`
- Modify: `src/modeling/mates/mate.ts`
- Modify: `src/modeling/capture/assembly.ts`
- Create: `src/modeling/mates/clevisJointStructure.ts`
- Create: `src/modeling/mates/clevisJointStructure.test.ts`

- [x] **Step 1: Write failing clevis descriptor tests**

Build a clevis with explicit style and engineering material:

```ts
const steel = {
  name: 'test steel',
  model: 'isotropic-ductile' as const,
  yieldStrengthMPa: 250,
  bearingStrengthMPa: 400,
};
const result = joint.clevis({
  ...bodies,
  axis: 'Y',
  pivotParent: [0, 0, 0],
  style: { pinR: 3, holeClearance: 0.2, plateT: 4, tongueY: 5, forkGapY: 6, knuckleR: 10 },
  engineering: { pin: steel, fork: steel, tongue: steel },
});
expect(result.structural).toMatchObject({
  kind: 'clevis-double-shear-v1',
  pinDiameterMm: 6,
  boreDiameterMm: 6.4,
  forkPlateThicknessMm: 4,
  tongueThicknessMm: 5,
  forkGapMm: 6,
  supportSpanMm: 10,
  edgeDistanceMm: 10,
});
```

Assert that invalid material strengths throw at construction and that omitting
`engineering` still emits geometry with no materials.

- [x] **Step 2: Run clevis tests and verify RED**

Run:

```bash
npx vitest run src/modeling/joints/clevis.test.ts
```

Expected: FAIL because engineering options and `structural` output do not
exist.

- [x] **Step 3: Add structural public types and clevis emission**

Add the exact `StructuralMaterial` and `ClevisStructuralModel` contracts from
the design spec, plus `engineering?: { pin; fork; tongue }` on
`ClevisJointOptions` and `structural` on `ClevisJoint`. Validate every declared
strength as positive finite. Build all structural dimensions only from the
resolved `style` used by geometry.

Extend `MateCapacity` with
`readonly structure?: ClevisStructuralModel`, preserve a defensive copy in
`Assembly.mate()`, and reject structural evidence on non-revolute mates.

- [x] **Step 4: Run clevis tests and verify GREEN**

Run the command from Step 2. Expected: all clevis tests pass.

- [x] **Step 5: Write failing pure equation tests**

Create a radial-load fixture and independently calculate expected values:

```ts
const result = reviewClevisJointStructure({
  reaction,
  model,
  minSafetyFactor: 2,
});
expect(result.status).toBe('pass');
expect(result.checks.pinDoubleShear.stressMPa).toBeCloseTo(
  radialForceN / (2 * Math.PI * pinDiameterMm ** 2 / 4),
  10,
);
expect(result.checks.pinBending.stressMPa).toBeCloseTo(
  32 * (radialForceN * supportSpanMm / 4) / (Math.PI * pinDiameterMm ** 3),
  10,
);
```

Add tests where only pin diameter flips pass to failed, only material strength
flips pass to failed, invalid ligament is input-incomplete, missing materials
is input-incomplete, axial force is unsupported, and perpendicular moment is
unsupported. Verify the implicit shear allowable records the
`yield/sqrt(3)` assumption.

- [x] **Step 6: Run equation tests and verify RED**

Run:

```bash
npx vitest run src/modeling/mates/clevisJointStructure.test.ts
```

Expected: FAIL because the structural review module does not exist.

- [x] **Step 7: Implement the pure structural review**

Implement the equations and statuses exactly as specified:

```ts
export type ClevisJointStructureStatus =
  | 'pass'
  | 'failed'
  | 'input-incomplete'
  | 'unsupported-load-case';

export interface ClevisJointStructureReview {
  readonly mateName: string;
  readonly status: ClevisJointStructureStatus;
  readonly minSafetyFactor: number;
  readonly checks: Readonly<Record<string, StructuralCheckEvidence>>;
  readonly assumptions: readonly string[];
  readonly message?: string;
}
```

Use N/mm2 = MPa directly. Reject `minSafetyFactor < 2`, non-positive geometry,
axial force above 0.01 N, and perpendicular bending moment above 0.1 Nmm. Do
not consume PBR material, density, or generic BREP measurements.

- [x] **Step 8: Run clevis and equation tests and verify GREEN**

Run:

```bash
npx vitest run src/modeling/joints/clevis.test.ts src/modeling/mates/clevisJointStructure.test.ts
```

Expected: both files pass.

### Task 4: Physical Gate and MCP Integration

**Files:**
- Modify: `src/modeling/mates/physicalUseCase.ts`
- Modify: `src/modeling/mates/physicalUseCase.test.ts`
- Modify: `src/agent/mcp/tools/reviewCad.ts`
- Modify: `src/agent/mcp/tools/designLoop.ts`
- Modify: `src/agent/mcp/toolRegistry.ts`
- Modify: `src/agent/mcp/toolOutputSchemas.ts`
- Modify: `tests/integration/mcp/physicalUseCaseGate.test.ts`
- Modify: `tests/integration/mcp/designLoop.test.ts`
- Modify: `tests/unit/mcp/reviewCadOutputSchema.test.ts`
- Modify: `tests/integration/examples/functionFirstBarGraspSkeleton.test.ts`
- Modify: `tests/integration/examples/fiveFingerKinematicHand.test.ts`

- [x] **Step 1: Write failing orchestration tests**

Add an in-memory complete clevis mechanism and request structure review:

```ts
const result = await reviewPhysicalUseCasesWithReachability(arm, {
  includeReachability: true,
  includeStatics: true,
  includeJointReactions: true,
  includeJointStructure: true,
});
expect(result.jointReactionCertificates).toHaveLength(1);
expect(result.jointStructuralCertificates[0].joints[0]).toMatchObject({
  envelope: { status: 'pass' },
  structure: { status: 'pass' },
});
```

Add diagnostic assertions for indeterminate topology, undeclared envelope,
envelope exceeded, missing structural model/materials, unsupported axial or
perpendicular moment, and insufficient safety factor. Verify
`minJointSafetyFactor` defaults to 2 and values below 2 are rejected.

- [x] **Step 2: Run physical-use-case tests and verify RED**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCase.test.ts
```

Expected: FAIL because options, outputs, and diagnostics do not exist.

- [x] **Step 3: Implement physical-use-case orchestration**

Extend `PhysicalUseCaseCriteria` with `minJointSafetyFactor`, validating it as
finite and at least 2. Extend options/results with:

```ts
readonly includeJointReactions?: boolean;
readonly includeJointStructure?: boolean;
readonly jointReactionCertificates: readonly PhysicalUseCaseJointReactionCertificate[];
readonly jointStructuralCertificates: readonly PhysicalUseCaseJointStructuralCertificate[];
```

Define the aggregate certificate explicitly:

```ts
export interface PhysicalUseCaseJointStructuralCertificate {
  readonly useCaseName: string;
  readonly poses: NumericPoses;
  readonly joints: readonly {
    readonly mateName: string;
    readonly envelope: JointReactionCapacityEvidence;
    readonly structure?: ClevisJointStructureReview;
  }[];
}
```

`includeJointStructure` implies reactions; reactions imply statics. For every
passing static certificate, run reactions, then envelope and structure reviews.
Map every issue/status to the exact diagnostic codes in the design spec. Only
emit a structural certificate when the review actually ran; preserve failed
evidence alongside its blocking diagnostic.

- [x] **Step 4: Run physical-use-case tests and verify GREEN**

Run the command from Step 2. Expected: all tests pass.

- [x] **Step 5: Write failing MCP/tool integration tests**

Assert `review_cad` accepts:

```ts
{
  includePhysicalUseCaseJointReactions: true,
  includePhysicalUseCaseJointStructure: true,
}
```

and returns `physicalUseCaseJointReactionCertificates` and
`physicalUseCaseJointStructuralCertificates`. Assert that `design_loop`
forwards both flags automatically for source containing `physicalUseCase(`.
Update schema tests to require arrays with unit-bearing reaction and stress
properties.

- [x] **Step 6: Run MCP tests and verify RED**

Run:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts tests/integration/mcp/designLoop.test.ts tests/unit/mcp/reviewCadOutputSchema.test.ts
```

Expected: FAIL because the registry, tools, and output schemas lack the fields.

- [x] **Step 7: Wire review_cad, design_loop, registry, and schemas**

Add the two booleans to the review input and registry. Forward them to the
physical-use-case review, include both certificate arrays in success and
failure output, and describe that structure implies reaction/statics. In
`designLoop`, set both true beside existing reachability/statics flags whenever
the attempt declares a physical use case. Extend JSON output schemas without
loosening existing required fields.

- [x] **Step 8: Make example expectations honest**

Keep the direct bar test green only when structure review is not requested.
Add a structure-enabled assertion requiring one of:

```ts
expect(codes).toContain(
  'assembly.physical-use-case.joint-structure-input-incomplete',
);
expect(codes).toContain(
  'assembly.physical-use-case.joint-structure-unsupported-load-case',
);
```

Keep the five-finger test's reachability rejection unchanged; do not add a
structural pass assertion for it.

- [x] **Step 9: Run all focused tests**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCaseStatics.test.ts src/modeling/mates/physicalUseCaseJointReactions.test.ts src/modeling/mates/physicalUseCaseJointCapacity.test.ts src/modeling/joints/clevis.test.ts src/modeling/mates/clevisJointStructure.test.ts src/modeling/mates/physicalUseCase.test.ts tests/integration/mcp/physicalUseCaseGate.test.ts tests/integration/mcp/designLoop.test.ts tests/unit/mcp/reviewCadOutputSchema.test.ts tests/integration/examples/functionFirstBarGraspSkeleton.test.ts tests/integration/examples/fiveFingerKinematicHand.test.ts
```

Expected: all focused tests pass; the bar and five-finger rejection assertions
remain explicit.

- [x] **Step 10: Run static verification**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both commands exit zero. Existing generated TanStack route warnings
may be reported by typecheck but are not failures.

- [x] **Step 11: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only the intended current-session files
plus the pre-existing dirty hand/tooling files. Do not revert or commit
unrelated existing changes.
