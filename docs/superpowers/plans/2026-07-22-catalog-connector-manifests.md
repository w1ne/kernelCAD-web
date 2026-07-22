# Catalog Connector Manifests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve source-authored, physically meaningful connector frames from universal KernelCAD components through catalog ingestion and remote `fetch_part`.

**Architecture:** Keep `ConnectorManifest` v1 as the local authoring-sidecar contract. Add a strictly validated `HashBoundConnectorManifest` to bind remote interfaces to exact exported STEP bytes. Existing parts without a manifest retain generic STEP-derived connectors; records that advertise a bad manifest fail instead of silently degrading.

**Tech Stack:** TypeScript, Vitest, Node `crypto`/filesystem, KernelCAD capture `Scene`, OCCT STEP export, Cloudflare-compatible catalog JSON.

---

## File map

- `src/shared/parts/connectorManifest.ts` — Node-only local-sidecar loader and public re-exports.
- `src/shared/parts/connectorManifestSchema.ts` — browser-safe manifest schema and validation used by catalog metadata.
- `src/shared/parts/connectorManifest.test.ts` — manifest contract regression coverage.
- `src/shared/parts/types.ts` — canonical remote `PartRecord` transport field.
- `src/modeling/parts/stepPartsAdapter.ts` — raw remote JSON to canonical record mapping.
- `src/modeling/parts/stepPartsAdapter.test.ts` — mapped-manifest regression coverage.
- `scripts/ingestParts.ts` and `scripts/ingestParts.test.ts` — bind an authored sidecar to emitted STEP bytes.
- `src/modeling/parts/fetchPart.ts` and `src/modeling/parts/fetchPartMetadata.test.ts` — attach verified manifest frames before generic synthesis.
- `src/modeling/capture/captureSession.ts` — typed, verified catalog-interface store keyed by fetched Shape id.
- `src/modeling/capture/assembly.ts` and `src/modeling/capture/assembly.catalogConnectors.test.ts` — promote factual catalog interfaces into both assembly mating APIs.
- `src/agent/script-runtime/connectorManifestExport.ts` and `.test.ts` — convert numeric authored `Scene` connectors into a portable sidecar.
- `src/agent/script-runtime/export.ts` — request and return a sidecar during STEP export.
- `src/agent/cli/commands/export.ts` — expose the sidecar write path as CLI options.
- `scripts/ingestElectronics.ts` and `scripts/ingestElectronics.test.ts` — request a sidecar for `kcad_source` parts.
- `scripts/parts/authored/a4988-stepstick-carrier.kcad.ts` and `sg90-micro-servo.kcad.ts` — universal model interfaces only.
- `scripts/electronics-parts.json` — catalog records for the two authored universal components.

### Task 1: Define and transport a hash-bound remote manifest

**Files:**
- Modify: `src/shared/parts/connectorManifest.ts`
- Create: `src/shared/parts/connectorManifestSchema.ts`
- Modify: `src/shared/parts/connectorManifest.test.ts`
- Modify: `src/shared/parts/types.ts`
- Modify: `src/modeling/parts/stepPartsAdapter.ts`
- Modify: `src/modeling/parts/stepPartsAdapter.test.ts`

- [x] **Step 1: Write the failing mapper test**

Append this fixture and assertion to `src/modeling/parts/stepPartsAdapter.test.ts`:

```ts
it('preserves a valid hash-bound authored manifest and exposes its names', () => {
  const raw: StepPartsRecord = {
    ...REAL,
    connectorManifest: {
      schemaVersion: 1,
      partId: REAL.id,
      family: REAL.family,
      geometrySha256: REAL.sha256!,
      connectors: [{
        name: 'driver-step', type: 'frame', origin: [1, 2, 3], normal: [0, 0, 1],
      }],
    },
  };
  const mapped = mapStepPartsRecord(raw);
  expect(mapped.connectorManifest).toEqual(raw.connectorManifest);
  expect(mapped.connectors).toEqual(['driver-step']);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/modeling/parts/stepPartsAdapter.test.ts`

