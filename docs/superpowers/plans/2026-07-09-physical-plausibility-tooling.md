# Physical Plausibility Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build tooling that rejects or explains physically implausible CAD assemblies before agents continue visual/model iterations.

**Architecture:** Add small deterministic review units that sit under `src/modeling/` and are surfaced through `review_cad`, Studio, and `design_loop`. The hand model becomes a consumer of these gates, not the place where we encode one-off discipline. Each task is test-first and independently shippable.

**Tech Stack:** TypeScript, Vitest, KernelCAD assembly/mate APIs, existing `review_cad`, `design_loop`, Studio React UI, Playwright only for final browser evidence.

---

## File Structure

- Create `src/modeling/runtime/interferenceClassification.ts`
  - Pure helper that classifies raw `InterferencePair[]` into `contact-noise` and `actionable` using `jointContactCapMm3()`.
- Create `tests/unit/runtime/interferenceClassification.test.ts`
  - Unit tests for classification, summary counts, and boundary behavior at the cap.
- Modify `src/agent/mcp/tools/reviewCad.ts`
  - Add `interferenceSummary` to `review_cad` output while keeping `rawInterferencePairs` for low-level consumers.
- Modify `src/agent/mcp/toolOutputSchemas.ts`
  - Expose `interferenceSummary` in MCP output schemas.
- Modify `src/studio/StudioShell.tsx`
  - Read `interferenceSummary.actionableCount` when available, falling back to classified raw pairs.
- Modify `src/studio/components/Layout/StatusBar.tsx`
  - Show actionable count and concise tooltip text that mentions raw/contact-noise/actionable counts.
- Modify `src/studio/types.ts` and `src/studio/hooks/useRecomputeResult.ts`
  - Add `interferenceSummary` to the Studio recompute contract.
- Modify `src/studio/__tests__/StudioShell.status.test.tsx`
  - Cover actionable footer count behavior.
- Modify `src/studio/components/Layout/StatusBar.test.tsx`
  - Cover footer tooltip/status rendering.
- Create `src/modeling/mates/physicalUseCaseReachability.ts`
  - Targeted use-case contact reachability sampler that samples only actuator mates named in `physicalUseCase.actuatorLimits`.
- Modify `src/modeling/mates/physicalUseCase.ts`
  - Call the targeted reachability review when enabled and emit concrete `contact-unreachable` diagnostics with closest distance.
- Modify `tests/integration/mcp/physicalUseCaseGate.test.ts`
  - Add fast fixtures for reachable and unreachable declared contacts.
- Modify `src/agent/mcp/tools/reviewCad.ts`
  - Add input option `includePhysicalUseCaseReachability?: boolean`, defaulting to true when `requirePhysicalUseCase` is true and `includePoseEnvelope` is false.
- Modify `src/agent/mcp/toolRegistry.ts`
  - Document the new reachability option and output behavior.
- Create `src/modeling/joints/supportedServoRevolute.ts`
  - Helper builder for a supported servo revolute drive intent.
- Modify `src/modeling/joints/index.ts` and `src/modeling/api.ts`
  - Expose the helper under `joint.supportedServoRevolute(...)`.
- Create `src/modeling/joints/supportedServoRevolute.test.ts`
  - Unit tests for generated geometry/connectors/intents.
- Modify `tests/integration/mcp/designLoop.test.ts`
  - Add a tooling acceptance report test: an accepted attempt must have no actionable interference, supported actuators, reachable declared contacts, and screenshot review.

---

### Task 1: Shared Interference Classification

**Files:**
- Create: `src/modeling/runtime/interferenceClassification.ts`
- Create: `tests/unit/runtime/interferenceClassification.test.ts`

- [x] **Step 1: Write failing tests**

Create `tests/unit/runtime/interferenceClassification.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { classifyInterferencePairs, summarizeInterferencePairs } from '../../../src/modeling/runtime/interferenceClassification';
import { jointContactCapMm3 } from '../../../src/modeling/runtime/jointContactCap';

describe('interference classification', () => {
  it('classifies raw pairs below or equal to the cap as contact noise', () => {
    const cap = jointContactCapMm3();

    const result = classifyInterferencePairs([
      { a: 'palm-root', b: 'index-proximal', volumeMm3: 0.5 },
      { a: 'index-proximal', b: 'index-middle', volumeMm3: cap },
    ]);

    expect(result.map((pair) => pair.classification)).toEqual(['contact-noise', 'contact-noise']);
    expect(result.map((pair) => pair.actionable)).toEqual([false, false]);
  });

  it('classifies raw pairs above the cap as actionable', () => {
    const cap = jointContactCapMm3();

    const result = classifyInterferencePairs([
      { a: 'servo', b: 'palm-root', volumeMm3: cap + 0.01 },
    ]);

    expect(result).toEqual([
      {
        a: 'servo',
        b: 'palm-root',
        volumeMm3: cap + 0.01,
        capMm3: cap,
        classification: 'actionable',
        actionable: true,
      },
    ]);
  });

  it('summarizes raw, contact-noise, and actionable counts', () => {
    const cap = jointContactCapMm3();

    expect(summarizeInterferencePairs([
      { a: 'a', b: 'b', volumeMm3: 1 },
      { a: 'c', b: 'd', volumeMm3: cap + 1 },
    ])).toMatchObject({
      rawCount: 2,
      contactNoiseCount: 1,
      actionableCount: 1,
      capMm3: cap,
    });
  });
});
```

