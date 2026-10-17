# Studio Browser Kernel + Mesh Payload Diet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make hosted-Studio parameter edits, animations, and model recreation blazingly fast: ~10× smaller mesh payloads (binary + partial updates) and a background browser kernel worker so param edits run locally with no network.

**Architecture:** A versioned binary mesh container (`bin1`) with 64-bit per-feature fingerprints enables both smaller transports and changed-features-only patches. A new Studio Web Worker (same pattern as the shipped `site/island/docs-worker.ts`) runs the full modern pipeline (`runScriptInBrowser` + `meshFeaturesPerFeature` + `updateModelParams`) on a warmed model; `GeometryContext` routes param edits to the worker when warm and falls back to the existing (hardened) server path otherwise. Spec: `docs/superpowers/specs/2026-10-18-studio-browser-kernel-design.md`.

**Tech Stack:** TypeScript, Vite, React (Studio), three.js, replicad-opencascadejs (OCCT wasm), vitest, Playwright.

**Repo sequencing note:** This plan covers `kernelCAD-web` only (PR A + PR C in the spec). The server-side `Accept` negotiation + partial responses (PR B) is a separate plan written when the vendor pin bump lands, because the server consumes the codec through `vendor/kernelcad` (see spec "Sequencing").

**Implementation rule for every task:** write the failing test first, run it, implement until green, run the full file, commit. Never leave a task with a red or skipped test.

---

### Task 1: Binary mesh codec (`bin1`)

**Files:**
- Create: `src/modeling/capture/featureMeshBinary.ts`
- Test: `src/modeling/capture/featureMeshBinary.test.ts`

**Public interface (locking this in):**

```ts
export const MESH_BIN_MAGIC = 0x3142434b;   // "KCB1" little-endian
export const MESH_BIN_VERSION = 1;
export const MESH_BIN_FLAG_PARTIAL = 0x1;

export type NumericBuffer = Float32Array | Uint32Array | number[];

export interface FaceGeometryInput {
  vertices: NumericBuffer; normals: NumericBuffer; uv?: NumericBuffer;
  indices: NumericBuffer; faceId: number;
  plane?: FaceGeometry['plane']; cylinder?: FaceGeometry['cylinder'];
}
export interface FeatureMeshSerializedInput
  extends Omit<FeatureMeshSerialized, 'faces' | 'mesh' | 'edges'> {
  faces: FaceGeometryInput[];
  mesh?: { positions: NumericBuffer; normals: NumericBuffer; indices: NumericBuffer };
  edges?: NumericBuffer;
  fingerprint?: string;                       // hex16, present on decoded features
}
export interface MeshBinaryTrailer { unchangedIds: string[]; removedIds: string[] }
export interface FeatureFingerprintInput {
  faceIds: number[]; vertices: NumericBuffer; normals: NumericBuffer;
  uvs?: NumericBuffer; indices: NumericBuffer;
  meshPositions?: NumericBuffer; meshNormals?: NumericBuffer; meshIndices?: NumericBuffer;
  edges?: NumericBuffer;
}

export function fingerprintBuffers(input: FeatureFingerprintInput): string;
export function encodeMeshBinary(
  features: Array<FeatureMeshSerializedInput | FeatureMesh>,
  trailer?: MeshBinaryTrailer,
): Uint8Array;
export function decodeMeshBinary(bytes: Uint8Array): {
  features: FeatureMeshSerializedInput[]; trailer?: MeshBinaryTrailer;
};
```

**Container (little-endian, offsets relative to container start):**

```
header  { magic u32, version u16, flags u16, count u32 }          // 12 bytes
table   count × { metaLen u32, metaOffset u32, firstBuffer u32, bufferCount u32 }
meta    per record: UTF-8 JSON, zero-padded to 4
buffers per record, in this exact order, each written as { len u32, bytes, pad to 4 }:
        faces: for each face  vertices f32, normals f32
               [if the record hasUv: for each face uv f32]
               for each face  indices u32
        [if record hasMesh: positions f32, normals f32, indices u32]
        [if record hasEdges: edges f32]
```

`meta` per record is `{ feature, faces, hasUv, hasMesh, hasEdges, fingerprint }`
where `feature` is every `FeatureMeshSerialized` field except `faces`, `mesh`,
`edges`; `faces` is `[{ faceId, plane?, cylinder?, vertexOffset, vertexCount,
indexOffset, indexCount }]` with offsets/counts in **elements** against the
record's contiguous face buffers. `fingerprint` = `fingerprintBuffers` over the
record's contiguous face buffers + faceIds + mesh/edges buffers. The first
record's meta is `{ meta, trailer }` when a trailer is passed (flags bit0 set).

**Invariants the tests must pin:**
- Decode of an encode is value-identical for every field (geometry, materials,
  ids, transforms, plane/cylinder, uv presence/absence, empty faces, empty
  feature list, `virtual` records).
- Decoded numeric arrays are views into the input `bytes` buffer (no copy):
  `expect(decoded.faces[0].vertices.buffer).toBe(bytes.buffer)`.
- `fingerprintBuffers` is deterministic, 16 hex chars, and changes when any
  single float, face id, or buffer length changes.
- `encodeMeshBinary(features, trailer)` sets `flags` bit0 and the trailer
  round-trips; absent trailer → `trailer === undefined` even if a stray
  `__partial` meta exists.
- Encode accepts `FeatureMesh` (mesher output, typed arrays) and
  `FeatureMeshSerialized` (JSON, `number[]`) interchangeably.

- [ ] **Step 1: Write the failing test file**

