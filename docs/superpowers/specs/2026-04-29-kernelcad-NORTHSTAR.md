> **⚠️ This is the LONG-TERM ARCHITECTURE TARGET (north-star), not a v1 release plan.**
>
> v0.1 implementation scope lives in a separate plan: `2026-04-29-kernelcad-v0.1-plan.md` (next-step deliverable, much narrower).
> The module list and feature breadth here are a multi-version *roadmap*, not commitments. Anything here that requires stable naming, full Fusion-class history, or speciality modules (sheet metal / SDF / wood / assemblies / MCP mutation / skill installer) is **post-v0.1**.

# kernelCAD — North-Star Architecture

**Date:** 2026-04-29
**Status:** Architecture vision (post-review v2 — addresses all critique points from spec review)
**Author:** Andrii (with Claude assistance)
**Repo:** `kernelCAD-web` (in-place evolution)

## Goals (long-term, multi-version)

Build the **best agent-first parametric CAD platform**, with:

- **Fusion-class architecture** — feature graph with timeline, command + undo, dependency graph for recompute and reorder validation, stable entity naming via causal history, expression engine with units, recompute-on-load (no B-Rep persistence in saved files).
- **Script-as-source-of-truth API** — `.kcad.ts` files are the canonical artifact for the *model*; agents read/write them with normal file tools; UI commands serialize back into the script via AST manipulation.
- **Broad CAD module surface** (eventually): primitives, sketches, edge features, assemblies, sheet metal, SDF, libs, output formats — sequenced over multiple versions.
- **Three agent surfaces** — CLI, MCP server, skill installer for chat UIs.

## Non-Goals

- **Manifold backend.** OCCT-only. Manifold tracked as a future proposal once preview lag is measured. The IR is designed dual-ready so adding it later is additive.
- **B-Rep persistence in saved files.** No `.kcd` JSON cache. The `.kcad.ts` script (plus optional view-state metadata, see below) is the only saved model artifact. Cache may be added later for fast load on large models.
- **Multi-user collaboration / cloud sync.** Local-first only.
- **Direct B-Rep editing** (push-pull, edit-prior-feature beyond reorder/suppress). Timeline + reorder gives ~80% of the value.
- **Native desktop app.** `kernelCAD-desktop` is a separate effort. Web + CLI + MCP all share the same kernel.

---

## The Source-of-Truth Lock

Settled. There are **exactly two persisted artifacts**, with strict roles:

| Artifact | What's in it | Who owns mutations |
|---|---|---|
| `<project>.kcad.ts` | All **model intent**: features, params, suppression, assembly composition, imports | Agents (Read/Write/Edit), UI commands (via AST manipulation), human typing |
| `<project>.kcad.json` *(optional, gitignorable)* | **View state only**: camera position, last-active panel layout, recently-edited param. Zero model semantics. | Studio UI on session-end |

Rules:

- **The script is the only model source of truth.** Reorder = actual script edit. Suppression = `.suppress()` modifier in the script (or a `// @suppress` annotation on the call), not a sidecar flag. MCP mutation tools = AST edits to the script, never direct IR mutation.
- **`.kcad.json` is regenerable.** A user who deletes it loses only window layout, not any model.
- **Loop-generated features that need individual treatment require user refactor to non-loop form.** We don't track "the 3rd bolt in a `for` loop" via metadata. Constraint, not bug — keeps models human-readable and AST-editable.

### MCP server boundary

The MCP server's `applyFeature(plan)` tool from earlier drafts is **removed**. MCP mutations are exclusively AST edits to the canonical script. MCP **read** tools (`getShapeInfo`, `getEdgesOf`, `whyDidThisFail`, etc.) remain — they query the live model without changing it.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  USER SCRIPT  (.kcad.ts)  — canonical model, saved to disk           │
│  + .kcad.json (view state only, optional)                             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴────────────┐
                ▼                          ▼
