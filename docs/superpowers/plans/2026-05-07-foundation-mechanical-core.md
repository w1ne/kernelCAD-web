# Foundation + Mechanical Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the post-v0.4 codebase ready for the capability-first spine by tightening release/test proof and landing the first Patterns contract that feeds assemblies.

**Architecture:** This slice deliberately avoids a rich Studio UI. It first turns release/test quality expectations into executable checks, removes misleading todo coverage, then adds a small script-first Patterns API that records repeated features in `.kcad.ts` runtime capture. Assemblies remain a follow-up slice, but Patterns must create inspectable feature records that assemblies can depend on.

**Tech Stack:** TypeScript, Vitest, existing `CaptureSession`/`Shape`/`KernelCadApi`, existing OCCT lowerer and MCP `list_api` drift sentinel.

---

## File Structure

- Modify `package.json`: add explicit foundation proof scripts.
- Modify `src/integration/e2e_workflows.test.ts`: replace the constraint `it.todo` with a real gated behavior test.
- Create `scripts/testQualityAudit.ts`: executable audit for skipped/todo/focused tests and weak release-proof patterns.
- Create `scripts/testQualityAudit.test.ts`: unit tests for the audit parser.
- Modify `src/intent/types.ts`: add a `pattern` feature kind and shared pattern metadata types.
- Modify `src/capture/captureSession.ts`: add a `patternFeature` registrar that captures base feature input and pattern metadata.
- Modify `src/capture/proxy.ts`: add `Shape.patternLinear(...)` and `Shape.patternCircular(...)` script APIs.
- Modify `src/modules/api.ts`: expose no top-level pattern function; patterning stays as shape methods for chain readability.
- Modify `src/backends/occt/occtLowerer.ts`: lower `pattern` by cloning/translating/rotating the base shape and fusing the instances.
- Modify `src/mcp/tools/listApi.ts`: advertise the new `Shape` methods so MCP agents can discover them.
- Create `tests/unit/patterns/patternCapture.test.ts`: behavior tests for captured pattern records.
- Create `tests/unit/backends/occt/patternLowerer.test.ts`: behavior tests for lowered pattern geometry.
- Modify `CHANGELOG.md`: add Unreleased entry for foundation proof and pattern contract.

---

### Task 1: Executable Test-Quality Audit

**Files:**
- Create: `scripts/testQualityAudit.ts`
- Create: `scripts/testQualityAudit.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing audit tests**

Create `scripts/testQualityAudit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { auditTestText, formatAuditReport } from './testQualityAudit';