```ts
// src/modeling/capture/featureMeshBinary.test.ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  decodeMeshBinary, encodeMeshBinary, fingerprintBuffers,
  MESH_BIN_MAGIC, MESH_BIN_FLAG_PARTIAL,
  type FeatureMeshSerializedInput, type MeshBinaryTrailer,
} from './featureMeshBinary';

function feature(overrides: Partial<FeatureMeshSerializedInput> = {}): FeatureMeshSerializedInput {
  return {
    featureId: 'shape#1', featureKind: 'box', predecessors: [],
    faces: [{
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
      faceId: 7,
      plane: { kind: 'plane', normal: [0, 0, 1], origin: [0, 0, 0] },
    }],
    edges: new Float32Array([0, 1]),
    volume: 12.5,
    color: '#ff0000',
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    ...overrides,
  };
}

describe('encode/decode round-trip', () => {
  it('round-trips geometry, metadata and face ranges', () => {
    const bytes = encodeMeshBinary([feature(), feature({ featureId: 'shape#2', featureKind: 'cylinder', displayName: 'Boss' })]);
    expect(new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true)).toBe(MESH_BIN_MAGIC);
    const { features, trailer } = decodeMeshBinary(bytes);
    expect(trailer).toBeUndefined();
    expect(features).toHaveLength(2);
    const a = features[0]!;
    expect(a.featureId).toBe('shape#1');
    expect(Array.from(a.faces[0]!.vertices)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(Array.from(a.faces[0]!.indices)).toEqual([0, 1, 2]);
    expect(a.faces[0]!.faceId).toBe(7);
    expect(a.faces[0]!.plane).toEqual({ kind: 'plane', normal: [0, 0, 1], origin: [0, 0, 0] });
    expect(Array.from(a.edges as Float32Array)).toEqual([0, 1]);
    expect(a.volume).toBe(12.5);
    expect(a.color).toBe('#ff0000');
    expect(a.transform).toHaveLength(16);
    expect(features[1]!.displayName).toBe('Boss');
  });

  it('decodes zero-copy typed-array views', () => {
    const bytes = encodeMeshBinary([feature()]);
    const { features } = decodeMeshBinary(bytes);
    expect(features[0]!.faces[0]!.vertices.buffer).toBe(bytes.buffer);
  });

  it('round-trips uv, mesh, empty faces, virtual records and empty input', () => {
    const withExtras = feature({
      faces: [{
        vertices: new Float32Array([0, 0, 0]), normals: new Float32Array([0, 0, 1]),
        uv: new Float32Array([0.5, 0.5]), indices: new Uint32Array([0]), faceId: 1,
      }],
      mesh: {
        positions: new Float32Array([0, 0, 0, 1, 1, 1]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1]),
      },
    });
    const empty: FeatureMeshSerializedInput = {
      featureId: 'render#1', featureKind: 'renderEnvironment', predecessors: [], faces: [], virtual: true,
    };
    const { features } = decodeMeshBinary(encodeMeshBinary([withExtras, empty]));
    expect(features[1]!.virtual).toBe(true);
    expect(features[1]!.faces).toHaveLength(0);
    expect(Array.from(features[0]!.faces[0]!.uv as Float32Array)).toEqual([0.5, 0.5]);
    expect(Array.from(features[0]!.mesh!.positions)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(decodeMeshBinary(encodeMeshBinary([])).features).toEqual([]);
  });

  it('carries a partial trailer and per-feature fingerprints', () => {
    const trailer: MeshBinaryTrailer = { unchangedIds: ['shape#9'], removedIds: ['shape#8'] };
    const bytes = encodeMeshBinary([feature()], trailer);
    expect(new DataView(bytes.buffer, bytes.byteOffset).getUint16(6, true) & MESH_BIN_FLAG_PARTIAL).toBe(1);
    const { features, trailer: got } = decodeMeshBinary(bytes);
    expect(got).toEqual(trailer);
    expect(features[0]!.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('fingerprintBuffers', () => {
  it('is stable across runs and sensitive to geometry, ids and lengths', () => {
    const buffers = {
      faceIds: [1, 2],
      vertices: new Float32Array([0, 0, 0, 1, 0, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
    };
    const a = fingerprintBuffers(buffers);
    expect(a).toBe(fingerprintBuffers({ ...buffers, vertices: new Float32Array([0, 0, 0, 1, 0, 0]) }));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprintBuffers({ ...buffers, vertices: new Float32Array([0, 0, 0.001, 1, 0, 0]) })).not.toBe(a);
    expect(fingerprintBuffers({ ...buffers, faceIds: [1, 3] })).not.toBe(a);
    expect(fingerprintBuffers({ ...buffers, indices: new Uint32Array([0, 1]) })).not.toBe(a);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/modeling/capture/featureMeshBinary.test.ts`
Expected: FAIL — cannot resolve `./featureMeshBinary`.

- [ ] **Step 3: Implement `featureMeshBinary.ts`**

Implement exactly the interface and container above. Requirements:
- No imports beyond the listed types + `FaceGeometry`/`FeatureMesh`/`FeatureMeshSerialized` type imports (types are erased — the graph guard stays green).
- `fingerprintBuffers`: two 32-bit FNV-1a lanes (different basis/prime) over
  `faceIds` (u32 LE), then per buffer: `byteLength` (u32 LE) then the raw
  bytes; concatenated hex16. Iterate typed arrays as bytes via
  `new Uint8Array(b.buffer, b.byteOffset, b.byteLength)`; for `number[]`
  convert to `Float32Array` first (all `number[]` inputs in practice are f32
  or u32 geometry — document that `number[]` is treated as f32).
- `encodeMeshBinary` normalizes inputs to typed arrays (copies `number[]`
  only), writes the containers in the exact order above, pads to 4 bytes.
  `firstBuffer`/`bufferCount` are record-local buffer indexes (decoder walks
  sequentially; they exist for validation).
- `decodeMeshBinary` validates magic/version, walks records forward: read
  meta, then read that record's `bufferCount` length-prefixed buffers in the
  same order encode wrote them, slicing zero-copy views with
  `new Float32Array(bytes.buffer, bytes.byteOffset + off + 4, len/4)`.
  Rebuild `faces[].vertices/normals/uv/indices` from the record's contiguous
  buffers using the meta ranges; rebuild `mesh`/`edges` when the flags say
  they exist; attach `fingerprint`.