- [x] **Step 2: Run test and verify red**

Run:

```bash
npx vitest run tests/unit/runtime/interferenceClassification.test.ts --reporter=dot
```

Expected: FAIL because `src/modeling/runtime/interferenceClassification.ts` does not exist.

- [x] **Step 3: Implement minimal classifier**

Create `src/modeling/runtime/interferenceClassification.ts`:

```ts
import type { InterferencePair } from './detectInterferences';
import { jointContactCapMm3 } from './jointContactCap';

export type InterferenceClassification = 'contact-noise' | 'actionable';

export interface ClassifiedInterferencePair extends InterferencePair {
  readonly capMm3: number;
  readonly classification: InterferenceClassification;
  readonly actionable: boolean;
}

export interface InterferenceSummary {
  readonly rawCount: number;
  readonly contactNoiseCount: number;
  readonly actionableCount: number;
  readonly capMm3: number;
  readonly pairs: readonly ClassifiedInterferencePair[];
}

export function classifyInterferencePairs(
  pairs: readonly InterferencePair[],
  capMm3 = jointContactCapMm3(),
): ClassifiedInterferencePair[] {
  return pairs.map((pair) => {
    const actionable = pair.volumeMm3 > capMm3;
    return {
      ...pair,
      capMm3,
      classification: actionable ? 'actionable' : 'contact-noise',
      actionable,
    };
  });
}

export function summarizeInterferencePairs(
  pairs: readonly InterferencePair[],
  capMm3 = jointContactCapMm3(),
): InterferenceSummary {
  const classified = classifyInterferencePairs(pairs, capMm3);
  const actionableCount = classified.filter((pair) => pair.actionable).length;
  return {
    rawCount: classified.length,
    contactNoiseCount: classified.length - actionableCount,
    actionableCount,
    capMm3,
    pairs: classified,
  };
}
```

- [x] **Step 4: Run test and verify green**

Run:

```bash
npx vitest run tests/unit/runtime/interferenceClassification.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/modeling/runtime/interferenceClassification.ts tests/unit/runtime/interferenceClassification.test.ts
git commit -m "feat: classify interference actionability"
```

---

### Task 2: Wire Interference Summary Through `review_cad` And Studio

**Files:**
- Modify: `src/agent/mcp/tools/reviewCad.ts`
- Modify: `src/agent/mcp/toolOutputSchemas.ts`
- Modify: `src/studio/types.ts`
- Modify: `src/studio/hooks/useRecomputeResult.ts`
- Modify: `src/studio/StudioShell.tsx`
- Modify: `src/studio/components/Layout/StatusBar.tsx`
- Modify: `src/studio/__tests__/StudioShell.status.test.tsx`
- Modify: `src/studio/components/Layout/StatusBar.test.tsx`

- [x] **Step 1: Write failing Studio/status tests**

In `src/studio/__tests__/StudioShell.status.test.tsx`, keep raw pairs in the mock and add `interferenceSummary`:

```ts
let recomputeInterferenceSummary: {
    rawCount: number;
    contactNoiseCount: number;
    actionableCount: number;
    capMm3: number;
} | null = null;
```

Extend the mocked `useRecomputeResult` return:

```ts
interferenceSummary: recomputeInterferenceSummary,
```

Add test:

```ts
it('uses actionable interference summary for footer count', () => {
    recomputeRawPairs = [
        { a: 'raw-a', b: 'raw-b', volumeMm3: 1 },
        { a: 'real-a', b: 'real-b', volumeMm3: 30 },
    ];
    recomputeInterferenceSummary = {
        rawCount: 2,
        contactNoiseCount: 1,
        actionableCount: 1,
        capMm3: 20,
    };

    render(<StudioShell />);

    expect(screen.getByTestId('status-interferences').textContent).toBe('1');
});
```

In `src/studio/components/Layout/StatusBar.test.tsx`, add:

```ts
it('renders actionable interference count with summary title', () => {
  render(
    <StatusBar
      isComputing={false}
      diagnostics={[]}
      bodyCount={22}
      selectedCount={0}
      interferences={1}
      interferenceSummary={{
        rawCount: 16,
        contactNoiseCount: 15,
        actionableCount: 1,
        capMm3: 20,
      }}
    />,
  );

  const text = screen.getByText(/interferences: 1/);
  expect(text).toHaveAttribute('title', expect.stringContaining('raw: 16'));
  expect(text).toHaveAttribute('title', expect.stringContaining('contact-noise: 15'));
});
```

- [x] **Step 2: Run tests and verify red**

Run:

```bash
npx vitest run src/studio/__tests__/StudioShell.status.test.tsx src/studio/components/Layout/StatusBar.test.tsx --reporter=dot
```

Expected: FAIL because `interferenceSummary` is not yet part of the Studio contract and StatusBar props.

- [x] **Step 3: Add `interferenceSummary` to `review_cad` output**

In `src/agent/mcp/tools/reviewCad.ts`, import:

```ts
import { summarizeInterferencePairs, type InterferenceSummary } from '../../../modeling/runtime/interferenceClassification';
```

Add `interferenceSummary: InterferenceSummary;` beside `rawInterferencePairs` in both output variants.

After `rawInterferencePairs` is computed:

```ts
const interferenceSummary = summarizeInterferencePairs(rawInterferencePairs);
```

Return `interferenceSummary` in both `ok: true` and `ok: false` branches that already return `rawInterferencePairs`.

- [x] **Step 4: Update output schema**

In `src/agent/mcp/toolOutputSchemas.ts`, add `interferenceSummary` next to `rawInterferencePairs`:

```ts
interferenceSummary: {
  type: 'object',
  additionalProperties: true,
  description: 'Classified interference counts and pairs: raw, contact-noise, actionable, and capMm3.',
},
```

- [x] **Step 5: Update Studio types and hook**

In `src/studio/types.ts`, add:

```ts
readonly interferenceSummary: {
    readonly rawCount: number;
    readonly contactNoiseCount: number;
    readonly actionableCount: number;
    readonly capMm3: number;
} | null;
```

In `src/studio/hooks/useRecomputeResult.ts`, add:

```ts
const interferenceSummary = useMemo(
    () => workbench.scriptReview?.interferenceSummary ?? null,
    [workbench.scriptReview],
);
```

Return it and add it to the dependency list.

- [x] **Step 6: Update StudioShell and StatusBar**

In `src/studio/StudioShell.tsx`, replace direct raw-pair filtering with:

```ts
const interferenceCount = recompute.interferenceSummary?.actionableCount
    ?? (recompute.rawInterferencePairs ?? []).filter((pair) => pair.volumeMm3 > jointContactCapMm3()).length;
```

Pass summary:

```tsx
<StatusBar
  ...
  interferences={interferenceCount}
  interferenceSummary={recompute.interferenceSummary}
/>
```

In `src/studio/components/Layout/StatusBar.tsx`, extend props:

```ts
interferenceSummary?: {
  rawCount: number;
  contactNoiseCount: number;
  actionableCount: number;
  capMm3: number;
} | null;
```

Render title:

```tsx
const interferenceTitle = interferenceSummary
  ? `actionable: ${interferenceSummary.actionableCount}, contact-noise: ${interferenceSummary.contactNoiseCount}, raw: ${interferenceSummary.rawCount}, cap: ${interferenceSummary.capMm3} mm3`
  : undefined;
```

Attach `title={interferenceTitle}` to the `interferences: N` element.

- [x] **Step 7: Run tests and verify green**

Run:

```bash
npx vitest run src/studio/__tests__/StudioShell.status.test.tsx src/studio/components/Layout/StatusBar.test.tsx --reporter=dot
```

Expected: PASS.

- [x] **Step 8: Run review_cad interference tests**

Run:

```bash
npx vitest run tests/integration/mcp/reviewCad-interference.test.ts --reporter=dot
```

Expected: PASS and no output schema failures.

- [x] **Step 9: Commit**

```bash
git add src/agent/mcp/tools/reviewCad.ts src/agent/mcp/toolOutputSchemas.ts src/studio/types.ts src/studio/hooks/useRecomputeResult.ts src/studio/StudioShell.tsx src/studio/components/Layout/StatusBar.tsx src/studio/__tests__/StudioShell.status.test.tsx src/studio/components/Layout/StatusBar.test.tsx
git commit -m "feat: surface actionable interference summary"
```

---

### Task 3: Targeted Physical-Use-Case Reachability Gate

