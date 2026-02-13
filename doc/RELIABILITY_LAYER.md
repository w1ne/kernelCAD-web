# Reliability Layer

The Reliability Layer provides robust wrappers around Replicad's Sketcher API to handle edge cases gracefully and prevent invalid geometry.

## Scope

The reliability layer is broader than `SafeSketcher`. It should enforce deterministic and failure-safe behavior across:
- code mutation and commit
- worker request/response lifecycle
- execution scheduling (normal + preview)
- project persistence and migration
- runtime observability

## SafeSketcher

**Location**: `src/lib/safeSketch.ts`

The `SafeSketcher` class wraps Replicad's `Sketcher` to provide:

### Features

| Feature | Behavior |
|---------|----------|
| **Redundant Move Prevention** | Consecutive `movePointerTo()` calls to the same point are ignored |
| **Auto-Close Loops** | Open loops are automatically closed before starting a new path |
| **Position Tracking** | Tracks current cursor position for validation |
| **Tolerance Handling** | Uses 1e-6 tolerance for point comparison |

### Usage

```typescript
import { SafeSketcher, createSafeReplicad } from './lib/safeSketch';

// Option 1: Direct usage
const sketcher = new SafeSketcher(new replicad.Sketcher('XY'));
const solid = sketcher
  .movePointerTo([0, 0])
  .lineTo([10, 0])
  .lineTo([10, 10])
  .close()
  .extrude(5);

// Option 2: Factory (replaces Sketcher globally)
const safeReplicad = createSafeReplicad(replicad);
const sketcher2 = new safeReplicad.Sketcher('XY'); // Returns SafeSketcher
```

### Factory Function

`createSafeReplicad(replicad)` returns a modified replicad object where:
- `Sketcher` constructor returns `SafeSketcher` instances
- All other replicad APIs remain unchanged
- Used by the web worker to inject reliability layer into user code

## Future Enhancements

- [ ] Additional curve method wrappers (bezier, spline)
- [ ] Disjoint loop detection and handling
- [ ] Geometry validation before extrusion

## Reliability/Determinism Gaps (Current)

### 1) Worker initialization and pending request deadlocks
- `GeometryEngine.initialize()` can wait forever if worker returns `ERROR` for `INIT`.
- Worker crash/protocol failure does not reject all pending requests.

Refs:
- `src/lib/geometryEngine.ts`

### 2) Stale execution result races
- `GeometryContext` applies async execution results without request revision checks.
- Late responses can overwrite newer user intent.

Refs:
- `src/context/GeometryContext.tsx`

### 3) Non-deterministic runtime IDs/timestamps
- Worker sketch IDs currently use `Date.now()`.
- This breaks stable replay/snapshot behavior and UI identity consistency.

Refs:
- `src/lib/worker.ts`
- `src/context/CodeContext.tsx`

### 4) Multiple code mutation paths
- Modeling code can be changed through command mutations, direct `setCode`, and editor text edits.
- There is no single transactional mutation boundary for all writes.

Refs:
- `src/context/CodeContext.tsx`
- `src/hooks/useCodeInsertion.ts`

### 5) Weak persistence contract
- Project validation is permissive and not migration-based.
- Corrupt partial payloads can pass validation and fail later.

Refs:
- `src/lib/projectService.ts`

## Hardening Plan (Phased)

### Phase 0: Failure Safety (Do First)
- [x] Reject `initPromise` on `INIT` error response.
- [x] Reject all pending worker requests on `onerror`/protocol violation/terminate.
- [x] Add per-request timeout (fail fast, surface explicit timeout error).
- [x] Add structured diagnostics counters for failure modes (`initFailures`, `workerCrashes`, `protocolViolations`, `requestTimeouts`).

### Phase 1: Deterministic Execution Contract
- [x] Add monotonically increasing `requestRevision` in `GeometryContext`.
- [x] Apply response only if `response.revision === latestRevision`.
- [ ] Split preview execution channel from committed execution channel (independent revision streams).
- [x] Remove timestamp-based IDs from worker payload; replace with deterministic IDs.

### Phase 2: Transactional Code Mutation
- [x] Introduce `CodeMutationService` as the only commit gateway.
- [x] Route insert/delete/rename through AST transform + parse validation + commit.
- [ ] Keep fallback heuristic path behind explicit feature flag and log every fallback.

### Phase 3: Persistence Contract
- [x] Define `zod` schema for `.kcad` payload.
- [x] Validate all fields strictly (no partial acceptance).
- [x] Add migration pipeline (`v1 -> v2 -> ...`) and reject unsupported versions.

### Phase 4: Observability and Burn-In
- [~] Add counters for stale response drops, engine failure/timeout diagnostics, and code mutation attempts/success/failures.
- [ ] Add regression tests for each failure mode.

## Determinism Invariants

The system should satisfy these invariants:
1. Same code + same dependencies -> same normalized geometry metadata and stable IDs.
2. Latest intent wins: old async responses never override new state.
3. Every modeling mutation is either fully committed or fully rejected (no partial writes).
4. Worker failures terminate in bounded time with explicit error states.
5. Persisted project is either schema-valid/migrated or rejected at load time.
