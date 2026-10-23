// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The browser kernel worker core driven by the REAL kernel (node build of the
// same OCCT wasm). The settled mesh is compared with what the dev server's
// `/__kernelcad/mesh` route produces for the same source and params.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runScript } from '../../composition/runScript';
import { meshFeaturesPerFeature } from '../../modeling/capture/featureMeshing';
import { rehydrateFromBridge, serializeForBridge, type FeatureMeshSerialized } from '../../modeling/capture/featureMeshSerialize';
import { __setHostFsForTest } from '../../shared/runtime/hostFs';
import { createKernelDeps } from './kernelDeps';
import { featureMeshFingerprint } from './meshFingerprint';
import { createKernelWorkerCore } from './workerCore';
import type { ParamValues, RebuildJobRequest, RebuildJobResult } from './protocol';

const FIXTURE = readFileSync(new URL('../../../tests/fixtures/browser-kernel/param-arm.kcad.ts', import.meta.url), 'utf8');

const memory = { bytes: () => 0, capHit: () => false };

let nextJob = 1;
function job(params: ParamValues, extra: Partial<RebuildJobRequest> = {}): RebuildJobRequest {
  return {
    type: 'rebuild', jobId: nextJob, scope: 'test', generation: nextJob++,
    source: FIXTURE, params, quality: 'display', have: null, ...extra,
  };
}

/** The dev server's stateless mesh route for the same input. */
async function serverMesh(source: string, params: ParamValues): Promise<Map<string, string>> {
  const run = await runScript({ code: source, fileName: 'studio-edit.kcad.ts' });
  for (const [name, value] of Object.entries(params)) run.paramTable.set(name, value);
  const meshing = await meshFeaturesPerFeature(run.records, run.paramTable, run.session);
  const wire = JSON.parse(JSON.stringify(meshing.features.map(serializeForBridge))) as FeatureMeshSerialized[];
  return new Map(wire.map((f) => [f.featureId, featureMeshFingerprint(rehydrateFromBridge(f))]));
}

function shownFingerprints(features: FeatureMeshSerialized[]): Map<string, string> {
  return new Map(features.map((f) => [f.featureId, featureMeshFingerprint(rehydrateFromBridge(f))]));
}

function expectResult(reply: unknown): RebuildJobResult {
  expect((reply as { type: string }).type).toBe('result');
  return reply as RebuildJobResult;
}

describe('browser kernel worker core (real kernel)', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds, then re-sends only the features a slider edit changed, matching the server mesh', async () => {
    const core = createKernelWorkerCore(createKernelDeps(memory));
    const first = expectResult(await core.handle(job({})));
    expect(first.timings.path).toBe('full');
    expect(first.payload.changedFeatureIds).toBeUndefined();
    expect(shownFingerprints(first.payload.features)).toEqual(await serverMesh(FIXTURE, {}));

    // A pose-only edit moves the link: its transform changes, the base's does not.
    const posed = expectResult(await core.handle(job({ elbowDeg: 30 }, { have: first.fingerprints })));
    expect(posed.timings.path).toBe('incremental');
    const sent = posed.payload.features.map((f) => f.featureId);
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.length).toBeLessThan(Object.keys(first.fingerprints).length);
    expect(posed.payload.changedFeatureIds).toEqual(sent);
    const reference = await serverMesh(FIXTURE, { elbowDeg: 30 });
    expect(Object.keys(posed.fingerprints).sort()).toEqual([...reference.keys()].sort());
    for (const id of Object.keys(posed.fingerprints)) {
      expect(posed.fingerprints[id], id).toBe(reference.get(id));
    }
  });

  it('coarse drag ticks are a tessellation profile only; the settled edit is full display quality', async () => {
    const core = createKernelWorkerCore(createKernelDeps(memory));
    await core.handle(job({}));
    const drag = expectResult(await core.handle(job({ width: 55 }, { quality: 'coarse' })));
    const settled = expectResult(await core.handle(job({ width: 55 })));
    const reference = await serverMesh(FIXTURE, { width: 55 });
    expect(drag.quality).toBe('coarse');
    expect(shownFingerprints(settled.payload.features)).toEqual(reference);
    // Same solid: mesh bounds only move by the coarse chord tolerance (1 mm).
    for (const axis of [0, 1, 2]) {
      expect(Math.abs(drag.payload.bounds.min[axis] - settled.payload.bounds.min[axis])).toBeLessThanOrEqual(1);
      expect(Math.abs(drag.payload.bounds.max[axis] - settled.payload.bounds.max[axis])).toBeLessThanOrEqual(1);
    }
  });

  it('answers a repeated document from the content-keyed cache', async () => {
    const core = createKernelWorkerCore(createKernelDeps(memory));
    const a = expectResult(await core.handle(job({ elbowDeg: 10 })));
    await core.handle(job({ elbowDeg: 20 }));
    const again = expectResult(await core.handle(job({ elbowDeg: 10 })));
    expect(again.timings.path).toBe('cache');
    expect(again.fingerprints).toEqual(a.fingerprints);
  });

  it('a choice value baked into the source is a different document and rebuilds', async () => {
    const core = createKernelWorkerCore(createKernelDeps(memory));
    const matte = expectResult(await core.handle(job({})));
    const glossSource = FIXTURE.replace("param('finish', 'matte'", "param('finish', 'gloss'");
    const gloss = expectResult(await core.handle(job({}, { source: glossSource, have: matte.fingerprints })));
    expect(gloss.timings.path).toBe('full');
    expect(gloss.payload.params.finish.value).toBe('gloss');
    // The link's colour changed, so it is re-sent even though its triangles did not.
    expect(gloss.payload.changedFeatureIds?.length).toBeGreaterThan(0);
  });

  it('reports a model error as a script error and keeps working', async () => {
    const core = createKernelWorkerCore(createKernelDeps(memory));
    const broken = await core.handle(job({}, { source: "return box(1, 1, 1).nope();" }));
    expect(broken).toMatchObject({ type: 'error', code: 'script', fatal: false, firstBuild: true });
    expectResult(await core.handle(job({})));
  });

  it('refuses an out-of-range override like the server table does', async () => {
    const core = createKernelWorkerCore(createKernelDeps(memory));
    const reply = await core.handle(job({ width: 500 }));
    expect(reply).toMatchObject({ type: 'error', code: 'script' });
  });

  it('routes a model that needs the filesystem to the server', async () => {
    // The node runner imported above installs a filesystem; the worker has none.
    const hostFs = __setHostFsForTest(null);
    try {
      const core = createKernelWorkerCore(createKernelDeps(memory));
      const reply = await core.handle(job({}, { source: "return lib.fromSTEP('parts/missing.step');" }));
      expect(reply).toMatchObject({ type: 'error', code: 'server-only' });
    } finally {
      __setHostFsForTest(hostFs);
    }
  });
});