┌────────────────────────┐    ┌──────────────────────────────────┐
│  SCRIPT RUNTIME        │    │  COMMAND LAYER                   │
│  - ts.transpileModule  │    │  - UI/agent commands → AST edit  │
│  - Worker realm        │    │  - ts-morph manipulates script   │
│  - injected globals    │    │  - never mutates IR directly     │
└────────────────────────┘    └──────────────────────────────────┘
                │                          │
                ▼                          ▼ (script changes)
┌──────────────────────────────────────────────────────────────────────┐
│  RUNTIME FEATURE-GRAPH CAPTURE  (capture/)                           │
│  - script execution registers FeatureRecords by side-effect          │
│  - capture order = creation order, NOT AST statement order            │
│  - loops, conditionals, helper functions naturally produce N records │
└──────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FEATURE GRAPH (intent/)                                             │
│  - flat list of FeatureRecord; each has a stable FeatureId           │
│  - inputs reference upstream features by FeatureId, NOT by nesting   │
│  - parameters are Param objects (expression + unit + evaluated)      │
│  - timeline view = the same list, ordered by capture                 │
└──────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  RECOMPUTE ENGINE  (compute/)                                        │
│  - DependencyGraph (DAG) drives topo-sort AND canReorder validation  │
│  - input-hash caching: skip features whose inputs unchanged          │
│  - health state cascade                                              │
│  - error mode: UseLastGood (keep last-good lowering on op failure)   │
└──────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  BACKEND LOWERING + OBSERVED EVOLUTION  (backends/, naming/)         │
│  - lowering: FeatureRecord → backend kernel call                     │
│  - lowering produces an EvolutionRecord (observed topology changes)  │
│  - NamingHistory accumulates EvolutionRecords across the recompute   │
│  - resolveEntityRef() walks the history forward                      │
└──────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  RUNTIME MESH  (universal exchange)                                  │
└──────────────────────────────────────────────────────────────────────┘
                │
        ┌───────┼────────────────────┬──────────────────┐
        ▼       ▼                    ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  WEB STUDIO  │ │  CLI         │ │  MCP SERVER  │ │  SKILL       │
│  Monaco+R3F  │ │              │ │  read-only   │ │  install +   │
│  param sliders│ │             │ │  + AST edit  │ │  one-file    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Key invariants (revised post-review)

1. **Script is canonical.** `.kcad.ts` is the only saved model artifact. To "save" is to write the script; to "load" is to re-execute.
2. **Feature records are captured at runtime, not parsed from AST.** A `for` loop that produces 4 holes registers 4 `FeatureRecord` entries during execution. The AST is *not* the model; the *runtime trace* is.
3. **Feature graph is flat.** Each `FeatureRecord` has a `FeatureId`; inputs reference upstream features by `FeatureId`. There is no nested IR. The "timeline" is just this flat list ordered by creation.
4. **IR carries requested topology refs (intent); lowering produces observed evolution (fact).** The two are separated. `EvolutionRecord` is a *result* of lowering, not a field on the input plan.
5. **Both UI commands and script edits produce model changes the same way** — by editing the script, then re-running it. Single mutation path eliminates sync.
6. **Stable naming spans both authoring modes.** Agent edits and UI commands both pass through the same naming/recompute pipeline.

---

## Feature Graph (revised IR)

The IR is a **flat list of `FeatureRecord`s**, not a nested discriminated union of plans.

### Foundation types

```typescript
type Vec3 = [number, number, number];
type Mat4 = number[];                    // 16 elements, column-major

type FeatureId = string;                 // stable, unique within a document
type RewriteId = string;                 // unique per topology-changing lowering
type ScriptLocation = { file: string; line: number; column: number };

// Param: a number that may be an expression with units
interface Param {
  expression: string;                    // 'width / 2 + 5 mm'
  unit: 'mm' | 'in' | 'm' | 'deg' | 'rad' | 'unitless';
  // Future: open this to `| string` when we need mass/force/etc.
  evaluated: number;                     // canonical (mm for length, deg for angle)
  // For UI sliders, registered separately (see Param Registry below)
}
```

### FeatureRecord