- Guard rails: throw on truncated buffers (`off + 4 + len > bytes.length`),
  on `uv` present but `hasUv` false, and on a record whose `vertexOffset + vertexCount` overflows the contiguous buffer.
- Keep the file under ~330 lines: helpers `writeU32`, `pad4`, `pushBuffer`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/modeling/capture/featureMeshBinary.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint the new files**

Run: `npx tsc --noEmit && npx eslint src/modeling/capture/featureMeshBinary.ts src/modeling/capture/featureMeshBinary.test.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/modeling/capture/featureMeshBinary.ts src/modeling/capture/featureMeshBinary.test.ts
git commit -m "feat(mesh): bin1 binary mesh container with 64-bit per-feature fingerprints"
```

---

### Task 2: Accept binary payloads in the rehydrate path

**Files:**
- Modify: `src/modeling/capture/featureMeshSerialize.ts` (signature of `rehydrateFromBridge` only)
- Modify: `src/studio/context/GeometryContext.tsx` (`featureMeshesToGeometries` input type)
- Test: `src/modeling/capture/featureMeshSerialize.binary.test.ts` (new)

`rehydrateFromBridge` already converts each numeric field with
`new Float32Array(...)`, which accepts both `number[]` and `Float32Array`.
So this task only widens types — no behavior change.

- [ ] **Step 1: Write the failing test**

```ts
// src/modeling/capture/featureMeshSerialize.binary.test.ts
// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { rehydrateFromBridge } from './featureMeshSerialize';
import { decodeMeshBinary, encodeMeshBinary } from './featureMeshBinary';

describe('rehydrateFromBridge accepts bin1-decoded features', () => {
  it('produces the same FeatureMesh as the JSON path', () => {
    const input = {
      featureId: 'shape#1', featureKind: 'box', predecessors: [],
      faces: [{
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]), faceId: 3,
      }],
      edges: new Float32Array([0, 1]),
    };
    const { features } = decodeMeshBinary(encodeMeshBinary([input]));
    const mesh = rehydrateFromBridge(features[0] as never);
    expect(mesh.faces[0]!.vertices).toBeInstanceOf(Float32Array);
    expect(Array.from(mesh.faces[0]!.vertices)).toEqual(Array.from(input.faces[0]!.vertices));
    expect(Array.from(mesh.edges as Float32Array)).toEqual([0, 1]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/modeling/capture/featureMeshSerialize.binary.test.ts`
Expected: FAIL with a TS error inside the test file (decoded features not
assignable to `FeatureMeshSerialized`) at typecheck; vitest may run it (types
erased) — if it passes at runtime, still fix the types and add
`// @ts-expect-error` removal after the widening.

- [ ] **Step 3: Widen the types**

In `featureMeshSerialize.ts`:

```ts
import type { FeatureMeshSerializedInput } from './featureMeshBinary';

export function rehydrateFromBridge(s: FeatureMeshSerialized | FeatureMeshSerializedInput): FeatureMesh {
```

(Keep the body unchanged. `new Float32Array(f.vertices)` accepts both forms.)

In `GeometryContext.tsx` (and any sibling that imports it), widen
`featureMeshesToGeometries(features: FeatureMeshSerialized[])` to accept
`Array<FeatureMeshSerialized | FeatureMeshSerializedInput>`.

- [ ] **Step 4: Run the tests + typecheck**

Run: `npx vitest run src/modeling/capture/featureMeshSerialize.binary.test.ts src/studio/context/GeometryContext.test.tsx && npx tsc --noEmit`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add src/modeling/capture/featureMeshSerialize.ts src/studio/context/GeometryContext.tsx src/modeling/capture/featureMeshSerialize.binary.test.ts
git commit -m "refactor(mesh): accept bin1 typed arrays in rehydrateFromBridge"
```

---

### Task 3: Precompute `.bin` (+ `.br`) in the gallery build

**Files:**
- Modify: `site/scripts/build-gallery.ts` (~line 301 `_mesh` writer)
- Modify: `src/studio/gallerySource.ts`
- Test: `src/studio/gallerySource.test.ts`, `site/scripts/build-gallery.test.ts`

- [ ] **Step 1: Write the failing tests**

In `gallerySource.test.ts` add:

```ts
import { galleryPrecomputedMeshBinUrl } from './gallerySource';

it('bin url sits next to the json precompute', () => {
  expect(galleryPrecomputedMeshBinUrl('abc123'))
    .toBe('/gallery/_mesh/abc123.bin');
});
```

In `build-gallery.test.ts`, add a test asserting the writer emits
`<sha>.bin` and `<sha>.bin.br` next to `<sha>.json` for every entry that has a
mesh (assert via the exported helper the script already uses to write
precomputes; follow the file's existing test pattern for `_mesh` writes).

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/studio/gallerySource.test.ts`
Expected: FAIL — `galleryPrecomputedMeshBinUrl` not exported.

- [ ] **Step 3: Implement**

`gallerySource.ts`:

```ts
/** bin1 precompute, written next to the JSON by the gallery build. */
export function galleryPrecomputedMeshBinUrl(sourceSha256Hex: string): string {
  return `${galleryAssetBase()}/gallery/_mesh/${sourceSha256Hex}.bin`;
}

/** Brotli variant of the bin1 precompute for CDNs that do not auto-compress
 *  custom binary content types. The client requests `.bin.br` with
 *  `Accept-Encoding` handled by the CDN; a direct fetch falls back to `.bin`. */
export function galleryPrecomputedMeshBinBrUrl(sourceSha256Hex: string): string {
  return `${galleryAssetBase()}/gallery/_mesh/${sourceSha256Hex}.bin.br`;
}
```

`build-gallery.ts`: at the `_mesh` writer, for every payload it already
writes as JSON:
1. re-encode the same feature list through `encodeMeshBinary` (import from
   `../../src/modeling/capture/featureMeshBinary`) and write `<sha>.bin`;