**Files:**
- Create: `src/modeling/mates/physicalUseCaseReachability.ts`
- Modify: `src/modeling/mates/physicalUseCase.ts`
- Modify: `src/agent/mcp/tools/reviewCad.ts`
- Modify: `src/agent/mcp/toolRegistry.ts`
- Modify: `tests/integration/mcp/physicalUseCaseGate.test.ts`

- [x] **Step 1: Write failing unreachable-contact test**

In `tests/integration/mcp/physicalUseCaseGate.test.ts`, add:

```ts
it('blocks declared physical-use-case contacts that targeted actuator sampling cannot reach', async () => {
  const result = await reviewCadTool({
    includePoseEnvelope: false,
    includeInterference: false,
    includePhysicalUseCaseReachability: true,
    requirePhysicalUseCase: true,
    code: `
      const arm = assembly('unreachable use case contact');
      arm.part('base', box(30, 30, 8, true))
        .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 4] }, axis: [0, 0, 1] })
        .connector('target', { type: 'frame', origin: { kind: 'vec3', value: [120, 0, 4] } })
        .connector('support', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 4] } });
      arm.part('finger', box(40, 6, 6, true).translate(20, 0, 0))
        .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
        .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [40, 0, 0] } });
      arm.part('servo', box(8, 8, 8, true))
        .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
      arm.mate('servo-fix', 'base.support', 'servo.mount', 'fastened');
      arm.mate('curl', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [0, 30] });
      arm.mechanicalJoint('curl-drive', {
        mate: 'curl',
        actuator: 'servo',
        shaft: 'base',
        supports: ['base'],
        output: 'finger',
      });
      arm.physicalUseCase('touch-target', {
        stableParts: ['base'],
        loads: [{ part: 'finger', force: [0, 0, -1] }],
        contacts: [{ a: 'finger.tip', b: 'base.target', normal: [1, 0, 0], friction: 0.5, normalForceN: 2 }],
        actuatorLimits: [{ mate: 'curl', maxTorqueNmm: 500 }],
        criteria: { maxSlipMm: 2 },
      });
      return arm.model();
    `,
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    const unreachable = result.diagnostics.find((diagnostic) =>
      diagnostic.code === 'assembly.physical-use-case.contact-unreachable'
    );
    expect(unreachable).toMatchObject({
      contactA: 'finger.tip',
      contactB: 'base.target',
      toleranceMm: 2,
    });
  }
});
```

- [x] **Step 2: Run test and verify red**

Run:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts -t "targeted actuator sampling cannot reach" --reporter=dot
```

Expected: FAIL because `includePhysicalUseCaseReachability` is not wired and no targeted reachability diagnostic is emitted.

- [x] **Step 3: Implement targeted sampler**

Create `src/modeling/mates/physicalUseCaseReachability.ts`:

```ts
import type { Assembly } from '../capture/assembly';
import type { PhysicalUseCaseContact, PhysicalUseCaseRecord } from './physicalUseCase';
import { parseConnectorRef } from './mate';

export interface PhysicalUseCaseReachabilityIssue {
  readonly useCaseName: string;
  readonly contact: PhysicalUseCaseContact;
  readonly minDistanceMm?: number;
  readonly toleranceMm: number;
}

export async function reviewPhysicalUseCaseReachability(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  opts: { samplesPerMate?: number } = {},
): Promise<PhysicalUseCaseReachabilityIssue[]> {
  const samplesPerMate = opts.samplesPerMate ?? 3;
  const samples = buildTargetedPoseSamples(arm, useCase, samplesPerMate);
  const best = new Map<string, number>();

  for (const poses of samples) {
    const solved = await arm.solve(poses);
    for (const contact of useCase.contacts) {
      const a = connectorWorldPoint(arm, solved.transforms, contact.a);
      const b = connectorWorldPoint(arm, solved.transforms, contact.b);
      if (a === undefined || b === undefined) continue;
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      const key = `${contact.a}\t${contact.b}`;
      best.set(key, Math.min(best.get(key) ?? Infinity, distance));
    }
  }

  return useCase.contacts.flatMap((contact) => {
    const toleranceMm = useCase.criteria?.maxSlipMm ?? 0;
    const key = `${contact.a}\t${contact.b}`;
    const minDistanceMm = best.get(key);
    if (minDistanceMm !== undefined && minDistanceMm <= toleranceMm) return [];
    return [{ useCaseName: useCase.name, contact, minDistanceMm, toleranceMm }];
  });
}