Expected: the new assertion fails because `connectorManifest` does not exist on `PartRecord` and the mapper returns `connectors: []`.

- [x] **Step 3: Write the failing validation test**

Append this test to `src/shared/parts/connectorManifest.test.ts`:

```ts
it('rejects a hash-bound manifest whose expected STEP hash differs', () => {
  const m = {
    schemaVersion: 1 as const,
    partId: 'carrier', family: 'stepper-driver',
    geometrySha256: 'a'.repeat(64),
    connectors: [{ name: 'solder-face', type: 'frame' as const, origin: [0, 0, 0] as [number, number, number], normal: [0, 0, -1] as [number, number, number] }],
  };
  expect(() => validateHashBoundConnectorManifest(m, {
    partId: 'carrier', family: 'stepper-driver', geometrySha256: 'b'.repeat(64),
  })).toThrow(/geometrySha256/);
});
```

- [x] **Step 4: Run the validation test and verify RED**

Run: `npx vitest run src/shared/parts/connectorManifest.test.ts`

Expected: import failure because `validateHashBoundConnectorManifest` is not exported.

- [x] **Step 5: Implement the minimal shared contract**

Put the bound type and strict browser-safe helper in `src/shared/parts/connectorManifestSchema.ts`, retaining `connectorManifest.ts` as the Node-only bundled-sidecar loader/re-export:

```ts
export interface HashBoundConnectorManifest extends ConnectorManifest {
  geometrySha256: string;
}

export function validateHashBoundConnectorManifest(
  manifest: HashBoundConnectorManifest,
  expected: { partId: string; family: string; geometrySha256: string },
): void {
  validateConnectorManifest(manifest);
  if (!/^[0-9a-f]{64}$/.test(manifest.geometrySha256)) {
    throw new Error('manifest: geometrySha256 must be lowercase 64-character hex');
  }
  if (manifest.partId !== expected.partId) throw new Error('manifest: partId does not match catalog record');
  if (manifest.family !== expected.family) throw new Error('manifest: family does not match catalog record');
  if (manifest.geometrySha256 !== expected.geometrySha256) {
    throw new Error('manifest: geometrySha256 does not match catalog record');
  }
}
```

Also make `validateConnectorManifest` reject duplicate names, non-finite three-vectors, and a zero frame normal or axis before the new helper invokes it.

- [x] **Step 6: Add canonical record fields and mapper behavior**

Import `HashBoundConnectorManifest` into `src/shared/parts/types.ts` and add:

```ts
connectorManifest?: HashBoundConnectorManifest;
```

to `PartRecord` and `CatalogPartMetadata`; preserve it in `snapshotCatalogPart`. Update `isPartRecord` to call `validateHashBoundConnectorManifest` when that optional field is present and return `false` on validation failure. In `src/modeling/parts/stepPartsAdapter.ts`, declare the optional raw field as `unknown`, require a lowercase 64-hex SHA on every manifest-bearing raw record, and validate it against `raw.id`, `raw.family`, and that exact SHA before building the record as:

```ts
const connectorManifest = raw.connectorManifest;
if (connectorManifest !== undefined) {
  if (typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.sha256)) {
    throw new Error('step.parts: connectorManifest requires a lowercase record sha256');
  }
  validateHashBoundConnectorManifest(connectorManifest, {
    partId: raw.id, family: raw.family, geometrySha256: raw.sha256,
  });
}
const record: PartRecord = {
  // existing fields
  connectors: connectorManifest?.connectors.map((connector) => connector.name) ?? [],
  ...(connectorManifest === undefined ? {} : { connectorManifest }),
};
```

- [x] **Step 7: Run the focused contract suite and verify GREEN**

Run: `npx vitest run src/shared/parts/connectorManifest.test.ts src/modeling/parts/stepPartsAdapter.test.ts`

Expected: both files pass; no-manifest adapter fixtures still produce an empty connector list.

- [x] **Step 8: Commit the transport slice**

