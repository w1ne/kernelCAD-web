# kernelCAD v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working `kernelcad` CLI that runs `.kcad.ts` scripts (primitives + booleans + extrude/revolve), exports STL+STEP, and emits structured JSON diagnostics. Foundation for v0.2+ (edge features, sketches, stable naming) lives in this same architecture but is out of scope.

**Architecture:** Script-primary (`.kcad.ts` is canonical). User scripts execute in a Web Worker / Node `vm.runInContext` realm and register `FeatureRecord`s by side-effect into a `CaptureSession`. The flat feature graph feeds a `RecomputeEngine` that lowers each feature via the `OcctLowerer` (wrapping the existing Replicad/OpenCASCADE worker) and produces a `RuntimeMesh` for preview + `STEP/STL` for export. v0.1 supports only `canonical` face refs (top/bottom/...) — `tracked`/`created`/`propagated` refs and `NamingHistory` are v0.2+ work.

**Tech Stack:** TypeScript, Node 22+, Vite (dev), Vitest (unit tests), Playwright (e2e — minimal in v0.1), Replicad 0.20.5 + replicad-opencascadejs 0.20.2 (OCCT WASM), `mathjs` (expression engine, NEW dep), `commander` (CLI, NEW dep), `vm` (Node built-in for script isolation).

**v0.1 Acceptance Demo:** This script must run via `kernelcad export step demo.kcad.ts -o demo.step` and produce a valid STEP file:

```typescript
// demo.kcad.ts
const w = param('Width', 100, { min: 50, max: 200, unit: 'mm' });
const h = param('Height', 50, { min: 20, max: 100, unit: 'mm' });
const d = param('Depth', 30, { min: 10, max: 80, unit: 'mm' });

const base = box(w, h, d);
const hole = cylinder(d + 10, 10).translate(w / 2, h / 2, -5);
const plate = base.subtract(hole);

return plate;
```

The STEP file must round-trip through FreeCAD or Fusion 360 without geometry corruption.

---

## File Structure

NEW directories under `src/` (parallel to existing code; existing `src/components`, `src/features`, `src/kernel` stay running for the web studio):

```
src/
  intent/
    types.ts              # FeatureId, Param, FaceRef, EdgeRef, FeatureKind, FeatureRef
    featureRecord.ts      # FeatureRecord interface + helpers
    featureId.ts          # FeatureId generation (incrementing counter, stable per session)
  capture/
    captureSession.ts     # collects FeatureRecord during script execution
    proxy.ts              # Shape proxy with chainable methods (.translate, .subtract, ...)
  compute/
    paramRegistry.ts      # ParamRegistry (mathjs expressions + cycle detection + units)
    dependencyGraph.ts    # DAG, topological sort, canReorder
    inputHash.ts          # SHA-256 of (kind, params, input ids+geometry sigs)
    recomputeEngine.ts    # the recompute loop + health state
  naming/
    canonicalFace.ts      # canonical face resolution (v0.1 only — top/bottom/...)
    # NamingHistory + EvolutionRecord are v0.2 work — skipped in v0.1
  diagnostics/
    diagnostic.ts         # CompilerDiagnostic type
    formatter.ts          # JSON formatter for CLI output
  backends/
    backend.ts            # ShapeBackend + FeatureLowerer interfaces
    runtimeMesh.ts        # RuntimeMesh exchange format
    occt/
      worker.ts           # Refactored from src/lib/worker.ts
      occtBackend.ts      # OcctBackend implementing ShapeBackend
      occtLowerer.ts      # OcctLowerer per FeatureKind
      workerHost.ts       # Main-thread/Node host that spawns + talks to worker
  script-runtime/
    transpile.ts          # ts.transpileModule wrapper + source map
    isolation.ts          # buildSandboxGlobals(), createSandboxedRunner()
    require.ts            # multi-file require() shim with param overrides
    runScript.ts          # main entry: load → transpile → run → return capture
  modules/
    core/
      box.ts              # box() global
      cylinder.ts         # cylinder() global
      sphere.ts           # sphere() global
      extrude.ts          # extrude(), profile primitives (rect, circle, polygon)
      revolve.ts          # revolve()
      boolean.ts          # union(), .subtract(), .intersect()
      transforms.ts       # .translate(), .rotate(), .scale() on Shape proxy
    api.ts                # the global API surface — wires modules into CaptureSession
  cli/
    index.ts              # CLI entry (commander.js setup)
    commands/
      evaluate.ts         # `kernelcad evaluate <file.kcad.ts>`
      exportStl.ts        # `kernelcad export stl <file>`
      exportStep.ts       # `kernelcad export step <file>`

tests/
  unit/
    intent/
      featureRecord.test.ts
      featureId.test.ts
    capture/
      captureSession.test.ts
    compute/
      paramRegistry.test.ts
      dependencyGraph.test.ts
      inputHash.test.ts
      recomputeEngine.test.ts
    backends/occt/
      occtLowerer.test.ts        # geometry regression (volume/bbox per primitive)
    modules/core/
      box.test.ts
      cylinder.test.ts
      boolean.test.ts
    cli/
      evaluate.test.ts
  e2e/
    cli-acceptance.test.ts        # run demo.kcad.ts end-to-end via CLI
    fixtures/
      demo.kcad.ts                # the acceptance demo above
```

EXISTING code preserved (untouched in v0.1; refactored later):
- `src/components/*` — web studio UI keeps using existing features
- `src/features/*` — old feature registry stays for web studio
- `src/agent/AgentAPI.ts` — keeps existing shape; MCP server migration is post-v0.1
- `src/kernel/HeadlessKernel.ts` — kept; web studio uses it; replaced by `script-runtime/` for CLI
- `src/lib/CodeBuilder.ts`, `CodeAnalyzer.ts` — kept; reused by `commands/` in v0.5

EXISTING code refactored:
- `src/lib/worker.ts` (777 lines) → `src/backends/occt/worker.ts` (move + interface adapter)

---

## Phase 0 — Cleanup & Foundation

### Task 0.1: Archive obsolete docs

**Files:**
- Move 19 files from `doc/` to `archive/doc/`

- [ ] **Step 1: Create archive folder**

```bash
mkdir -p ~/projects/kernelCAD-web/archive/doc
```

- [ ] **Step 2: Move obsolete docs (KEEP only ARCHITECTURE, ROADMAP, TESTING_STRATEGY for now; rest archived)**

```bash
cd ~/projects/kernelCAD-web/doc
git mv AGENT_API.md AGENTIC_WORKFLOW_IDEAS.md BEST_PRACTICES_WORKFLOWS.md \
       CAD_ENGINEERING_STANDARDS.md CAD_QUERY_GUIDE.md CAD_WORKFLOW_COMPARISON.md \
       COMPETITIVE_ANALYSIS.md CORE_WORKFLOWS.md DETAILED_INTERACTION_SPECS.md \
       HISTORY_SYSTEM_SPEC.md IMPLEMENTATION_DETAILS.md INTERFACES.md \
       KEYBOARD_SHORTCUTS.md PERFORMANCE_IMPROVEMENTS.md PROJECT_MANAGEMENT.md \
       REFACTORING_ANALYSIS.md RELEASE_READINESS.md RELEASE_STRATEGY.md \
       RELIABILITY_LAYER.md VISIBILITY_AND_SELECTION_SPEC.md \
       VISION.md VISUAL_FEEDBACK_SYSTEM.md \
       ../archive/doc/
```

Expected: 22 files moved. `doc/` retains `ARCHITECTURE.md`, `ROADMAP.md`, `TESTING_STRATEGY.md`, and `spec/` subfolder.

- [ ] **Step 3: Commit**

```bash
git add archive/ doc/
git commit -m "chore(docs): archive 22 obsolete docs (v1 cleanup)"
```

---

### Task 0.2: Delete root-level cruft

**Files:**
- Delete: `test_output.txt`, `debug_output.txt`, `test_replicad_behavior.ts`

- [ ] **Step 1: Verify these are unreferenced**

```bash
cd ~/projects/kernelCAD-web
grep -rn "test_output\|debug_output\|test_replicad_behavior" --include="*.ts" --include="*.json" --include="*.md" src/ scripts/ docs/ | head
```

Expected: no hits in source code (only in this plan if grepping docs).

- [ ] **Step 2: Delete**

```bash
git rm test_output.txt debug_output.txt test_replicad_behavior.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove root-level scratch files"
```

---

### Task 0.3: Port internal docs from kernelCAD-private

**Files:**
- Copy: `~/projects/kernelCAD-private/research/fusion360/STABLE_NAMING_BLUEPRINT.md` → `docs/internals/STABLE_NAMING.md`
- Copy: `~/projects/kernelCAD-private/research/fusion360/kernelCAD_COMPUTE.md` → `docs/internals/RECOMPUTE.md`
- Copy: `~/projects/kernelCAD-private/research/fusion360/kernelCAD_SCHEMA.md` → `docs/internals/SCHEMA.md`
- Copy: `~/projects/kernelCAD-private/research/fusion360/OCCT_WASM_PERFORMANCE_GUIDE.md` → `docs/internals/OCCT_PERFORMANCE.md`

- [ ] **Step 1: Create internals dir**

```bash
mkdir -p ~/projects/kernelCAD-web/docs/internals
```

- [ ] **Step 2: Copy + add header banner to each**

```bash
cp ~/projects/kernelCAD-private/research/fusion360/STABLE_NAMING_BLUEPRINT.md ~/projects/kernelCAD-web/docs/internals/STABLE_NAMING.md
cp ~/projects/kernelCAD-private/research/fusion360/kernelCAD_COMPUTE.md ~/projects/kernelCAD-web/docs/internals/RECOMPUTE.md
cp ~/projects/kernelCAD-private/research/fusion360/kernelCAD_SCHEMA.md ~/projects/kernelCAD-web/docs/internals/SCHEMA.md
cp ~/projects/kernelCAD-private/research/fusion360/OCCT_WASM_PERFORMANCE_GUIDE.md ~/projects/kernelCAD-web/docs/internals/OCCT_PERFORMANCE.md
```

For each ported file, prepend:

```markdown
> **Ported from `kernelCAD-private` research; revised for v0.1+ implementation.**
> See `docs/superpowers/specs/2026-04-29-kernelcad-NORTHSTAR.md` for current architecture.
```

- [ ] **Step 3: Commit**

```bash
git add docs/internals/
git commit -m "docs(internals): port load-bearing research docs from kernelCAD-private"
```

---

### Task 0.4: Add CONTRIBUTING.md IP boundary clause

**Files:**
- Modify: `CONTRIBUTING.md` (create if missing)

- [ ] **Step 1: Check for existing CONTRIBUTING.md**

```bash
ls ~/projects/kernelCAD-web/CONTRIBUTING.md 2>&1
```

- [ ] **Step 2: Create or append the IP clause**

Append (or create) the file with:

```markdown
## Implementation IP Boundary

kernelCAD's implementation is clean-room and independent. Contributors must not paste source material from any commercial CAD product or any GPL/copyleft codebase into kernelCAD code or commits.

Architectural inspiration from public documentation of other CAD systems (Autodesk Fusion 360 published API docs, OpenCASCADE source, Replicad source, public CAD literature) is welcome; literal code copying is not.

When in doubt about the provenance of a snippet you want to use, ask in a PR comment before committing.
```

- [ ] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs(contributing): add clean-room IP boundary clause"
```

---

### Task 0.5: Install new dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
cd ~/projects/kernelCAD-web
npm install --save mathjs commander
npm install --save-dev @types/node
```

Expected: `mathjs ^14`, `commander ^14`, `@types/node ^22` in `package.json`.

- [ ] **Step 2: Verify**

```bash
npm ls mathjs commander
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add mathjs and commander for v0.1 foundation"
```

---

## Phase 1 — IR Types

### Task 1.1: Foundation types