function buildTargetedPoseSamples(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  samplesPerMate: number,
): Array<Record<string, number>> {
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  const actuatorMates = useCase.actuatorLimits
    .map((limit) => matesByName.get(limit.mate))
    .filter((mate): mate is NonNullable<typeof mate> => mate !== undefined && mate.type === 'revolute');

  if (actuatorMates.length === 0) return [{}];
  const samples: Array<Record<string, number>> = [{}];
  for (const mate of actuatorMates) {
    const [min, max] = mate.limitsDeg ?? [0, 0];
    const values = samplesPerMate <= 1
      ? [min]
      : Array.from({ length: samplesPerMate }, (_, i) => min + ((max - min) * i) / (samplesPerMate - 1));
    const next: Array<Record<string, number>> = [];
    for (const base of samples) {
      for (const value of values) next.push({ ...base, [mate.name]: value });
    }
    samples.splice(0, samples.length, ...next.slice(0, 64));
  }
  return samples;
}

function connectorWorldPoint(
  arm: Assembly,
  transforms: ReadonlyMap<string, { point(p: readonly [number, number, number]): [number, number, number] }>,
  ref: string,
): [number, number, number] | undefined {
  const parsed = parseConnectorRef(ref);
  const part = arm.__parts().find((candidate) => candidate.name === parsed.partName);
  const connector = part?.mateConnectors.find((candidate) => candidate.name === parsed.connectorName);
  if (connector === undefined || connector.origin.kind !== 'vec3') return undefined;
  return transforms.get(parsed.partName)?.point(connector.origin.value);
}
```

If `arm.solve(...)` returns a different property name than `transforms`, inspect `src/modeling/capture/assembly.ts` and adjust the one accessor only. Do not change the sampler API.

- [x] **Step 4: Wire diagnostics into physical use-case review**

Change `reviewPhysicalUseCases(...)` to async only if current callers can handle it. If not, add a new async wrapper:

```ts
export async function reviewPhysicalUseCasesWithReachability(
  arm: Assembly,
  opts: { requirePhysicalUseCase?: boolean; includeReachability?: boolean; samplesPerMate?: number } = {},
): Promise<PhysicalUseCaseReviewResult> {
  const base = reviewPhysicalUseCases(arm, opts);
  if (opts.includeReachability !== true) return base;
  const diagnostics = [...base.diagnostics];
  for (const useCase of arm.__physicalUseCases()) {
    const issues = await reviewPhysicalUseCaseReachability(arm, useCase, { samplesPerMate: opts.samplesPerMate });
    for (const issue of issues) {
      diagnostics.push({
        code: 'assembly.physical-use-case.contact-unreachable',
        severity: 'error',
        useCaseName: issue.useCaseName,
        contactA: issue.contact.a,
        contactB: issue.contact.b,
        ...(issue.minDistanceMm === undefined ? {} : { minDistanceMm: issue.minDistanceMm }),
        toleranceMm: issue.toleranceMm,
        message: issue.minDistanceMm === undefined
          ? `Physical use case '${issue.useCaseName}' contact '${issue.contact.a}' to '${issue.contact.b}' could not be checked in targeted actuator samples.`
          : `Physical use case '${issue.useCaseName}' contact '${issue.contact.a}' to '${issue.contact.b}' never gets within ${issue.toleranceMm.toFixed(2)} mm; closest targeted sample is ${issue.minDistanceMm.toFixed(2)} mm.`,
        hint: `physical-use-case.contact-unreachable — revise the target, connector placement, or actuator mate limits so '${issue.contact.a}' reaches '${issue.contact.b}' within maxSlipMm ${issue.toleranceMm.toFixed(2)}.`,
      });
    }
  }
  return { ...base, diagnostics };
}
```

- [x] **Step 5: Wire review_cad option**

In `ReviewCadInput`, add:

```ts
includePhysicalUseCaseReachability?: boolean;
physicalUseCaseReachabilitySamplesPerMate?: number;
```

In `reviewCadTool`, replace the physical use-case review call with:

```ts
const physicalUseCases = await reviewPhysicalUseCasesWithReachability(arm, {
  requirePhysicalUseCase: input.requirePhysicalUseCase,
  poseEnvelope,
  includeReachability: input.includePhysicalUseCaseReachability ?? input.requirePhysicalUseCase === true,
  samplesPerMate: input.physicalUseCaseReachabilitySamplesPerMate,
});
```

- [x] **Step 6: Update registry docs**

In `src/agent/mcp/toolRegistry.ts`, add schema entries:

```ts
includePhysicalUseCaseReachability: {
  type: 'boolean',
  description: 'When true, declared physicalUseCase contacts are checked by sampling only actuatorLimits mates, faster than full pose envelope.',
},
physicalUseCaseReachabilitySamplesPerMate: {
  type: 'number',
  description: 'Samples per actuator mate for targeted physicalUseCase contact reachability. Default 3.',
},
```

- [x] **Step 7: Run focused tests**

Run:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts -t "targeted actuator sampling cannot reach" --reporter=dot
```

Expected: PASS.