```bash
git add src/shared/parts/connectorManifest.ts src/shared/parts/connectorManifestSchema.ts src/shared/parts/connectorManifest.test.ts src/shared/parts/types.ts src/modeling/parts/stepPartsAdapter.ts src/modeling/parts/stepPartsAdapter.test.ts src/modeling/parts/remoteClient.ts
git commit -m "feat(catalog): transport hash-bound connector manifests"
```

### Task 2: Bind authoring sidecars during STEP ingestion

**Files:**
- Modify: `scripts/ingestParts.ts`
- Modify: `scripts/ingestParts.test.ts`

- [x] **Step 1: Write the failing ingestion test**

Create a fixture `.meta.json` with an unbound manifest and assert the record uses the emitted STEP digest:

```ts
expect(record.connectorManifest).toMatchObject({
  partId: 'fixture-part', family: 'fixture-family',
  geometrySha256: record.sha256,
  connectors: [{ name: 'carrier-solder-face', type: 'frame' }],
});
expect(record.connectors).toEqual(['carrier-solder-face']);
```

Also retain the current no-sidecar-manifest assertion that generic connector synthesis creates the prior `mating-face` name.

- [x] **Step 2: Run the ingestion test and verify RED**

Run: `npx vitest run scripts/ingestParts.test.ts`

Expected: `connectorManifest` is absent and generic names are returned even with a supplied authored sidecar.

- [x] **Step 3: Add a raw sidecar field and validate/bind it**

Add `connectorManifest?: ConnectorManifest` to `IngestSidecar`, and `connectorManifest?: HashBoundConnectorManifest` to `CatalogRecord`. Define an `AuthoredManifestError` subclass and rethrow it from `ingestDirectory` rather than recording it in `skipped.json`; bad authored interface data must stop that catalog release. After computing `sha256`, use:

```ts
let connectorManifest: HashBoundConnectorManifest | undefined;
if (meta.connectorManifest !== undefined) {
  validateConnectorManifest(meta.connectorManifest);
  if (meta.connectorManifest.partId !== id || meta.connectorManifest.family !== family) {
    throw new Error(`ingest: manifest identity does not match ${id}/${family}`);
  }
  connectorManifest = { ...meta.connectorManifest, geometrySha256: sha256 };
}
```

Select connector output with:

```ts
connectors: connectorManifest === undefined
  ? conns.map((c) => ({ name: c.name, origin: c.origin, axis: c.axis }))
  : connectorManifest.connectors.map((c) => ({
      name: c.name, origin: c.origin,
      axis: c.type === 'axis' ? c.axis : c.normal,
    })),
...(connectorManifest === undefined ? {} : { connectorManifest }),
```

- [x] **Step 4: Run the ingestion test and verify GREEN**

Run: `npx vitest run scripts/ingestParts.test.ts`

Expected: manifest names replace generic names only for the authored fixture and carry the exact computed hash.

- [x] **Step 5: Commit the ingest slice**

```bash
git add scripts/ingestParts.ts scripts/ingestParts.test.ts
git commit -m "feat(catalog): bind authored interfaces to STEP bytes"
```

Implementation hardening accepted during review: ingestion independently hashes the copied
`out/step/<id>.step` in its regression, rejects malformed JSON/manifest data as an
`AuthoredManifestError`, and preflights all resolved catalog IDs before creating output
directories. The resolver rejects non-string sidecar IDs and duplicate derived or explicit
IDs, preventing a later STEP from overwriting bytes described by an earlier bound manifest.

### Task 3: Consume verified manifests during remote fetch

**Files:**
- Modify: `src/modeling/parts/fetchPart.ts`
- Modify: `src/modeling/parts/fetchPartMetadata.test.ts`
- Modify: `src/modeling/capture/captureSession.ts`

- [x] **Step 1: Write the failing remote-fetch tests**

Mock a remote record that advertises a valid hash-bound `pwm-contact` manifest, then assert:

```ts
expect(session.catalogConnectors.get(shape.id)).toEqual([{
  name: 'pwm-contact', type: 'frame', origin: [1, 2, 3], normal: [1, 0, 0],
}]);
expect(session.autoConnectors.get(shape.id)).toEqual(expect.arrayContaining([
  expect.objectContaining({ name: 'pwm-contact', origin: [1, 2, 3], axis: [1, 0, 0] }),
]));
expect(synthesizeConnectorsFromReport).not.toHaveBeenCalled();
```

Add a second case whose manifest hash differs from `meta.sha256` and expect `fetchPartHost` to reject with `geometrySha256` rather than calling synthesis.

- [x] **Step 2: Run the remote-fetch tests and verify RED**

Run: `npx vitest run src/modeling/parts/fetchPartMetadata.test.ts`

Expected: the valid-manifest case receives generic generated frames or none; the mismatch does not reject.

- [x] **Step 3: Extract a strict attachment helper**

Keep the legacy `AutoConnector` cache unchanged for discovery compatibility. Replace the local sidecar-only conversion with a typed catalog attachment plus the existing lossy auto-connector attachment:

```ts
function attachManifestConnectors(
  ctx: FetchPartCtx,
  shape: Shape,
  manifest: ConnectorManifest,
): string[] {
  ctx.session.attachCatalogConnectors(shape.id, manifest.connectors);
  const conns = manifest.connectors.map((c) => ({
    name: c.name,
    ref: formatTopoRef({ owner: shape.id, kind: 'connector', segments: [c.name] }),
    origin: c.origin,
    axis: c.type === 'axis' ? c.axis : c.normal,
    type: 'frame' as const,
  }));
  ctx.session.attachAutoConnectors(shape.id, conns);
  return conns.map((connector) => connector.name);
}
```

This task owns the typed prerequisite as well: add `catalogConnectors` and
`attachCatalogConnectors()` to `CaptureSession` before the fetch helper calls it. Store an
immutable copy of the already validated entries; do not treat the lossy `autoConnectors`
projection as the factual interface source.

Keep bundled sidecar attachment best-effort by loading and validating v1 inside its current `try/catch`. For remote data, after `getOrFetchAsync` and before `inspectStepFile`, execute:

```ts
if (meta.connectorManifest !== undefined) {
  validateHashBoundConnectorManifest(meta.connectorManifest, {
    partId: meta.id, family: meta.family, geometrySha256: meta.sha256,
  });
  const connectors = attachManifestConnectors(ctx, shape, meta.connectorManifest);
  record = { ...record, connectors };
} else {
  // existing inspectStepFile + synthesizeConnectorsFromReport fallback
}
```

The production branch must validate against a fresh SHA-256 of the raw bytes returned
from the cache, not only the metadata digest passed into cache lookup. Keep that logic in
a small helper used immediately before `fromStepBytes`, with a direct differing-bytes
regression so the post-cache integrity check is covered independently of adapter validation.

- [x] **Step 4: Run remote-fetch tests and verify GREEN**

Run: `npx vitest run src/modeling/parts/fetchPartMetadata.test.ts`

Expected: exact authored frames attach, mismatch rejects, and existing no-manifest metadata tests retain the generic path.

- [x] **Step 5: Commit the remote-fetch slice**

```bash
git add src/modeling/parts/fetchPart.ts src/modeling/parts/fetchPartMetadata.test.ts src/modeling/capture/captureSession.ts
git commit -m "feat(catalog): attach verified authored interfaces"
```

### Task 4: Promote factual catalog interfaces into assembly mating

**Files:**
- Modify: `src/modeling/capture/assembly.ts`
- Create: `src/modeling/capture/assembly.catalogConnectors.test.ts`

- [ ] **Step 1: Write the failing assembly-promotion tests**

Create a `CaptureSession`, attach a factual connector to a box before it enters an assembly, then assert that it is usable by both connector APIs:

```ts
const source = kcad.box(4, 4, 2);
session.attachCatalogConnectors(source.id, [{
  name: 'pwm-contact', type: 'frame', origin: [4, 2, 1], normal: [1, 0, 0],
}]);
const part = arm.part('servo', source);
expect(part.connector('pwm-contact')).toMatchObject({ partName: 'servo', connector: 'pwm-contact' });
expect(part.mateConnectors).toContainEqual(expect.objectContaining({ name: 'pwm-contact', type: 'frame' }));
```