**Files:**
- Create: `src/intent/types.ts`
- Test: `tests/unit/intent/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/intent/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Param, FaceRef, EdgeRef, FeatureRef } from '../../../src/intent/types';

describe('intent/types', () => {
  it('Param accepts expression + unit + evaluated', () => {
    const p: Param = { expression: '50 mm', unit: 'mm', evaluated: 50 };
    expect(p.evaluated).toBe(50);
  });

  it('FaceRef discriminated union — canonical', () => {
    const f: FaceRef = { kind: 'canonical', face: 'top' };
    expect(f.kind).toBe('canonical');
  });

  it('EdgeRef carries selector', () => {
    const e: EdgeRef = { kind: 'tracked', edgeName: 'lid', selector: 'midpoint' };
    expect(e.selector).toBe('midpoint');
  });

  it('FeatureRef discriminated union supports face refs', () => {
    const r: FeatureRef = {
      kind: 'face',
      featureId: 'box_1',
      ref: { kind: 'canonical', face: 'top' }
    };
    expect(r.kind).toBe('face');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/projects/kernelCAD-web && npx vitest run tests/unit/intent/types.test.ts
```

Expected: FAIL with "Cannot find module" (file doesn't exist yet).

- [ ] **Step 3: Implement**

```typescript
// src/intent/types.ts
export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
export type Mat4 = number[]; // 16 elements, column-major

export type FeatureId = string;
export type RewriteId = string;

export interface ScriptLocation {
  file: string;
  line: number;
  column: number;
}

export type Unit = 'mm' | 'in' | 'm' | 'deg' | 'rad' | 'unitless';

export interface Param {
  expression: string;       // e.g. 'width / 2 + 5 mm'
  unit: Unit;
  evaluated: number;        // canonical: mm for length, deg for angle
}

export type FaceRef =
  | { kind: 'canonical'; face: 'top'|'bottom'|'left'|'right'|'front'|'back' }
  | { kind: 'tracked'; faceName: string }
  | { kind: 'created'; rewriteId: RewriteId; slot: string }
  | { kind: 'propagated'; rewriteId: RewriteId; source: FaceRef };

export type EdgeRef =
  | { kind: 'tracked'; edgeName: string; selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'created'; rewriteId: RewriteId; slot: string;
      selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'propagated'; rewriteId: RewriteId; source: EdgeRef;
      selector: 'edge'|'start'|'end'|'midpoint' };

export type VertexRef =
  | { kind: 'tracked'; vertexName: string }
  | { kind: 'created'; rewriteId: RewriteId; slot: string };

export type FeatureRef =
  | { kind: 'feature'; id: FeatureId }
  | { kind: 'face'; featureId: FeatureId; ref: FaceRef }
  | { kind: 'edge'; featureId: FeatureId; ref: EdgeRef }
  | { kind: 'vertex'; featureId: FeatureId; ref: VertexRef };

export type FeatureKind =
  // primitives
  | 'box' | 'cylinder' | 'sphere' | 'torus'
  // 2D-to-3D
  | 'extrude' | 'revolve' | 'loft' | 'sweep'
  // boolean
  | 'boolean'
  // edge/face features (v0.2+)
  | 'fillet' | 'chamfer' | 'shell' | 'hole' | 'cut' | 'draft'
  // imports (v0.3+)
  | 'importedMesh' | 'importedStep'
  // sketch (v0.2+)
  | 'sketch' | 'constrainedSketch'
  // assembly (v0.6+)
  | 'assemblyPart' | 'assemblyJoint' | 'assemblyConnect'
  // specialty (v0.13+)
  | 'sheetMetal' | 'sdf';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/intent/types.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/intent/types.ts tests/unit/intent/types.test.ts
git commit -m "feat(intent): add foundation types (Param, FaceRef, EdgeRef, FeatureKind)"
```

---

### Task 1.2: FeatureRecord + featureId generator

**Files:**
- Create: `src/intent/featureId.ts`
- Create: `src/intent/featureRecord.ts`
- Test: `tests/unit/intent/featureRecord.test.ts`
- Test: `tests/unit/intent/featureId.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/intent/featureId.test.ts
import { describe, it, expect } from 'vitest';
import { createFeatureIdGenerator } from '../../../src/intent/featureId';

describe('featureId', () => {
  it('produces unique IDs for the same kind', () => {
    const gen = createFeatureIdGenerator();
    expect(gen.next('box')).toBe('box_1');
    expect(gen.next('box')).toBe('box_2');
    expect(gen.next('cylinder')).toBe('cylinder_1');
  });

  it('reset() restarts counters', () => {
    const gen = createFeatureIdGenerator();
    gen.next('box');
    gen.reset();
    expect(gen.next('box')).toBe('box_1');
  });
});
```

```typescript
// tests/unit/intent/featureRecord.test.ts
import { describe, it, expect } from 'vitest';
import type { FeatureRecord } from '../../../src/intent/featureRecord';
import type { Param } from '../../../src/intent/types';

describe('FeatureRecord', () => {
  it('has expected shape', () => {
    const w: Param = { expression: '100 mm', unit: 'mm', evaluated: 100 };
    const r: FeatureRecord = {
      id: 'box_1',
      kind: 'box',
      inputs: {},
      params: { width: w, height: w, depth: w },
      transforms: [],
      suppressed: false,
    };
    expect(r.id).toBe('box_1');
    expect(r.params.width.evaluated).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/intent/featureId.test.ts tests/unit/intent/featureRecord.test.ts
```

Expected: both FAIL with module not found.

- [ ] **Step 3: Implement**

```typescript
// src/intent/featureId.ts
import type { FeatureId, FeatureKind } from './types';

export interface FeatureIdGenerator {
  next(kind: FeatureKind): FeatureId;
  reset(): void;
}

export function createFeatureIdGenerator(): FeatureIdGenerator {
  const counters = new Map<FeatureKind, number>();
  return {
    next(kind) {
      const n = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, n);
      return `${kind}_${n}`;
    },
    reset() {
      counters.clear();
    },
  };
}
```

```typescript
// src/intent/featureRecord.ts
import type {
  FeatureId, FeatureKind, FeatureRef, Param, ScriptLocation,
  Vec3,
} from './types';

export type ShapeTransform =
  | { op: 'translate'; x: number; y: number; z: number }
  | { op: 'rotateAxis'; axis: Vec3; degrees: number; pivot?: Vec3 }
  | { op: 'scale'; sx: number; sy: number; sz: number }
  | { op: 'mirror'; normal: Vec3 };

export interface FeatureRecord {
  id: FeatureId;
  kind: FeatureKind;
  inputs: Record<string, FeatureRef>;
  params: Record<string, Param>;
  transforms: ShapeTransform[];
  scriptLocation?: ScriptLocation;
  suppressed: boolean;
  metadata?: Record<string, unknown>;
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run tests/unit/intent/featureId.test.ts tests/unit/intent/featureRecord.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/intent/featureId.ts src/intent/featureRecord.ts tests/unit/intent/featureRecord.test.ts tests/unit/intent/featureId.test.ts
git commit -m "feat(intent): add FeatureRecord + FeatureIdGenerator"
```

---

## Phase 2 — Param Registry & Capture

### Task 2.1: ParamRegistry with mathjs

**Files:**
- Create: `src/compute/paramRegistry.ts`
- Test: `tests/unit/compute/paramRegistry.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/compute/paramRegistry.test.ts
import { describe, it, expect } from 'vitest';
import { ParamRegistry } from '../../../src/compute/paramRegistry';

describe('ParamRegistry', () => {
  it('registers and evaluates a numeric param', () => {
    const r = new ParamRegistry();
    r.register('Width', '100', { unit: 'mm', min: 0, max: 200 });
    expect(r.get('Width').evaluated).toBe(100);
  });

  it('evaluates an expression that references another param', () => {
    const r = new ParamRegistry();
    r.register('Width', '100', { unit: 'mm' });
    r.register('Half', 'Width / 2', { unit: 'mm' });
    expect(r.get('Half').evaluated).toBe(50);
  });

  it('detects cycles and throws', () => {
    const r = new ParamRegistry();
    r.register('A', '1', { unit: 'mm' });
    r.register('B', 'A + 1', { unit: 'mm' });
    expect(() => r.update('A', 'B + 1')).toThrow(/cycle/i);
  });

  it('updates trigger re-evaluation of dependents', () => {
    const r = new ParamRegistry();
    r.register('Width', '100', { unit: 'mm' });
    r.register('Half', 'Width / 2', { unit: 'mm' });
    r.update('Width', '200');
    expect(r.get('Half').evaluated).toBe(100);
  });

  it('unit conversion: in to mm', () => {
    const r = new ParamRegistry();
    r.register('Len', '1 in', { unit: 'mm' });
    expect(r.get('Len').evaluated).toBeCloseTo(25.4, 3);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/compute/paramRegistry.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// src/compute/paramRegistry.ts
import { create, all, type MathJsInstance } from 'mathjs';
import type { Param, Unit } from '../intent/types';

const math: MathJsInstance = create(all, {});

export interface ParamOptions {
  unit: Unit;
  min?: number;
  max?: number;
  description?: string;
}

interface ParamEntry {
  expression: string;
  unit: Unit;
  options: ParamOptions;
  evaluated: number;
  dependsOn: Set<string>;
  dependents: Set<string>;
}

export class ParamRegistry {
  private params = new Map<string, ParamEntry>();

  register(name: string, expression: string, options: ParamOptions): void {
    if (this.params.has(name)) {
      throw new Error(`Param '${name}' already registered`);
    }
    const entry: ParamEntry = {
      expression,
      unit: options.unit,
      options,
      evaluated: 0,
      dependsOn: this.parseDependencies(expression),
      dependents: new Set(),
    };
    this.params.set(name, entry);
    for (const dep of entry.dependsOn) {
      const e = this.params.get(dep);
      if (e) e.dependents.add(name);
    }
    this.evaluate(name);
  }

  update(name: string, newExpression: string): void {
    const entry = this.params.get(name);
    if (!entry) throw new Error(`Param '${name}' not registered`);
    const newDeps = this.parseDependencies(newExpression);
    // cycle check
    if (this.wouldCycle(name, newDeps)) {
      throw new Error(`Cycle detected: '${name}' depends on itself transitively`);
    }
    // remove old dependents links
    for (const oldDep of entry.dependsOn) {
      this.params.get(oldDep)?.dependents.delete(name);
    }
    entry.expression = newExpression;
    entry.dependsOn = newDeps;
    for (const dep of newDeps) {
      this.params.get(dep)?.dependents.add(name);
    }
    this.evaluate(name);
    // cascade re-eval to dependents
    const queue = [...entry.dependents];
    while (queue.length) {
      const next = queue.shift()!;
      this.evaluate(next);
      for (const d of this.params.get(next)!.dependents) queue.push(d);
    }
  }

  get(name: string): Param {
    const e = this.params.get(name);
    if (!e) throw new Error(`Param '${name}' not registered`);
    return { expression: e.expression, unit: e.unit, evaluated: e.evaluated };
  }

  list(): string[] {
    return [...this.params.keys()];
  }

  private parseDependencies(expression: string): Set<string> {
    // Walk mathjs AST to find SymbolNodes
    const deps = new Set<string>();
    try {
      const node = math.parse(expression);
      node.traverse((n: { type: string; name?: string }) => {
        if (n.type === 'SymbolNode' && n.name && this.params.has(n.name)) {
          deps.add(n.name);
        }
      });
    } catch {
      // parse error — leave deps empty; evaluation will fail with a clearer error
    }
    return deps;
  }

  private wouldCycle(name: string, newDeps: Set<string>): boolean {
    // DFS from each new dep; if we reach `name`, it's a cycle
    const visited = new Set<string>();
    const visit = (node: string): boolean => {
      if (node === name) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      const entry = this.params.get(node);
      if (!entry) return false;
      for (const d of entry.dependsOn) if (visit(d)) return true;
      return false;
    };
    for (const d of newDeps) if (visit(d)) return true;
    return false;
  }

  private evaluate(name: string): void {
    const entry = this.params.get(name)!;
    const scope: Record<string, number> = {};
    for (const dep of entry.dependsOn) {
      scope[dep] = this.params.get(dep)!.evaluated;
    }
    const result = math.evaluate(entry.expression, scope);
    // Convert to canonical unit (mm for length, deg for angle)
    let value: number;
    if (typeof result === 'number') {
      value = result;
    } else if (result && typeof result.toNumber === 'function') {
      value = result.toNumber(this.canonicalUnitString(entry.unit));
    } else {
      throw new Error(`Param '${name}' evaluation produced unexpected type: ${typeof result}`);
    }
    entry.evaluated = value;
  }

  private canonicalUnitString(unit: Unit): string {
    switch (unit) {
      case 'mm': return 'mm';
      case 'in': return 'mm';   // canonical is mm
      case 'm':  return 'mm';
      case 'deg': return 'deg';
      case 'rad': return 'deg';  // canonical is deg
      case 'unitless': return '';
    }
  }
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/compute/paramRegistry.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compute/paramRegistry.ts tests/unit/compute/paramRegistry.test.ts
git commit -m "feat(compute): ParamRegistry with mathjs expressions, units, cycle detection"
```

---

### Task 2.2: CaptureSession + Shape proxy

**Files:**
- Create: `src/capture/captureSession.ts`
- Create: `src/capture/proxy.ts`
- Test: `tests/unit/capture/captureSession.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/capture/captureSession.test.ts
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';

describe('CaptureSession', () => {
  it('records features in capture order', () => {
    const s = new CaptureSession();
    const f1 = s.register({
      kind: 'box',
      params: {
        width: { expression: '10', unit: 'mm', evaluated: 10 },
        height: { expression: '10', unit: 'mm', evaluated: 10 },
        depth: { expression: '10', unit: 'mm', evaluated: 10 },
        centered: { expression: 'false', unit: 'unitless', evaluated: 0 },
      },
      inputs: {},
    });
    const f2 = s.register({
      kind: 'cylinder',
      params: {
        h: { expression: '20', unit: 'mm', evaluated: 20 },
        r: { expression: '5', unit: 'mm', evaluated: 5 },
      },
      inputs: {},
    });
    const records = s.getRecords();
    expect(records).toHaveLength(2);
    expect(records[0].id).toBe(f1.id);
    expect(records[1].id).toBe(f2.id);
    expect(records[0].kind).toBe('box');
    expect(records[1].kind).toBe('cylinder');
  });

  it('createShape returns a proxy that registers transforms', () => {
    const s = new CaptureSession();
    const shape = s.createShape({
      kind: 'box',
      params: {
        width: { expression: '10', unit: 'mm', evaluated: 10 },
        height: { expression: '10', unit: 'mm', evaluated: 10 },
        depth: { expression: '10', unit: 'mm', evaluated: 10 },
        centered: { expression: 'false', unit: 'unitless', evaluated: 0 },
      },
      inputs: {},
    });
    shape.translate(5, 0, 0);
    const records = s.getRecords();
    expect(records[0].transforms).toEqual([
      { op: 'translate', x: 5, y: 0, z: 0 },
    ]);
  });

  it('boolean ops register a new feature with input refs', () => {
    const s = new CaptureSession();
    const a = s.createShape({ kind: 'box', params: {}, inputs: {} });
    const b = s.createShape({ kind: 'cylinder', params: {}, inputs: {} });
    const c = a.subtract(b);
    const records = s.getRecords();
    expect(records).toHaveLength(3);
    expect(records[2].kind).toBe('boolean');
    expect(records[2].inputs.base).toEqual({ kind: 'feature', id: a.id });
    expect(records[2].inputs.cutter_0).toEqual({ kind: 'feature', id: b.id });
    expect(c.id).toBe(records[2].id);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/capture/captureSession.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement proxy**

```typescript
// src/capture/proxy.ts
import type { FeatureId, FeatureRef } from '../intent/types';
import type { ShapeTransform } from '../intent/featureRecord';
import type { CaptureSession } from './captureSession';

export class Shape {
  constructor(
    readonly id: FeatureId,
    private session: CaptureSession,
  ) {}

  translate(x: number, y: number, z: number): Shape {
    this.session.appendTransform(this.id, { op: 'translate', x, y, z });
    return this;
  }

  rotate(axis: [number, number, number], degrees: number, pivot?: [number, number, number]): Shape {
    this.session.appendTransform(this.id, { op: 'rotateAxis', axis, degrees, pivot });
    return this;
  }

  scale(sx: number, sy?: number, sz?: number): Shape {
    this.session.appendTransform(this.id, {
      op: 'scale',
      sx,
      sy: sy ?? sx,
      sz: sz ?? sx,
    });
    return this;
  }

  subtract(...others: Shape[]): Shape {
    return this.session.boolean('difference', this, others);
  }

  union(...others: Shape[]): Shape {
    return this.session.boolean('union', this, others);
  }

  intersect(...others: Shape[]): Shape {
    return this.session.boolean('intersection', this, others);
  }
}
```

- [ ] **Step 4: Implement CaptureSession**

```typescript
// src/capture/captureSession.ts
import { createFeatureIdGenerator, type FeatureIdGenerator } from '../intent/featureId';
import type { FeatureRecord, ShapeTransform } from '../intent/featureRecord';
import type { FeatureKind, FeatureRef, Param } from '../intent/types';
import { Shape } from './proxy';

export interface FeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
}

