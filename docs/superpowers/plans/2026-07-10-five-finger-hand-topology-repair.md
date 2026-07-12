# Five-Finger Hand Topology Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current five-finger hand pass `reviewJointTopology(...)` by adding real passive joint-support evidence and treating the grasp cylinder as a contact target rather than hand structure.

**Architecture:** Add an assembly-level passive `jointSupport(...)` intent that reuses the support-side fastened-path rule already used by driven `mechanicalJoint(...)`. Add a narrow part role for contact targets so topology ignores load-path checks on objects that are explicitly not part of the hand structure. Apply both to the existing hand without visual redesign.

**Tech Stack:** TypeScript, Vitest, KernelCAD Assembly capture API, existing mate topology reviewer and five-finger hand example.

---

## File Structure

- Modify `src/modeling/capture/assembly.ts`
  - Add `JointSupportIntentOpts`, `JointSupportIntentRecord`, `AssemblyPartRole`, `AssemblyPartOpts.role`, stored part role, `jointSupport(...)`, and `__jointSupportIntents()`.
- Modify `tests/unit/assemblies/assemblyCapture.test.ts`
  - Add capture/validation tests for passive joint support and contact-target role storage.
- Modify `src/modeling/mates/jointTopology.ts`
  - Accept either driven `mechanicalJoint(...)` or passive `jointSupport(...)` as revolute support evidence.
  - Skip `assembly.connectivity.no-load-path` for physical-use-case load parts whose stored role is `contact-target`.
- Modify `src/modeling/mates/jointTopology.test.ts`
  - Add passive-supported hinge pass/fail tests.
  - Add contact-target load-path skip test.
- Modify `examples/robot-hand/five-finger-kinematic-hand.kcad.ts`
  - Add passive support declarations for every unsupported revolute.
  - Mark `grasp-cylinder` as `role: 'contact-target'`.
- Modify `tests/integration/examples/fiveFingerKinematicHand.test.ts`
  - Change the topology regression from expected blockers to expected empty diagnostics.

---

### Task 1: Capture Passive Joint Support And Contact Target Role

**Files:**
- Modify: `src/modeling/capture/assembly.ts`
- Modify: `tests/unit/assemblies/assemblyCapture.test.ts`

- [x] **Step 1: Write failing capture tests**

Add tests near the existing `mechanicalJoint(...)` capture tests:

```ts
it('captures passive joint support intent records', () => {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('passive support');

  const returned = arm.jointSupport('pip-bearing', {
    mate: 'index-pip',
    shaft: 'index-proximal',
    supports: ['index-proximal'],
    output: 'index-middle',
    requiredSupport: {
      kind: 'hinge-bracket',
      around: 'index-proximal.pip',
      supports: ['index-proximal'],
      minBearingLengthMm: 6,
    },
  });

  expect(returned).toBe(arm);
  expect(arm.__jointSupportIntents()).toEqual([
    {
      name: 'pip-bearing',
      mate: 'index-pip',
      shaft: 'index-proximal',
      supports: ['index-proximal'],
      output: 'index-middle',
      requiredSupport: {
        kind: 'hinge-bracket',
        around: 'index-proximal.pip',
        supports: ['index-proximal'],
        minBearingLengthMm: 6,
      },
    },
  ]);
});

it('stores contact target part roles', () => {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('contact target');

  arm.part('grasp-cylinder', kcad.cylinder(20, 10), { role: 'contact-target' });

  expect(arm.__parts().find((part) => part.name === 'grasp-cylinder')?.role).toBe('contact-target');
});
```

- [x] **Step 2: Verify red**

Run:

```bash
npx vitest run tests/unit/assemblies/assemblyCapture.test.ts -t "passive joint support|contact target" --reporter=dot
```

Expected: FAIL because `jointSupport`, `__jointSupportIntents`, and `role` do not exist.

- [x] **Step 3: Implement capture API**

In `src/modeling/capture/assembly.ts`:

```ts
export type AssemblyPartRole = 'structure' | 'contact-target';

export interface JointSupportIntentOpts {
  readonly mate: string;
  readonly shaft: string;
  readonly supports: readonly string[];
  readonly output: string;
  readonly requiredSupport?: MechanicalJointSupportRequirement;
}

export interface JointSupportIntentRecord extends JointSupportIntentOpts {
  readonly name: string;
}
```

Add `role?: AssemblyPartRole` to `AssemblyPartOpts` and `AssemblyPartStored`. Store it in `part(...)` only when defined.

Add a private array beside `mechanicalJointIntents`:

```ts
private readonly jointSupportIntents: JointSupportIntentRecord[] = [];
```

Add `jointSupport(name, opts)` mirroring `mechanicalJoint(...)` validation, without `actuator`:

```ts
jointSupport(name: string, opts: JointSupportIntentOpts): this {
  validateMechanicalIntentName('name', name);
  if (this.jointSupportIntents.some((intent) => intent.name === name)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.jointSupport.duplicate-name: joint support intent '${name}' is already declared.`,
      undefined,
      `invalid-args.assembly.joint-support-duplicate-name — use a unique jointSupport name.`,
    );
  }
  validateMechanicalIntentName('mate', opts.mate);
  validateMechanicalIntentName('shaft', opts.shaft);
  validateMechanicalIntentName('output', opts.output);
  if (!Array.isArray(opts.supports) || opts.supports.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.jointSupport.invalid-ref: joint support intent '${name}' requires at least one support part.`,
      undefined,
      `invalid-args.assembly.joint-support-invalid-ref — pass supports: ['support-part-name', ...].`,
    );
  }
  for (const support of opts.supports) {
    validateMechanicalIntentName('supports[]', support);
  }
  if (opts.requiredSupport !== undefined) {
    validateMechanicalIntentName('requiredSupport.kind', opts.requiredSupport.kind);
    validateMechanicalIntentName('requiredSupport.around', opts.requiredSupport.around);
    for (const support of opts.requiredSupport.supports ?? []) {
      validateMechanicalIntentName('requiredSupport.supports[]', support);
    }
    if (
      opts.requiredSupport.minBearingLengthMm !== undefined &&
      (!Number.isFinite(opts.requiredSupport.minBearingLengthMm) || opts.requiredSupport.minBearingLengthMm <= 0)
    ) {
      throw new KernelError('feature.invalid-args', `assembly.jointSupport.invalid-required-support: minBearingLengthMm must be a positive finite number.`);
    }
    if (
      opts.requiredSupport.clearanceMm !== undefined &&
      (!Number.isFinite(opts.requiredSupport.clearanceMm) || opts.requiredSupport.clearanceMm < 0)
    ) {
      throw new KernelError('feature.invalid-args', `assembly.jointSupport.invalid-required-support: clearanceMm must be a non-negative finite number.`);
    }
  }

  this.jointSupportIntents.push({
    name,
    mate: opts.mate,
    shaft: opts.shaft,
    supports: [...opts.supports],
    output: opts.output,
    ...(opts.requiredSupport !== undefined ? {
      requiredSupport: {
        ...opts.requiredSupport,
        ...(opts.requiredSupport.supports !== undefined ? { supports: [...opts.requiredSupport.supports] } : {}),
      },
    } : {}),
  });
  return this;
}
```

Add:

```ts
__jointSupportIntents(): readonly JointSupportIntentRecord[] {
  return this.jointSupportIntents;
}
```

- [x] **Step 4: Verify green**

Run:

```bash
npx vitest run tests/unit/assemblies/assemblyCapture.test.ts -t "passive joint support|contact target" --reporter=dot
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/modeling/capture/assembly.ts tests/unit/assemblies/assemblyCapture.test.ts
git commit -m "feat: capture passive joint support"
```

---

### Task 2: Teach Topology Gate Passive Support And Contact Targets

**Files:**
- Modify: `src/modeling/mates/jointTopology.ts`
- Modify: `src/modeling/mates/jointTopology.test.ts`

- [x] **Step 1: Write failing topology tests**

Add tests to `src/modeling/mates/jointTopology.test.ts`:

```ts
it('accepts passive support intents for supported revolute hinges', () => {
  const arm = armLike({
    parts: [
      { name: 'proximal', role: 'structure', mateConnectors: [{ name: 'pip', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] }] },
      { name: 'middle', role: 'structure', mateConnectors: [{ name: 'pip', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] }] },
    ],
    mates: [{ name: 'pip', a: 'proximal.pip', b: 'middle.pip', type: 'revolute', limitsDeg: [0, 40] }],
    jointSupportIntents: [{ mate: 'pip', shaft: 'proximal', supports: ['proximal'], output: 'middle' }],
  });

  expect(codesOf(arm)).not.toContain('assembly.joint-topology.unsupported-axis');
});

it('rejects passive support intents disconnected from the hinge support side', () => {
  const arm = armLike({
    parts: [
      { name: 'proximal', role: 'structure', mateConnectors: [{ name: 'pip', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] }] },
      { name: 'middle', role: 'structure', mateConnectors: [{ name: 'pip', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] }] },
      { name: 'fake-shaft', role: 'structure', mateConnectors: [] },
      { name: 'fake-support', role: 'structure', mateConnectors: [] },
    ],
    mates: [{ name: 'pip', a: 'proximal.pip', b: 'middle.pip', type: 'revolute', limitsDeg: [0, 40] }],
    jointSupportIntents: [{ mate: 'pip', shaft: 'fake-shaft', supports: ['fake-support'], output: 'middle' }],
  });

  expect(codesOf(arm)).toContain('assembly.joint-topology.unsupported-axis');
});

it('does not require load paths for contact target load parts', () => {
  const arm = armLike({
    parts: [
      { name: 'palm-root', role: 'structure', mateConnectors: [] },
      { name: 'grasp-cylinder', role: 'contact-target', mateConnectors: [] },
    ],
    physicalUseCases: [{
      name: 'grasp',
      stableParts: ['palm-root'],
      loads: [{ part: 'grasp-cylinder', force: [0, 0, -3] }],
    }],
  });

  expect(codesOf(arm)).not.toContain('assembly.connectivity.no-load-path');
});
```

Update `armLike(...)` to include:

```ts
jointSupportIntents?: unknown[];
__jointSupportIntents: () => overrides.jointSupportIntents ?? [],
```

- [x] **Step 2: Verify red**

Run:

```bash
npx vitest run src/modeling/mates/jointTopology.test.ts --reporter=dot
```

Expected: FAIL because passive support intents are ignored and contact-target role is not skipped.

- [x] **Step 3: Implement topology support**

In `jointTopology.ts`, import `JointSupportIntentRecord`.

Generalize `isCompleteMechanicalIntent(...)` into a shared support check for records shaped like:

```ts
interface JointSupportLikeIntent {
  readonly mate: string;
  readonly shaft: string;
  readonly supports: readonly string[];
  readonly output: string;
}
```

Then `collectSupportedRevoluteMates(...)` must iterate both:

```ts
for (const intent of arm.__mechanicalJointIntents()) {
  if (!isCompleteDrivenMechanicalIntent(intent, matesByName, partsByName, fastenedGraph)) continue;
  supported.add(intent.mate);
}

for (const intent of arm.__jointSupportIntents()) {
  if (!isCompleteJointSupportIntent(intent, matesByName, partsByName, fastenedGraph)) continue;
  supported.add(intent.mate);
}
```

Use the same support-side fastened reachability for both; only driven `mechanicalJoint(...)` also checks `actuator`.

In the physical-use-case load-path loop, skip contact targets:

```ts
const loadPart = partsByName.get(load.part);
if (loadPart === undefined) continue;
if (loadPart.role === 'contact-target') continue;
```

- [x] **Step 4: Verify green**

Run:

```bash
npx vitest run src/modeling/mates/jointTopology.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/modeling/mates/jointTopology.ts src/modeling/mates/jointTopology.test.ts
git commit -m "feat: review passive joint support"
```

---

### Task 3: Repair Five-Finger Hand Topology

**Files:**
- Modify: `examples/robot-hand/five-finger-kinematic-hand.kcad.ts`
- Modify: `tests/integration/examples/fiveFingerKinematicHand.test.ts`

- [x] **Step 1: Write failing example expectation**

Change the topology regression to require no topology diagnostics:

```ts
const topologyReview = reviewJointTopology(assembly);

expect(topologyReview.diagnostics).toEqual([]);
```

- [x] **Step 2: Verify red**

Run:

```bash
npx vitest run tests/integration/examples/fiveFingerKinematicHand.test.ts -t "topology" --reporter=dot
```

Expected: FAIL with current unsupported-axis and grasp-cylinder no-load-path diagnostics.

- [x] **Step 3: Add passive supports and contact target role**

In `examples/robot-hand/five-finger-kinematic-hand.kcad.ts`, add a helper inside `assemblyTasks.push(...)` after mates are declared:

```ts
function supportRevolute(mate, shaft, output, around) {
  hand.jointSupport(`${mate}-support`, {
    mate,
    shaft,
    supports: [shaft],
    output,
    requiredSupport: {
      kind: 'hinge-bracket',
      around,
      supports: [shaft],
      minBearingLengthMm: 6,
    },
  });
}
```

For every finger, call:

```ts
if (!supportedGraspMcpNames.includes(spec.name)) {
  supportRevolute(`${spec.name}-mcp`, 'palm-root', `${spec.name}-proximal`, `palm-root.${spec.name}Mcp`);
}
supportRevolute(`${spec.name}-pip`, `${spec.name}-proximal`, `${spec.name}-middle`, `${spec.name}-proximal.pip`);
supportRevolute(`${spec.name}-dip`, `${spec.name}-middle`, `${spec.name}-distal`, `${spec.name}-middle.dip`);
```

Mark the object:

```ts
const graspCylinder = hand.part('grasp-cylinder', ..., { role: 'contact-target' });
```

- [x] **Step 4: Verify green**

Run:

```bash
npx vitest run tests/integration/examples/fiveFingerKinematicHand.test.ts -t "topology" --reporter=dot
```

Expected: PASS.

- [x] **Step 5: Run full hand integration**

Run:

```bash
npx vitest run tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add examples/robot-hand/five-finger-kinematic-hand.kcad.ts tests/integration/examples/fiveFingerKinematicHand.test.ts
git commit -m "fix: satisfy hand topology gate"
```

---

## Final Verification

- [x] Capture tests:

```bash
npx vitest run tests/unit/assemblies/assemblyCapture.test.ts -t "passive joint support|contact target" --reporter=dot
```

- [x] Topology unit tests:

```bash
npx vitest run src/modeling/mates/jointTopology.test.ts --reporter=dot
```

- [x] Review/design-loop integration:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts tests/integration/mcp/designLoop.test.ts tests/unit/mcp/designLoopNextActionPrompt.test.ts --reporter=dot
```

- [x] Hand integration:

```bash
npx vitest run tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot
```

- [x] Typecheck:

```bash
npm run typecheck
```