2. `zlib.brotliCompressSync(Buffer.from(bin), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } })`
   → write `<sha>.bin.br`;
3. keep writing the JSON unchanged (old clients, embeds).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/studio/gallerySource.test.ts site/scripts/build-gallery.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/build-gallery.ts src/studio/gallerySource.ts src/studio/gallerySource.test.ts site/scripts/build-gallery.test.ts
git commit -m "feat(gallery): write bin1 + brotli precomputed meshes next to json"
```

---

### Task 4: Client prefers the binary precompute; server calls negotiate bin

**Files:**
- Modify: `src/studio/scriptSource.ts` (`meshSourceHosted`, `meshSourceDev`, `BackendMeshPayload`)
- Test: `src/studio/scriptSource.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `scriptSource.test.ts` (follow the file's existing fetch-mocking
pattern):

1. `meshSourceHosted` fetches `<sha>.bin` first; when it 200s, the payload is
   decoded via `decodeMeshBinary` and returned with `features` typed arrays.
2. When `.bin` 404s, it falls back to the existing `.json` precompute.
3. When both miss, it POSTs to the server with
   `Accept: application/json, application/x-kernelcad-mesh+bin` and decodes
   `content-type: application/x-kernelcad-mesh+bin` responses; a JSON response
   is accepted unchanged.
4. `meshSourceDev` POSTs the same `Accept` header.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/studio/scriptSource.test.ts`
Expected: FAIL — binary paths not implemented.

- [ ] **Step 3: Implement**

In `scriptSource.ts`:
- import `decodeMeshBinary` and the bin URL helper;
- in `meshSourceHosted`'s precompute stage: try `.bin` → on ok, decode →
  convert trailer → return; on non-ok, try the existing `.json` flow;
- in `meshOnServer` (the shared server fetch): add the `Accept` header; parse
  by `content-type` (`application/x-kernelcad-mesh+bin` → decode; otherwise
  `response.json()`), keeping the existing 504-`mesh.pending` retry and error
  paths intact;
- `BackendMeshPayload['features']` widens to
  `Array<FeatureMeshSerialized | FeatureMeshSerializedInput>` (Task 2's union).

- [ ] **Step 4: Run the tests + typecheck**

Run: `npx vitest run src/studio/scriptSource.test.ts && npx tsc --noEmit`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add src/studio/scriptSource.ts src/studio/scriptSource.test.ts
git commit -m "feat(studio): prefer bin1 mesh payloads end to end"
```

---

### Task 5: Partial-payload merge in the client

**Files:**
- Create: `src/studio/context/geometry/mergeFeatureMeshes.ts`
- Modify: `src/studio/context/geometry/useMeshFetch.ts` (hosted apply path)
- Test: `src/studio/context/geometry/mergeFeatureMeshes.test.ts`

**Interface:**

```ts
export interface MeshMergeState {
  order: string[];                                     // featureIds in display order
  meshes: Map<string, FeatureMeshSerializedInput>;     // last payload per feature
  fingerprints: Map<string, string>;
}
export function emptyMergeState(): MeshMergeState;
export function mergeFeatureMeshes(
  state: MeshMergeState | null,
  incoming: FeatureMeshSerializedInput[],
  trailer?: MeshBinaryTrailer,
): { state: MeshMergeState; changed: boolean };
```

Rules: `trailer === undefined` → full replace (new state, order = incoming
order). With a trailer: replace/insert every incoming feature (insert appends
in incoming order), drop `removedIds`, keep everything else; `changed` is true
iff any geometry (fingerprints map) differs. The client stores fingerprints
from decoded features.

- [ ] **Step 1: Write the failing tests**

```ts
// src/studio/context/geometry/mergeFeatureMeshes.test.ts
import { describe, expect, it } from 'vitest';
import { emptyMergeState, mergeFeatureMeshes } from './mergeFeatureMeshes';

const f = (id: string, fp: string) => ({ featureId: id, featureKind: 'box', predecessors: [], faces: [], fingerprint: fp });

describe('mergeFeatureMeshes', () => {
  it('full replace without a trailer', () => {
    const { state } = mergeFeatureMeshes(null, [f('a', '1'), f('b', '2')]);
    expect(state.order).toEqual(['a', 'b']);
    const next = mergeFeatureMeshes(state, [f('c', '3')]);
    expect(next.state.order).toEqual(['c']);
  });

  it('keeps unchanged, replaces changed in place, appends new, drops removed', () => {
    const { state } = mergeFeatureMeshes(null, [f('a', '1'), f('b', '2'), f('c', '3')]);
    const merged = mergeFeatureMeshes(state, [f('b', '2b'), f('d', '4')], { unchangedIds: ['a'], removedIds: ['c'] });
    expect(merged.changed).toBe(true);
    expect(merged.state.order).toEqual(['a', 'b', 'd']);
    expect(merged.state.fingerprints.get('b')).toBe('2b');
    expect(merged.state.meshes.has('c')).toBe(false);
  });

  it('reports changed=false when fingerprints and order are unchanged', () => {
    const { state } = mergeFeatureMeshes(null, [f('a', '1'), f('b', '2')]);
    const merged = mergeFeatureMeshes(state, [f('b', '2')], { unchangedIds: ['a'], removedIds: [] });
    expect(merged.changed).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/studio/context/geometry/mergeFeatureMeshes.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the module (small, ~80 lines) to the interface above.**

- [ ] **Step 4: Wire into `useMeshFetch.ts`**

The hosted apply path keeps a `MeshMergeState` (module-level Map keyed by
studio source for session lifetime) and:
- sends `have` fingerprints for the current state on param-edit requests
  (only when every state fingerprint is a hex16 — otherwise omit `have`);
- applies the response through `mergeFeatureMeshes`, then maps
  `state.order → meshes` through the existing `featureMeshesToGeometries`;
- on a merge-mismatch error (an `unchangedIds`/incoming id missing from
  state), retries once without `have`.
Adjust the fetch call sites (`paramEditsForMesh.ts` `meshParamEdits`) to pass
`have`.

- [ ] **Step 5: Run the tests + typecheck**

Run: `npx vitest run src/studio/context/geometry/ && npx tsc --noEmit`
Expected: PASS + clean.

- [ ] **Step 6: Commit**

```bash
git add src/studio/context/geometry/mergeFeatureMeshes.ts src/studio/context/geometry/mergeFeatureMeshes.test.ts src/studio/context/geometry/useMeshFetch.ts src/studio/context/geometry/paramEditsForMesh.ts
git commit -m "feat(studio): merge partial bin1 patches into the live geometry"
```

---

### Task 6: Coalesce param edits (one in-flight + one trailing)

**Files:**
- Create: `src/studio/context/geometry/paramEditQueue.ts`
- Modify: `src/studio/context/geometry/paramEditsForMesh.ts` (`meshParamEdits`)
- Test: `src/studio/context/geometry/paramEditQueue.test.ts`

**Interface:**

```ts
export interface ParamEditQueue {
  /** Queue or replace the pending edit map; resolves when its request settles. */
  submit(edits: ParamEditValues): Promise<void>;
  /** In-flight + pending counts (tests + telemetry). */
  stats(): { inFlight: boolean; pending: boolean };
  /** Test seam: drain the trailing. */
  dispose(): void;
}
export function createParamEditQueue(run: (edits: ParamEditValues) => Promise<void>): ParamEditQueue;
```

Semantics: if nothing is in flight, run immediately; otherwise merge edits
per param name into the pending map (last wins) and start it when the
in-flight settles. `submit` resolves when the request that carried its values
settles (for a coalesced value: when the trailing request settles).

- [ ] **Step 1: Write the failing tests**

```ts
// src/studio/context/geometry/paramEditQueue.test.ts
import { describe, expect, it } from 'vitest';
import { createParamEditQueue } from './paramEditQueue';