export class CaptureSession {
  private idGen: FeatureIdGenerator = createFeatureIdGenerator();
  private records: FeatureRecord[] = [];

  register(spec: FeatureSpec): FeatureRecord {
    const id = this.idGen.next(spec.kind);
    const r: FeatureRecord = {
      id,
      kind: spec.kind,
      params: spec.params,
      inputs: spec.inputs,
      transforms: [],
      suppressed: false,
    };
    this.records.push(r);
    return r;
  }

  createShape(spec: FeatureSpec): Shape {
    const r = this.register(spec);
    return new Shape(r.id, this);
  }

  appendTransform(id: string, t: ShapeTransform): void {
    const r = this.records.find(x => x.id === id);
    if (!r) throw new Error(`Feature '${id}' not registered`);
    r.transforms.push(t);
  }

  boolean(op: 'union'|'difference'|'intersection', base: Shape, cutters: Shape[]): Shape {
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };
    cutters.forEach((c, i) => {
      inputs[`cutter_${i}`] = { kind: 'feature', id: c.id };
    });
    const opLabel: Param = {
      expression: `'${op}'`, unit: 'unitless', evaluated: 0,
    };
    return this.createShape({
      kind: 'boolean',
      params: { op: opLabel },
      inputs,
    });
  }

  getRecords(): readonly FeatureRecord[] {
    return this.records;
  }

  reset(): void {
    this.records = [];
    this.idGen.reset();
  }
}
```

- [ ] **Step 5: Run to verify pass**

```bash
npx vitest run tests/unit/capture/captureSession.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/capture/ tests/unit/capture/
git commit -m "feat(capture): CaptureSession + Shape proxy with chainable transforms + booleans"
```

---

## Phase 3 — Dependency Graph & Recompute

### Task 3.1: DependencyGraph

**Files:**
- Create: `src/compute/dependencyGraph.ts`
- Test: `tests/unit/compute/dependencyGraph.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/compute/dependencyGraph.test.ts
import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../../src/compute/dependencyGraph';