Add a second assertion that `arm.mate('signal', 'servo.pwm-contact', 'socket.signal', 'fastened')` resolves after a normal explicit `socket.signal` frame is declared. Add a third test that stores only a legacy `session.attachAutoConnectors(... 'mating-face' ...)` value and confirms it is not promoted. Add a rigid-transform test that calls `source.translate(10, 0, 0).rotateZ(90)` before `assembly.part()` and expects the promoted origin/direction to be transformed. Add scale, reflection, and ParamRef-transform tests that reject rather than silently desynchronizing a physical interface. Finally import the catalog part through `subAssembly()` and assert its interfaces are neither duplicated nor rejected.

- [ ] **Step 2: Run the assembly-promotion tests and verify RED**

Run: `npx vitest run src/modeling/capture/assembly.catalogConnectors.test.ts`

Expected: `part.connector('pwm-contact')` throws because the auto-connector cache is not currently merged into assembly connectors.

- [ ] **Step 3: Add typed authored-interface promotion**

In `Assembly.part`, read `session.catalogConnectors.get(shape.id)`, validate each exact `ConnectorEntry`, and apply the feature record's rigid transforms in declared order. For a translate use `Transform.translation(...)`; for a rotation use `Transform.rotationAroundPivot(...)`; compose each new transform to the left of the previous total. Reject `scale` and `reflect` for a catalog-attached Shape. Merge the result before `resolvePartPlacement`:

```ts
for (const connector of transformedCatalogConnectors) {
  if (connectors[connector.name] !== undefined) {
    throw new KernelError('feature.invalid-args', `assembly connector '${connector.name}' is declared both by the catalog part and assembly.part options.`, shape.id);
  }
  connectors[connector.name] = {
    origin: toVec3Param(connector.origin, 'mm'),
    axis: toVec3Param(connector.type === 'axis' ? connector.axis : connector.normal, 'unitless'),
  };
}
const mateConnectors: Connector[] = [];
```

Pass the populated `connectors` map and empty `mateConnectors` array to `session.assemblyPart` / `makePartRef`. Immediately after the part ref is built, register each transformed entry through the existing validator path:

```ts
for (const connector of transformedCatalogConnectors) {
  part.connector(connector.name, {
    type: connector.type,
    origin: { kind: 'vec3', value: connector.origin },
    ...(connector.type === 'axis' ? { axis: connector.axis } : { normal: connector.normal }),
  });
}
```

Do not read or promote the legacy generic `autoConnectors` map.

Keep catalog-interface promotion private to the first direct `assembly.part()` call. The
`subAssembly()` copy path already brings forward promoted legacy and mate-style connectors;
route it through an internal no-repromotion path so an imported subassembly cannot create
duplicate names or entries.

- [ ] **Step 4: Run the assembly-promotion tests and verify GREEN**

Run: `npx vitest run src/modeling/capture/assembly.catalogConnectors.test.ts src/modeling/capture/assembly.chaining.test.ts tests/integration/parts/partsAutoConnectors.test.ts`

Expected: factual catalog frames work in `connector()` and `mate()`, while generic synthesized frames retain their existing non-mating behavior.

- [ ] **Step 5: Commit the assembly bridge**

```bash
git add src/modeling/capture/assembly.ts src/modeling/capture/assembly.catalogConnectors.test.ts
git commit -m "feat(assembly): promote authored catalog interfaces"
```

### Task 5: Export numeric authored Scene connectors without copying coordinates

**Files:**
- Create: `src/agent/script-runtime/connectorManifestExport.ts`
- Create: `src/agent/script-runtime/connectorManifestExport.test.ts`
- Modify: `src/agent/script-runtime/export.ts`
- Modify: `src/agent/cli/commands/export.ts`

- [ ] **Step 1: Write the failing pure-helper tests**

