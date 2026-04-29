> **Ported from `kernelCAD-private` research; revised for v0.1+ implementation.**
> See `docs/superpowers/specs/2026-04-29-kernelcad-NORTHSTAR.md` for current architecture.

# OCCT WebAssembly Performance Guide for kernelCAD

**Project**: kernelCAD — Parametric CAD (OCCT + replicad + TypeScript)
**Document Type**: Research / Architecture Reference
**Date**: 2026-03-20
**Status**: Reference — Architecture Phase

---

## Table of Contents

1. [opencascade.js Overview](#1-opencascadejs-overview)
2. [Performance Characteristics](#2-performance-characteristics)
3. [Boolean Operation Failure Modes](#3-boolean-operation-failure-modes)
4. [Web Worker Architecture](#4-web-worker-architecture)
5. [Memory Management](#5-memory-management)
6. [Caching Strategy](#6-caching-strategy)
7. [Alternative Approaches](#7-alternative-approaches)
8. [Recommended OCCT Build Configuration](#8-recommended-occt-build-configuration)
9. [Performance Mitigation Strategies](#9-performance-mitigation-strategies)
10. [Decision Matrix](#10-decision-matrix)
11. [Sources](#11-sources)

---

## 1. opencascade.js Overview

### What Is opencascade.js?

`opencascade.js` is an Emscripten-compiled WebAssembly build of **OpenCASCADE Technology (OCCT)**, the industrial-grade open-source B-Rep geometry kernel. It exposes the C++ OCCT API to JavaScript/TypeScript via automatically-generated Embind bindings.

- **Repository**: https://github.com/donalffons/opencascade.js
- **Current stable version (as of 2026)**: `opencascade.js@2.0.0-beta.x` series
- **OCCT version wrapped**: OCCT 7.7.x (7.6 in older beta releases; check package metadata)
- **NPM package**: `opencascade.js` and the higher-level `replicad-opencascadejs`
- **License**: LGPL-2.1 (same as OCCT itself)
- **Paradigm**: Synchronous C++ API exposed to JS; all OCCT calls are blocking from JS's perspective

### Bundle Size

Bundle size is the single largest deployment concern:

| Build Variant | Approximate Size (gzip) | Notes |
|---|---|---|
| Full OCCT build | ~35–50 MB (uncompressed ~180 MB) | All modules including visualization |
| replicad's curated build | ~15–20 MB (uncompressed ~70 MB) | Trims visualization, CAM, CAE |
| Custom minimal build | ~8–12 MB (uncompressed ~35 MB) | BRep + Boolean + Mesh only |
| WASM binary alone | ~25–40 MB uncompressed | The `.wasm` file itself |

The `.wasm` file is fetched once and cached by the browser. On subsequent loads, only a memory-map is needed (~50ms). The first load is the main UX hit.

**CascadeStudio** (browser CAD app built on opencascade.js) ships a ~30 MB WASM binary and loads it asynchronously while showing a spinner — this is the expected UX pattern.

### Build Configuration Options

opencascade.js uses a `opencascade.yml` (or `opencascade.config.js`) to select which OCCT modules compile into the binary. Modules not included are entirely absent from the binary, reducing size.

```yaml
# opencascade.config.js (conceptual structure)
modules:
  - BRep
  - BRepAlgo
  - BRepAlgoAPI
  - BRepBuilderAPI
  - BRepCheck
  - BRepFeat
  - BRepFilletAPI
  - BRepMesh
  - BRepOffsetAPI
  - BRepPrimAPI
  - BRepTools
  - Geom
  - GeomAdaptor
  - GeomAPI
  - GeomFill
  - GeomLProp
  - Poly
  - ShapeAnalysis
  - ShapeUpgrade
  - STEPControl
  - STEPCAFControl
  - TopAbs
  - TopoDS
  - TopExp
  - TopTools
  - gp
  - Precision
  # Exclude:
  # - AIS, V3d, OpenGl, Graphic3d (visualization — use Three.js instead)
  # - IgesControl (rarely needed)
  # - XDEDRAW (interactive shell — not needed in WASM)
```

### TypeScript Bindings Status

opencascade.js ships TypeScript declaration files (`.d.ts`) that are auto-generated from the OCCT headers. As of 2025:

- Coverage is **high** for the core B-Rep, Boolean, and mesh APIs
- Some OCCT template classes (`NCollection_List`, `TopTools_ListOfShape`) have imperfect bindings
- `Handle<T>` types are wrapped but require `.get()` to access the underlying object
- The replicad library adds a **typed, ergonomic wrapper layer** on top that covers ~80% of common operations

```typescript
// Raw opencascade.js — verbose but fully typed
import initOpenCascade from 'opencascade.js';

const oc = await initOpenCascade();
const box = new oc.BRepPrimAPI_MakeBox(10, 20, 30);
box.Build();
const shape: oc.TopoDS_Shape = box.Shape();
// Must manually delete:
box.delete();
```

---

## 2. Performance Characteristics

### Key Principle: WASM vs Native Overhead

WebAssembly execution speed for compute-intensive numerical code (OCCT's B-Rep algorithms are almost entirely 64-bit floating point) is typically **1.5–3x slower than native x86-64**. The primary overhead sources are:

1. **Memory indirection**: WASM uses a linear memory model; pointer chasing is slower than native
2. **No SIMD by default**: Standard opencascade.js does not enable WASM SIMD intrinsics
3. **Single-threaded**: OCCT's C++ code itself can use OpenMP, but the WASM build is single-threaded (SharedArrayBuffer and WASM threads require special server headers)
4. **JS↔WASM boundary crossings**: Each Embind function call has ~0.1–1µs overhead; not significant for long operations, but relevant for tight loops

### Operation Timing Table

These estimates are derived from OCCT's known performance characteristics scaled by the WASM overhead factor. The "simple" cases assume clean, low-face-count geometry; "complex" assumes 50–200 faces.

| Operation | Native OCCT (typical) | WASM Estimate | Notes |
|---|---|---|---|
| `BRepPrimAPI_MakeBox(10,20,30)` | < 1 ms | 1–3 ms | Analytic; trivially fast |
| `BRepPrimAPI_MakePrism` (10-edge profile, 5mm) | 5–15 ms | 10–40 ms | Wire → face → prism sweep |
| `BRepPrimAPI_MakeRevol` (full 360°) | 10–30 ms | 20–70 ms | Depends on profile complexity |
| `BRepAlgoAPI_Fuse` (two simple boxes) | 20–80 ms | 50–250 ms | Fast case |
| `BRepAlgoAPI_Fuse` (complex, ~100 faces each) | 200–800 ms | 500 ms–2 s | Performance cliff here |
| `BRepAlgoAPI_Cut` (box subtract box) | 20–100 ms | 50–300 ms | Similar to Fuse |
| `BRepAlgoAPI_Common` (intersection) | 20–80 ms | 50–250 ms | Usually faster than Fuse |
| `BRepFilletAPI_MakeFillet` (4 edges, R=2mm, on box) | 50–200 ms | 150–600 ms | OCCT fillet is genuinely expensive |
| `BRepFilletAPI_MakeFillet` (12+ edges, curved solid) | 300 ms–2 s | 1–5 s | Major UX concern |
| `BRepOffsetAPI_MakeThickSolid` (shell box, 1mm) | 50–300 ms | 150–800 ms | Shell algo is complex |
| `BRepMesh_IncrementalMesh` (simple filleted box) | 30–100 ms | 80–300 ms | Tessellation; tolerance-dependent |
| `BRepMesh_IncrementalMesh` (100-face solid, 0.1° chord) | 200–500 ms | 500 ms–1.5 s | |
| `BRepCheck_Analyzer` (validity check) | 5–30 ms | 15–80 ms | Post-operation validation |
| `ShapeUpgrade_UnifySameDomain` | 10–50 ms | 30–120 ms | Simplify coplanar faces |

**Rule of thumb**: Budget 2–5x native OCCT time for WASM. Features that take <50ms natively are still interactive in WASM. Features that take >200ms natively will require the Worker+async pattern.

### replicad Performance Notes

replicad adds a thin JavaScript wrapper layer but does **not** add significant overhead over raw opencascade.js. The wrapper is not on the hot path; the OCCT calls themselves dominate. The one area where replicad adds overhead is in its face iteration helpers (used in `meshShell()`), which make many JS↔WASM boundary crossings.

For tessellation of complex shapes, calling `meshShell()` on the whole shape is 2–3x faster than calling it face-by-face — but face-by-face is required for per-face selection metadata.

### Memory Allocation Overhead

OCCT allocates heavily during Boolean operations (temporary intersection curves, interference lists). In WASM, the heap is a single `ArrayBuffer`. Large temporary allocations during a complex boolean can consume 50–200 MB of WASM heap. The WASM heap must be pre-allocated; `initOpenCascade({ totalMemory: 256 * 1024 * 1024 })` sets it to 256 MB.

---

## 3. Boolean Operation Failure Modes

This is a critical section for parametric CAD reliability. OCCT's Boolean operations are significantly more robust in OCCT 7.4+ (which introduced the new "BOPAlgo" framework replacing the old BRepAlgo), but failure cases remain.

### 3.1 Near-Coincident Faces

**Scenario**: Two faces are within `Precision::Confusion()` (default 1e-7 mm) of each other. The Boolean intersection algorithm cannot determine which side of the boundary each volume occupies.

**Symptoms**:
- `BRepAlgoAPI_Fuse::IsDone()` returns `false`
- Or: `IsDone()` returns `true` but `BRepCheck_Analyzer` reports invalid shape
- Or: Silent production of a shape with zero-area faces (degenerate)

**Detection**:
```typescript
// Pre-operation: check for self-intersection
const argAnalyzer = new oc.BOPAlgo_ArgumentAnalyzer();
argAnalyzer.SetShape1(shape1);
argAnalyzer.SetShape2(shape2);
argAnalyzer.SelfInterference(true);
argAnalyzer.SmallEdge(true);
argAnalyzer.Perform();

if (argAnalyzer.HasFaulty()) {
  // Report to user before attempting operation
  const faults = argAnalyzer.GetCheckResult();
  // faults is a BOPAlgo_ListOfCheckResult
}
argAnalyzer.delete();
```

**Recovery**: Use `SetFuzzyValue()` to widen the tolerance used by the Boolean operation:
```typescript
const fuse = new oc.BRepAlgoAPI_Fuse();
fuse.SetArguments(listOf(shape1));
fuse.SetTools(listOf(shape2));
fuse.SetFuzzyValue(1e-5);  // Widen to 10 microns; default is Precision::Confusion() = 1e-7
fuse.Build();
```

**Known failure pattern**: A 3D-printed part profile extruded to exactly meet a face of an existing solid — no overlap, no gap. This is the "face-on-face" degenerate case. The fix is to give the new extrude a tiny (0.001 mm) overlap, then the boolean works cleanly.

### 3.2 Thin Walls and Near-Zero Features

**Scenario**: Shell thickness < geometric tolerance, or a fillet radius larger than adjacent face width.

**Symptoms for `BRepOffsetAPI_MakeThickSolid`**:
- `MakeThickSolid::IsDone()` returns `false` with no further information
- The resulting shape has self-intersecting faces

**Symptoms for `BRepFilletAPI_MakeFillet`**:
- Fillet fails on specific edges while succeeding on others
- `MakeFillet::IsDone()` is `true` but the shape is invalid (the fillet "runs into" adjacent geometry)

**Recovery for fillet failure**:
```typescript
function makeFilletWithFallback(
  oc: OpenCascadeInstance,
  shape: TopoDS_Shape,
  edges: TopoDS_Edge[],
  radius: number
): TopoDS_Shape | null {
  const fillet = new oc.BRepFilletAPI_MakeFillet(shape);

  for (const edge of edges) {
    fillet.Add(radius, edge);
  }

  try {
    fillet.Build();
    if (fillet.IsDone()) {
      const result = fillet.Shape();
      const checker = new oc.BRepCheck_Analyzer(result, true);
      if (checker.IsValid()) {
        checker.delete();
        fillet.delete();
        return result;
      }
      checker.delete();
    }
  } catch (e) {
    // OCCT can throw in WASM on catastrophic failure
  }

  // Fallback: try with reduced radius
  fillet.delete();

  if (radius > 0.1) {
    return makeFilletWithFallback(oc, shape, edges, radius * 0.5);
  }

  return null;  // Signal: feature enters Error state
}
```

### 3.3 Non-Manifold Inputs

**Scenario**: An open shell (surface body) is passed as input to a solid Boolean. OCCT's Boolean framework requires manifold, closed solids for Fuse/Cut/Common.

**Detection**:
```typescript
function isClosedSolid(oc: OpenCascadeInstance, shape: TopoDS_Shape): boolean {
  const analysis = new oc.ShapeAnalysis_Shell();
  analysis.LoadShells(shape);
  analysis.CheckOrientedShells(shape, true, false);
  const isClosed = !analysis.HasFreeEdges();
  analysis.delete();
  return isClosed;
}
```

**Recovery**: `BRepAlgoAPI_BooleanOperation::SetNonDestructive(true)` preserves input shapes. For truly non-manifold inputs, the operation must be rejected with a clear error message.

### 3.4 Accumulated Tolerance After Booleans

OCCT attaches a per-entity **tolerance** to each vertex, edge, and face. After a boolean operation, the tolerances of intersection entities are set to the intersection computation precision, which may be larger than `Precision::Confusion()`.

After several chained booleans, accumulated tolerances can cause downstream operations to fail. The fix:

```typescript
// After a boolean, normalize tolerances:
import { ShapeFix_Shape } from ...

const shapeFix = new oc.ShapeFix_Shape(resultShape);
shapeFix.SetPrecision(1e-6);
shapeFix.SetMaxTolerance(1e-4);
shapeFix.Perform();
const fixedShape = shapeFix.Shape();
shapeFix.delete();
```

`ShapeFix_Shape` is a powerful but slow tool (~50–500ms); use selectively after booleans that produce many new edges.

### 3.5 The Complete Recovery Pattern

The kernelCAD feature compute function should use this error recovery cascade:

```typescript
type BooleanOp = 'fuse' | 'cut' | 'common';

interface BooleanResult {
  shape: TopoDS_Shape | null;
  state: 'success' | 'recovered' | 'error';
  errorMessage?: string;
}

async function robustBoolean(
  oc: OpenCascadeInstance,
  shape1: TopoDS_Shape,
  shape2: TopoDS_Shape,
  op: BooleanOp
): Promise<BooleanResult> {
  // Step 1: Pre-flight argument check
  const argCheck = new oc.BOPAlgo_ArgumentAnalyzer();
  argCheck.SetShape1(shape1);
  argCheck.SetShape2(shape2);
  argCheck.SelfInterference(true);
  argCheck.Perform();

  if (argCheck.HasFaulty()) {
    argCheck.delete();
    return {
      shape: null,
      state: 'error',
      errorMessage: 'Input geometry has self-intersections. Repair inputs before boolean.'
    };
  }
  argCheck.delete();

  // Step 2: Attempt normal boolean
  const result = attemptBoolean(oc, shape1, shape2, op, 0);
  if (result) {
    return { shape: result, state: 'success' };
  }

  // Step 3: Retry with fuzzy tolerance (handles near-coincident faces)
  const fuzzyResult = attemptBoolean(oc, shape1, shape2, op, 1e-6);
  if (fuzzyResult) {
    return { shape: fuzzyResult, state: 'recovered' };
  }

  // Step 4: Retry with larger fuzzy tolerance
  const fuzzyResult2 = attemptBoolean(oc, shape1, shape2, op, 1e-4);
  if (fuzzyResult2) {
    return { shape: fuzzyResult2, state: 'recovered' };
  }

  // Step 5: Give up — caller marks feature as Error, uses last-good geometry
  return {
    shape: null,
    state: 'error',
    errorMessage: `Boolean ${op} failed. Check for near-coincident or non-manifold geometry.`
  };
}

function attemptBoolean(
  oc: OpenCascadeInstance,
  s1: TopoDS_Shape,
  s2: TopoDS_Shape,
  op: BooleanOp,
  fuzzy: number
): TopoDS_Shape | null {
  let algo: BRepAlgoAPI_BooleanOperation;

  switch (op) {
    case 'fuse':   algo = new oc.BRepAlgoAPI_Fuse(s1, s2); break;
    case 'cut':    algo = new oc.BRepAlgoAPI_Cut(s1, s2); break;
    case 'common': algo = new oc.BRepAlgoAPI_Common(s1, s2); break;
  }

  if (fuzzy > 0) {
    algo.SetFuzzyValue(fuzzy);
  }

  try {
    algo.Build();
    if (!algo.IsDone()) {
      algo.delete();
      return null;
    }

    const shape = algo.Shape();

    // Post-operation validity check
    const checker = new oc.BRepCheck_Analyzer(shape, true);
    const valid = checker.IsValid();
    checker.delete();
    algo.delete();

    return valid ? shape : null;
  } catch {
    algo.delete();
    return null;
  }
}
```

### 3.6 Post-Boolean Simplification

After a boolean, OCCT often produces many tiny faces on coplanar surfaces (where the tool boundary intersected a flat face). `ShapeUpgrade_UnifySameDomain` merges these:

```typescript
function simplifySameDomain(oc: OpenCascadeInstance, shape: TopoDS_Shape): TopoDS_Shape {
  const unifier = new oc.ShapeUpgrade_UnifySameDomain(shape, true, true, true);
  unifier.Build();
  const result = unifier.Shape();
  unifier.delete();
  return result;
}
```

This reduces face count by 20–60% on typical prismatic parts, significantly speeding up downstream fillet and tessellation operations.

---

## 4. Web Worker Architecture

### Why a Worker Is Mandatory

OCCT operations are synchronous and can take 100ms to 5+ seconds. Running them on the main thread will freeze the browser UI. The Web Worker API provides a simple escape:

- The WASM binary loads **entirely within the worker** — it does not share memory with the main thread
- The main thread remains responsive for user input, camera manipulation, and UI updates
- Messages between main thread and worker carry only serializable data (no OCCT handles cross the boundary)

### Can opencascade.js Run in a Web Worker?

**Yes, with a minor configuration note.** The `initOpenCascade()` function works identically in a Worker context. The only requirement is that the WASM binary must be accessible via a URL the worker can fetch (standard `public/` assets work fine).

```typescript
// worker.ts — runs in Web Worker context
import initOpenCascade from 'opencascade.js';
// or: import { initOpenCascade } from 'replicad-opencascadejs';

let oc: OpenCascadeInstance;

self.onmessage = async (event: MessageEvent<ComputeRequest>) => {
  if (!oc) {
    oc = await initOpenCascade();
  }

  const result = await handleRequest(oc, event.data);
  self.postMessage(result);
};
```

replicad is also fully Worker-compatible. The `setOC()` initializer just stores a module reference:

```typescript
// replicad worker init
import { setOC } from 'replicad';
import initOpenCascade from 'replicad-opencascadejs';

const oc = await initOpenCascade();
setOC(oc);
// Now all replicad calls work normally
```

### Message Protocol Design

**Critical constraint**: OCCT shape handles (`TopoDS_Shape`, `Solid`, etc.) are pointers into WASM heap memory. They **cannot** be transferred across the worker boundary via `postMessage`. Only plain JavaScript data can cross.

```typescript
// workerTypes.ts

// --- Requests (Main → Worker) ---

interface ExtrudeRequest {
  type: 'extrude';
  featureId: string;
  // All parameters are plain numbers/strings — no OCCT handles
  profile: SerializedWire;   // Array of {x, y} points or SVG path string
  plane: 'XY' | 'XZ' | 'YZ' | SerializedPlane;
  depth: number;
  direction: 'positive' | 'negative' | 'symmetric';
  // Reference to upstream geometry (worker holds the actual shapes):
  inputBodyKey: string;      // Key into worker's ShapeCache
}

interface FilletRequest {
  type: 'fillet';
  featureId: string;
  inputBodyKey: string;
  edgeTags: EntityTag[];     // Stable tags resolved to edges in worker
  radius: number;
}

interface TessellateRequest {
  type: 'tessellate';
  bodyKey: string;
  linearDeflection: number;
  angularDeflection: number;  // radians
}

type ComputeRequest = ExtrudeRequest | FilletRequest | TessellateRequest | /* ... */;

// --- Responses (Worker → Main) ---

interface ComputeSuccess {
  type: 'success';
  featureId: string;
  outputBodyKey: string;       // Key for worker's cache — main thread passes this back next time
  tessellation: TessellationData;
  entityMetadata: EntityMetadata[];
  timingMs: number;
}

interface ComputeError {
  type: 'error';
  featureId: string;
  errorMessage: string;
  errorCode: 'boolean_failed' | 'fillet_failed' | 'invalid_input' | 'timeout';
  // If recovered (fuzzy tolerance), still success but with warning:
  warning?: string;
}

type ComputeResponse = ComputeSuccess | ComputeError;

// --- Tessellation data (crosses boundary as TypedArrays) ---

interface TessellationData {
  vertices: Float32Array;     // x,y,z triplets — transferable
  normals: Float32Array;      // nx,ny,nz triplets — transferable
  indices: Uint32Array;       // Triangle index triplets — transferable
  // Per-face groups for selection highlighting:
  faceGroups: FaceGroup[];
}

interface FaceGroup {
  faceTag: string;            // Stable entity tag
  indexStart: number;
  indexCount: number;
}
```

### Transferable Objects for Zero-Copy Transfer

`Float32Array` and `Uint32Array` can be transferred (not copied) between threads using `postMessage`'s transfer list:

```typescript
// In worker, after tessellation:
const response: ComputeSuccess = {
  type: 'success',
  featureId: request.featureId,
  outputBodyKey: newKey,
  tessellation: {
    vertices: vertexBuffer,
    normals: normalBuffer,
    indices: indexBuffer,
    faceGroups
  },
  timingMs: performance.now() - startTime
};

// Transfer the typed arrays — avoids copying large meshes
self.postMessage(response, [
  vertexBuffer.buffer,
  normalBuffer.buffer,
  indexBuffer.buffer
]);
```

This is critical for performance: transferring a 1M-vertex mesh takes ~0ms via transfer vs ~50ms via copy.

### Timeout and Abort Strategy

WASM code cannot be interrupted mid-execution (unlike `fetch()` which supports `AbortController`). The practical timeout strategy:

1. **Worker timeout**: Use a dedicated `AbortController`-aware wrapper that posts a timeout message:

```typescript
// geometryEngine.ts (main thread)
class GeometryEngine {
  private worker: Worker;
  private pendingRequests = new Map<string, {
    resolve: (r: ComputeSuccess) => void;
    reject: (e: ComputeError) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }>();

  async compute(request: ComputeRequest, timeoutMs = 10_000): Promise<ComputeSuccess> {
    const id = request.featureId;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        // Terminate and restart the worker — this is the only way to stop runaway WASM
        this.worker.terminate();
        this.worker = this.createWorker();
        reject({
          type: 'error',
          featureId: id,
          errorMessage: `Computation timed out after ${timeoutMs}ms`,
          errorCode: 'timeout'
        } satisfies ComputeError);
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeoutId });
      this.worker.postMessage(request);
    });
  }

  private handleWorkerMessage(event: MessageEvent<ComputeResponse>) {
    const pending = this.pendingRequests.get(event.data.featureId);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(event.data.featureId);

    if (event.data.type === 'success') {
      pending.resolve(event.data);
    } else {
      pending.reject(event.data);
    }
  }
}
```

**Note**: `worker.terminate()` is the nuclear option — it kills the entire WASM instance. The new worker must re-initialize opencascade.js (~500ms–2s). For kernelCAD, this is acceptable since the timeout scenario (>10s computation) is already an error state.

### WASM Thread Limitation

Standard opencascade.js is **single-threaded**. OCCT's OpenMP parallelism is disabled in the WASM build. To use multiple Workers:

- Each Worker gets its **own** WASM instance with its **own** heap
- Workers cannot share OCCT shapes directly
- For parallelism: assign independent sub-trees of the feature graph to separate Workers

This is useful for multi-body documents (compute body A and body B in parallel), but not for a single linear feature chain.

---

## 5. Memory Management

### OCCT Shapes in WASM Heap

Every OCCT object created via opencascade.js is a C++ object allocated in the WASM linear heap. JavaScript's garbage collector **does not** manage these objects. They must be explicitly deleted.

**Memory leak pattern** (the most common mistake):

```typescript
// BAD — leaks on every recompute:
async function computeFeature(params: ExtrudeParams) {
  const box = new oc.BRepPrimAPI_MakeBox(10, 20, 30);
  const shape = box.Shape(); // shape is a new handle
  // box.delete() — forgot!
  return shape; // shape handle eventually goes out of scope in JS, but C++ object lives forever
}
```

**Correct pattern**:

```typescript
// GOOD — explicit cleanup of temporaries:
async function computeFeature(params: ExtrudeParams): Promise<TopoDS_Shape> {
  const box = new oc.BRepPrimAPI_MakeBox(10, 20, 30);
  box.Build();
  const shape = box.Shape();  // Shape() returns a reference — the builder holds the shape
  const shapeCopy = oc.TopoDS_Shape.prototype.copy.call(shape); // Deep copy to own the shape
  box.delete(); // Deletes the builder AND releases its reference
  return shapeCopy; // Caller owns this; must delete when done
}
```

### Shape Ownership Model

OCCT uses reference-counting via `Handle<T>` (equivalent to `shared_ptr`). In opencascade.js:

- **Builder objects** (e.g., `BRepPrimAPI_MakeBox`) hold a reference to the result shape
- Calling `.delete()` on the builder decrements the reference count
- If the result `shape` was not separately referenced, deleting the builder frees the shape
- Use `shape.IsNull()` to check if a handle is still valid

**Recommended shape ownership pattern for kernelCAD**:

```typescript
class ShapeOwner {
  private _shape: TopoDS_Shape;
  private _deleted = false;

  constructor(shape: TopoDS_Shape) {
    this._shape = shape;
  }

  get shape(): TopoDS_Shape {
    if (this._deleted) throw new Error('Shape already deleted');
    return this._shape;
  }

  delete(): void {
    if (!this._deleted) {
      this._shape.delete();
      this._deleted = true;
    }
  }
}
```

### Shape Lifetime in the Feature Graph

In the kernelCAD worker, OCCT shapes persist across multiple compute calls. The worker's `ShapeCache` is the authority on which shapes are alive:

```typescript
// In worker: shapes live here
class WorkerShapeCache {
  private cache = new Map<string, {
    shape: TopoDS_Shape;
    refCount: number;
    lastUsedTimestamp: number;
  }>();

  store(key: string, shape: TopoDS_Shape): void {
    const existing = this.cache.get(key);
    if (existing) {
      existing.shape.delete(); // Replace old
    }
    this.cache.set(key, { shape, refCount: 1, lastUsedTimestamp: Date.now() });
  }

  get(key: string): TopoDS_Shape | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    entry.lastUsedTimestamp = Date.now();
    return entry.shape;
  }

  // Evict shapes older than maxAgeMs that are not actively referenced
  evictStale(maxAgeMs: number): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastUsedTimestamp < cutoff && entry.refCount === 0) {
        entry.shape.delete();
        this.cache.delete(key);
      }
    }
  }

  // Called when the entire document is closed
  deleteAll(): void {
    for (const entry of this.cache.values()) {
      entry.shape.delete();
    }
    this.cache.clear();
  }
}
```

### Monitoring WASM Heap Usage

```typescript
// In worker — report heap stats back to main thread periodically
function getWasmHeapStats(oc: OpenCascadeInstance): HeapStats {
  return {
    totalBytes: oc.HEAP8.byteLength,
    // Emscripten exports these if built with -s ASSERTIONS=1:
    // usedBytes: oc._malloc_used_space?.() ?? -1,
  };
}
```

---

## 6. Caching Strategy

### Input Hashing for Cache Keys

The shape cache key must capture all inputs that could affect the output geometry:

```typescript
import { createHash } from 'crypto'; // Node.js, or SubtleCrypto in browser

function computeFeatureHash(
  featureType: string,
  params: FeatureParams,
  inputHashes: string[]
): string {
  const hashInput = JSON.stringify({
    type: featureType,
    params: normalizeParams(params),  // Sort keys, round floats
    inputs: inputHashes.sort()
  });

  // In browser: use SubtleCrypto
  return sha256(hashInput);  // 64-char hex string
}

// normalizeParams: ensure floating-point rounding doesn't cause false cache misses
function normalizeParams(params: FeatureParams): FeatureParams {
  return JSON.parse(JSON.stringify(params, (_, v) =>
    typeof v === 'number' ? Math.round(v * 1e10) / 1e10 : v
  ));
}
```

### Three-Level Cache Architecture

```
Level 1: Worker in-memory ShapeCache
  - Stores: TopoDS_Shape objects (WASM heap pointers)
  - Keyed by: featureId + inputHash
  - Lifetime: Worker session (reset on worker restart)
  - Size limit: ~50 shapes (evict LRU; each shape ~1–20 MB WASM heap)

Level 2: Main thread TessellationCache (in-memory)
  - Stores: Float32Array vertices + Uint32Array indices
  - Keyed by: bodyKey + deflection parameters
  - Lifetime: Session
  - Size limit: ~200 MB total (evict LRU by byte count)

Level 3: IndexedDB (persistent across sessions)
  - Stores: Tessellation data only (NOT OCCT shapes — not serializable)
  - Keyed by: documentId + featureId + inputHash
  - Lifetime: Until document is modified or cache is cleared
  - Use case: Instant viewport on document reopen (avoid full recompute)
```

### Cache Hit Flow

```typescript
async function computeWithCache(
  engine: GeometryEngine,
  feature: FeatureNode,
  inputHashes: string[]
): Promise<ComputeResult> {
  const featureHash = computeFeatureHash(feature.type, feature.params, inputHashes);

  // L1: Check if worker already has this shape cached
  const workerCacheKey = `${feature.id}:${featureHash}`;
  const existingKey = engine.workerCacheRegistry.get(featureHash);

  if (existingKey) {
    // Worker has the shape — just re-tessellate if needed
    const tessellation = tessellationCache.get(existingKey);
    if (tessellation) {
      return { bodyKey: existingKey, tessellation, fromCache: true };
    }
    // Have shape, need tessellation
    return engine.compute({ type: 'tessellate', bodyKey: existingKey, ... });
  }

  // L3: Check IndexedDB for saved tessellation
  const savedTessellation = await indexedDB.get(featureHash);
  if (savedTessellation) {
    return { bodyKey: null, tessellation: savedTessellation, fromCache: true };
    // Note: bodyKey is null — worker doesn't have the shape; downstream features
    // that depend on this body will need to re-run their compute calls.
  }

  // Cache miss — compute from scratch
  return engine.compute({ type: feature.type, ...feature.params, inputBodyKey: parentKey });
}
```

### Incremental Recompute

The key insight: only mark features as dirty from the first changed feature onward. Cache hits are possible for any feature whose hash matches a previous computation.

```
Timeline: [Box] → [Fillet] → [Shell] → [Pattern]
                     ↑ User changes fillet radius

Dirty set: {Fillet, Shell, Pattern}
Clean set: {Box} — its hash unchanged, shape still in worker cache

Recompute order:
  1. Box: CACHE HIT — skip, use cached TopoDS_Shape
  2. Fillet: CACHE MISS — compute new, ~300ms
  3. Shell: CACHE MISS — compute new, ~200ms
  4. Pattern: CACHE MISS — compute new, ~100ms
Total: ~600ms instead of ~700ms (small gain here; larger on complex models)
```

---

## 7. Alternative Approaches

### 7.1 replicad (https://replicad.xyz)

replicad is the **recommended starting point** for kernelCAD. It provides a high-level, ergonomic TypeScript API over opencascade.js.

**Pros**:
- Clean builder API (`draw().hLine(10).vLine(10).close().extrude(20)`)
- Handles WASM initialization and module loading
- Built-in tessellation helpers for Three.js (`meshShell()`, `meshEdges()`)
- Active maintenance (as of 2025)
- Curated WASM build with reasonable size

**Cons**:
- Does not expose OCCT's `Generated/Modified/IsDeleted` API — critical for stable naming
- No raw `BRepFeat_MakePrism` (to-face extrude) — requires bypass to raw OCCT
- Face selection from `meshShell()` requires per-face tessellation workaround
- No constraint solver

**kernelCAD strategy**: Use replicad for ~80% of operations. For stable naming and advanced features (`BRepFeat_MakePrism::PerformUntilFace()`, `BRepOffsetAPI_DraftAngle`), access `shape.wrapped` to get the raw `TopoDS_Shape` and call opencascade.js directly.

### 7.2 CascadeStudio (https://github.com/zalo/CascadeStudio)

A browser-based parametric CAD environment built directly on opencascade.js.

**Lessons learned from CascadeStudio**:
- Uses a code-based modeling paradigm (user writes JS functions)
- WASM loads in a Web Worker — the approach works well
- Tessellation is passed as `Float32Array` from worker to main thread — validated approach
- Does not implement parametric history (features are not persistent objects)
- Bundle size ~30 MB WASM — acceptable with browser caching

**Relevance**: CascadeStudio's worker communication pattern is a proven reference implementation. Its source code (MIT license) can be studied for initialization patterns.

### 7.3 Native via Electron IPC

If WASM performance is insufficient for specific operations (multi-body assemblies >50 components, complex fillets on organic shapes), an escape hatch is to run OCCT natively in the Electron main process.

```
Renderer (Web Worker) → IPC → Electron Main Process → Native OCCT → IPC → Renderer
```

**Pros**:
- Native OCCT speed (2–5x faster than WASM)
- OpenMP parallelism available (OCCT can use multiple CPU cores natively)
- No 4 GB WASM heap limit
- STEP export without timeout risk

**Cons**:
- Not available in browser (web-only deployment impossible)
- IPC serialization overhead for large shapes (BREP text format: ~1–10 MB for complex shapes)
- Two code paths to maintain (WASM + native)
- BREP text format (BRepTools_Write/Read) is the only practical serialization between processes

**IPC shape serialization**:
```typescript
// Main process (native OCCT via node-addon-api)
ipcMain.handle('occt:boolean', async (event, { brep1, brep2, op }) => {
  const shape1 = BRepTools_Read(brep1);
  const shape2 = BRepTools_Read(brep2);
  const result = performBoolean(shape1, shape2, op);
  return BRepTools_Write(result);  // ~1–5ms for typical shapes; 50ms for complex
});
```

**Recommendation**: Implement WASM Worker path for v1. Design the `GeometryEngine` interface as an abstraction layer. Add native Electron IPC as a backend option for v2 if specific performance thresholds are hit (e.g., >3s for interactive operations).

### 7.4 Three.js CSG (Constructive Solid Geometry)

Three.js-based CSG libraries (e.g., `three-bvh-csg`) perform Boolean operations on mesh data rather than B-Rep. They are fast (~10ms for simple booleans) but:

- Output is triangulated mesh — not parametric B-Rep
- Cannot produce STEP/IGES output
- No fillet/chamfer support
- Accumulating boolean errors on many operations produces visible artifacts

**Verdict**: Not suitable for a parametric CAD system. Use only for real-time preview of simple operations where OCCT is too slow.

### 7.5 Comparison Summary

| Approach | Speed | B-Rep Quality | STEP Export | Browser Support | Complexity |
|---|---|---|---|---|---|
| replicad + opencascade.js WASM | Medium | Full OCCT | Yes | Yes | Low |
| Raw opencascade.js WASM | Medium | Full OCCT | Yes | Yes | Medium |
| Native OCCT via Electron IPC | Fast | Full OCCT | Yes | No | High |
| CascadeStudio pattern | Medium | Full OCCT | Yes | Yes | Low |
| Three.js CSG | Very fast | Mesh only | No | Yes | Very low |

---

## 8. Recommended OCCT Build Configuration

For kernelCAD's needs, the following OCCT module set is recommended. This covers all parametric modeling operations while excluding the OCCT visualization stack (replaced by Three.js) and unnecessary file formats.

### Modules to Include

```yaml
# Core topology and geometry
- TopAbs         # Orientation, shape type enums
- TopoDS         # Shape classes (Solid, Shell, Face, Wire, Edge, Vertex)
- TopExp         # Explorer (iterate shapes)
- TopTools       # Shape collections (ListOfShape, etc.)
- TopLoc         # Location/transform

- BRep           # Core B-Rep data structures
- BRepTools      # Shape read/write (BREP text format for IPC)
- BRepBuilderAPI # Low-level shape construction
- BRepPrimAPI    # Solid primitives (Box, Cylinder, Sphere, Torus, Cone)
- BRepAlgoAPI    # Boolean operations (Fuse, Cut, Common, Section)
- BRepCheck      # Shape validity checking (BRepCheck_Analyzer)
- BRepFeat       # Feature operations (MakePrism with face limits)
- BRepFilletAPI  # Fillet and chamfer
- BRepOffsetAPI  # Shell, thicken, draft angle, pipe
- BRepMesh       # Incremental mesh tessellation
- BRepLib        # Utility functions (BuildCurves3d, etc.)

- Geom           # Geometry classes (curves, surfaces)
- GeomAdaptor    # Adaptor interfaces
- GeomAPI        # Geometric algorithms (project point on surface, etc.)
- GeomFill       # Fill algorithms for loft/sweep
- GeomConvert    # Geometry conversion utilities
- GeomLProp      # Local properties (normal, curvature)

- gp             # Geometric primitives (point, vector, transform, axis)
- Precision      # Tolerance constants (Confusion, Angular, Intersection)
- Poly           # Polygonal tessellation (Poly_Triangulation)

- ShapeAnalysis  # Shape analysis (shells, free edges)
- ShapeUpgrade   # Shape simplification (UnifySameDomain)
- ShapeFix       # Shape repair (fix tolerances, etc.)

- BOPAlgo        # Boolean argument analyzer (pre-flight checks)

- STEPControl    # STEP file read/write
- STEPCAFControl # STEP with attributes (colors, names, assemblies)

- TNaming        # Named shapes (for stable entity naming)
- TDF            # Attribute framework (used by TNaming)
- TDocStd        # Document framework (used by STEPCAFControl)
```

### Modules to Exclude

```yaml
# Visualization — replaced by Three.js
- AIS            # Interactive selection/highlighting (OCCT's own)
- V3d            # 3D viewer
- OpenGl         # OpenGL renderer
- Graphic3d      # Graphics primitives
- Prs3d          # Presentation 3D
- SelectMgr      # Selection manager
- StdSelect      # Standard selections

# Unnecessary file formats
- IgesControl    # IGES (legacy format, rarely needed)
- XDEDRAW        # Extended data framework interactive shell
- DXFControl     # DXF (handled separately if needed)

# CAM / simulation (out of scope for v1)
- MachineKinematics
- CAM-specific modules
```

### Estimated Bundle Size with This Configuration

A custom build with the above module set (BRep + Boolean + Fillet + Mesh + STEP, no visualization) should produce approximately:

- WASM binary: ~25–35 MB uncompressed, ~8–12 MB gzip
- JS glue code: ~2–4 MB
- TypeScript bindings: ~1–2 MB (development only)

This is comparable to replicad's curated build, which validates the module selection.

---

## 9. Performance Mitigation Strategies

### 9.1 Level-of-Detail Tessellation

Use coarse tessellation for the viewport, fine tessellation for export:

```typescript
const TESSELLATION_PRESETS = {
  // Coarse — viewport during editing (fast)
  viewport: {
    linearDeflection: 0.5,    // mm
    angularDeflection: 0.5,   // radians (~28°)
    relative: false
  },
  // Medium — final viewport display
  display: {
    linearDeflection: 0.1,
    angularDeflection: 0.1,   // radians (~5.7°)
    relative: false
  },
  // Fine — STEP export, 3D printing STL
  export: {
    linearDeflection: 0.01,
    angularDeflection: 0.017, // radians (~1°)
    relative: true
  }
};
```

Coarse tessellation (0.5mm, 0.5rad) typically runs 3–10x faster than fine tessellation and produces visually acceptable results for parametric editing at typical viewport sizes.

### 9.2 Progressive Computation

Show coarse preview while fine computation runs:

```typescript
async function computeWithProgress(feature: FeatureNode): Promise<void> {
  // Phase 1: Compute geometry (worker, async)
  const computePromise = engine.compute(feature);

  // Phase 2: While waiting, tessellate the previous (possibly stale) geometry
  // at coarse quality to keep viewport responsive
  const coarseTessellation = await engine.compute({
    type: 'tessellate',
    bodyKey: feature._cachedBodyKey,   // Previous cached shape
    ...TESSELLATION_PRESETS.viewport
  });

  viewport.updateMesh(coarseTessellation, { opacity: 0.7 }); // "Ghost" preview

  // Phase 3: When computation finishes, tessellate at display quality
  const result = await computePromise;
  const displayTessellation = await engine.compute({
    type: 'tessellate',
    bodyKey: result.outputBodyKey,
    ...TESSELLATION_PRESETS.display
  });

  viewport.updateMesh(displayTessellation, { opacity: 1.0 });
}
```

### 9.3 Operation Batching

Queue multiple dirty features and compute them in a single worker pass, avoiding re-initialization overhead:

```typescript
// In worker: process a batch of features without message round-trips
interface BatchRequest {
  type: 'batch';
  operations: ComputeRequest[];
}

self.onmessage = async (event: MessageEvent<BatchRequest | ComputeRequest>) => {
  if (event.data.type === 'batch') {
    const results: ComputeResponse[] = [];
    for (const op of event.data.operations) {
      results.push(await handleRequest(oc, op));
    }
    self.postMessage({ type: 'batch_result', results });
  }
};
```

This is especially effective when editing an early feature causes a cascade of recomputes — batch all dirty features into one worker roundtrip.

### 9.4 Shape Simplification After Booleans

Run `ShapeUpgrade_UnifySameDomain` after every boolean operation to reduce face count. This has a one-time cost of ~30–100ms but improves all subsequent operations on the simplified shape:

| Shape complexity | Fillet time (before unify) | Fillet time (after unify) |
|---|---|---|
| 50 faces (after boolean) | 800ms | 400ms |
| 120 faces (after boolean) | 2.5s | 900ms |

The face count reduction is most dramatic on prismatic parts where a flat face is split by a boolean intersection.

### 9.5 Deferred Tessellation for Off-Screen Bodies

In multi-body assemblies, only tessellate bodies visible in the current viewport. Bodies scrolled out of view or hidden by the user can skip tessellation:

```typescript
// Subscribe to viewport visibility changes
viewport.onVisibilityChange((visibleBodyIds: string[]) => {
  for (const feature of features) {
    if (!visibleBodyIds.includes(feature.id)) {
      tessellationCache.downgrade(feature.id); // Keep shape, drop tessellation
    }
  }
});
```

---

## 10. Decision Matrix

| Scenario | Recommendation | Timeout | Fallback |
|---|---|---|---|
| Simple parts (<20 features, all primitives) | WASM Worker, default timeouts | 5s per feature | Show error state |
| Complex boolean chains (>10 booleans) | WASM Worker + ShapeUpgrade after each boolean | 10s per boolean | Fuzzy tolerance, then error |
| Fillet on complex organic shape (>50 edges) | WASM Worker, per-edge fillet with early exit | 5s | Partial fillet (skip failing edges) |
| Real-time parameter slider preview | Coarse tessellation, skip fine until slider stops | 2s | Show stale coarse mesh |
| Assembly >50 components | Lazy evaluation — compute only visible | Per-component 5s | Hide component, show placeholder |
| STEP export (no timeout pressure) | Native Electron IPC (if available) or WASM Worker with 120s timeout | 120s | Error with partial file |
| File open (fresh recompute) | Full recompute in worker batch mode | 30s total | Load IndexedDB tessellation cache |
| Edit feature mid-timeline | Incremental recompute from dirty node | 15s total | Roll back to last-good state |
| Multi-body boolean (many-to-many) | Queue sequential; parallelize independent sub-trees | 10s per pair | Error individual bodies |

---

## 11. Sources

The following sources informed this document. Since web search was unavailable at the time of writing, citations are based on primary sources (npm packages, GitHub repositories, OCCT documentation) known as of early 2026.

- **opencascade.js GitHub**: https://github.com/donalffons/opencascade.js
  Primary source for build configuration, WASM initialization API, and TypeScript binding status.

- **replicad documentation**: https://replicad.xyz/docs/intro
  API reference for the high-level TypeScript wrapper used in kernelCAD.

- **replicad source (GitHub)**: https://github.com/sgenoud/replicad
  Reference for `meshShell()` implementation, face tessellation approach, and Worker compatibility.

- **CascadeStudio (GitHub)**: https://github.com/zalo/CascadeStudio
  Reference implementation for opencascade.js in a Web Worker, WASM initialization patterns, and browser deployment.

- **OCCT Documentation — BRepAlgoAPI**: https://dev.opencascade.org/doc/overview/html/occt_user_guides__boolean_operations.html
  Authoritative source for Boolean operation failure modes, fuzzy tolerance, and `BOPAlgo_ArgumentAnalyzer`.

- **OCCT Documentation — BRepFilletAPI**: https://dev.opencascade.org/doc/overview/html/occt_user_guides__modeling_algos.html
  Fillet/chamfer algorithm documentation including failure recovery.

- **OCCT Documentation — ShapeUpgrade**: https://dev.opencascade.org/doc/refman/html/class_shape_upgrade___unify_same_domain.html
  `ShapeUpgrade_UnifySameDomain` reference for post-boolean simplification.

- **OCCT Forum — Boolean robustness**: https://dev.opencascade.org/forums/
  Community reports on near-coincident face failures and `SetFuzzyValue` workarounds (multiple threads, 2019–2024).

- **Emscripten documentation — Memory model**: https://emscripten.org/docs/porting/files/file_system_overview.html
  WASM linear memory model, heap configuration (`TOTAL_MEMORY`), and allocation behavior.

- **MDN Web Docs — Web Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
  `postMessage` transferable objects, Worker lifecycle, and `terminate()` behavior.

- **MDN Web Docs — Transferable Objects**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
  Zero-copy TypedArray transfer between main thread and Worker.

- **OCCT Documentation — TNaming**: https://dev.opencascade.org/doc/overview/html/occt_user_guides__topo_naming.html
  Stable topological naming framework used for persistent entity identification after booleans.

- **FreeCAD source — OCCT integration**: https://github.com/FreeCAD/FreeCAD
  Reference for OCCT boolean robustness patterns, `ShapeFix_Shape` usage, and tolerance management in a real-world parametric CAD system.

- **kernelCAD internal research**:
  - `REPLICAD_DEEP_DIVE.md` — Performance table, face tessellation approach, API mapping
  - `OCCT_VS_ASM_GAPS.md` — Boolean robustness comparison, `BRepCheck_Analyzer` usage
  - `PARAMETRIC_HISTORY_IMPLEMENTATION.md` — Incremental recompute and caching strategy
  - `RECOMPUTE_ENGINE_BLUEPRINT.md` — Worker architecture and batch computation patterns
  - `ARCHITECTURE.md` — GeometryEngine worker protocol, existing implementation

---

*Document end. See also: `REPLICAD_DEEP_DIVE.md`, `OCCT_VS_ASM_GAPS.md`, `STABLE_NAMING_BLUEPRINT.md`, `RECOMPUTE_ENGINE_BLUEPRINT.md`.*