describe('testQualityAudit', () => {
  it('flags focused tests and todo tests as release-blocking', () => {
    const result = auditTestText('src/example.test.ts', [
      "it.only('focus leak', () => {})",
      "it.todo('fake coverage')",
    ].join('\n'));

    expect(result.blockers.map(b => b.kind)).toEqual(['focused-test', 'todo-test']);
    expect(formatAuditReport([result])).toContain('src/example.test.ts:1 focused-test');
    expect(formatAuditReport([result])).toContain('src/example.test.ts:2 todo-test');
  });

  it('allows explicit environment-gated suites but reports them as supplemental', () => {
    const result = auditTestText('src/integration/ui_workflows.test.tsx', [
      'const describeUI = runUIE2E ? describe : describe.skip;',
    ].join('\n'));

    expect(result.blockers).toEqual([]);
    expect(result.warnings.map(w => w.kind)).toEqual(['env-gated-suite']);
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm test -- scripts/testQualityAudit.test.ts
```

Expected: fail because `scripts/testQualityAudit.ts` does not exist.

- [ ] **Step 3: Implement the audit module**

Create `scripts/testQualityAudit.ts`:

```ts
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AuditKind = 'focused-test' | 'todo-test' | 'env-gated-suite';

export interface AuditFinding {
  kind: AuditKind;
  file: string;
  line: number;
  text: string;
}

export interface FileAudit {
  file: string;
  blockers: AuditFinding[];
  warnings: AuditFinding[];
}

const focusedRe = /\b(?:describe|it|test)\.only\s*\(/;
const todoRe = /\b(?:it|test)\.todo\s*\(/;
const envGatedRe = /(?:describe|it|test)\.skip|describe\.skipIf|ctx\.skip\(/;

export function auditTestText(file: string, text: string): FileAudit {
  const blockers: AuditFinding[] = [];
  const warnings: AuditFinding[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const line = index + 1;
    if (focusedRe.test(lineText)) {
      blockers.push({ kind: 'focused-test', file, line, text: lineText.trim() });
    }
    if (todoRe.test(lineText)) {
      blockers.push({ kind: 'todo-test', file, line, text: lineText.trim() });
    }
    if (envGatedRe.test(lineText)) {
      warnings.push({ kind: 'env-gated-suite', file, line, text: lineText.trim() });
    }
  });

  return { file, blockers, warnings };
}

export function formatAuditReport(results: FileAudit[]): string {
  const lines: string[] = [];
  for (const result of results) {
    for (const finding of result.blockers) {
      lines.push(`${finding.file}:${finding.line} ${finding.kind} ${finding.text}`);
    }
    for (const finding of result.warnings) {
      lines.push(`${finding.file}:${finding.line} ${finding.kind} ${finding.text}`);
    }
  }
  return lines.join('\n');
}

export function auditRepo(cwd = process.cwd()): FileAudit[] {
  const roots = ['src', 'tests', 'eval', 'scripts', 'site'];
  const files: string[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(join(cwd, dir))) {
      const rel = `${dir}/${entry}`;
      if (rel.includes('/node_modules/')) continue;
      const abs = join(cwd, rel);
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        walk(rel);
      } else if (/\.(test|spec)\.(ts|tsx)$/.test(rel)) {
        files.push(rel);
      }
    }
  }

  for (const root of roots) walk(root);

  return files.map(file => auditTestText(file, readFileSync(`${cwd}/${file}`, 'utf8')));
}

function main(): void {
  const results = auditRepo();
  const blockers = results.flatMap(r => r.blockers);
  const report = formatAuditReport(results);
  if (report) console.log(report);
  if (blockers.length > 0) {
    console.error(`test-quality audit failed: ${blockers.length} blocker(s)`);
    process.exit(1);
  }
}

const invoked = process.argv[1] === fileURLToPath(import.meta.url);
if (invoked) main();
```

- [ ] **Step 4: Wire the npm script**

In `package.json`, add:

```json
"test:audit": "npx tsx scripts/testQualityAudit.ts"
```

Place it near the existing `test` scripts.

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- scripts/testQualityAudit.test.ts
npm run test:audit
```

Expected: test passes. `npm run test:audit` fails until Task 2 removes the existing `it.todo`.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/testQualityAudit.ts scripts/testQualityAudit.test.ts
git commit -m "test: add executable test quality audit"
```

---

### Task 2: Replace Misleading Todo Coverage

**Files:**
- Modify: `src/integration/e2e_workflows.test.ts`

- [ ] **Step 1: Replace the todo with a real gated constraint behavior test**

In `src/integration/e2e_workflows.test.ts`, add imports:

```ts
import { ConstraintSolver } from '../lib/constraints/solver';
import type { SolverState, SketchEntity } from '../lib/constraints/types';
```

Replace:

```ts
it.todo('should solve constraints through the legacy E2E workflow');
```

with:

```ts
it('should solve constraints through the kernel constraint solver', () => {
  const solver = new ConstraintSolver();
  const state: SolverState = {
    entities: new Map<string, SketchEntity>([
      ['fixed', { id: 'fixed', type: 'POINT', x: 0, y: 0, fixed: true }],
      ['moving', { id: 'moving', type: 'POINT', x: 7, y: 0, fixed: false }],
    ]),
    constraints: [
      { id: 'distance', type: 'DISTANCE', entities: ['fixed', 'moving'], value: 20 },
    ],
  };

  solver.solve(state);

  const moving = state.entities.get('moving');
  if (!moving || moving.type !== 'POINT') throw new Error('moving point missing');
  expect(moving.x).toBeCloseTo(20);
  expect(moving.y).toBeCloseTo(0);
});
```

- [ ] **Step 2: Verify the todo is gone and gated test still passes when enabled**

Run:

```bash
npm run test:audit
KERNELCAD_E2E=1 npm test -- src/integration/e2e_workflows.test.ts
```

Expected: `npm run test:audit` has no blockers. The E2E file passes under `KERNELCAD_E2E=1`.

- [ ] **Step 3: Commit**

```bash
git add src/integration/e2e_workflows.test.ts
git commit -m "test: replace constraint workflow todo"
```

---

### Task 3: Patterns Capture Contract

**Files:**
- Modify: `src/intent/types.ts`
- Modify: `src/capture/captureSession.ts`
- Modify: `src/capture/proxy.ts`
- Create: `tests/unit/patterns/patternCapture.test.ts`

- [ ] **Step 1: Write failing capture tests**

Create `tests/unit/patterns/patternCapture.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

describe('pattern capture contract', () => {
  it('captures a linear pattern as one feature with base input and spacing metadata', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const base = kcad.box(10, 5, 2);
    const pattern = base.patternLinear({ count: 4, direction: [1, 0, 0], spacing: 12 });

    const records = session.getRecords();
    expect(pattern.id).toMatch(/^pattern_/);
    expect(records.at(-1)).toMatchObject({
      kind: 'pattern',
      inputs: { base: { kind: 'feature', id: base.id } },
      metadata: {
        pattern: {
          kind: 'linear',
          count: 4,
          direction: [1, 0, 0],
          spacing: 12,
        },
      },
    });
  });

  it('rejects invalid pattern counts before capture', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const base = kcad.box(10, 5, 2);

    expect(() => base.patternLinear({ count: 1, direction: [1, 0, 0], spacing: 12 }))
      .toThrow(/count must be an integer >= 2/);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/unit/patterns/patternCapture.test.ts
```

Expected: fail because `patternLinear` does not exist.

- [ ] **Step 3: Add Pattern types**

In `src/intent/types.ts`, add `'pattern'` to `FeatureKind` near the edge/face features:

```ts
  | 'fillet' | 'chamfer' | 'shell' | 'hole' | 'holes' | 'cutout' | 'draft' | 'pattern'
```

Add:

```ts
export interface LinearPatternSpec {
  kind: 'linear';
  count: number;
  direction: Vec3;
  spacing: number;
}

export interface CircularPatternSpec {
  kind: 'circular';
  count: number;
  axis: Vec3;
  angleDeg: number;
}

export type PatternSpec = LinearPatternSpec | CircularPatternSpec;
```

- [ ] **Step 4: Add CaptureSession registrar**

In `src/capture/captureSession.ts`, import `PatternSpec` and add:

```ts
  patternFeature(base: Shape, pattern: PatternSpec): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`pattern: base shape '${base.id}' is not from this CaptureSession`);
    }
    return this.createShape({
      kind: 'pattern',
      params: {},
      inputs: {
        base: { kind: 'feature', id: base.id },
      },
      metadata: { pattern },
    });
  }
```

- [ ] **Step 5: Add Shape methods and validation**

In `src/capture/proxy.ts`, import `PatternSpec` and add to `Shape`:

```ts
  patternLinear(opts: { count: number; direction: [number, number, number]; spacing: number }): Shape {
    if (!Number.isInteger(opts.count) || opts.count < 2) {
      throw new KernelError('feature.invalid-args', 'patternLinear count must be an integer >= 2.', this.id, 'Pass count: 2 or greater.');
    }
    if (!isValidVec3(opts.direction)) {
      throw new KernelError('feature.invalid-args', `patternLinear direction must be a finite Vec3; got ${formatScalarForError(opts.direction)}.`, this.id, 'Pass direction: [x, y, z].');
    }
    if (typeof opts.spacing !== 'number' || !Number.isFinite(opts.spacing) || opts.spacing === 0) {
      throw new KernelError('feature.invalid-args', `patternLinear spacing must be a non-zero finite number; got ${formatScalarForError(opts.spacing)}.`, this.id, 'Pass a non-zero finite spacing.');
    }
    const pattern: PatternSpec = { kind: 'linear', count: opts.count, direction: opts.direction, spacing: opts.spacing };
    return this.session.patternFeature(this, pattern);
  }

  patternCircular(opts: { count: number; axis: [number, number, number]; angleDeg?: number }): Shape {
    if (!Number.isInteger(opts.count) || opts.count < 2) {
      throw new KernelError('feature.invalid-args', 'patternCircular count must be an integer >= 2.', this.id, 'Pass count: 2 or greater.');
    }
    if (!isValidVec3(opts.axis)) {
      throw new KernelError('feature.invalid-args', `patternCircular axis must be a finite Vec3; got ${formatScalarForError(opts.axis)}.`, this.id, 'Pass axis: [x, y, z].');
    }
    const angleDeg = opts.angleDeg ?? 360;
    if (typeof angleDeg !== 'number' || !Number.isFinite(angleDeg) || angleDeg === 0) {
      throw new KernelError('feature.invalid-args', `patternCircular angleDeg must be a non-zero finite number; got ${formatScalarForError(angleDeg)}.`, this.id, 'Pass a non-zero finite angleDeg.');
    }
    const pattern: PatternSpec = { kind: 'circular', count: opts.count, axis: opts.axis, angleDeg };
    return this.session.patternFeature(this, pattern);
  }
```

- [ ] **Step 6: Verify capture contract**

Run:

```bash
npm test -- tests/unit/patterns/patternCapture.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/intent/types.ts src/capture/captureSession.ts src/capture/proxy.ts tests/unit/patterns/patternCapture.test.ts
git commit -m "feat(patterns): capture linear and circular pattern intent"
```

---

### Task 4: Patterns Lowering + MCP Discoverability

**Files:**
- Modify: `src/backends/occt/occtLowerer.ts`
- Modify: `src/mcp/tools/listApi.ts`
- Create: `tests/unit/backends/occt/patternLowerer.test.ts`

- [ ] **Step 1: Write failing lowerer test**

Create `tests/unit/backends/occt/patternLowerer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/capture/captureSession';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import { createApi } from '../../../../src/modules/api';

describe('OCCT pattern lowerer', () => {
  it('lowers a linear pattern into a fused repeated solid', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.box(2, 2, 2).patternLinear({ count: 3, direction: [1, 0, 0], spacing: 4 });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    const pattern = result.shapes.get('pattern_1');
    expect(pattern).toBeDefined();
    if (!pattern) throw new Error('pattern did not lower');
    const bbox = pattern.shape.boundingBox();
    expect(bbox.max[0] - bbox.min[0]).toBeGreaterThan(9);
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- tests/unit/backends/occt/patternLowerer.test.ts
```

Expected: fail because `OcctLowerer` does not support `pattern`.

- [ ] **Step 3: Add `pattern` to lowerer support**

In `src/backends/occt/occtLowerer.ts`, add `'pattern'` to the `supports` set.

- [ ] **Step 4: Implement minimal pattern lowering**

In `OcctLowerer.lower`, add a `case 'pattern'` arm that:

```ts
case 'pattern': {
  const base = inputs.byKey.base;
  if (!base?.ok) {
    return {
      ok: false,
      diagnostics: [{
        target: this.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `pattern base input is missing or failed.`,
        hint: 'Pattern features must reference a successfully lowered base shape.',
      }],
    };
  }
  const pattern = (r.metadata as { pattern?: import('../../intent/types').PatternSpec } | undefined)?.pattern;
  if (!pattern) {
    return {
      ok: false,
      diagnostics: [{
        target: this.target,
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: 'pattern feature is missing pattern metadata.',
        hint: 'Create patterns through .patternLinear(...) or .patternCircular(...).',
      }],
    };
  }
  let shape = base.shape;
  for (let i = 1; i < pattern.count; i++) {
    let instance = base.shape;
    if (pattern.kind === 'linear') {
      instance = instance.translate(
        pattern.direction[0] * pattern.spacing * i,
        pattern.direction[1] * pattern.spacing * i,
        pattern.direction[2] * pattern.spacing * i,
      );
    } else {
      instance = instance.rotate(pattern.axis, (pattern.angleDeg / pattern.count) * i);
    }
    shape = shape.fuse(instance);
  }
  return { ok: true, shape, diagnostics: [] };
}
```

If `OcctBackend` exposes different wrapper names in the current branch, use the equivalent methods already used by transform and boolean lowering in the same file. Do not bypass `OcctBackend` with raw Replicad unless the adjacent cases already do that.

- [ ] **Step 5: Update MCP API list**

In `src/mcp/tools/listApi.ts`, add:

```ts
'patternLinear',
'patternCircular',
```

to the `SHAPE_METHODS` list.

- [ ] **Step 6: Verify lowerer and drift sentinel**

Run:

```bash
npm test -- tests/unit/backends/occt/patternLowerer.test.ts tests/integration/mcp/listApi.driftSentinel.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/backends/occt/occtLowerer.ts src/mcp/tools/listApi.ts tests/unit/backends/occt/patternLowerer.test.ts
git commit -m "feat(patterns): lower repeated mechanical features"
```

---

### Task 5: Foundation Proof Script + Changelog

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add proof script**

In `package.json`, add:

```json
"proof:foundation": "npm run typecheck && npm run test:audit && npm test -- src/lib/constraints/solver.test.ts src/lib/constraints/advanced_constraints.test.ts tests/integration/diagnostics/hint-mandatory.test.ts scripts/lib/whatsNewTemplate.test.ts tests/integration/mcp/listApi.driftSentinel.test.ts tests/unit/patterns/patternCapture.test.ts tests/unit/backends/occt/patternLowerer.test.ts"
```

- [ ] **Step 2: Add changelog entry**

Under `## [Unreleased]` in `CHANGELOG.md`, add:

```md
### Added — foundation + mechanical core preparation

- Added an executable test-quality audit so focused tests and `it.todo` cases cannot be mistaken for release proof.
- Added the first Patterns contract with `.patternLinear(...)` and `.patternCircular(...)` shape methods, captured as canonical `.kcad.ts` model intent and advertised through MCP `list_api`.
- Added a focused foundation proof script covering typecheck, test-quality audit, constraints, diagnostics, release-note template checks, MCP API drift, and pattern capture/lowering behavior.
```

- [ ] **Step 3: Verify full slice**

Run:

```bash
npm run proof:foundation
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: add foundation proof gate"
```

---

## Self-Review Checklist

- Spec coverage: covers foundation cleanup, test quality, release proof, Patterns as first mechanical-core dependency, and MCP discoverability.
- Scope boundary: does not implement assemblies, toolbox, UI, SDF, or vision.
- Test posture: starts with failing tests for audit, todo removal, pattern capture, and pattern lowering.
- Acceptance: `npm run proof:foundation` passes in the `feat/foundation-mechanical-core` worktree.