Run a real `assembly.part(..., { at: [10, 20, 30] })` fixture through `runScript` and `RecomputeEngine`, then assert that the capture Scene and lowerer differ in the intended way and the extracted manifest follows the STEP frame:

```ts
expect(loweredPart.worldTransform.point([1, 1, 1])).toEqual([1, 1, 1]);
expect(sceneToConnectorManifest(scene, loweredScene, run.records, { partId: 'servo', family: 'micro-servo' }))
  .toMatchObject({
    partId: 'servo', family: 'micro-servo',
    connectors: [{ name: 'pwm-contact', type: 'frame', origin: [11, 21, 31], normal: [1, 0, 0] }],
  });
```

Also assert `sceneToWorldFrameParts(loweredScene)[0].shape.boundingBox().min` is `[10, 20, 30]`, proving the geometry and manifest use the same placement. Add cases that reject duplicate names, a topology origin, `planar`, `ball`, mates, and joint-driven source records.

- [ ] **Step 2: Run helper tests and verify RED**

Run: `npx vitest run src/agent/script-runtime/connectorManifestExport.test.ts`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the pure extractor**

Create `sceneToConnectorManifest` using the recomputed `SceneBackend`, the direct `assemblyPart` records, and the existing `Transform.point` and `Transform.axisDir` APIs. For each capture Scene part, find one matching `SceneBackend` part and one `assemblyPart` FeatureRecord by unique part name. Decode `metadata.at` from its evaluated `Vec3Param` values. The exact transform used by STEP export is:

```ts
const transform = backendPart.worldTransform.compose(
  Transform.translation(at.x.evaluated, at.y.evaluated, at.z.evaluated),
);
```

The helper signature and core loop are:

```ts
export function sceneToConnectorManifest(
  scene: Scene,
  lowered: SceneBackend,
  records: readonly FeatureRecord[],
  identity: { partId: string; family: string },
): ConnectorManifest {
  if ((scene.mates?.length ?? 0) > 0 || records.some((record) => record.kind === 'assemblyJoint')) {
    throw new Error('connector-manifest export requires a mate-free, joint-free assembly');
  }
  const connectors: ConnectorEntry[] = [];
  const names = new Set<string>();
  for (const part of scene.parts) for (const connector of part.connectors ?? []) {
    const backendPart = singleByName(lowered.parts, part.name, 'lowered scene part');
    const assemblyPart = singleByName(assemblyPartRecords(records), part.name, 'assembly part record');
    const at = readAssemblyPartAt(assemblyPart);
    const transform = backendPart.worldTransform.compose(Transform.translation(at[0], at[1], at[2]));
    if (connector.type !== 'frame' && connector.type !== 'axis') throw new Error(...);
    if (connector.origin.kind !== 'vec3') throw new Error(...);
    if (names.has(connector.name)) throw new Error(...);
    names.add(connector.name);
    const origin = tuple(transform.point(connector.origin.value));
    const direction = tuple(transform.axisDir(
      connector.type === 'axis' ? connector.axis ?? [0, 0, 1] : connector.normal ?? [0, 0, 1],
    ));
    connectors.push(connector.type === 'axis'
      ? { name: connector.name, type: 'axis', origin, axis: direction }
      : { name: connector.name, type: 'frame', origin, normal: direction });
  }
  const manifest = { schemaVersion: 1, ...identity, connectors } as const;
  validateConnectorManifest(manifest);
  return manifest;
}
```

- [ ] **Step 4: Thread an optional manifest request through export and CLI**

Add `connectorManifest?: { partId: string; family: string }` to runtime `ExportInput` and `connectorManifest?: ConnectorManifest` to `ExportResult`. If requested, require `format === 'step'`, a returned `Scene`, and the same successful lowered `SceneBackend` used by `exportSceneToSTEPAsync`; call `sceneToConnectorManifest(scene, lowered, run.records, identity)` and include it in the successful result.

Add CLI options:

```ts
.option('--connector-manifest <path>', 'write numeric authored connector manifest beside a STEP export')
.option('--manifest-part-id <id>', 'catalog part id for --connector-manifest')
.option('--manifest-family <family>', 'catalog family for --connector-manifest')
```

Require all three options together, write the returned manifest JSON with the existing file-write diagnostic path, and reject their use with formats other than `step`.

- [ ] **Step 5: Run helper and focused CLI tests and verify GREEN**

Run: `npx vitest run src/agent/script-runtime/connectorManifestExport.test.ts src/agent/mcp/tools/export.test.ts`

Expected: transformed numeric frames are stable, unsupported connectors reject, and existing export behavior remains unchanged.

- [ ] **Step 6: Commit the export slice**

```bash
git add src/agent/script-runtime/connectorManifestExport.ts src/agent/script-runtime/connectorManifestExport.test.ts src/agent/script-runtime/export.ts src/agent/cli/commands/export.ts
git commit -m "feat(export): emit authored connector manifests"
```

### Task 6: Request manifests for authored electronics catalog parts

**Files:**
- Modify: `scripts/ingestElectronics.ts`
- Create: `scripts/ingestElectronics.test.ts`

- [ ] **Step 1: Write the failing command-construction test**

Extract a pure helper and test its exact command line:

```ts
expect(authoredExportArgs('/repo/dist/cli/index.js', '/repo/part.kcad.ts', '/tmp/part.step', '/tmp/part.manifest.json', {
  id: 'a4988-stepstick-carrier', family: 'stepper-driver',
})).toEqual([
  '/repo/dist/cli/index.js', 'export', 'step', '/repo/part.kcad.ts', '-o', '/tmp/part.step',
  '--connector-manifest', '/tmp/part.manifest.json',
  '--manifest-part-id', 'a4988-stepstick-carrier', '--manifest-family', 'stepper-driver',
]);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run scripts/ingestElectronics.test.ts`

Expected: module export is missing.

- [ ] **Step 3: Implement command construction and sidecar transfer**

For each `kcad_source`, set `manifestOut = join(src, `${part.id}.connector-manifest.json`)`, pass the helper output to `execFileSync`, require that the command created this file, parse it as a `ConnectorManifest`, and include it in the generated `<id>.meta.json`:

```ts
connectorManifest: loadConnectorManifest(manifestOut),
```

