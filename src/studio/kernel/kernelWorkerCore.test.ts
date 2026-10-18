// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/kernelWorkerCore.test.ts
//
// The core's protocol behaviors, driven through fake deps: response ordering,
// changed-only param patches (bin1 + trailer), error mapping, dispose. The
// real kernel is never touched — kernelWorkerCore exists precisely so these
// can run in node.
import { describe, expect, it } from 'vitest';
import { createKernelWorkerCore, type KernelWorkerDeps } from './kernelWorkerCore';
import type { KernelRequest, KernelResponse } from './protocol';
import {
  decodeMeshBinary,
  MESH_BIN_FLAG_PARTIAL,
  MESH_BIN_MAGIC,
} from '../../modeling/capture/featureMeshBinary';
import type { FeatureMesh } from '../../modeling/capture/featureMeshing';

type ResultResponse = Extract<KernelResponse, { type: 'result' }>;
type ErrorResponse = Extract<KernelResponse, { type: 'error' }>;

function resultOf(response: KernelResponse | undefined): ResultResponse {
  if (response?.type !== 'result') throw new Error(`expected a result response, got ${response?.type}`);
  return response;
}

function errorOf(response: KernelResponse | undefined): ErrorResponse {
  if (response?.type !== 'error') throw new Error(`expected an error response, got ${response?.type}`);
  return response;
}

/** The serialized shape the server bridge echoes back: the params map. */
class FakeParamTable {
  width = 1;
  serialize(): Record<string, unknown> {
    return { width: { name: 'width', type: 'number', value: this.width, defaultValue: 1 } };
  }
}