```typescript
interface FeatureRecord {
  id: FeatureId;                         // stable across edits via causal history
  kind: FeatureKind;                     // discriminant
  inputs: Record<string, FeatureRef>;    // named refs to upstream features
  params: Record<string, Param>;         // kind-specific parameters
  transforms: ShapeTransform[];          // method-form .translate(), .rotate(), etc.
  scriptLocation?: ScriptLocation;       // for diagnostics; not load-bearing
  suppressed: boolean;                   // from .suppress() in script or // @suppress
  metadata?: Record<string, unknown>;    // user-attached: material, qty, etc.
}

type FeatureRef =
  | { kind: 'feature'; id: FeatureId }                     // ref to whole shape
  | { kind: 'face'; featureId: FeatureId; ref: FaceRef }   // ref to a face on a feature
  | { kind: 'edge'; featureId: FeatureId; ref: EdgeRef }
  | { kind: 'vertex'; featureId: FeatureId; ref: VertexRef };

type FeatureKind =
  // primitives
  | 'box' | 'cylinder' | 'sphere' | 'torus'
  // 2D-to-3D
  | 'extrude' | 'revolve' | 'loft' | 'sweep'
  // boolean
  | 'boolean'
  // edge/face features
  | 'fillet' | 'chamfer' | 'shell' | 'hole' | 'cut' | 'draft'
  // imports
  | 'importedMesh' | 'importedStep'
  // sketch (separate plan)
  | 'sketch' | 'constrainedSketch'
  // assembly (separate plan)
  | 'assemblyPart' | 'assemblyJoint' | 'assemblyConnect'
  // specialty
  | 'sheetMetal' | 'sdf';
```

### Topology refs (intent only — observed evolution lives elsewhere)

These types describe **what the user asked for**. They do not encode what the kernel actually produced.

```typescript
type FaceRef =
  | { kind: 'canonical'; face: 'top'|'bottom'|'left'|'right'|'front'|'back' }
  | { kind: 'tracked'; faceName: string }      // a label set in a sketch (e.g. profile.label('lid'))
  | { kind: 'created'; rewriteId: RewriteId; slot: string }
  | { kind: 'propagated'; rewriteId: RewriteId; source: FaceRef };

type EdgeRef =
  | { kind: 'tracked'; edgeName: string; selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'created'; rewriteId: RewriteId; slot: string; selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'propagated'; rewriteId: RewriteId; source: EdgeRef; selector: 'edge'|'start'|'end'|'midpoint' };

type VertexRef =
  | { kind: 'tracked'; vertexName: string }
  | { kind: 'created'; rewriteId: RewriteId; slot: string };
```

### EvolutionRecord (produced by lowering, NOT a field of the IR)

```typescript
// Output of lowering one topology-changing feature.
interface EvolutionRecord {
  rewriteId: RewriteId;
  featureId: FeatureId;
  operation: FeatureKind;
  preservedFaces: { source: FaceRef; result: BackendFaceId; status: 'supported'|'ambiguous' }[];
  splitFaces:     { source: FaceRef; results: BackendFaceId[] }[];
  mergedFaces:    { sources: FaceRef[]; result: BackendFaceId }[];
  createdFaces:   { slot: string; result: BackendFaceId }[];
  preservedEdges: { source: EdgeRef; result: BackendEdgeId; status: 'supported'|'ambiguous' }[];
  // ... edges, vertices similarly
  diagnostics: CompilerDiagnostic[];
}

// Accumulated across the whole recompute pass.
class NamingHistory {
  records: EvolutionRecord[];
  resolveFaceRef(ref: FaceRef, atFeature: FeatureId): BackendFaceId | UnresolvedRef;
  resolveEdgeRef(ref: EdgeRef, atFeature: FeatureId): BackendEdgeId | UnresolvedRef;
}
```

### Rationale for the IR redesign (vs the original nested-plan version)