Do not add a manifest for downloaded third-party STEP files.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npx vitest run scripts/ingestElectronics.test.ts scripts/ingestParts.test.ts`

Expected: authored commands request the sidecar, and ingestion binds it to the final STEP hash.

- [ ] **Step 5: Commit the electronics ingest slice**

```bash
git add scripts/ingestElectronics.ts scripts/ingestElectronics.test.ts
git commit -m "feat(catalog): preserve authored electronics interfaces"
```

### Task 7: Add universal A4988 and SG90 catalog components

**Files:**
- Create: `scripts/parts/authored/a4988-stepstick-carrier.kcad.ts`
- Create: `scripts/parts/authored/sg90-micro-servo.kcad.ts`
- Modify: `scripts/electronics-parts.json`
- Create: `scripts/universalElectronicsParts.test.ts`

- [ ] **Step 1: Write source-level factual-interface tests**

Assert that A4988 declares `carrier-solder-face`, `en-contact`, `step-contact`, `dir-contact`, `vmot-contact`, and its other actual plated-hole contacts; assert that SG90 declares `ground-contact`, `vplus-contact`, `pwm-contact`, and `output-axis-envelope`; assert neither source declares `mount-hole`, `universal-spline`, `x-motor`, or `y-motor`.

- [ ] **Step 2: Run the source tests and verify RED**

Run: `npx vitest run scripts/universalElectronicsParts.test.ts`

Expected: missing sources/records or missing connector declarations.

- [ ] **Step 3: Model interfaces on real modeled solids**

For A4988, call `.connector()` on the PCB/actual pad parts with:

```ts
pcbRef.connector('carrier-solder-face', {
  type: 'frame', origin: { kind: 'vec3', value: [PCB_X / 2, PCB_Y / 2, 0] }, normal: [0, 0, -1],
});
padRef.connector(`${pin.name}-contact`, {
  type: 'frame', origin: { kind: 'vec3', value: [pin.x, pin.y, PCB_T + 0.08] }, normal: [0, 0, 1],
});
```

For SG90, attach the cable contacts to their modeled contact faces and declare only an envelope axis:

```ts
housingRef.connector('pwm-contact', {
  type: 'frame', origin: { kind: 'vec3', value: [cableHousingX + 2.64, pwmY, leadZ] }, normal: [1, 0, 0],
});
housingRef.connector('output-axis-envelope', {
  type: 'axis', origin: { kind: 'vec3', value: [OUTPUT_X, OUTPUT_Y, CASE_H + BOSS_H] }, axis: [0, 0, 1],
});
```

Add each part to `scripts/electronics-parts.json` using its real manufacturer/source attribution and `kcad_source`; do not add fixture-only board, power, mounting, or project-specific fields.

- [ ] **Step 4: Run source tests and a narrow catalog export test**

Run: `npx vitest run scripts/universalElectronicsParts.test.ts`

Expected: factual interface declarations pass source-level coverage. If disk headroom is at least 1 GiB, run `npx tsx scripts/ingestElectronics.ts <fresh-temp-out> --manifest scripts/electronics-parts.json`; otherwise defer the generated catalog export to CI.

- [ ] **Step 5: Commit universal component sources**

```bash
git add scripts/parts/authored/a4988-stepstick-carrier.kcad.ts scripts/parts/authored/sg90-micro-servo.kcad.ts scripts/electronics-parts.json scripts/universalElectronicsParts.test.ts
git commit -m "feat(catalog): add universal motor-control components"
```

### Task 8: Verify, review, publish, and only then use components in projects

**Files:**
- Verify: files modified in Tasks 1–6

- [ ] **Step 1: Check the exact change set**

Run: `git diff origin/develop...HEAD --check`

Expected: no whitespace errors and no changes outside the manifest pipeline, universal parts, and their tests.

- [ ] **Step 2: Run focused tests without the artifact-generating `pretest` hook**

Run: `npx vitest run src/shared/parts/connectorManifest.test.ts src/modeling/parts/stepPartsAdapter.test.ts scripts/ingestParts.test.ts src/modeling/parts/fetchPart.test.ts src/modeling/parts/fetchPartMetadata.test.ts src/modeling/capture/assembly.catalogConnectors.test.ts src/agent/script-runtime/connectorManifestExport.test.ts scripts/ingestElectronics.test.ts scripts/universalElectronicsParts.test.ts`

Expected: all listed focused suites pass.

- [ ] **Step 3: Run type verification if disk capacity permits**

Run: `npm run typecheck`

Expected: exit code 0. If free disk remains below 1 GiB, do not create build artifacts locally; push the tested branch and use required remote CI for the full type/build gate.

- [ ] **Step 4: Perform two reviews**

First review against this plan: no manual connector-coordinate copy, no generic synthesis when an authored manifest is present, no fictional universal interfaces. Second review for TypeScript/API quality and compatibility with no-manifest third-party records.

- [ ] **Step 5: Push and open a draft pull request**

```bash
git push -u origin agent/catalog-connector-manifests
```

Open a draft PR describing the fallback behavior, the strict remote integrity rule, the disk-constrained local verification, and CI evidence.

- [ ] **Step 6: Merge only after CI and catalog deployment validate the exact SHA**

Use the GitHub merge workflow after all required checks pass. Trigger/observe the catalog deployment, then fetch a deployed A4988/SG90 record through the hosted MCP and confirm the returned connector names are authored names rather than `mating-face`.

- [ ] **Step 7: Keep incomplete consumer devices unlisted**

Do not publish the Plotter or Ereader merely because their catalog parts now exist. The Plotter still needs a real mechanism graph and physical hardware decisions; the Ereader still needs the missing power/charging/programming BOM and durable LabWired evidence.