function deferred() { let resolve!: () => void; const promise = new Promise<void>((r) => { resolve = r; }); return { promise, resolve }; }

describe('createParamEditQueue', () => {
  it('runs immediately when idle and coalesces to one trailing batch', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const gates: Array<ReturnType<typeof deferred>> = [];
    const queue = createParamEditQueue(async (edits) => {
      calls.push(edits);
      const gate = deferred();
      gates.push(gate);
      await gate.promise;
    });
    const first = queue.submit({ w: 1 });
    expect(calls).toEqual([{ w: 1 }]);
    const second = queue.submit({ w: 2 });
    const third = queue.submit({ w: 3, h: 5 });
    expect(queue.stats()).toEqual({ inFlight: true, pending: true });
    gates[0]!.resolve(); await first; await Promise.resolve();
    expect(calls[1]).toEqual({ w: 3, h: 5 });
    gates[1]!.resolve(); await Promise.all([second, third]);
    expect(queue.stats()).toEqual({ inFlight: false, pending: false });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/studio/context/geometry/paramEditQueue.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the queue (~60 lines).**

- [ ] **Step 4: Route `meshParamEdits` through a singleton queue per studio**

In `paramEditsForMesh.ts`: keep `paramEditsForMesh` pure; change
`meshParamEdits` to submit through a module-scoped
`createParamEditQueue` created lazily on first use and rebuilt when
`shouldUseHostedMesh()`/source changes are irrelevant (the queue only carries
edits; `code` is captured per submit). Export `__resetParamEditQueueForTests()`.

- [ ] **Step 5: Run the tests + typecheck**

Run: `npx vitest run src/studio/context/geometry/paramEditQueue.test.ts src/studio/context/geometry/ && npx tsc --noEmit`
Expected: PASS + clean.

- [ ] **Step 6: Commit**

```bash
git add src/studio/context/geometry/paramEditQueue.ts src/studio/context/geometry/paramEditQueue.test.ts src/studio/context/geometry/paramEditsForMesh.ts
git commit -m "feat(studio): coalesce stateless param edits to one in-flight + one trailing"
```

---

### Task 7: Worker protocol + kernel worker

**Files:**
- Create: `src/studio/kernel/protocol.ts`
- Create: `src/studio/kernel/kernelWorkerCore.ts` (testable, no worker globals)
- Create: `src/studio/kernel/studioKernelWorker.ts` (thin worker entry)
- Test: `src/studio/kernel/kernelWorkerCore.test.ts`
- Modify: `src/modeling/runtime/browserGraphNodeFree.test.ts` (third graph)

**Protocol (locking this in):**

```ts
export const KERNEL_PROTOCOL_VERSION = 1;

export type KernelRequest =
  | { v: 1; id: number; type: 'build'; source: string; fileName: string }
  | { v: 1; id: number; type: 'params'; edits: Array<{ name: string; value: number | boolean }>; have?: Record<string, string> }
  | { v: 1; id: number; type: 'dispose' };

export type KernelResponse =
  | { v: 1; id: number; type: 'script-done' }
  | { v: 1; id: number; type: 'result'; payload: Uint8Array; trailer?: MeshBinaryTrailer;
      params: unknown; featureRecords: unknown[]; bounds: Bounds; failedFeatureIds: string[] }
  | { v: 1; id: number; type: 'error'; code: 'script-error' | 'host-fs-unavailable' | 'worker-error'; message: string;
      failedFeatureIds?: string[] };
```

`payload` is a `bin1` container transferred (not copied). `script-done` is
sent between script evaluation and meshing so the host can disarm the 30 s
watchdog.

**`kernelWorkerCore.ts` interface (injectable for tests):**

```ts
export interface KernelWorkerDeps {
  runScript(input: { code: string; fileName: string }): Promise<{
    records: unknown[]; paramTable: unknown;
    session: unknown; // CaptureSession shape the mesher and paramUpdate take
  }>;
  mesh(records: unknown[], paramTable: unknown, session: unknown): Promise<{
    features: import('../../modeling/capture/featureMeshing').FeatureMesh[];
    bounds: Bounds; failedFeatureIds: string[];
  }>;
  updateParams(model: unknown, edits: Array<{ name: string; value: number | boolean }>): Promise<{ model: unknown }>;
}
export function createKernelWorkerCore(deps: KernelWorkerDeps): {
  handle(request: KernelRequest): Promise<KernelResponse | { type: 'script-done'; id: number }>;
};
```

Core behavior:
- `build`: `runScript` → post `script-done` (returns it so the host adapter
  emits immediately) → `mesh` → encode bin1 (with per-feature fingerprints) →
  result{payload, params, featureRecords, bounds, failedFeatureIds}. Store the
  built model for `params`.
- `params`: `updateParams` → re-mesh → partial encode with a trailer
  (`unchangedIds` from `have` fingerprints that still match; `removedIds` for
  ids gone; all other features changed). `failedFeatureIds` →
  `error{code:'script-error'}` (same as server 'one or more features failed').
- Errors thrown with `code === 'cli.host-fs-unavailable'` are re-coded to
  `host-fs-unavailable` so the client can mark the source server-only.
- No state leaks between `dispose` and the next `build`.

- [ ] **Step 1: Write the failing tests** (core with fake deps)

```ts
// src/studio/kernel/kernelWorkerCore.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createKernelWorkerCore } from './kernelWorkerCore';
import { decodeMeshBinary } from '../../modeling/capture/featureMeshBinary';
import type { KernelResponse } from './protocol';

function deps() {
  const feature = (id: string, x: number) => ({
    featureId: id, featureKind: 'box', predecessors: [],
    faces: [{ vertices: new Float32Array([x, 0, 0]), normals: new Float32Array([0, 0, 1]), indices: new Uint32Array([0]), faceId: 1 }],
  });
  let current = [feature('a', 0), feature('b', 0)];
  return {
    runScript: vi.fn(async () => ({ records: [{}], paramTable: {}, session: {} })),
    mesh: vi.fn(async () => ({ features: current, bounds: { min: [0, 0, 0], max: [1, 1, 1] }, failedFeatureIds: [] })),
    updateParams: vi.fn(async (_m: unknown, edits: Array<{ name: string; value: number | boolean }>) => {
      const dx = Number(edits.find((e) => e.name === 'w')?.value ?? 0);
      current = [feature('a', dx), feature('b', 0)];
      return { model: {} };
    }),
  };
}

function resultOf(responses: KernelResponse[]): Extract<KernelResponse, { type: 'result' }> {
  const result = responses.find((r) => r.type === 'result');
  if (!result || result.type !== 'result') throw new Error('no result');
  return result;
}

describe('kernelWorkerCore', () => {
  it('build answers [script-done, result] and encodes bin1 with fingerprints', async () => {
    const core = createKernelWorkerCore(deps());
    const responses = await core.handle({ v: 1, id: 1, type: 'build', source: 'x', fileName: 'a.kcad.ts' });
    expect(responses.map((r) => r.type)).toEqual(['script-done', 'result']);
    const { features } = decodeMeshBinary(resultOf(responses).payload);
    expect(features.map((f) => f.featureId)).toEqual(['a', 'b']);
    expect(features[0]!.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it('params returns a partial patch honouring have-fingerprints', async () => {
    const core = createKernelWorkerCore(deps());
    const built = resultOf(await core.handle({ v: 1, id: 1, type: 'build', source: 'x', fileName: 'a.kcad.ts' }));
    const decoded = decodeMeshBinary(built.payload);
    const have = Object.fromEntries(decoded.features.map((f) => [f.featureId, f.fingerprint!]));

    const patched = resultOf(await core.handle({ v: 1, id: 2, type: 'params', edits: [{ name: 'w', value: 5 }], have }));
    expect(patched.trailer).toEqual({ unchangedIds: ['b'], removedIds: [] });
    const patch = decodeMeshBinary(patched.payload);
    expect(patch.features.map((f) => f.featureId)).toEqual(['a']);
  });

  it('params without have returns the full set with no trailer', async () => {
    const core = createKernelWorkerCore(deps());
    await core.handle({ v: 1, id: 1, type: 'build', source: 'x', fileName: 'a.kcad.ts' });
    const patched = resultOf(await core.handle({ v: 1, id: 2, type: 'params', edits: [{ name: 'w', value: 5 }] }));
    expect(patched.trailer).toBeUndefined();
  });
});
```

**Locked interface:** `handle(req): Promise<KernelResponse[]>` — `build` →
`[script-done, result]`, `params` → `[result]`, `dispose` → `[]`.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/studio/kernel/kernelWorkerCore.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `protocol.ts` + `kernelWorkerCore.ts` to the locked interface.**

- [ ] **Step 4: Implement `studioKernelWorker.ts`** (thin adapter, ~70 lines)

```ts
// src/studio/kernel/studioKernelWorker.ts
import wasmUrl from 'replicad-opencascadejs/src/replicad_single.wasm?url';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runScriptInBrowser } from '../../composition/browserRuntime';
import { meshFeaturesPerFeature } from '../../modeling/capture/featureMeshing';
import { updateModelParams } from '../../modeling/paramUpdate';
import { createKernelWorkerCore } from './kernelWorkerCore';
import type { KernelRequest } from './protocol';

const enginePromise = initOcct({ locateFile: (file: string) => (file.endsWith('.wasm') ? wasmUrl : file) });

const core = createKernelWorkerCore({
  runScript: async ({ code, fileName }) => {
    await enginePromise;
    const result = await runScriptInBrowser({ code, fileName });
    return { records: result.records, paramTable: result.paramTable, session: result.session };
  },
  mesh: async (records, paramTable, session) => {
    const meshed = await meshFeaturesPerFeature(
      records as Parameters<typeof meshFeaturesPerFeature>[0],
      paramTable as Parameters<typeof meshFeaturesPerFeature>[1],
      session as Parameters<typeof meshFeaturesPerFeature>[2],
    );
    return { features: meshed.features, bounds: meshed.bounds, failedFeatureIds: meshed.failedFeatureIds };
  },
  updateParams: async (model, edits) => {
    const next = await updateModelParams(model as never, edits as never);
    return { model: next.model };
  },
});

self.onmessage = async (event: MessageEvent<KernelRequest>) => {
  const responses = await core.handle(event.data);
  for (const response of responses) {
    const transfers: Transferable[] = response.type === 'result' ? [response.payload.buffer] : [];
    (self as unknown as Worker).postMessage(response, transfers);
  }
};
```

The `runScript` dep must KEEP the captured session across calls — adjust the
core so `build` stores `{ records, paramTable, session }` and `params`
re-meshes against the stored session (`mesh(records, paramTable, session)`),
passing the updated model's records/session from `updateParams`.

- [ ] **Step 5: Extend the graph guard**

In `src/modeling/runtime/browserGraphNodeFree.test.ts`, add
`src/studio/kernel/studioKernelWorker.ts` as a third `ENTRY` walked by the
same assertions.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/studio/kernel/kernelWorkerCore.test.ts src/modeling/runtime/browserGraphNodeFree.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/studio/kernel/ src/modeling/runtime/browserGraphNodeFree.test.ts
git commit -m "feat(studio): kernel worker protocol + bin1 build/params core"
```

---

### Task 8: Browser-kernel client lifecycle

**Files:**
- Create: `src/studio/kernel/browserKernelClient.ts`
- Test: `src/studio/kernel/browserKernelClient.test.ts`

**Interface (locking this in):**

```ts
export type KernelStatus = 'idle' | 'spawning' | 'warming' | 'warm' | 'failed';
export interface BrowserKernel {
  status(): KernelStatus;
  /** Warm the worker for `source`; resolves when warm or failed. Idempotent. */
  warm(source: string, fileName: string): Promise<void>;
  /** Apply param edits against the warm model. Throws KernelUnavailableError
   *  when not warm; throws KernelHostFsError for host-fs sources. */
  params(edits: Array<{ name: string; value: number | boolean }>, have?: Record<string, string>): Promise<{
    payload: Uint8Array; trailer?: MeshBinaryTrailer;
    params: unknown; featureRecords: unknown[]; bounds: Bounds; failedFeatureIds: string[];
  }>;
  /** Sticky reason the source is server-only (for telemetry/UI). */
  fallbackReason(): string | null;
  dispose(): void;
}
export function createBrowserKernel(opts: {
  spawn: () => Worker;               // injected so tests use a fake
  scriptBudgetMs?: number;           // default BROWSER_SCRIPT_TIMEOUT_MS (30_000)
  totalBudgetMs?: number;            // default 300_000
}): BrowserKernel;
```

Behavior:
- `warm`: lazily `spawn()`, send `build`; watchdog arms on send, disarmed by
  `script-done`; a `result` → `warm`; an `error` with `host-fs-unavailable` →
  `failed` + `fallbackReason='host-fs'`; script-error → `failed` +
  `fallbackReason='script-error'`; watchdog fire or worker `error`/`messageerror`
  or unexpected exit → terminate, respawn ONCE, retry the build; second
  failure → `failed` + `fallbackReason='crash'`.
- `params`: only when `warm`; superseded requests: later `params` calls drop
  earlier in-flight ones (revision guard); crash during params → terminate,
  one respawn + rebuild for warm... **Locked choice: a crash during `params`
  marks the source `failed` immediately** (no rebuild) — the model is
  recoverable via `warm` only on the next model open; keeps the logic small.
- `totalBudgetMs` watchdog per request → terminate + `failed` +
  `fallbackReason='timeout'`.
- `dispose`: terminate the worker, reset state.

- [ ] **Step 1: Write the failing tests** with a fake Worker class that
  implements `postMessage`/`terminate` and lets the test emit responses and
  errors. Cover: warm→params happy path; host-fs error; crash-respawn-retry
  then failed; second crash sticky failed; script watchdog fire (fake timers
  → `failed`); dispose. Use `vi.useFakeTimers()` for budgets.

- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement `browserKernelClient.ts` (~250 lines).**
- [ ] **Step 4: Run the tests + typecheck.**
- [ ] **Step 5: Commit** `feat(studio): browser kernel client with warm/params lifecycle`.

---

### Task 9: Route Studio param edits to the worker

**Files:**
- Modify: `src/studio/context/geometry/paramEditsForMesh.ts` (worker branch)
- Modify: `src/studio/context/geometry/useMeshFetch.ts` (warm on open; merge worker results)
- Create: `src/studio/kernel/flag.ts` (`browserKernelEnabled()`, `browserKernelForce()`)
- Test: `src/studio/context/geometry/paramEditsForMesh.worker.test.ts`, `src/studio/kernel/flag.test.ts`

**Flag:**
- `browserKernelEnabled(): 'off' | 'auto' | 'force'` from
  `import.meta.env.VITE_STUDIO_BROWSER_KERNEL ?? 'off'`, with `?kernel=` query
  override (`off|force`).
- `auto` gate: `shouldUseHostedMesh()` && `typeof WebAssembly !== 'undefined'`
  && `!isSafariIos()` && `!(navigator.deviceMemory && navigator.deviceMemory < 4)`.

**Routing:**
- `meshParamEdits(code, edits)`: when a browser kernel singleton exists and
  `status() === 'warm'` and the source matches → `kernel.params(...)` →
  decode/merge (Task 5 path) → return a `BackendMeshPayload`-shaped result;
  otherwise the existing server flow (with `have` fingerprints when held).
- `useMeshFetch` hosted branch: when `browserKernelEnabled() !== 'off'`, on
  model open kick `kernel.warm(source, fileName)` after the precompute paints
  (defer until `document.visibilityState === 'visible'`); on source change call
  `kernel.dispose()` + re-warm.
- Server-only precheck before warming: `/\blib\s*\.\s*from(ST|EP)\b/` or a
  literal relative import in the source → skip warm (server path stays).

- [ ] **Step 1: Write the failing tests**
  1. `browserKernelEnabled` matrix (env × query × capability) — pure function
     with injected env, no DOM guards needed beyond `navigator`/`document`
     stubs.
  2. `meshParamEdits` routes to the kernel when a fake kernel is `warm` and the
     fetch mock is never called; falls back to `meshSourceHosted` when the
     kernel is `failed`; coalescing still applies (submit twice, one trailing).
  3. A `host-fs-unavailable` worker error flips to the server path for the same
     source (assert one kernel attempt, then a server call).
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests + typecheck.**
- [ ] **Step 5: Commit** `feat(studio): route param edits to the browser kernel when warm`.

---

### Task 10: Embed build exclusion

**Files:**
- Modify: `vite.studio.config.ts` (or the embed build's plugin set)
- Test: `src/studio/kernel/embedExclusion.test.ts`

- [ ] **Step 1: Write the failing test**

Follow the existing embed-strip plugin test pattern (a test that runs the
built embed bundle paths or asserts the plugin transform):
assert the embed build's transform removes any
`new Worker(new URL('./kernel/studioKernelWorker.ts'...))` spawn (or asserts
the kernel client module is only reached through a dynamic `import()` guarded
by `browserKernelEnabled() !== 'off'`), so the ~11 MB worker chunk cannot
enter the embed bundle.

- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement the exclusion** (extend the existing strip plugin's
  regex set, or ensure the client is only imported from a dynamic import site
  inside the flag check).
- [ ] **Step 4: Run the test + `npm run build:studio`** (the studio lib build
  must succeed and must not emit the worker chunk).
- [ ] **Step 5: Commit** `build(studio): keep the kernel worker out of the embed bundle`.

---

### Task 11: Telemetry

**Files:**
- Modify: `src/studio/kernel/browserKernelClient.ts` (emit events)
- Test: extend `browserKernelClient.test.ts`

Events (through the existing telemetry module — find its client API by
grepping `track(` or `telemetry` in `src/studio`): `studio_kernel_init` (ms),
`studio_kernel_build` (ms, featureCount), `studio_kernel_params` (ms, patch
bytes, full bytes when known), `studio_kernel_fallback` (reason). No payload
content, no source text — just timings and sizes.

- [ ] **Step 1: Write the failing tests** (inject a fake telemetry sink into
  `createBrowserKernel` opts; assert one event per transition with the required
  fields).
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.**
- [ ] **Step 5: Commit** `feat(studio): kernel telemetry for init/build/params/fallback`.

---

### Task 12: E2E, docs, demo, perf record

**Files:**
- Create: `tests/e2e/browserKernel.spec.ts` (Playwright; follow existing specs' server-stub pattern)
- Modify: `docs/` user-facing material that describes gallery param editing (find the current gallery/studio docs page)
- Create: `docs/superpowers/plans/artifacts/2026-10-18-browser-kernel/` (perf record + demo)

- [ ] **Step 1: Playwright E2E**

Scenario A (worker path): open `/studio?gallery=hand-coffee-grinder` against
the local app build with `VITE_STUDIO_BROWSER_KERNEL=force`; wait for the
precompute paint; edit a param through the Params tab; assert the geometry
updates while the network log shows **zero** `/__kernelcad/mesh` POSTs.
Scenario B (fallback): force `?kernel=off`; same edit completes via the
server stub.

Run: `npx playwright test tests/e2e/browserKernel.spec.ts`
Expected: PASS. (If the dev-only worker spawn cannot run under Playwright's
chromium for `force` on localhost, gate the spawn on `force` ignoring the
hosted check — and record that decision in the test.)

- [ ] **Step 2: Perf record**

Run the local measurement script (write a small
`scripts/measure-browser-kernel.ts` Playwright driver that logs wasm init,
warm build, and 5 consecutive param edit times + bytes for the coffee
grinder), commit the output to the artifacts folder with the date and machine.
Expected numbers to report (no fake pass/fail): init, warm ms, edit ms/bytes
before vs after.

- [ ] **Step 3: Demo MP4** per repo discipline (short clip of a param drag on
  the coffee grinder running locally in the worker), stored in the artifacts
  folder and linked from the plan's artifacts README.

- [ ] **Step 4: Docs** — update the gallery/studio docs describing that edits
  now run in-browser where supported and that the server path is the fallback.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/browserKernel.spec.ts docs/ scripts/measure-browser-kernel.ts "docs/superpowers/plans/artifacts/2026-10-18-browser-kernel"
git commit -m "test(studio): browser kernel e2e + perf record + demo"
```

---

## Self-review (completed by the plan author)

- **Spec coverage:** 0a → Tasks 1-2; 0b → Tasks 3-4; 0c → Task 5; 0d → Task 6;
  1 worker → Task 7; client lifecycle → Task 8; routing/flags → Task 9;
  embed exclusion → Task 10; telemetry → Task 11; testing/demo/perf → Task 12;
  server negotiation (PR B) → explicitly deferred to a follow-up plan (repo
  sequencing; the spec's "Sequencing" section says the same).
- **Placeholders:** the only deliberately sketched code (Task 7 test call
  flow) locks its final form ("Locked choice: `handle` returns
  `KernelResponse[]`") and instructs the removal of the stub lines; every
  other task has a complete interface + acceptance tests.
- **Type consistency:** `FeatureMeshSerializedInput`,
  `MeshBinaryTrailer`, `ParamEditValues`, `MeshMergeState`, `KernelRequest/
  Response`, `BrowserKernel` are defined once and referenced identically in
  later tasks.