/** `stable#1` never moves; `mover#1` follows the width param. */
function fakeFeature(id: string, x: number): FeatureMesh {
  return {
    featureId: id,
    featureKind: 'box',
    predecessors: [],
    faces: [{
      vertices: new Float32Array([x, 0, 0, x + 1, 0, 0, x, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
      faceId: 0,
    }],
  };
}

interface FakeState {
  failRunScript?: unknown;
  failMesh?: unknown;
  failUpdateParams?: unknown;
  failedFeatureIds: string[];
}

interface FakeKernel {
  deps: KernelWorkerDeps;
  table: FakeParamTable;
  records: unknown[];
  state: FakeState;
  updateParamsCalls: unknown[];
}

function fakeKernel(): FakeKernel {
  const table = new FakeParamTable();
  const records: unknown[] = [{ id: 'stable#1', kind: 'box' }, { id: 'mover#1', kind: 'box' }];
  const state: FakeState = { failedFeatureIds: [] };
  const updateParamsCalls: unknown[] = [];
  const deps: KernelWorkerDeps = {
    async runScript() {
      if (state.failRunScript !== undefined) throw state.failRunScript;
      return { records, paramTable: table, session: { id: 'session' } };
    },
    async mesh() {
      if (state.failMesh !== undefined) throw state.failMesh;
      return {
        features: [fakeFeature('stable#1', 0), fakeFeature('mover#1', table.width)],
        bounds: { min: [0, 0, 0], max: [10, 10, 0] },
        failedFeatureIds: state.failedFeatureIds,
      };
    },
    async updateParams(model, edits) {
      if (state.failUpdateParams !== undefined) throw state.failUpdateParams;
      updateParamsCalls.push(model);
      for (const edit of edits) {
        if (edit.name === 'width' && typeof edit.value === 'number') table.width = edit.value;
      }
      return { model: { records, paramTable: table, session: { id: 'session' } } };
    },
  };
  return { deps, table, records, state, updateParamsCalls };
}

function build(id: number): KernelRequest {
  return { v: 1, id, type: 'build', source: 'box(10)', fileName: 'studio.kcad.ts' };
}

function params(
  id: number,
  edits: Array<{ name: string; value: number | boolean }>,
  have?: Record<string, string>,
): KernelRequest {
  return { v: 1, id, type: 'params', edits, ...(have !== undefined ? { have } : {}) };
}

function dispose(id: number): KernelRequest {
  return { v: 1, id, type: 'dispose' };
}

/** The fingerprint map a client would hold after painting `payload`. */
function haveFrom(payload: Uint8Array): Record<string, string> {
  const have: Record<string, string> = {};
  for (const feature of decodeMeshBinary(payload).features) {
    have[feature.featureId] = feature.fingerprint as string;
  }
  return have;
}

function partialFlagOf(payload: Uint8Array): number {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  return view.getUint16(6, true) & MESH_BIN_FLAG_PARTIAL;
}

describe('createKernelWorkerCore: build', () => {
  it('answers script-done then a full result with a decodable payload and the serialized params', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);

    const responses = await core.handle(build(7));

    expect(responses.map((r) => r.type)).toEqual(['script-done', 'result']);
    expect(responses.every((r) => r.id === 7)).toBe(true);

    const result = resultOf(responses[1]);
    const view = new DataView(result.payload.buffer, result.payload.byteOffset, result.payload.byteLength);
    expect(view.getUint32(0, true)).toBe(MESH_BIN_MAGIC);

    const decoded = decodeMeshBinary(result.payload);
    expect(decoded.trailer).toBeUndefined();
    expect(partialFlagOf(result.payload)).toBe(0);
    expect(decoded.features.map((f) => f.featureId)).toEqual(['stable#1', 'mover#1']);
    for (const feature of decoded.features) {
      expect(feature.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    }

    // The bridge shape: params are the param table's `serialize()` output, not
    // the live table object.
    expect(result.params).toEqual(kernel.table.serialize());
    expect(result.featureRecords).toEqual(kernel.records);
    expect(result.bounds).toEqual({ min: [0, 0, 0], max: [10, 10, 0] });
    expect(result.failedFeatureIds).toEqual([]);
  });
});

describe('createKernelWorkerCore: params with have', () => {
  it('sends only the changed feature under a trailer naming the unchanged rest', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);
    const built = resultOf((await core.handle(build(1)))[1]);
    const have = haveFrom(built.payload);

    const responses = await core.handle(params(2, [{ name: 'width', value: 2 }], have));

    expect(responses.map((r) => r.type)).toEqual(['result']);
    const result = resultOf(responses[0]);
    expect(result.id).toBe(2);
    expect(result.trailer).toEqual({ unchangedIds: ['stable#1'], removedIds: [] });

    const decoded = decodeMeshBinary(result.payload);
    expect(decoded.trailer).toEqual({ unchangedIds: ['stable#1'], removedIds: [] });
    expect(partialFlagOf(result.payload)).toBe(MESH_BIN_FLAG_PARTIAL);
    expect(decoded.features.map((f) => f.featureId)).toEqual(['mover#1']);
    expect(result.params).toEqual(kernel.table.serialize());
    expect(result.featureRecords).toEqual(kernel.records);
  });

  it('sends the full payload WITHOUT a trailer when nothing changed', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);
    const built = resultOf((await core.handle(build(1)))[1]);
    const have = haveFrom(built.payload);

    const responses = await core.handle(params(2, [{ name: 'width', value: 1 }], have));

    const result = resultOf(responses[0]);
    expect(result.trailer).toBeUndefined();
    // A trailer cannot ride in a container with no records; the locked handling
    // is the full payload, unflagged.
    expect(partialFlagOf(result.payload)).toBe(0);
    const decoded = decodeMeshBinary(result.payload);
    expect(decoded.trailer).toBeUndefined();
    expect(decoded.features.map((f) => f.featureId)).toEqual(['stable#1', 'mover#1']);
  });

  it('reports have-ids the new mesh no longer has as removedIds', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);
    const built = resultOf((await core.handle(build(1)))[1]);
    const have = { ...haveFrom(built.payload), 'ghost#1': 'deadbeefdeadbeef' };

    const responses = await core.handle(params(2, [{ name: 'width', value: 2 }], have));

    const result = resultOf(responses[0]);
    expect(result.trailer).toEqual({ unchangedIds: ['stable#1'], removedIds: ['ghost#1'] });
    const decoded = decodeMeshBinary(result.payload);
    expect(decoded.features.map((f) => f.featureId)).toEqual(['mover#1']);
  });
});

describe('createKernelWorkerCore: params without have', () => {
  it('sends the full payload with no trailer even when nothing changed', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);
    await core.handle(build(1));

    const responses = await core.handle(params(2, [{ name: 'width', value: 1 }]));

    expect(responses.map((r) => r.type)).toEqual(['result']);
    const result = resultOf(responses[0]);
    expect(result.trailer).toBeUndefined();
    expect(partialFlagOf(result.payload)).toBe(0);
    const decoded = decodeMeshBinary(result.payload);
    expect(decoded.features.map((f) => f.featureId)).toEqual(['stable#1', 'mover#1']);
  });
});