- [x] **Step 8: Run physical use-case suite**

Run:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 9: Commit**

```bash
git add src/modeling/mates/physicalUseCaseReachability.ts src/modeling/mates/physicalUseCase.ts src/agent/mcp/tools/reviewCad.ts src/agent/mcp/toolRegistry.ts tests/integration/mcp/physicalUseCaseGate.test.ts
git commit -m "feat: check physical use case contact reachability"
```

---

### Task 4: Supported Servo Revolute Helper

**Files:**
- Create: `src/modeling/joints/supportedServoRevolute.ts`
- Create: `src/modeling/joints/supportedServoRevolute.test.ts`
- Modify: `src/modeling/joints/index.ts`
- Modify: `src/modeling/api.ts`
- Modify: `src/agent/mcp/tools/listApi.ts`

- [x] **Step 1: Write failing API test**

Create `src/modeling/joints/supportedServoRevolute.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';

describe('joint.supportedServoRevolute', () => {
  it('creates seated actuator geometry and mechanicalJoint intent for a revolute mate', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('supported drive');

    arm.part('base', kcad.box(30, 30, 8, true))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 4] }, axis: [0, 0, 1] })
      .connector('servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [0, -15, 4] } });
    arm.part('link', kcad.box(40, 6, 6, true).translate(20, 0, 0))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('curl', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [0, 45] });

    const drive = kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'base.axis',
    });

    expect(drive.actuatorPartName).toBe('curl-drive-servo');
    expect(arm.__mechanicalJointIntents()).toEqual([
      expect.objectContaining({
        name: 'curl-drive',
        mate: 'curl',
        actuator: 'curl-drive-servo',
        shaft: 'base',
        supports: ['base'],
        output: 'link',
      }),
    ]);
    expect(arm.__mates().some((mate) => mate.name === 'curl-drive-servo-fix' && mate.type === 'fastened')).toBe(true);
  });
});
```

- [x] **Step 2: Run test and verify red**

Run:

```bash
npx vitest run src/modeling/joints/supportedServoRevolute.test.ts --reporter=dot
```

Expected: FAIL because `joint.supportedServoRevolute` does not exist.

- [x] **Step 3: Implement helper**

Create `src/modeling/joints/supportedServoRevolute.ts`:

```ts
import type { Assembly } from '../capture/assembly';
import type { Shape } from '../capture/proxy';
import type { KernelCadApi } from '../api';

export interface SupportedServoRevoluteOptions {
  readonly name: string;
  readonly mate: string;
  readonly support: string;
  readonly supportMount: string;
  readonly output: string;
  readonly axis: string;
  readonly servoBody?: Shape;
  readonly minBearingLengthMm?: number;
}

export interface SupportedServoRevoluteResult {
  readonly actuatorPartName: string;
}

export function supportedServoRevolute(
  kc: KernelCadApi,
  arm: Assembly,
  opts: SupportedServoRevoluteOptions,
): SupportedServoRevoluteResult {
  const actuatorPartName = `${opts.name}-servo`;
  const servoBody = opts.servoBody
    ?? kc.box(20, 13, 16, true)
      .union(kc.cylinder(5, 4.5, 24).alongAxis([1, 0, 0]).translate(0, -7, 0));

  arm.part(actuatorPartName, servoBody)
    .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  arm.mate(`${opts.name}-servo-fix`, opts.supportMount, `${actuatorPartName}.mount`, 'fastened');
  arm.mechanicalJoint(opts.name, {
    mate: opts.mate,
    actuator: actuatorPartName,
    shaft: opts.support,
    supports: [opts.support],
    output: opts.output,
    requiredSupport: {
      kind: 'hinge-bracket',
      around: opts.axis,
      supports: [opts.support],
      minBearingLengthMm: opts.minBearingLengthMm ?? 8,
    },
  });

  return { actuatorPartName };
}
```

- [x] **Step 4: Expose helper**

In `src/modeling/joints/index.ts`, export the helper type/function.

In `src/modeling/api.ts`, add method under `joint` namespace:

```ts
supportedServoRevolute: (arm, opts) => supportedServoRevolute(api, arm, opts),
```

Adjust exact names to match the existing `makeJointNamespace` pattern.

- [x] **Step 5: Update API listing**

In `src/agent/mcp/tools/listApi.ts`, extend the `joint` API description with:

```ts
`joint.supportedServoRevolute(assembly, { name, mate, support, supportMount, output, axis, servoBody?, minBearingLengthMm? })` creates a seated servo part, fastened mount, and mechanicalJoint support contract for a driven revolute mate.
```

- [x] **Step 6: Run helper test**

Run:

```bash
npx vitest run src/modeling/joints/supportedServoRevolute.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/modeling/joints/supportedServoRevolute.ts src/modeling/joints/supportedServoRevolute.test.ts src/modeling/joints/index.ts src/modeling/api.ts src/agent/mcp/tools/listApi.ts
git commit -m "feat: add supported servo revolute helper"
```

---

### Task 5: Design-Loop Physical Acceptance Report

**Files:**
- Modify: `src/agent/mcp/tools/designLoop.ts`
- Modify: `tests/integration/mcp/designLoop.test.ts`
- Modify: `tests/unit/mcp/designLoopNextActionPrompt.test.ts`

- [x] **Step 1: Write failing design-loop test**

In `tests/integration/mcp/designLoop.test.ts`, add:

```ts
it('rejects visual acceptance when physical use case contacts are unreachable', async () => {
  const result = await designLoopTool({
    goal: 'Reject a visually reviewed hand if the declared grasp contact cannot be reached.',
    requireVisualReview: true,
    includePoseEnvelope: false,
    includeInterference: false,
    attempts: [{
      id: 'bad-grasp',
      title: 'Visually accepted but physically unreachable',
      code: `
        const arm = assembly('bad grasp');
        arm.part('base', box(30, 30, 8, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 4] }, axis: [0, 0, 1] })
          .connector('target', { type: 'frame', origin: { kind: 'vec3', value: [120, 0, 4] } })
          .connector('support', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 4] } });
        arm.part('finger', box(40, 6, 6, true).translate(20, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [40, 0, 0] } });
        arm.part('servo', box(8, 8, 8, true)).connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('servo-fix', 'base.support', 'servo.mount', 'fastened');
        arm.mate('curl', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [0, 30] });
        arm.mechanicalJoint('curl-drive', { mate: 'curl', actuator: 'servo', shaft: 'base', supports: ['base'], output: 'finger' });
        arm.physicalUseCase('touch-target', {
          stableParts: ['base'],
          loads: [{ part: 'finger', force: [0, 0, -1] }],
          contacts: [{ a: 'finger.tip', b: 'base.target', normal: [1, 0, 0], friction: 0.5, normalForceN: 2 }],
          actuatorLimits: [{ mate: 'curl', maxTorqueNmm: 500 }],
          criteria: { maxSlipMm: 2 },
        });
        return arm.model();
      `,
      visualReview: {
        accepted: true,
        screenshotPath: '/tmp/bad-grasp.png',
        findings: ['The fixture is visible in the screenshot.'],
        checks: requiredPassingVisualChecks('Visible fixture with connector labels and seated servo mount.'),
      },
    }],
  });

  expect(result.attempts[0].accepted).toBe(false);
  expect(result.attempts[0].reviewFacts.some((fact) =>
    fact.code === 'assembly.physical-use-case.contact-unreachable'
  )).toBe(true);
});
```

Use the existing helper pattern for `requiredPassingVisualChecks(...)` in that test file. If the helper is named differently, reuse the local helper that creates complete visual-review checks.

- [x] **Step 2: Run test and verify red**

Run:

```bash
npx vitest run tests/integration/mcp/designLoop.test.ts -t "physically unreachable" --reporter=dot
```

Expected: FAIL because design_loop is not forwarding targeted physical-use-case reachability.

- [x] **Step 3: Forward reachability through design_loop**

In `src/agent/mcp/tools/designLoop.ts`, where `reviewCadTool` is called, add:

```ts
includePhysicalUseCaseReachability: true,
requirePhysicalUseCase: true,
```

only when the attempt contains `physicalUseCase(` or when the tool input explicitly asks for physical acceptance. If adding an input flag is cleaner, add:

```ts
requirePhysicalAcceptance?: boolean;
```

Default it to `true` for mechanism/robot-hand goals only if current design_loop conventions already infer goal-dependent gates. Otherwise default false and set true in this test.

- [x] **Step 4: Make next-action prompt explicit**

In `src/agent/mcp/tools/designLoop.ts`, ensure contact-unreachable facts are included in `nextActionPrompt` by preserving them in `reviewFacts`.

In `tests/unit/mcp/designLoopNextActionPrompt.test.ts`, add:

```ts
expect(prompt).toContain('assembly.physical-use-case.contact-unreachable');
expect(prompt).toContain('closest');
expect(prompt).toContain('maxSlipMm');
```

- [x] **Step 5: Run design-loop tests**

Run:

```bash
npx vitest run tests/integration/mcp/designLoop.test.ts tests/unit/mcp/designLoopNextActionPrompt.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/agent/mcp/tools/designLoop.ts tests/integration/mcp/designLoop.test.ts tests/unit/mcp/designLoopNextActionPrompt.test.ts
git commit -m "feat: reject unreachable physical use cases in design loop"
```