describe('DependencyGraph', () => {
  it('topological sort respects dependencies', () => {
    const g = new DependencyGraph();
    g.addNode('a');
    g.addNode('b');
    g.addNode('c');
    g.addEdge('a', 'b'); // b depends on a
    g.addEdge('b', 'c');
    expect(g.topologicalOrder()).toEqual(['a', 'b', 'c']);
  });

  it('canReorder rejects moving a node before its dependency', () => {
    const g = new DependencyGraph();
    g.addNode('a');
    g.addNode('b');
    g.addEdge('a', 'b');
    const result = g.canReorder('b', 0);
    expect(result.valid).toBe(false);
    expect(result.blockingFeatureId).toBe('a');
  });

  it('canReorder accepts safe moves', () => {
    const g = new DependencyGraph();
    g.addNode('a');
    g.addNode('b');
    g.addNode('c');
    // no deps; any order works
    expect(g.canReorder('c', 0).valid).toBe(true);
  });

  it('detects cycles', () => {
    const g = new DependencyGraph();
    g.addNode('a');
    g.addNode('b');
    g.addEdge('a', 'b');
    expect(() => g.addEdge('b', 'a')).toThrow(/cycle/i);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/compute/dependencyGraph.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/compute/dependencyGraph.ts
import type { FeatureId } from '../intent/types';

export interface ReorderResult {
  valid: boolean;
  reason?: string;
  blockingFeatureId?: FeatureId;
}

export class DependencyGraph {
  private nodes: FeatureId[] = [];                      // order = creation order
  private edges = new Map<FeatureId, Set<FeatureId>>(); // from → to (to depends on from)

  addNode(id: FeatureId): void {
    if (this.edges.has(id)) return;
    this.nodes.push(id);
    this.edges.set(id, new Set());
  }

  addEdge(from: FeatureId, to: FeatureId): void {
    if (!this.edges.has(from)) throw new Error(`Unknown source node: ${from}`);
    if (!this.edges.has(to)) throw new Error(`Unknown target node: ${to}`);
    if (from === to) throw new Error(`Self-edge: ${from}`);
    if (this.wouldCycle(from, to)) {
      throw new Error(`Adding edge ${from}->${to} would create a cycle`);
    }
    this.edges.get(from)!.add(to);
  }

  removeNode(id: FeatureId): void {
    this.edges.delete(id);
    for (const set of this.edges.values()) set.delete(id);
    this.nodes = this.nodes.filter(n => n !== id);
  }

  topologicalOrder(): FeatureId[] {
    const indegree = new Map<FeatureId, number>();
    for (const n of this.nodes) indegree.set(n, 0);
    for (const [, targets] of this.edges) {
      for (const t of targets) indegree.set(t, (indegree.get(t) ?? 0) + 1);
    }
    const queue: FeatureId[] = this.nodes.filter(n => (indegree.get(n) ?? 0) === 0);
    const result: FeatureId[] = [];
    while (queue.length) {
      const n = queue.shift()!;
      result.push(n);
      for (const t of this.edges.get(n) ?? []) {
        const d = (indegree.get(t) ?? 0) - 1;
        indegree.set(t, d);
        if (d === 0) queue.push(t);
      }
    }
    if (result.length !== this.nodes.length) {
      throw new Error('Cycle detected during topo sort (graph corrupt)');
    }
    return result;
  }

  canReorder(id: FeatureId, newIndex: number): ReorderResult {
    const currentIndex = this.nodes.indexOf(id);
    if (currentIndex < 0) return { valid: false, reason: `Unknown node: ${id}` };
    if (newIndex < 0 || newIndex >= this.nodes.length) {
      return { valid: false, reason: `Index out of range: ${newIndex}` };
    }
    // upstream deps must remain at indices < newIndex
    for (const [from, targets] of this.edges) {
      if (targets.has(id)) {
        const fromIdx = this.nodes.indexOf(from);
        if (fromIdx >= newIndex) {
          return {
            valid: false,
            reason: `Dependency '${from}' would be after this node`,
            blockingFeatureId: from,
          };
        }
      }
    }
    // downstream dependents must remain at indices > newIndex
    for (const t of this.edges.get(id) ?? []) {
      const tIdx = this.nodes.indexOf(t);
      if (tIdx <= newIndex) {
        return {
          valid: false,
          reason: `Dependent '${t}' would be before this node`,
          blockingFeatureId: t,
        };
      }
    }
    return { valid: true };
  }

  private wouldCycle(from: FeatureId, to: FeatureId): boolean {
    // DFS from `to`; if we reach `from`, adding `from->to` would cycle
    const visited = new Set<FeatureId>();
    const stack: FeatureId[] = [to];
    while (stack.length) {
      const n = stack.pop()!;
      if (n === from) return true;
      if (visited.has(n)) continue;
      visited.add(n);
      for (const t of this.edges.get(n) ?? []) stack.push(t);
    }
    return false;
  }
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/compute/dependencyGraph.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compute/dependencyGraph.ts tests/unit/compute/dependencyGraph.test.ts
git commit -m "feat(compute): DependencyGraph with topo sort + canReorder + cycle detection"
```

---

### Task 3.2: Diagnostics types + JSON formatter

**Files:**
- Create: `src/diagnostics/diagnostic.ts`
- Create: `src/diagnostics/formatter.ts`
- Test: `tests/unit/diagnostics/formatter.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/diagnostics/formatter.test.ts
import { describe, it, expect } from 'vitest';
import { formatJson } from '../../../src/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../../src/diagnostics/diagnostic';

describe('formatter', () => {
  it('formats a list of diagnostics as JSON', () => {
    const diags: CompilerDiagnostic[] = [
      { target: 'export-occt', code: 'feature.box.invalid-dim', featureId: 'box_1', severity: 'error', message: 'Width must be > 0' },
    ];
    const out = formatJson(diags);
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].featureId).toBe('box_1');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/diagnostics/formatter.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/diagnostics/diagnostic.ts
import type { FeatureId, ScriptLocation } from '../intent/types';

export type BackendTarget = 'export-occt' | 'faceted-mesh';

export type DiagnosticSeverity = 'info' | 'warn' | 'error';

export interface CompilerDiagnostic {
  target: BackendTarget;
  code: string;
  featureId?: FeatureId;
  scriptLocation?: ScriptLocation;
  severity: DiagnosticSeverity;
  message: string;
}
```

```typescript
// src/diagnostics/formatter.ts
import type { CompilerDiagnostic } from './diagnostic';

export function formatJson(diags: readonly CompilerDiagnostic[]): string {
  return JSON.stringify(diags, null, 2);
}

export function formatHuman(diags: readonly CompilerDiagnostic[]): string {
  return diags.map(d => {
    const where = d.scriptLocation
      ? `${d.scriptLocation.file}:${d.scriptLocation.line}:${d.scriptLocation.column}`
      : (d.featureId ?? '<unknown>');
    return `${d.severity.toUpperCase()} [${d.code}] ${where}: ${d.message}`;
  }).join('\n');
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/diagnostics/formatter.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/diagnostics/ tests/unit/diagnostics/
git commit -m "feat(diagnostics): CompilerDiagnostic type + JSON/human formatters"
```

---

## Phase 4 — Backend Interface

### Task 4.1: ShapeBackend + RuntimeMesh + FeatureLowerer interfaces

**Files:**
- Create: `src/backends/runtimeMesh.ts`
- Create: `src/backends/backend.ts`
- Test: `tests/unit/backends/backend.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/backends/backend.test.ts
import { describe, it, expect } from 'vitest';
import type { ShapeBackend, FeatureLowerer } from '../../../src/backends/backend';

describe('backend interfaces', () => {
  it('ShapeBackend interface compiles', () => {
    // Type-only test: this file should typecheck.
    const _check: keyof ShapeBackend = 'getMesh';
    expect(_check).toBe('getMesh');
  });

  it('FeatureLowerer interface compiles', () => {
    const _check: keyof FeatureLowerer = 'lower';
    expect(_check).toBe('lower');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/backends/backend.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/backends/runtimeMesh.ts
export interface RuntimeMesh {
  positions: Float32Array; // 3 floats per vertex
  normals: Float32Array;   // 3 floats per vertex
  indices: Uint32Array;    // 3 indices per triangle
  faceID?: Uint32Array;    // optional: 1 ID per triangle for click-to-select
}
```

```typescript
// src/backends/backend.ts
import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureKind, FeatureRef, Vec3 } from '../intent/types';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import type { RuntimeMesh } from './runtimeMesh';

export const BACKEND_TARGETS = ['export-occt'] as const;
export type BackendTarget = (typeof BACKEND_TARGETS)[number];

export interface ShapeBackend {
  readonly target: BackendTarget;
  translate(x: number, y: number, z: number): ShapeBackend;
  rotate(axis: Vec3, degrees: number, pivot?: Vec3): ShapeBackend;
  scale(s: number | Vec3): ShapeBackend;
  mirror(normal: Vec3): ShapeBackend;
  union(other: ShapeBackend): ShapeBackend;
  subtract(other: ShapeBackend): ShapeBackend;
  intersect(other: ShapeBackend): ShapeBackend;
  splitByPlane(normal: Vec3, offset: number): [ShapeBackend, ShapeBackend];
  boundingBox(): { min: Vec3; max: Vec3 };
  volume(): number;
  surfaceArea(): number;
  isEmpty(): boolean;
  getMesh(): RuntimeMesh;
  exportSTL(): Uint8Array;
  exportSTEP(): Uint8Array;
  exportBREP?(): Uint8Array;
  dispose?(): void;
}

export interface ResolvedInputs {
  byKey: Record<string, ShapeBackend>;
}

export interface LowerResult {
  shape: ShapeBackend;
  diagnostics: CompilerDiagnostic[];
}

export interface FeatureLowerer {
  readonly target: BackendTarget;
  readonly supports: ReadonlySet<FeatureKind>;
  lower(record: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult>;
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/backends/backend.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/backends/runtimeMesh.ts src/backends/backend.ts tests/unit/backends/backend.test.ts
git commit -m "feat(backends): ShapeBackend + FeatureLowerer + RuntimeMesh interfaces"
```

---

## Phase 5 — OCCT Backend (refactor existing worker + new lowerer)

### Task 5.1: Move existing worker to backends/occt/

**Files:**
- Move: `src/lib/worker.ts` → `src/backends/occt/worker.ts`
- Update imports across codebase

- [ ] **Step 1: Identify files importing the worker**

```bash
cd ~/projects/kernelCAD-web
grep -rn "from.*'.*lib/worker'" --include="*.ts" --include="*.tsx" src/ | head -20
```

- [ ] **Step 2: Move file and update imports**

```bash
mkdir -p src/backends/occt
git mv src/lib/worker.ts src/backends/occt/worker.ts
# Then for each file from Step 1, sed-replace the import path
```

For each importing file (e.g., `src/lib/worker-host.ts`), open it and change:
```typescript
import { ... } from './worker';   // or '../lib/worker'
```
to:
```typescript
import { ... } from '../backends/occt/worker';
```

- [ ] **Step 3: Verify build still passes**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Verify existing tests still pass**

```bash
npm test
```

Expected: same pass/fail count as before the move.

- [ ] **Step 5: Commit**

```bash
git add src/backends/occt/ src/lib/
git commit -m "refactor: move worker.ts to src/backends/occt/ (no behavior change)"
```

---

### Task 5.2: OcctBackend wrapping Replicad

**Files:**
- Create: `src/backends/occt/occtBackend.ts`
- Test: `tests/unit/backends/occt/occtBackend.test.ts`

- [ ] **Step 1: Write failing test (geometry regression on box)**

```typescript
// tests/unit/backends/occt/occtBackend.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/backends/occt/occtBackend';

describe('OcctBackend', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('builds a box and reports correct volume', () => {
    const b = OcctBackend.box(10, 20, 30);
    expect(b.volume()).toBeCloseTo(6000, 1);
    const bb = b.boundingBox();
    expect(bb.min).toEqual([0, 0, 0]);
    expect(bb.max).toEqual([10, 20, 30]);
  });

  it('translate moves the bbox', () => {
    const b = OcctBackend.box(10, 10, 10).translate(5, 0, 0);
    expect(b.boundingBox().min[0]).toBe(5);
  });

  it('subtract reduces volume', () => {
    const base = OcctBackend.box(20, 20, 20);
    const hole = OcctBackend.cylinder(20, 5).translate(10, 10, 0);
    const result = base.subtract(hole);
    const expected = 8000 - Math.PI * 25 * 20;
    expect(result.volume()).toBeCloseTo(expected, 0);
  });

  it('exportSTL produces a valid binary STL header', () => {
    const b = OcctBackend.box(10, 10, 10);
    const stl = b.exportSTL();
    expect(stl.length).toBeGreaterThan(84); // 80-byte header + 4-byte tri count
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/backends/occt/occtBackend.test.ts
```

- [ ] **Step 3: Implement OcctBackend (uses replicad library directly, in-thread for tests)**

```typescript
// src/backends/occt/occtBackend.ts
import * as replicad from 'replicad';
import opencascade from 'replicad-opencascadejs/src/replicad_single.js';
import opencascadeWasm from 'replicad-opencascadejs/src/replicad_single.wasm?url';
import type { ShapeBackend, BackendTarget } from '../backend';
import type { Vec3 } from '../../intent/types';
import type { RuntimeMesh } from '../runtimeMesh';

let initialized = false;

export async function initOcct(): Promise<void> {
  if (initialized) return;
  const oc = await opencascade({
    locateFile: (f: string) => f.endsWith('.wasm') ? opencascadeWasm : f,
  });
  replicad.setOC(oc);
  initialized = true;
}

export class OcctBackend implements ShapeBackend {
  readonly target: BackendTarget = 'export-occt';
  constructor(private shape: replicad.Solid | replicad.Shape3D) {}

  static box(x: number, y: number, z: number, centered = false): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    const b = replicad.makeBaseBox(x, y, z);
    const placed = centered ? b.translate(-x / 2, -y / 2, -z / 2) : b;
    return new OcctBackend(placed);
  }

  static cylinder(h: number, r: number, segments = 64): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    return new OcctBackend(replicad.makeCylinder(r, h));
  }

  static sphere(r: number, segments = 32): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    return new OcctBackend(replicad.makeSphere(r));
  }

  translate(x: number, y: number, z: number): OcctBackend {
    return new OcctBackend(this.shape.translate([x, y, z]));
  }

  rotate(axis: Vec3, degrees: number, pivot: Vec3 = [0, 0, 0]): OcctBackend {
    return new OcctBackend(this.shape.rotate(degrees, pivot, axis));
  }

  scale(s: number | Vec3): OcctBackend {
    const factor = typeof s === 'number' ? s : s[0]; // replicad scale is uniform
    return new OcctBackend(this.shape.scale(factor));
  }

  mirror(normal: Vec3): OcctBackend {
    return new OcctBackend(this.shape.mirror(normal as [number, number, number], [0, 0, 0]));
  }

  union(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape as replicad.Solid;
    return new OcctBackend((this.shape as replicad.Solid).fuse(o));
  }

  subtract(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape as replicad.Solid;
    return new OcctBackend((this.shape as replicad.Solid).cut(o));
  }

  intersect(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape as replicad.Solid;
    return new OcctBackend((this.shape as replicad.Solid).intersect(o));
  }

  splitByPlane(_normal: Vec3, _offset: number): [ShapeBackend, ShapeBackend] {
    throw new Error('splitByPlane not implemented in v0.1');
  }

  boundingBox(): { min: Vec3; max: Vec3 } {
    const bb = this.shape.boundingBox;
    return {
      min: [bb.bounds[0][0], bb.bounds[0][1], bb.bounds[0][2]] as Vec3,
      max: [bb.bounds[1][0], bb.bounds[1][1], bb.bounds[1][2]] as Vec3,
    };
  }

  volume(): number {
    return Math.abs(this.shape.volume);
  }

  surfaceArea(): number {
    // Replicad does not expose surface area directly on Solid in 0.20.x;
    // sum of face areas as a fallback.
    let total = 0;
    for (const f of this.shape.faces) total += f.area;
    return total;
  }

  isEmpty(): boolean {
    return this.shape.faces.length === 0;
  }

  getMesh(): RuntimeMesh {
    const meshed = this.shape.mesh({ tolerance: 0.05, angularTolerance: 0.3 });
    return {
      positions: new Float32Array(meshed.vertices),
      normals: new Float32Array(meshed.normals ?? new Array(meshed.vertices.length).fill(0)),
      indices: new Uint32Array(meshed.triangles),
    };
  }

  exportSTL(): Uint8Array {
    const blob = this.shape.blobSTL();
    // blobSTL returns a Blob; we wrap synchronously below via FileReader workaround
    // For tests we use the buffer directly via `blob.arrayBuffer()` which is async.
    throw new Error('exportSTL must be called via async wrapper — use exportSTLAsync()');
  }

  async exportSTLAsync(): Promise<Uint8Array> {
    const blob = await this.shape.blobSTL();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  exportSTEP(): Uint8Array {
    throw new Error('exportSTEP must be called via async wrapper — use exportSTEPAsync()');
  }

  async exportSTEPAsync(): Promise<Uint8Array> {
    const blob = await this.shape.blobSTEP();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  dispose(): void {
    if ('delete' in this.shape && typeof this.shape.delete === 'function') {
      this.shape.delete();
    }
  }
}
```

- [ ] **Step 4: Adjust test to use async exporters**

Update `tests/unit/backends/occt/occtBackend.test.ts` `exportSTL` test:

```typescript
  it('exportSTLAsync produces a valid binary STL header', async () => {
    const b = OcctBackend.box(10, 10, 10);
    const stl = await b.exportSTLAsync();
    expect(stl.length).toBeGreaterThan(84);
  });
```

- [ ] **Step 5: Run to verify pass**

```bash
npx vitest run tests/unit/backends/occt/occtBackend.test.ts
```

Expected: 4 tests PASS. (May take 5-15s on first run as OCCT WASM initializes.)

- [ ] **Step 6: Commit**

```bash
git add src/backends/occt/occtBackend.ts tests/unit/backends/occt/occtBackend.test.ts
git commit -m "feat(backends/occt): OcctBackend wrapping Replicad with primitives, transforms, booleans, exports"
```

---

### Task 5.3: OcctLowerer for primitives + booleans

**Files:**
- Create: `src/backends/occt/occtLowerer.ts`
- Test: `tests/unit/backends/occt/occtLowerer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/backends/occt/occtLowerer.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/backends/occt/occtBackend';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';
import type { Param } from '../../../../src/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const ul = (n: number): Param => ({ expression: String(n), unit: 'unitless', evaluated: n });

describe('OcctLowerer', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a box record', async () => {
    const r: FeatureRecord = {
      id: 'box_1', kind: 'box',
      params: { x: mm(10), y: mm(20), z: mm(30), centered: ul(0) },
      inputs: {}, transforms: [], suppressed: false,
    };
    const lowerer = new OcctLowerer();
    const res = await lowerer.lower(r, { byKey: {} });
    expect(res.diagnostics).toHaveLength(0);
    expect(res.shape.volume()).toBeCloseTo(6000, 1);
  });

  it('lowers a cylinder record', async () => {
    const r: FeatureRecord = {
      id: 'cyl_1', kind: 'cylinder',
      params: { h: mm(20), r: mm(5) },
      inputs: {}, transforms: [], suppressed: false,
    };
    const lowerer = new OcctLowerer();
    const res = await lowerer.lower(r, { byKey: {} });
    expect(res.shape.volume()).toBeCloseTo(Math.PI * 25 * 20, 0);
  });

  it('applies transforms in order', async () => {
    const r: FeatureRecord = {
      id: 'box_1', kind: 'box',
      params: { x: mm(10), y: mm(10), z: mm(10), centered: ul(0) },
      inputs: {},
      transforms: [{ op: 'translate', x: 5, y: 0, z: 0 }],
      suppressed: false,
    };
    const lowerer = new OcctLowerer();
    const res = await lowerer.lower(r, { byKey: {} });
    expect(res.shape.boundingBox().min[0]).toBe(5);
  });

  it('lowers boolean difference with two operand inputs', async () => {
    const lowerer = new OcctLowerer();
    const baseRec: FeatureRecord = {
      id: 'box_1', kind: 'box',
      params: { x: mm(20), y: mm(20), z: mm(20), centered: ul(0) },
      inputs: {}, transforms: [], suppressed: false,
    };
    const cylRec: FeatureRecord = {
      id: 'cyl_1', kind: 'cylinder',
      params: { h: mm(20), r: mm(5) },
      inputs: {},
      transforms: [{ op: 'translate', x: 10, y: 10, z: 0 }],
      suppressed: false,
    };
    const baseRes = await lowerer.lower(baseRec, { byKey: {} });
    const cylRes  = await lowerer.lower(cylRec, { byKey: {} });
    const boolRec: FeatureRecord = {
      id: 'bool_1', kind: 'boolean',
      params: { op: { expression: "'difference'", unit: 'unitless', evaluated: 0 } },
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        cutter_0: { kind: 'feature', id: 'cyl_1' },
      },
      transforms: [], suppressed: false,
    };
    const res = await lowerer.lower(boolRec, {
      byKey: { base: baseRes.shape, cutter_0: cylRes.shape },
    });
    const expected = 8000 - Math.PI * 25 * 20;
    expect(res.shape.volume()).toBeCloseTo(expected, 0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/backends/occt/occtLowerer.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/backends/occt/occtLowerer.ts
import type {
  FeatureLowerer, BackendTarget, ResolvedInputs, LowerResult, ShapeBackend,
} from '../backend';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { FeatureKind } from '../../intent/types';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { OcctBackend } from './occtBackend';

export class OcctLowerer implements FeatureLowerer {
  readonly target: BackendTarget = 'export-occt';
  readonly supports: ReadonlySet<FeatureKind> = new Set<FeatureKind>([
    'box', 'cylinder', 'sphere',
    'extrude', 'revolve',
    'boolean',
  ]);

  async lower(r: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult> {
    const diagnostics: CompilerDiagnostic[] = [];
    let shape: ShapeBackend;
    switch (r.kind) {
      case 'box': {
        const x = r.params.x.evaluated;
        const y = r.params.y.evaluated;
        const z = r.params.z.evaluated;
        const centered = (r.params.centered?.evaluated ?? 0) > 0.5;
        shape = OcctBackend.box(x, y, z, centered);
        break;
      }
      case 'cylinder': {
        shape = OcctBackend.cylinder(r.params.h.evaluated, r.params.r.evaluated);
        break;
      }
      case 'sphere': {
        shape = OcctBackend.sphere(r.params.r.evaluated);
        break;
      }
      case 'boolean': {
        const op = String(r.params.op.expression).replace(/'/g, '');
        const base = inputs.byKey['base'];
        if (!base) throw new Error(`Boolean ${r.id} missing 'base' input`);
        let acc = base;
        const cutters = Object.entries(inputs.byKey)
          .filter(([k]) => k.startsWith('cutter_'))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);
        if (op === 'difference') {
          for (const c of cutters) acc = acc.subtract(c);
        } else if (op === 'union') {
          for (const c of cutters) acc = acc.union(c);
        } else if (op === 'intersection') {
          for (const c of cutters) acc = acc.intersect(c);
        } else {
          throw new Error(`Unknown boolean op: ${op}`);
        }
        shape = acc;
        break;
      }
      default:
        return {
          shape: undefined as never,
          diagnostics: [{
            target: this.target,
            code: `feature.${r.kind}.unsupported-in-v0.1`,
            featureId: r.id,
            severity: 'error',
            message: `Feature kind '${r.kind}' is not supported in v0.1.`,
          }],
        };
    }
    // Apply transforms in order
    for (const t of r.transforms) {
      switch (t.op) {
        case 'translate': shape = shape.translate(t.x, t.y, t.z); break;
        case 'rotateAxis': shape = shape.rotate(t.axis, t.degrees, t.pivot); break;
        case 'scale': shape = shape.scale([t.sx, t.sy, t.sz]); break;
        case 'mirror': shape = shape.mirror(t.normal); break;
      }
    }
    return { shape, diagnostics };
  }
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/backends/occt/occtLowerer.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backends/occt/occtLowerer.ts tests/unit/backends/occt/occtLowerer.test.ts
git commit -m "feat(backends/occt): OcctLowerer for box/cylinder/sphere/boolean + transforms"
```

---

### Task 5.4: OcctLowerer for extrude + revolve

**Files:**
- Modify: `src/backends/occt/occtLowerer.ts`
- Modify: `src/backends/occt/occtBackend.ts` (add extrude/revolve helpers)
- Test: `tests/unit/backends/occt/occtLowerer.extrude.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/backends/occt/occtLowerer.extrude.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/backends/occt/occtBackend';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';
import type { Param } from '../../../../src/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });

describe('OcctLowerer — extrude/revolve', () => {
  beforeAll(async () => { await initOcct(); });

  it('extrudes a rect profile to a box', async () => {
    const r: FeatureRecord = {
      id: 'extrude_1', kind: 'extrude',
      params: {
        profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
        w: mm(10), h: mm(20),
        height: mm(30),
      },
      inputs: {}, transforms: [], suppressed: false,
    };
    const res = await new OcctLowerer().lower(r, { byKey: {} });
    expect(res.shape.volume()).toBeCloseTo(6000, 0);
  });

  it('revolves a rect profile around Y axis', async () => {
    const r: FeatureRecord = {
      id: 'revolve_1', kind: 'revolve',
      params: {
        profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
        w: mm(5), h: mm(10),
        offsetX: mm(5),
        angleDeg: { expression: '360', unit: 'deg', evaluated: 360 },
      },
      inputs: {}, transforms: [], suppressed: false,
    };
    const res = await new OcctLowerer().lower(r, { byKey: {} });
    // washer: outer cylinder (r=10, h=10) - inner cylinder (r=5, h=10)
    const expected = Math.PI * (100 - 25) * 10;
    expect(res.shape.volume()).toBeCloseTo(expected, 0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/backends/occt/occtLowerer.extrude.test.ts
```

- [ ] **Step 3: Add extrude/revolve to OcctBackend**

In `src/backends/occt/occtBackend.ts`, add:

```typescript
import * as replicad from 'replicad';

export class OcctBackend implements ShapeBackend {
  // ... existing code ...

  static extrudeRect(w: number, h: number, height: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized');
    const sketch = replicad.drawRectangle(w, h);
    const shape = sketch.sketchOnPlane('XY').extrude(height);
    return new OcctBackend(shape);
  }

  static extrudeCircle(r: number, height: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized');
    const sketch = replicad.drawCircle(r);
    const shape = sketch.sketchOnPlane('XY').extrude(height);
    return new OcctBackend(shape);
  }

  static revolveRect(w: number, h: number, offsetX: number, angleDeg: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized');
    // Profile in XY, revolve around Y axis (Z becomes radial after revolution)
    // Place rect at (offsetX, 0) with size (w, h)
    const sketch = replicad.draw()
      .movePointerTo([offsetX, 0])
      .hLine(w).vLine(h).hLine(-w).close();
    const shape = sketch.sketchOnPlane('XZ').revolve([0, 0, 1], [0, 0, 0]);
    return new OcctBackend(shape);
  }
}
```

- [ ] **Step 4: Add extrude/revolve cases to OcctLowerer**

In `src/backends/occt/occtLowerer.ts`, in the `switch (r.kind)`:

```typescript
      case 'extrude': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        const height = r.params.height.evaluated;
        if (profileKind === 'rect') {
          shape = OcctBackend.extrudeRect(r.params.w.evaluated, r.params.h.evaluated, height);
        } else if (profileKind === 'circle') {
          shape = OcctBackend.extrudeCircle(r.params.r.evaluated, height);
        } else {
          return {
            shape: undefined as never,
            diagnostics: [{ target: this.target, code: 'feature.extrude.unsupported-profile',
              featureId: r.id, severity: 'error',
              message: `Profile kind '${profileKind}' not supported in v0.1` }],
          };
        }
        break;
      }
      case 'revolve': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'rect') {
          shape = OcctBackend.revolveRect(
            r.params.w.evaluated,
            r.params.h.evaluated,
            r.params.offsetX.evaluated,
            r.params.angleDeg.evaluated,
          );
        } else {
          return {
            shape: undefined as never,
            diagnostics: [{ target: this.target, code: 'feature.revolve.unsupported-profile',
              featureId: r.id, severity: 'error',
              message: `Profile kind '${profileKind}' not supported in v0.1` }],
          };
        }
        break;
      }
```

Also add `'extrude', 'revolve'` to the `supports` set (already in initial draft).

- [ ] **Step 5: Run to verify pass**

```bash
npx vitest run tests/unit/backends/occt/occtLowerer.extrude.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/backends/occt/ tests/unit/backends/occt/occtLowerer.extrude.test.ts
git commit -m "feat(backends/occt): extrude (rect/circle) + revolve (rect) lowerers"
```

---

## Phase 6 — Module API (global functions that register features)

### Task 6.1: Wire global API surface

**Files:**
- Create: `src/modules/api.ts`
- Test: `tests/unit/modules/api.test.ts`

This is the user-facing API: `box(...)`, `cylinder(...)`, `extrude(...)`, `param(...)`. It is bound to a `CaptureSession` + `ParamRegistry` per script execution.

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/modules/api.test.ts
import { describe, it, expect } from 'vitest';
import { createApi } from '../../../src/modules/api';
import { CaptureSession } from '../../../src/capture/captureSession';
import { ParamRegistry } from '../../../src/compute/paramRegistry';

describe('API surface', () => {
  it('box() returns a Shape and registers a feature', () => {
    const session = new CaptureSession();
    const params = new ParamRegistry();
    const api = createApi({ session, params });
    const s = api.box(10, 20, 30);
    const records = session.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('box');
    expect(records[0].params.x.evaluated).toBe(10);
    expect(s.id).toBe(records[0].id);
  });

  it('param() registers a UI param and returns evaluated value', () => {
    const session = new CaptureSession();
    const params = new ParamRegistry();
    const api = createApi({ session, params });
    const w = api.param('Width', 100, { unit: 'mm', min: 50, max: 200 });
    expect(w).toBe(100);
    expect(params.get('Width').evaluated).toBe(100);
  });

  it('cylinder().translate().subtract() chains correctly', () => {
    const session = new CaptureSession();
    const params = new ParamRegistry();
    const api = createApi({ session, params });
    const base = api.box(20, 20, 20);
    const hole = api.cylinder(20, 5).translate(10, 10, 0);
    const result = base.subtract(hole);
    const records = session.getRecords();
    expect(records).toHaveLength(3);
    expect(records[2].kind).toBe('boolean');
    expect(records[2].inputs.base).toEqual({ kind: 'feature', id: base.id });
    expect(result.id).toBe(records[2].id);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/modules/api.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/modules/api.ts
import type { CaptureSession } from '../capture/captureSession';
import { Shape } from '../capture/proxy';
import type { ParamRegistry, ParamOptions } from '../compute/paramRegistry';
import type { Param, Unit } from '../intent/types';

export interface ApiContext {
  session: CaptureSession;
  params: ParamRegistry;
}

export interface KernelCadApi {
  box(x: number, y: number, z: number, centered?: boolean): Shape;
  cylinder(h: number, r: number, segments?: number): Shape;
  sphere(r: number): Shape;
  extrudeRect(w: number, h: number, height: number): Shape;
  extrudeCircle(r: number, height: number): Shape;
  revolveRect(w: number, h: number, offsetX: number, angleDeg?: number): Shape;
  union(...shapes: Shape[]): Shape;
  param(name: string, defaultExpr: number | string, opts: ParamOptions): number;
}

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const ul = (n: number): Param => ({ expression: String(n), unit: 'unitless', evaluated: n });
const deg = (n: number): Param => ({ expression: String(n), unit: 'deg', evaluated: n });

export function createApi(ctx: ApiContext): KernelCadApi {
  const { session, params } = ctx;
  return {
    box(x, y, z, centered = false) {
      return session.createShape({
        kind: 'box',
        params: { x: mm(x), y: mm(y), z: mm(z), centered: ul(centered ? 1 : 0) },
        inputs: {},
      });
    },
    cylinder(h, r) {
      return session.createShape({
        kind: 'cylinder',
        params: { h: mm(h), r: mm(r) },
        inputs: {},
      });
    },
    sphere(r) {
      return session.createShape({
        kind: 'sphere',
        params: { r: mm(r) },
        inputs: {},
      });
    },
    extrudeRect(w, h, height) {
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
          w: mm(w), h: mm(h),
          height: mm(height),
        },
        inputs: {},
      });
    },
    extrudeCircle(r, height) {
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'circle'", unit: 'unitless', evaluated: 0 },
          r: mm(r),
          height: mm(height),
        },
        inputs: {},
      });
    },
    revolveRect(w, h, offsetX, angleDeg = 360) {
      return session.createShape({
        kind: 'revolve',
        params: {
          profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
          w: mm(w), h: mm(h),
          offsetX: mm(offsetX),
          angleDeg: deg(angleDeg),
        },
        inputs: {},
      });
    },
    union(...shapes) {
      if (shapes.length < 2) throw new Error('union() requires at least 2 shapes');
      const [first, ...rest] = shapes;
      return first.union(...rest);
    },
    param(name, defaultExpr, opts) {
      const exprStr = typeof defaultExpr === 'number' ? String(defaultExpr) : defaultExpr;
      params.register(name, exprStr, opts);
      return params.get(name).evaluated;
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/modules/api.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/api.ts tests/unit/modules/api.test.ts
git commit -m "feat(modules): user-facing API surface (box/cylinder/sphere/extrude/revolve/param)"
```

---

## Phase 7 — Script Runtime

### Task 7.1: TypeScript transpile

**Files:**
- Create: `src/script-runtime/transpile.ts`
- Test: `tests/unit/script-runtime/transpile.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/script-runtime/transpile.test.ts
import { describe, it, expect } from 'vitest';
import { transpileTs } from '../../../src/script-runtime/transpile';

describe('transpileTs', () => {
  it('strips TypeScript types', () => {
    const src = 'const x: number = 1; export default x;';
    const out = transpileTs(src, 'test.kcad.ts');
    expect(out.code).toContain('const x = 1');
    expect(out.code).not.toContain(': number');
  });

  it('preserves source map reference', () => {
    const src = 'const x = 1;';
    const out = transpileTs(src, 'test.kcad.ts');
    expect(out.sourceMap).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/script-runtime/transpile.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/script-runtime/transpile.ts
import * as ts from 'typescript';

export interface TranspileResult {
  code: string;
  sourceMap?: string;
}

export function transpileTs(source: string, fileName: string): TranspileResult {
  const result = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      sourceMap: true,
      strict: false,             // user scripts shouldn't need to satisfy strict mode
      esModuleInterop: true,
      isolatedModules: true,
    },
    reportDiagnostics: false,
  });
  return {
    code: result.outputText,
    sourceMap: result.sourceMapText,
  };
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/script-runtime/transpile.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/script-runtime/transpile.ts tests/unit/script-runtime/transpile.test.ts
git commit -m "feat(script-runtime): TS → ES2022 transpile with source maps"
```

---

### Task 7.2: Execution isolation (Node vm sandbox)

**Files:**
- Create: `src/script-runtime/isolation.ts`
- Test: `tests/unit/script-runtime/isolation.test.ts`

For v0.1, the CLI runs on Node — use `vm.runInContext` with a hand-built context that exposes only the kernelCAD API. (Web Worker isolation for browser comes when the studio migrates in v0.5.)

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/script-runtime/isolation.test.ts
import { describe, it, expect } from 'vitest';
import { runIsolated } from '../../../src/script-runtime/isolation';

describe('runIsolated', () => {
  it('exposes injected globals to the script', () => {
    const result = runIsolated('hello("world")', 'test.kcad.ts', {
      hello: (s: string) => `received ${s}`,
    });
    expect(result.returnValue).toBe('received world');
  });

  it('does not expose process or require', () => {
    expect(() => runIsolated('process.exit(0)', 'test.kcad.ts', {}))
      .toThrow();
  });

  it('captures the script return value via __module.exports default', () => {
    const result = runIsolated('return 42;', 'test.kcad.ts', {}, { wrapReturn: true });
    expect(result.returnValue).toBe(42);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/script-runtime/isolation.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/script-runtime/isolation.ts
import vm from 'node:vm';

export interface IsolationOptions {
  /** Wrap script in `(function() { ... })()` so a top-level `return` works. */
  wrapReturn?: boolean;
}

export interface IsolationResult {
  returnValue: unknown;
}

const STRIPPED_GLOBALS = new Set([
  'process', 'require', 'global', 'globalThis',
  'fetch', 'XMLHttpRequest', 'WebSocket',
  'setImmediate', 'queueMicrotask',
  '__filename', '__dirname',
]);

export function runIsolated(
  code: string,
  fileName: string,
  injected: Record<string, unknown>,
  opts: IsolationOptions = {},
): IsolationResult {
  // Build a fresh sandbox object: only injected + safe primitives + Math/JSON/console.
  const sandbox: Record<string, unknown> = Object.create(null);
  // Safe builtins
  for (const k of ['Math', 'JSON', 'Date', 'Number', 'String', 'Boolean', 'Array',
                   'Object', 'Map', 'Set', 'Symbol', 'console',
                   'Error', 'TypeError', 'RangeError', 'Promise']) {
    sandbox[k] = (globalThis as unknown as Record<string, unknown>)[k];
  }
  // Inject API
  for (const [k, v] of Object.entries(injected)) {
    if (STRIPPED_GLOBALS.has(k)) {
      throw new Error(`Cannot inject reserved global: ${k}`);
    }
    sandbox[k] = v;
  }
  // Sentinel to capture return value when wrapReturn is on
  sandbox.__return = undefined;

  const context = vm.createContext(sandbox, {
    name: fileName,
    codeGeneration: { strings: false, wasm: false },
  });

  let wrapped = code;
  if (opts.wrapReturn) {
    wrapped = `__return = (function() { ${code} \n})();`;
  }

  const script = new vm.Script(wrapped, { filename: fileName });
  script.runInContext(context, { timeout: 30_000 });

  return { returnValue: opts.wrapReturn ? sandbox.__return : undefined };
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/script-runtime/isolation.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/script-runtime/isolation.ts tests/unit/script-runtime/isolation.test.ts
git commit -m "feat(script-runtime): vm-based execution isolation with global filtering"
```

---

### Task 7.3: runScript entry point

**Files:**
- Create: `src/script-runtime/runScript.ts`
- Test: `tests/unit/script-runtime/runScript.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/script-runtime/runScript.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../src/script-runtime/runScript';
import { initOcct } from '../../../src/backends/occt/occtBackend';

describe('runScript', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs a script and returns captured features', async () => {
    const code = `
      const w = param('Width', 10, { unit: 'mm' });
      const b = box(w, 20, 30);
      return b;
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].kind).toBe('box');
    expect(result.records[0].params.x.evaluated).toBe(10);
    expect(result.params.list()).toContain('Width');
  });

  it('captures multi-feature scripts in order', async () => {
    const code = `
      const a = box(10, 10, 10);
      const b = cylinder(10, 5).translate(5, 5, 0);
      return a.subtract(b);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(3);
    expect(result.records.map(r => r.kind)).toEqual(['box', 'cylinder', 'boolean']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/script-runtime/runScript.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/script-runtime/runScript.ts
import { CaptureSession } from '../capture/captureSession';
import { ParamRegistry } from '../compute/paramRegistry';
import { createApi } from '../modules/api';
import type { FeatureRecord } from '../intent/featureRecord';
import { transpileTs } from './transpile';
import { runIsolated } from './isolation';

export interface RunScriptInput {
  code: string;
  fileName: string;
}

export interface RunScriptResult {
  records: readonly FeatureRecord[];
  params: ParamRegistry;
  returnValue: unknown;
}

export async function runScript(input: RunScriptInput): Promise<RunScriptResult> {
  const { code, fileName } = input;
  const session = new CaptureSession();
  const params = new ParamRegistry();
  const api = createApi({ session, params });

  const transpiled = transpileTs(code, fileName);

  const result = runIsolated(
    transpiled.code,
    fileName,
    api as unknown as Record<string, unknown>,
    { wrapReturn: true },
  );

  return {
    records: session.getRecords(),
    params,
    returnValue: result.returnValue,
  };
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/script-runtime/runScript.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/script-runtime/runScript.ts tests/unit/script-runtime/runScript.test.ts
git commit -m "feat(script-runtime): runScript end-to-end (transpile → isolated exec → capture)"
```

---

## Phase 8 — Recompute & Export Driver

### Task 8.1: RecomputeEngine

**Files:**
- Create: `src/compute/recomputeEngine.ts`
- Test: `tests/unit/compute/recomputeEngine.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/compute/recomputeEngine.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/backends/occt/occtLowerer';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../src/intent/featureRecord';
import type { Param } from '../../../src/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const ul = (n: number): Param => ({ expression: String(n), unit: 'unitless', evaluated: n });

describe('RecomputeEngine', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a single-feature graph and returns shape by id', async () => {
    const records: FeatureRecord[] = [{
      id: 'box_1', kind: 'box',
      params: { x: mm(10), y: mm(10), z: mm(10), centered: ul(0) },
      inputs: {}, transforms: [], suppressed: false,
    }];
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);
    expect(result.shapes.has('box_1')).toBe(true);
    expect(result.shapes.get('box_1')!.volume()).toBeCloseTo(1000, 1);
  });

  it('resolves boolean inputs from prior features', async () => {
    const records: FeatureRecord[] = [
      { id: 'box_1', kind: 'box',
        params: { x: mm(20), y: mm(20), z: mm(20), centered: ul(0) },
        inputs: {}, transforms: [], suppressed: false },
      { id: 'cyl_1', kind: 'cylinder',
        params: { h: mm(20), r: mm(5) },
        inputs: {},
        transforms: [{ op: 'translate', x: 10, y: 10, z: 0 }],
        suppressed: false },
      { id: 'bool_1', kind: 'boolean',
        params: { op: { expression: "'difference'", unit: 'unitless', evaluated: 0 } },
        inputs: {
          base: { kind: 'feature', id: 'box_1' },
          cutter_0: { kind: 'feature', id: 'cyl_1' },
        },
        transforms: [], suppressed: false },
    ];
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const expected = 8000 - Math.PI * 25 * 20;
    expect(result.shapes.get('bool_1')!.volume()).toBeCloseTo(expected, 0);
  });

  it('skips suppressed features and errors when downstream depends on them', async () => {
    const records: FeatureRecord[] = [
      { id: 'box_1', kind: 'box',
        params: { x: mm(10), y: mm(10), z: mm(10), centered: ul(0) },
        inputs: {}, transforms: [], suppressed: true },
    ];
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);
    expect(result.shapes.has('box_1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/compute/recomputeEngine.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/compute/recomputeEngine.ts
import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureId } from '../intent/types';
import type { FeatureLowerer, ShapeBackend, ResolvedInputs } from '../backends/backend';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import { DependencyGraph } from './dependencyGraph';

export interface RecomputeResult {
  shapes: Map<FeatureId, ShapeBackend>;
  diagnostics: CompilerDiagnostic[];
  health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
}

export class RecomputeEngine {
  constructor(private lowerer: FeatureLowerer) {}

  async run(records: readonly FeatureRecord[]): Promise<RecomputeResult> {
    const shapes = new Map<FeatureId, ShapeBackend>();
    const diagnostics: CompilerDiagnostic[] = [];
    const health = new Map<FeatureId, 'healthy'|'warning'|'error'>();

    // Build dep graph
    const graph = new DependencyGraph();
    for (const r of records) graph.addNode(r.id);
    for (const r of records) {
      for (const ref of Object.values(r.inputs)) {
        if (ref.kind === 'feature' || ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') {
          const upstreamId = ref.kind === 'feature' ? ref.id : ref.featureId;
          graph.addEdge(upstreamId, r.id);
        }
      }
    }

    const order = graph.topologicalOrder();
    const idToRecord = new Map(records.map(r => [r.id, r]));

    for (const id of order) {
      const r = idToRecord.get(id)!;
      if (r.suppressed) continue;

      // Resolve inputs
      const byKey: Record<string, ShapeBackend> = {};
      let inputsOk = true;
      for (const [key, ref] of Object.entries(r.inputs)) {
        const upstreamId = ref.kind === 'feature' ? ref.id : (ref as { featureId: FeatureId }).featureId;
        const s = shapes.get(upstreamId);
        if (!s) {
          inputsOk = false;
          diagnostics.push({
            target: this.lowerer.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `Input '${key}' references missing/failed feature '${upstreamId}'`,
          });
          break;
        }
        byKey[key] = s;
      }
      if (!inputsOk) {
        health.set(r.id, 'error');
        continue;
      }

      // Lower
      try {
        const res = await this.lowerer.lower(r, { byKey });
        diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          health.set(r.id, 'error');
        } else if (res.diagnostics.some(d => d.severity === 'warn')) {
          health.set(r.id, 'warning');
          shapes.set(r.id, res.shape);
        } else {
          health.set(r.id, 'healthy');
          shapes.set(r.id, res.shape);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        diagnostics.push({
          target: this.lowerer.target,
          code: 'recompute.lowering.exception',
          featureId: r.id,
          severity: 'error',
          message: msg,
        });
        health.set(r.id, 'error');
      }
    }

    return { shapes, diagnostics, health };
  }
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/compute/recomputeEngine.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compute/recomputeEngine.ts tests/unit/compute/recomputeEngine.test.ts
git commit -m "feat(compute): RecomputeEngine — lower features in topo order with input resolution"
```

---

### Task 8.2: Export driver helper

**Files:**
- Create: `src/script-runtime/export.ts`
- Test: `tests/unit/script-runtime/export.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/script-runtime/export.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { runAndExport } from '../../../src/script-runtime/export';
import { initOcct } from '../../../src/backends/occt/occtBackend';

describe('runAndExport', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports STL for the demo script', async () => {
    const code = `
      const base = box(20, 20, 20);
      const hole = cylinder(20, 5).translate(10, 10, 0);
      return base.subtract(hole);
    `;
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'stl' });
    expect(result.bytes.length).toBeGreaterThan(84);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('exports STEP for the demo script', async () => {
    const code = `
      const base = box(10, 10, 10);
      return base;
    `;
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'step' });
    const text = new TextDecoder().decode(result.bytes);
    expect(text).toContain('ISO-10303');
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/script-runtime/export.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/script-runtime/export.ts
import { runScript } from './runScript';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import { Shape } from '../capture/proxy';

export type ExportFormat = 'stl' | 'step';

export interface ExportInput {
  code: string;
  fileName: string;
  format: ExportFormat;
}

export interface ExportResult {
  bytes: Uint8Array;
  diagnostics: CompilerDiagnostic[];
}

export async function runAndExport(input: ExportInput): Promise<ExportResult> {
  const { code, fileName, format } = input;
  const run = await runScript({ code, fileName });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(run.records);

  const fatal = r.diagnostics.filter(d => d.severity === 'error');
  if (fatal.length > 0) {
    return { bytes: new Uint8Array(), diagnostics: r.diagnostics };
  }

  // Pick the shape: prefer the script's return value (a Shape proxy), else last feature.
  const ret = run.returnValue;
  let targetId: string | undefined;
  if (ret instanceof Shape) {
    targetId = ret.id;
  } else if (run.records.length > 0) {
    targetId = run.records[run.records.length - 1].id;
  }
  if (!targetId) {
    return {
      bytes: new Uint8Array(),
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.no-shape',
        severity: 'error',
        message: 'Script produced no shapes to export.',
      }],
    };
  }

  const shape = r.shapes.get(targetId) as OcctBackend | undefined;
  if (!shape) {
    return {
      bytes: new Uint8Array(),
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.shape-not-lowered',
        featureId: targetId,
        severity: 'error',
        message: `Target shape '${targetId}' did not lower successfully.`,
      }],
    };
  }

  const bytes = format === 'stl'
    ? await shape.exportSTLAsync()
    : await shape.exportSTEPAsync();

  return { bytes, diagnostics: r.diagnostics };
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/script-runtime/export.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/script-runtime/export.ts tests/unit/script-runtime/export.test.ts
git commit -m "feat(script-runtime): runAndExport driver — script → recompute → STL/STEP bytes"
```

---

## Phase 9 — CLI

### Task 9.1: CLI scaffolding (commander.js)

**Files:**
- Create: `src/cli/index.ts`
- Modify: `package.json` (add `bin` field)

- [ ] **Step 1: Implement CLI entry**

```typescript
// src/cli/index.ts
import { Command } from 'commander';
import { evaluateCommand } from './commands/evaluate';
import { exportCommand } from './commands/export';

const program = new Command();
program
  .name('kernelcad')
  .description('kernelCAD — agent-first parametric CAD CLI (v0.1)')
  .version('0.1.0');

program.addCommand(evaluateCommand());
program.addCommand(exportCommand());

program.parseAsync(process.argv).catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add bin entry to package.json**

In `package.json`, add:

```json
  "bin": {
    "kernelcad": "./dist/cli/index.js"
  },
```

And add a build script:

```json
  "scripts": {
    "build:cli": "tsc -p tsconfig.cli.json"
  }
```

- [ ] **Step 3: Create tsconfig.cli.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "module": "ESNext",
    "moduleResolution": "Node",
    "noEmit": false,
    "declaration": false,
    "rootDir": "./src"
  },
  "include": ["src/cli/**/*", "src/script-runtime/**/*", "src/capture/**/*",
              "src/compute/**/*", "src/intent/**/*", "src/backends/**/*",
              "src/diagnostics/**/*",
              "src/lib/geometryHelpers.ts", "src/lib/safeSketch.ts",
              "src/lib/userGlobals.ts", "src/lib/withTemporaryGlobals.ts", "src/lib/workerTypes.ts",
              "src/modules/**/*", "src/naming/**/*"],
  "exclude": ["src/components/**/*", "src/features/**/*", "src/studio/**/*",
              "tests/**/*", "**/*.test.ts"]
}
```

- [ ] **Step 4: Commit (commands stubbed in next tasks)**

```bash
git add src/cli/index.ts package.json tsconfig.cli.json
git commit -m "feat(cli): scaffold kernelcad CLI with commander"
```

---

### Task 9.2: `kernelcad evaluate` command

**Files:**
- Create: `src/cli/commands/evaluate.ts`
- Test: `tests/unit/cli/evaluate.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/cli/evaluate.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScript } from '../../../src/cli/commands/evaluate';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('evaluate command', () => {
  beforeAll(async () => { await initOcct(); });

  it('evaluates a script and returns success summary', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    writeFileSync(file, `
      const b = box(10, 10, 10);
      return b;
    `);
    const result = await evaluateScript({ file });
    expect(result.exitCode).toBe(0);
    expect(result.featureCount).toBe(1);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('returns non-zero exit code on script error', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'bad.kcad.ts');
    writeFileSync(file, `throw new Error('intentional');`);
    const result = await evaluateScript({ file });
    expect(result.exitCode).not.toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/cli/evaluate.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/cli/commands/evaluate.ts
import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct } from '../../backends/occt/occtBackend';
import { formatJson, formatHuman } from '../../diagnostics/formatter';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';

export interface EvaluateInput {
  file: string;
  json?: boolean;
}

export interface EvaluateResult {
  exitCode: number;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

export async function evaluateScript(input: EvaluateInput): Promise<EvaluateResult> {
  await initOcct();
  const filePath = resolve(input.file);
  let code: string;
  try {
    code = await readFile(filePath, 'utf8');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      exitCode: 2, featureCount: 0,
      diagnostics: [{
        target: 'export-occt', code: 'cli.file.read', severity: 'error',
        message: `Cannot read file: ${msg}`,
      }],
    };
  }
  let run;
  try {
    run = await runScript({ code, fileName: filePath });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      exitCode: 1, featureCount: 0,
      diagnostics: [{
        target: 'export-occt', code: 'cli.script.exception', severity: 'error',
        message: msg,
      }],
    };
  }
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(run.records);
  const fatal = r.diagnostics.filter(d => d.severity === 'error').length > 0;
  return {
    exitCode: fatal ? 1 : 0,
    featureCount: run.records.length,
    diagnostics: r.diagnostics,
  };
}

export function evaluateCommand(): Command {
  const cmd = new Command('evaluate')
    .description('Run a .kcad.ts script and report diagnostics')
    .argument('<file>', 'path to a .kcad.ts script')
    .option('--json', 'emit diagnostics as JSON')
    .action(async (file: string, opts: { json?: boolean }) => {
      const r = await evaluateScript({ file, json: opts.json });
      if (opts.json) {
        console.log(JSON.stringify({
          ok: r.exitCode === 0,
          featureCount: r.featureCount,
          diagnostics: r.diagnostics,
        }, null, 2));
      } else {
        console.log(`Features: ${r.featureCount}`);
        if (r.diagnostics.length > 0) {
          console.log(formatHuman(r.diagnostics));
        }
        if (r.exitCode === 0) console.log('OK');
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/cli/evaluate.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/evaluate.ts tests/unit/cli/evaluate.test.ts
git commit -m "feat(cli): kernelcad evaluate <file> command + tests"
```

---

### Task 9.3: `kernelcad export stl|step` command

**Files:**
- Create: `src/cli/commands/export.ts`
- Test: `tests/unit/cli/export.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/cli/export.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { exportScript } from '../../../src/cli/commands/export';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { writeFileSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('export command', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports STL for a valid script', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    const out  = join(tmp, 'demo.stl');
    writeFileSync(file, `return box(10, 10, 10);`);
    const r = await exportScript({ file, format: 'stl', out });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(84);
  });

  it('exports STEP for a valid script', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    const out  = join(tmp, 'demo.step');
    writeFileSync(file, `return box(10, 10, 10);`);
    const r = await exportScript({ file, format: 'step', out });
    expect(r.exitCode).toBe(0);
    const text = readFileSync(out, 'utf8');
    expect(text).toContain('ISO-10303');
  });

  it('returns non-zero on diagnostic errors', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'bad.kcad.ts');
    const out  = join(tmp, 'bad.step');
    writeFileSync(file, `throw new Error('boom');`);
    const r = await exportScript({ file, format: 'step', out });
    expect(r.exitCode).not.toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/unit/cli/export.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/cli/commands/export.ts
import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { initOcct } from '../../backends/occt/occtBackend';
import { runAndExport, type ExportFormat } from '../../script-runtime/export';
import { formatHuman } from '../../diagnostics/formatter';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';

export interface ExportInput {
  file: string;
  format: ExportFormat;
  out: string;
  json?: boolean;
}

export interface ExportCliResult {
  exitCode: number;
  bytesWritten: number;
  diagnostics: CompilerDiagnostic[];
}

export async function exportScript(input: ExportInput): Promise<ExportCliResult> {
  await initOcct();
  const filePath = resolve(input.file);
  let code: string;
  try {
    code = await readFile(filePath, 'utf8');
  } catch (e) {
    return {
      exitCode: 2, bytesWritten: 0,
      diagnostics: [{
        target: 'export-occt', code: 'cli.file.read', severity: 'error',
        message: e instanceof Error ? e.message : String(e),
      }],
    };
  }
  let result;
  try {
    result = await runAndExport({ code, fileName: filePath, format: input.format });
  } catch (e) {
    return {
      exitCode: 1, bytesWritten: 0,
      diagnostics: [{
        target: 'export-occt', code: 'cli.export.exception', severity: 'error',
        message: e instanceof Error ? e.message : String(e),
      }],
    };
  }
  const fatal = result.diagnostics.filter(d => d.severity === 'error').length > 0;
  if (fatal || result.bytes.length === 0) {
    return { exitCode: 1, bytesWritten: 0, diagnostics: result.diagnostics };
  }
  const outPath = resolve(input.out);
  await writeFile(outPath, result.bytes);
  return { exitCode: 0, bytesWritten: result.bytes.length, diagnostics: result.diagnostics };
}

export function exportCommand(): Command {
  const cmd = new Command('export')
    .description('Export a .kcad.ts script to STL or STEP')
    .argument('<format>', 'stl | step')
    .argument('<file>', 'path to .kcad.ts script')
    .requiredOption('-o, --out <path>', 'output file path')
    .option('--json', 'emit diagnostics as JSON')
    .action(async (format: string, file: string, opts: { out: string; json?: boolean }) => {
      if (format !== 'stl' && format !== 'step') {
        console.error(`Unsupported format: ${format}. Use 'stl' or 'step'.`);
        process.exitCode = 2; return;
      }
      const r = await exportScript({ file, format: format as ExportFormat, out: opts.out, json: opts.json });
      if (opts.json) {
        console.log(JSON.stringify({
          ok: r.exitCode === 0,
          bytesWritten: r.bytesWritten,
          out: opts.out,
          diagnostics: r.diagnostics,
        }, null, 2));
      } else {
        if (r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
        if (r.exitCode === 0) console.log(`Wrote ${r.bytesWritten} bytes to ${opts.out}`);
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run tests/unit/cli/export.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/export.ts tests/unit/cli/export.test.ts
git commit -m "feat(cli): kernelcad export stl|step <file> -o <out> command"
```

---

## Phase 10 — End-to-End Acceptance

### Task 10.1: Acceptance demo + e2e test

**Files:**
- Create: `tests/e2e/fixtures/demo.kcad.ts`
- Create: `tests/e2e/cli-acceptance.test.ts`

- [ ] **Step 1: Write the demo script**

```typescript
// tests/e2e/fixtures/demo.kcad.ts
const w = param('Width', 100, { unit: 'mm', min: 50, max: 200 });
const h = param('Height', 50, { unit: 'mm', min: 20, max: 100 });
const d = param('Depth', 30, { unit: 'mm', min: 10, max: 80 });

const base = box(w, h, d);
const hole = cylinder(d + 10, 10).translate(w / 2, h / 2, -5);
const plate = base.subtract(hole);

return plate;
```

- [ ] **Step 2: Write the e2e test**

```typescript
// tests/e2e/cli-acceptance.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { exportScript } from '../../src/cli/commands/export';
import { initOcct } from '../../src/backends/occt/occtBackend';
import { mkdtempSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEMO = join(__dirname, 'fixtures/demo.kcad.ts');

describe('v0.1 acceptance demo', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'plate.stl');
    const r = await exportScript({ file: DEMO, format: 'stl', out });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(1000);
  });

  it('runs end-to-end and produces valid STEP', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'plate.step');
    const r = await exportScript({ file: DEMO, format: 'step', out });
    expect(r.exitCode).toBe(0);
    const text = readFileSync(out, 'utf8');
    expect(text).toContain('ISO-10303');
    expect(text).toContain('FILE_SCHEMA');
    expect(text).toContain('AP203'); // application protocol
  });

  it('produces correct geometry: volume matches expected (plate w/ hole)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'plate.step');
    const r = await exportScript({ file: DEMO, format: 'step', out });
    expect(r.exitCode).toBe(0);
    // The script's params: w=100, h=50, d=30
    // Volume = 100*50*30 - PI*100*30 = 150000 - 9425 = ~140575
    // We re-run via runScript+RecomputeEngine to inspect volume
    const { runScript } = await import('../../src/script-runtime/runScript');
    const { RecomputeEngine } = await import('../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../src/backends/occt/occtLowerer');
    const { readFile } = await import('node:fs/promises');
    const code = await readFile(DEMO, 'utf8');
    const run = await runScript({ code, fileName: DEMO });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);
    const last = run.records[run.records.length - 1];
    const shape = result.shapes.get(last.id)!;
    const expected = 100 * 50 * 30 - Math.PI * 100 * 30;
    expect(shape.volume()).toBeCloseTo(expected, -1);
  });
});
```

- [ ] **Step 3: Run the e2e test**

```bash
cd ~/projects/kernelCAD-web
npx vitest run tests/e2e/cli-acceptance.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/
git commit -m "test(e2e): v0.1 acceptance — demo.kcad.ts produces valid STL+STEP"
```

---

### Task 10.2: Build CLI binary + smoke-test from shell

**Files:**
- Build artifact: `dist/cli/index.js`

- [ ] **Step 1: Build**

```bash
cd ~/projects/kernelCAD-web
npm run build:cli
```

Expected: `dist/cli/index.js` exists.

- [ ] **Step 2: Smoke-test from shell**

```bash
node dist/cli/index.js --version
```

Expected: `0.1.0`

```bash
node dist/cli/index.js evaluate tests/e2e/fixtures/demo.kcad.ts
```

Expected: `Features: 3` then `OK`, exit code 0.

```bash
node dist/cli/index.js export step tests/e2e/fixtures/demo.kcad.ts -o /tmp/plate.step
file /tmp/plate.step
head -3 /tmp/plate.step
```

Expected: file is non-empty, starts with `ISO-10303-21;`.

- [ ] **Step 3: Optional manual STEP round-trip check**

Open `/tmp/plate.step` in FreeCAD or Fusion 360 (manual; not a CI gate). Confirm the plate-with-hole geometry renders correctly.

- [ ] **Step 4: Commit (if any tweaks needed)**

```bash
# Likely no changes — but if CLI tweaks happened, commit them
git add -A
git commit -m "build: verify CLI build produces working bin" || echo "nothing to commit"
```

---

## Phase 11 — Final QC and Tag

### Task 11.1: Full test suite + typecheck

- [ ] **Step 1: Run typecheck**

```bash
cd ~/projects/kernelCAD-web
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Run all unit + e2e tests**

```bash
npm test
```

Expected: all tests pass; both v0.1 new tests AND existing 76 unit tests still pass (no regressions).

- [ ] **Step 4: If anything fails, fix and re-commit individually.**

---

### Task 11.2: Tag v0.1.0

- [ ] **Step 1: Bump version**

In `package.json`:

```json
  "version": "0.1.0"
```

(The repo is at 0.10.0 currently; this is a v0.1 of the new architecture, so we use `0.1.0` per the NORTHSTAR roadmap. **This may break npm/users of the old 0.10.x. Ask user before tagging.**)

- [ ] **Step 2: Update CHANGELOG.md**

Prepend:

```markdown
## v0.1.0 — 2026-04-29

### Added
- New flat feature-graph IR (`src/intent/`)
- Runtime feature capture (`src/capture/`) — script-primary, no AST walk
- `ParamRegistry` with mathjs expressions, units, cycle detection (`src/compute/paramRegistry.ts`)
- `DependencyGraph` with topo sort + canReorder validation (`src/compute/dependencyGraph.ts`)
- `RecomputeEngine` with input-resolution and health states (`src/compute/recomputeEngine.ts`)
- `ShapeBackend` + `FeatureLowerer` interfaces (`src/backends/backend.ts`)
- `OcctBackend` + `OcctLowerer` for box/cylinder/sphere/extrude/revolve/boolean (`src/backends/occt/`)
- TypeScript script transpile + `vm`-based execution isolation (`src/script-runtime/`)
- `kernelcad` CLI: `evaluate` + `export stl|step` (`src/cli/`)
- v0.1 acceptance demo: parametric plate with hole

### Changed
- Moved `src/lib/worker.ts` → `src/backends/occt/worker.ts`

### Deferred to v0.2+
- Edge features (fillet, chamfer, shell, hole, cut, draft) — require stable naming
- 2D sketch primitives + `tracked`/`created`/`propagated` topology refs
- `NamingHistory` walking + geometry-snapshot fallback

### Documentation
- New NORTHSTAR architecture spec (`docs/superpowers/specs/2026-04-29-kernelcad-NORTHSTAR.md`)
- Ported internal docs from `kernelCAD-private` into `docs/internals/`
- Added clean-room IP boundary clause to `CONTRIBUTING.md`
- Archived 22 obsolete docs to `archive/doc/`
```

- [ ] **Step 3: Commit + tag (CONFIRM WITH USER FIRST due to version downgrade)**

```bash
# Pause and ASK USER before running these:
git add package.json CHANGELOG.md
git commit -m "release: v0.1.0 — feature graph foundation + CLI"
git tag v0.1.0
```

---

## Self-Review

I am running the self-review checklist now (per writing-plans skill).

**Spec coverage:** Each section of NORTHSTAR mapped to tasks:
- Source-of-truth lock (script-primary): runtime in Tasks 7.1-7.3; no metadata file written in v0.1 (deferred per scope).
- Feature graph IR: Tasks 1.1-1.2.
- Runtime capture: Tasks 2.2.
- ParamRegistry + expressions: Task 2.1.
- DependencyGraph + recompute: Tasks 3.1, 8.1.
- Stable naming: deferred to v0.2 per the NORTHSTAR roadmap entry; v0.1 only ships canonical refs (no separate task needed since canonical is a 6-element string union with no resolver).
- Command layer: deferred to v0.5 per NORTHSTAR.
- Backend interface + OCCT lowerer: Tasks 4.1, 5.1-5.4.
- Module API surface: Task 6.1.
- Script runtime (transpile + isolation + run): Tasks 7.1-7.3.
- Export driver: Task 8.2.
- CLI (evaluate + export): Tasks 9.1-9.3.
- E2E acceptance: Tasks 10.1-10.2.
- Cleanup / migration: Tasks 0.1-0.5.

**Placeholder scan:** Searched for "TBD", "TODO", "implement later", "fill in details", "Add appropriate error handling" — none. All steps include actual code.

**Type consistency check:**
- `Param` shape (expression, unit, evaluated): consistent across Tasks 1.1, 2.1, 2.2, 5.3, 6.1.
- `FeatureRecord` shape: consistent across Tasks 1.2, 2.2, 5.3, 8.1.
- `ShapeBackend` interface: consistent across Tasks 4.1, 5.2, 5.3, 8.1.
- `BackendTarget = 'export-occt'` (only): consistent in Tasks 4.1, 5.2, 5.3.
- `FeatureLowerer.lower(record, inputs)` signature with `LowerResult { shape, diagnostics }`: consistent in Tasks 4.1, 5.3, 8.1.
- Boolean op naming: 'difference' / 'union' / 'intersection' (matches `subtract` method): consistent in Tasks 2.2, 5.3.
- `OcctBackend.exportSTLAsync()` / `exportSTEPAsync()`: consistent in Tasks 5.2, 8.2 (the sync versions throw, async versions used everywhere).

**Open issue (acknowledged):** Task 11.2's version downgrade from 0.10.0 → 0.1.0 needs user approval since it breaks semver. The plan has a CONFIRM WITH USER step.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-29-kernelcad-v0.1.md`.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best paired with Codex CLI delegation for implementation tasks.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