- **Flat graph** matches Fusion's model and `kernelCAD_SCHEMA.md`'s `RelationshipGraph`. Reorder + suppress + rollback are list operations, not tree surgery.
- **Refs by ID** mean a fillet doesn't have to embed its base shape's plan — it just says "fillet edge X of feature `extrude_3`." Cheap, diff-friendly, agent-readable.
- **Intent vs evolution split** — `FaceRef` is a small static request; `EvolutionRecord` is the lowering's after-action report. The compile-time IR can't know what the kernel will actually produce; only the lowering does.
- **`Param` as expression+unit+evaluated** lets the recompute engine re-evaluate without re-running the script when a slider moves: change the bound `Param.expression`, walk dependents, re-lower.

---

## Recompute Engine

### DependencyGraph

A single DAG per document. Drives:

1. **Recompute order** — Kahn topological sort, with `creationOrder` (the runtime capture index) as tiebreaker.
2. **Reorder validation** — `canReorder(featureId, newPosition): { valid: boolean; reason?: string; blockingFeatureId?: string }`. Checks that all upstream deps remain before the new position and all downstream dependents remain after. Reorder is implemented as a script edit (move the feature's call to a new position), then re-execution.

### Recompute loop

```
for each feature in topological order, starting from first dirty node:
  if suppressed: skip (downstream sees its prior result via UseLastGood)
  compute inputHash from (kind, params.evaluated, resolved input ids+geometry signatures)
  if inputHash matches cache: skip lowering, reuse cached BackendShape
  resolve all input refs via NamingHistory
  if any unresolvable:
    mark feature healthState = 'error'
    cascade error to dependents (their inputs are now broken)
    keep last-good BackendShape for downstream (UseLastGood)
    continue
  call backend.lower(plan, resolvedInputs) -> { shape: BackendShape, evolution: EvolutionRecord }
  append evolution to NamingHistory
  update inputHash cache
  mark feature healthState = 'healthy' (or 'warning' if geometry-fallback was used)
```

### Health state cascade

Three levels: `healthy` / `warning` / `error`. Errors cascade to dependents automatically. UI shows colored icons; tooltip explains the propagation chain.

### Param Registry (separate from the feature graph)

Top-level params (registered by `param('Width', 120, ...)` calls in the script) live in a `ParamRegistry` per document. Param edits via slider:
1. Update `ParamRegistry[name].evaluated`
2. Find features whose `inputHash` depended on this param
3. Mark dirty, run recompute loop

Param edits do **not** trigger script re-execution — they only trigger lowering re-runs of the affected features. This is the Fusion-style fast path for param scrubbing.

A param edit that needs a *different* feature graph (e.g., the user wants 5 holes instead of 4 in a `for` loop) **does** require re-execution. The system detects this via dependent-graph analysis.

---

## Stable Naming

Detailed spec lives in `docs/internals/STABLE_NAMING.md` (ported from `kernelCAD-private/research/fusion360/STABLE_NAMING_BLUEPRINT.md`). Summary:

- `FaceRef`/`EdgeRef`/`VertexRef` are intent (above).
- `EvolutionRecord` is the lowering's after-action report (above).
- `NamingHistory` resolves refs across history walks.
- Geometry-snapshot fallback (face normal, area, surface type, centroid) when history-walk is ambiguous; marks feature `warning` (not `error`).

OCCT-specific: built on `BRepAlgoAPI_*::Generated() / Modified() / IsDeleted()` callbacks since OCCT WASM does not expose `TNaming`. We rebuild the equivalent layer in TypeScript.

**Stable naming is the hardest problem in this architecture.** It is *not* in v0.1 scope. v0.1 ships only `canonical` face/edge refs (top/bottom/left/right/front/back). `tracked`/`created`/`propagated` refs and the `NamingHistory` walk are v0.2+ work.

---

## Command Layer

UI clicks and agent tool-calls go through `CADCommand` objects. Every `execute()` produces a single AST edit on the canonical script and pushes one entry to the undo stack:

```typescript
interface CADCommand {
  id: string;                                 // 'feature.box.create'
  inputs: CommandInput[];
  preview(ctx: CommandContext): Promise<void>;   // debounced, 50ms — runs script locally without committing
  execute(ctx: CommandContext): Promise<void>;   // commits AST edit + pushes undo entry
  cancel(ctx: CommandContext): void;
}
```

**The undo stack stores AST edits, not IR diffs.** Undo = revert the script to a prior text state.

**Existing `kernelCAD-web` Command/Undo (whole-code mutation) needs a complete rewrite for per-feature commands.** Acknowledged. Factored into v0.1 plan (and likely deferred until after v0.1's MVP, since v0.1 is scriptable-only without UI commands).

Multi-step commands (e.g., the Sketch Line tool) push intermediate AST edits via `commitStep()`.

---

## Script Runtime

### File extension

`.kcad.ts` (TypeScript). Plain `.kcad.js` also accepted (no transpile step).

### Compilation

- TypeScript: `ts.transpileModule()` to ES2020.
- Source map preservation for runtime error → source-line resolution.
- Per-file content-hash cache for multi-file imports.

### Execution isolation (NOT a sandbox)

We do **not** call this a sandbox. We use:

- **Web Worker realm** — separates user code from the main thread realm. The browser's worker isolation prevents DOM, `window`, and most main-thread globals from being reachable.
- **Manually filtered globals** — the worker's `globalThis` is shadowed before user code runs to remove `fetch`, `XMLHttpRequest`, `importScripts`, `WebSocket`, etc. User code receives only the kernelCAD API + `console`.
- **No `process`, no Node `fs`, no `child_process`** in the Node CLI runtime — the runner uses `vm.runInContext` with a hand-built context object listing only kernelCAD globals.

Documented constraint: this is **defense in depth**, not a sandbox. A malicious script could in principle escape (e.g., via prototype pollution on `Object.prototype`). Threat model is "user runs their own scripts," not "user runs untrusted scripts." If we ever ship a hosted "run untrusted scripts" service, we'd add an iframe sandbox or vm2-class isolation in front.

### Multi-file composition

```javascript
const motorMount = require('./parts/motor-mount.kcad.ts', { Wall: 8, Height: 20 });
```

- Override object replaces named `param()` defaults inside the imported file's scope.
- Imported files return `Shape`, `ShapeGroup`, `Assembly`, or an array.
- Per-(file, override-set) instance cache.

### Param scope

```javascript
const w = param('Width', 120, { min: 60, max: 220, unit: 'mm' });
```

- Registers a `Param` in the `ParamRegistry` and a UI slider in the studio.
- Values are expressions (`mathjs`); evaluated lazily with unit conversion.
- Cycle detection via DFS before any recompute.

---

## Backend Architecture

### Backend interface

```typescript
const BACKEND_TARGETS = ['export-occt'] as const;
type BackendTarget = (typeof BACKEND_TARGETS)[number];

interface ShapeBackend {
  readonly target: BackendTarget;
  fromMesh(mesh: RuntimeMesh): ShapeBackend;
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
  exportBREP(): Uint8Array;
  dispose?(): void;
}

interface FeatureLowerer {
  readonly target: BackendTarget;
  supports: Set<FeatureKind>;
  lower(record: FeatureRecord, resolvedInputs: ResolvedInputs):
    Promise<{ shape: ShapeBackend; evolution: EvolutionRecord }>;
}
```

v1 ships one `OcctBackend` + `OcctLowerer` wrapping the existing Replicad/OpenCASCADE WASM in the worker. Manifold added later as a parallel `Lowerer` + `Backend` pair, gated by `supports` set.

### Diagnostics

```typescript
interface CompilerDiagnostic {
  target: BackendTarget;
  code: string;                          // 'feature.fillet.no-edges-found'
  featureId: FeatureId;
  scriptLocation?: ScriptLocation;       // for editor markers
  severity: 'info' | 'warn' | 'error';
  message: string;
}
```

Surfaced to: editor (Monaco markers), CLI (JSON exit), MCP (structured tool error).

---

## Module Roadmap (NOT v1 scope)

This is a multi-version roadmap, ordered by dependency. **Do not interpret as v1 commitments.**

| Version | Module(s) | What it adds |
|---|---|---|
| **v0.1** (4-6 wk) | Foundation | Feature graph, recompute, OCCT backend, primitives (box/cyl/sphere/extrude/revolve/boolean), STL+STEP export, CLI evaluate/export, mesh preview, JSON diagnostics. Canonical face refs only. No fillet/chamfer/shell/hole. |
| v0.2 | Edge features + sketch baseline | fillet, chamfer, basic 2D sketches (rect/circle/path), `tracked` face/edge refs, NamingHistory walking. |
| v0.3 | Shell + hole + cut | shell, hole, cut. `created` face refs. Geometry-fallback for ambiguous splits. |
| v0.4 | Constrained sketches | constrainedSketch with GS-warmup-then-NR pipeline. Reuse existing TS solver from kernelCAD-web. |
| v0.5 | Studio UI | First UI commands (per-feature CADCommand layer, undo stack, AST edits). Param sliders bound to recompute. |
| v0.6 | Assemblies | Parts, joints (revolute/prismatic/fixed), connectors, FK solve. |
| v0.7 | Curves + surfacing | NURBS curves, lofts, sweeps. |
| v0.8 | Output extras | BOM, dimensions, BREP export, multi-view PDF. |
| v0.9 | Lib (toolbox) | Bolts, nuts, washers, gears, pipes. User-space functions, no special IR. |
| v0.10 | Viewport extras | cutPlane, jointsView, explodeView, animation. |
| v0.11 | Agent surface 1 | CLI extras (render/capture). MCP server (read-only tools). |
| v0.12 | Agent surface 2 | MCP AST-edit tools. Skill installer. one-file context bundler. |
| v0.13 | Sheet metal | Bends, K-factor, flat-pattern unfolding. |
| v0.14 | SDF | Smooth booleans, TPMS, organic. |
| v0.15 | Wood | Wood-specific helpers. |
| **v1.0** | Polish + docs | Full module surface. Public release. |

Manifold backend: not on this roadmap. Tracked separately as a v2 proposal once OCCT-only preview latency is measured against real models.

---

## Repo Plan

Stay in `kernelCAD-web`. Aggressive cleanup. Target structure:

```
src/
  intent/        # FeatureRecord, FaceRef/EdgeRef/VertexRef, FeatureKind
  capture/       # runtime feature-graph capture during script execution
  compute/       # DependencyGraph, recompute loop, Param/cycle detection
  naming/        # EvolutionRecord, NamingHistory, resolveRef
  commands/      # CADCommand, UndoStack (post-v0.1)
    ast/         # ts-morph wrappers (refactored from existing CodeBuilder)
  backends/
    occt/        # OcctBackend + OcctLowerer wrapping existing Replicad worker
  script-runtime/  # transpile, isolation, multi-file require, ParamRegistry
  modules/
    core/        # box, cylinder, fillet, chamfer (per-version sequencing in roadmap)
    sketch/
    assembly/
    output/
    lib/
    curves/
    viewport/
    sheet-metal/
    sdf/
    wood/
  studio/        # React UI (post-v0.1 for full UI command layer)
  cli/           # Node CLI entry
  mcp/           # MCP server (post-v0.1)
  skill/         # skill installer + bundler (post-v0.1)
docs/
  superpowers/specs/   # this design + v0.1 plan + future specs
  internals/           # ARCHITECTURE, STABLE_NAMING, RECOMPUTE, SCHEMA, OCCT_PERFORMANCE (ported from kernelCAD-private)
  guides/              # human-written narrative docs
  api/                 # auto-generated from TS types
archive/                # superseded docs, kept for reference until v1.0 ships
```

---

## Migration Cost (acknowledgement)

The reviewer correctly flagged this. Honest accounting:

- **`src/lib/worker.ts` (777 lines)** — refactor in place into `backends/occt/`. Mostly a folder move + interface wrap. Low cost.
- **`src/commands/Command.ts`** — current implementation is whole-code text mutation with a simple undo stack. The new design needs per-feature `CADCommand` with AST edits. **This is a complete rewrite of the command layer, not a refactor.** Deferred until v0.5 (when UI commands first land). v0.1-v0.4 can keep the existing whole-code undo as a fallback.
- **`src/features/*` (BoxFeature, CylinderFeature, etc.)** — current implementation emits Replicad code snippets directly into the script. New design needs them to register `FeatureRecord`s during script execution, which the `OcctLowerer` then consumes. **This is also a rewrite, not a refactor.** Each existing feature file maps to a new `modules/core/<feature>.ts` with very different code shape.
- **`src/agent/AgentAPI.ts`** — keep as the embryonic MCP server. Refactor when MCP lands (v0.11+).
- **Existing 76 unit + 29 E2E tests** — keep as regression baseline. Some will need updates once feature implementation rewrites land. Geometry regression tests are the most valuable to preserve.

---

## IP / License Boundary

kernelCAD's implementation is independent and clean-room. Reference material going forward is limited to:

- Public Autodesk Fusion 360 documentation (publicly available API docs and developer resources).
- General CAD literature (e.g. Hoffmann's *Geometric and Solid Modeling*, Shapiro's work on solid modeling, OCCT's published documentation, public papers on parametric CAD architecture).
- Public OpenCASCADE source and Replicad source (LGPL / MIT respectively).
- The user's own prior research notes in `kernelCAD-private/research/`.

**`CONTRIBUTING.md` clause** (to be added):
> kernelCAD's implementation is clean-room and independent. Contributors must not paste source material from any commercial CAD product or any GPL/copyleft codebase into kernelCAD code or commits. Architectural inspiration from public documentation of other CAD systems is welcome; literal code copying is not.

kernelCAD's own license: MIT (current). Revisit pre-v1.0 if business model requires otherwise.

---

## Risks (revised, deduplicated)

1. **Stable naming on OCCT WASM.** The hardest single problem. Mitigation: not in v0.1; v0.2 introduces `tracked` refs incrementally; exhaustive unit tests on `resolveRef()` covering all evolution outcomes.
2. **Recompute performance at scale.** Target sub-200 ms for small param changes on 100-feature models. Mitigation: input-hash caching from v0.1; lazy mesh generation; OCCT precision tuning.
3. **Solo + AI agent dev velocity.** Unproven for kernel-grade software. Mitigation: vertical-slice releases every 2-3 weeks; if velocity slips, descope the latest module rather than skip core invariants.
4. **Roadmap drift.** "Almost-done" syndrome on every module without ever shipping. Mitigation: v0.1 has a strict acceptance criterion (the demo workflow described in its plan); v0.X versions are public releases with changelogs, not internal milestones.
5. **Manifold deferral becoming permanent.** Mitigation: design IR + lowerer interface dual-ready (already done in this spec); track as a documented v2 proposal, not a vague intention.

---

## Open Questions (for v0.1 plan and beyond)

These belong in the v0.1 implementation plan (writing-plans skill output):

- v0.1 acceptance demo: write the exact `.kcad.ts` script that v0.1 must successfully run end-to-end.
- TDD strictness, snapshot tests, geometry parity suite shape.
- CI gating per check.
- Distribution: npm package name, CLI binary packaging.
- Public release cadence: commit to v0.1 ship date.

---

## Decisions Locked

| ID | Question | Choice |
|----|---------|--------|
| Q1 | Approach | Approach 2 (dual-track refactor: keep kernel + UI, rewrite middle layer) |
| Q2 | Name | kernelCAD |
| Q4 | Module scope | D — broad CAD coverage (as a roadmap, not v1 scope) |
| Q5 | Team | D — solo + AI agents |
| Q6 | Architecture | C — Hybrid (feature graph + Fusion-class timeline + commands) |
| Q6b | Source of truth | B — script-primary `.kcad.ts` |
| Q7 | Backend | C — OCCT-only v1, Manifold tracked as future proposal |
| Q8 | Repo | A — stay in `kernelCAD-web`, aggressive cleanup |
| Q9 | Agent surface | C — CLI + MCP + skill installer (sequenced via roadmap) |
| Q10 | View state | A — script + optional `.kcad.json` (view state only, gitignorable) |
| Q11 | Doc structure | A — north-star + separate v0.1 plan |