describe('createKernelWorkerCore: failures', () => {
  it('answers the server wording when features fail to compile and keeps the model for later edits', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);
    kernel.state.failedFeatureIds = ['mover#1'];

    const responses = await core.handle(build(3));

    expect(responses.map((r) => r.type)).toEqual(['script-done', 'error']);
    expect(errorOf(responses[1])).toMatchObject({
      id: 3,
      code: 'script-error',
      message: 'one or more features failed to compile',
      failedFeatureIds: ['mover#1'],
    });

    // The geometry was computed, so the build's model is the stored one — a
    // later params edit drives exactly it.
    kernel.state.failedFeatureIds = [];
    const next = await core.handle(params(4, [{ name: 'width', value: 3 }]));
    expect(next.map((r) => r.type)).toEqual(['result']);
    expect(kernel.updateParamsCalls).toEqual([
      { records: kernel.records, paramTable: kernel.table, session: { id: 'session' } },
    ]);

    // A failed params mesh is an error response too, and still updates the model.
    kernel.state.failedFeatureIds = ['mover#1'];
    const failed = await core.handle(params(5, [{ name: 'width', value: 4 }]));
    expect(failed.map((r) => r.type)).toEqual(['error']);
    expect(errorOf(failed[0])).toMatchObject({
      code: 'script-error',
      message: 'one or more features failed to compile',
      failedFeatureIds: ['mover#1'],
    });
    expect(kernel.updateParamsCalls).toHaveLength(2);
  });

  it('maps host-fs dependency errors to host-fs-unavailable', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);
    kernel.state.failRunScript = Object.assign(new Error('fromSTEP needs a filesystem'), {
      code: 'cli.host-fs-unavailable',
    });

    const responses = await core.handle(build(1));

    expect(responses.map((r) => r.type)).toEqual(['error']);
    expect(errorOf(responses[0])).toMatchObject({
      code: 'host-fs-unavailable',
      message: 'fromSTEP needs a filesystem',
    });

    // Any code carrying the `host-fs` marker maps the same way, not just the
    // `cli.` prefix.
    const other = fakeKernel();
    const otherCore = createKernelWorkerCore(other.deps);
    other.state.failMesh = Object.assign(new Error('referenceImage cannot read its file'), {
      code: 'runtime.host-fs.missing',
    });

    const meshFailure = await otherCore.handle(build(2));

    expect(meshFailure.map((r) => r.type)).toEqual(['script-done', 'error']);
    expect(errorOf(meshFailure[1])).toMatchObject({
      code: 'host-fs-unavailable',
      message: 'referenceImage cannot read its file',
    });
  });

  it('maps plain dependency errors to script-error with the original message', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);
    kernel.state.failRunScript = new Error('boom');

    expect(errorOf((await core.handle(build(1)))[0])).toMatchObject({
      code: 'script-error',
      message: 'boom',
    });

    const meshFailure = fakeKernel();
    const meshCore = createKernelWorkerCore(meshFailure.deps);
    meshFailure.state.failMesh = new Error('mesh exploded');

    const responses = await meshCore.handle(build(2));

    expect(errorOf(responses[1])).toMatchObject({ code: 'script-error', message: 'mesh exploded' });

    const updateFailure = fakeKernel();
    const updateCore = createKernelWorkerCore(updateFailure.deps);
    await updateCore.handle(build(3));
    updateFailure.state.failUpdateParams = new Error('param width below min 1');

    const updateResponses = await updateCore.handle(params(4, [{ name: 'width', value: 0 }]));

    expect(errorOf(updateResponses[0])).toMatchObject({
      code: 'script-error',
      message: 'param width below min 1',
    });
  });
});

describe('createKernelWorkerCore: dispose', () => {
  it('clears the stored model, then a following build starts fresh', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);
    await core.handle(build(1));

    expect(await core.handle(dispose(2))).toEqual([]);

    // A params edit has no model to drive: a typed error, not a rejection.
    const orphaned = await core.handle(params(3, [{ name: 'width', value: 2 }]));
    expect(errorOf(orphaned[0]).code).toBe('worker-error');
    expect(kernel.updateParamsCalls).toEqual([]);

    const rebuilt = await core.handle(build(4));
    expect(rebuilt.map((r) => r.type)).toEqual(['script-done', 'result']);
    expect(resultOf(rebuilt[1]).featureRecords).toEqual(kernel.records);
  });

  it('answers a params request before any build with a worker-error, never a rejection', async () => {
    const kernel = fakeKernel();
    const core = createKernelWorkerCore(kernel.deps);

    const responses = await core.handle(params(1, [{ name: 'width', value: 2 }]));

    expect(responses.map((r) => r.type)).toEqual(['error']);
    expect(errorOf(responses[0]).code).toBe('worker-error');
  });
});