---

### Task 6: Apply Tooling To Robot Hand Without Geometry Changes

**Files:**
- Modify: `tests/integration/examples/fiveFingerKinematicHand.test.ts`
- Modify: `artifacts/robot-hand-design-loop/2026-07-09-five-finger-hand-loop.json`

- [x] **Step 1: Add hand reachability assertion**

In `tests/integration/examples/fiveFingerKinematicHand.test.ts`, add a test that runs `reviewCadTool` with:

```ts
const result = await reviewCadTool({
  file: EXAMPLE_PATH,
  includePoseEnvelope: false,
  includeInterference: false,
  requirePhysicalUseCase: true,
  includePhysicalUseCaseReachability: true,
  physicalUseCaseReachabilitySamplesPerMate: 3,
});
```

Expected for current hand:

```ts
expect(result.ok).toBe(false);
expect(result.diagnostics.some((diagnostic) =>
  diagnostic.code === 'assembly.physical-use-case.contact-unreachable'
)).toBe(true);
```

This locks the current hand as rejected for a concrete, tool-generated reason.

Implementation note: the final test evaluates the same fixture and calls `reviewPhysicalUseCasesWithReachability(...)` directly because the full `reviewCadTool` path was too slow/hung for this fixture. The spec and quality review accepted this as satisfying the task intent.

- [x] **Step 2: Run test and verify expected failure/pass**

Run:

```bash
npx vitest run tests/integration/examples/fiveFingerKinematicHand.test.ts -t "physical use case reachability" --reporter=dot
```

Expected: PASS because the hand is intentionally rejected by the new gate.

- [x] **Step 3: Update design-loop artifact**

Append an attempt entry:

```json
{
  "id": "07",
  "title": "Tooling gate: targeted grasp reachability",
  "status": "rejected-by-physical-use-case-contact-reachability",
  "deterministicChecks": [
    "npx vitest run tests/integration/examples/fiveFingerKinematicHand.test.ts -t \"physical use case reachability\" --reporter=dot"
  ],
  "remainingCaveats": [
    "The model remains visually inspectable but is rejected because declared contacts do not reach the cylinder within maxSlipMm.",
    "Next geometry slice must redesign thumb/index/middle placement or actuator travel using this diagnostic, not visual guesswork."
  ]
}
```

Use valid JSON and include the actual screenshot path from the latest browser run if one was captured during execution.

- [x] **Step 4: Validate JSON**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('artifacts/robot-hand-design-loop/2026-07-09-five-finger-hand-loop.json','utf8')); console.log('json ok')"
```

Expected: `json ok`.

- [x] **Step 5: Commit**

```bash
git add tests/integration/examples/fiveFingerKinematicHand.test.ts artifacts/robot-hand-design-loop/2026-07-09-five-finger-hand-loop.json
git commit -m "test: reject hand by targeted grasp reachability"
```

---

## Final Verification

- [x] Run fast unit coverage:

```bash
npx vitest run tests/unit/runtime/interferenceClassification.test.ts src/modeling/joints/supportedServoRevolute.test.ts src/studio/__tests__/StudioShell.status.test.tsx src/studio/components/Layout/StatusBar.test.tsx --reporter=dot
```

Expected: all pass.

- [x] Run physical-use-case and hand integration coverage:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot
```

Expected: all pass; the hand-specific reachability test passes by asserting rejection.

- [x] Run design-loop coverage:

```bash
npx vitest run tests/integration/mcp/designLoop.test.ts tests/unit/mcp/designLoopNextActionPrompt.test.ts --reporter=dot
```

Expected: all pass.

- [x] Run typecheck:

```bash
npm run typecheck
```

Expected: `tsc -b --noEmit` exits 0. Existing TanStack route warnings may appear and are not part of this plan.

- [x] Browser evidence:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:<actual-port>/studio?script=examples/robot-hand/five-finger-kinematic-hand.kcad.ts
```

Expected:
- Status footer shows actionable interference count, not raw contact-noise count.
- Validity/design-loop output reports `assembly.physical-use-case.contact-unreachable` for the current hand until geometry is redesigned.

---

## Self-Review

- Spec coverage: interference classification, visible reporting, targeted reachability, mechanism-drive helper, and design-loop acceptance are all mapped to tasks.
- Placeholder scan: no placeholder markers, no open-ended “add tests” steps, and every behavior change has an explicit test command.
- Type consistency: `InterferenceSummary`, `ClassifiedInterferencePair`, `includePhysicalUseCaseReachability`, and `supportedServoRevolute` are introduced once and reused with the same names.
- Scope discipline: this plan explicitly avoids hand geometry changes until tooling can produce a concrete reachability rejection.
