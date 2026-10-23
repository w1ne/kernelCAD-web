// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
// Param edits routed to the browser kernel worker (?kernel=browser): what
// gets applied, what falls back to the server, what never starts.
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerializedParamEntry } from '../../../shared/runtime/paramTable';
import { BrowserKernelError } from '../../browserKernel/browserKernelClient';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import { useParamUpdate } from './useParamUpdate';

const meshParamEdits = vi.hoisted(() => vi.fn());
const kernel = vi.hoisted(() => ({
  usable: vi.fn(() => true),
  isServerOnly: vi.fn(() => false),
  isWarm: vi.fn(() => true),
  warm: vi.fn(async () => undefined),
  rebuild: vi.fn(),
}));

vi.mock('../../scriptSource', () => ({
  shouldUseHostedMesh: () => true,
  devMeshAvailable: () => false,
  needsFullKernel: () => true,
}));
vi.mock('./paramEditsForMesh', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./paramEditsForMesh')>();
  return { ...actual, meshParamEdits };
});
vi.mock('../../browserKernel/flag', () => ({ browserKernelEnabled: () => true }));
vi.mock('../../browserKernel/browserKernelInstance', () => ({ browserKernel: kernel }));

const CODE = "const width = param('width', 40, { min: 20, max: 80 }); return box(width, 1, 1);";
const DECLARED: SerializedParamEntry[] = [
  { name: 'width', type: 'number', value: 40, defaultValue: 40, meta: { min: 20, max: 80 } },
];

function feature(id: string, x: number) {
  return {
    featureId: id, featureKind: 'box', predecessors: [],
    faces: [{ vertices: new Float32Array([x, 0, 0]), normals: new Float32Array([0, 0, 1]), indices: new Uint32Array([0, 0, 0]), faceId: 0 }],
  };
}

function workerResult(features: ReturnType<typeof feature>[], changedFeatureIds?: string[], dims = true) {
  return {
    type: 'result', jobId: 1, scope: 's', generation: 1, quality: 'display',
    payload: {
      features, featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      params: { width: { ...DECLARED[0], value: 55 } },
      ...(dims ? { dimensions: [] } : {}),
      ...(changedFeatureIds ? { changedFeatureIds } : {}),
    },
    fingerprints: Object.fromEntries(features.map((f) => [f.featureId, `fp-${f.featureId}`])),
    timings: { buildMs: 1, meshMs: 1, serializeMs: 0, totalMs: 2, path: 'incremental' }, memoryBytes: 0,
  };
}

const SERVER_PAYLOAD = {
  features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] }, params: {}, review: { ok: true, diagnostics: [] },
};

/** Server edits, not the background warm-up the hook also sends. */
const serverEdits = () => meshParamEdits.mock.calls.filter((call) => call[4] !== true);

function makeDeps(): ExecutionApplyDeps {
  return {
    engine: {} as ExecutionApplyDeps['engine'],
    mainRevisionRef: { current: 0 },
    geometriesRef: { current: [] },
    setCurrentCodeRevision: vi.fn(),
    setIsComputing: vi.fn(),
    setStaleMainResponsesDropped: vi.fn(),
    setGeometries: vi.fn(),
    setGeometryTransformOverrides: vi.fn(),
    setFeatureRecords: vi.fn(),
    setScriptParams: vi.fn(),
    setScriptReview: vi.fn(),
    setMeshDimensions: vi.fn(),
    setSketchesGeometries: vi.fn(),
    setPreviewGeometries: vi.fn(),
    setError: vi.fn(),
    setLastSuccessfulRevision: vi.fn(),
    setExecutionCount: vi.fn(),
    pushExecutionRecord: vi.fn(),
  };
}

describe('useParamUpdate on the browser kernel', () => {
  beforeEach(() => {
    meshParamEdits.mockReset();
    meshParamEdits.mockImplementation(async () => SERVER_PAYLOAD);
    kernel.rebuild.mockReset();
    kernel.isWarm.mockReturnValue(true);
  });

  it('never starts a rebuild for an out-of-range value and keeps the model', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useParamUpdate(CODE, null, 0, deps, DECLARED));
    await act(async () => { await result.current.updateParam([{ name: 'width', value: 500 }]); });
    expect(kernel.rebuild).not.toHaveBeenCalled();
    expect(serverEdits()).toHaveLength(0);
    expect(deps.setGeometries).not.toHaveBeenCalled();
    expect(deps.setError).toHaveBeenCalledWith(expect.stringMatching(/width/));
  });

  it('paints the worker mesh with no server call, then patches only changed features', async () => {
    const deps = makeDeps();
    kernel.rebuild.mockResolvedValueOnce(workerResult([feature('a', 1), feature('b', 2)]));
    const { result } = renderHook(() => useParamUpdate(CODE, null, 0, deps, DECLARED));
    await act(async () => { await result.current.updateParam([{ name: 'width', value: 55 }]); });
    expect(serverEdits()).toHaveLength(0);
    expect(kernel.rebuild).toHaveBeenLastCalledWith(expect.objectContaining({ params: { width: 55 }, quality: 'display', have: null }));
    const shown = deps.geometriesRef!.current;
    expect(shown.map((g) => g.featureId)).toEqual(['a', 'b']);

    kernel.rebuild.mockResolvedValueOnce(workerResult([feature('b', 3)], ['b']));
    await act(async () => { await result.current.updateParam([{ name: 'width', value: 60 }]); });
    expect(kernel.rebuild).toHaveBeenLastCalledWith(expect.objectContaining({ have: { a: 'fp-a', b: 'fp-b' } }));
    const patched = deps.geometriesRef!.current;
    expect(patched[0]).toBe(shown[0]);
    expect(patched[1]).not.toBe(shown[1]);
  });

  it('meshes a drag tick at the coarse profile and keeps the settled dimensions', async () => {
    const deps = makeDeps();
    kernel.rebuild.mockResolvedValueOnce(workerResult([feature('a', 1)], undefined, false));
    const { result } = renderHook(() => useParamUpdate(CODE, null, 0, deps, DECLARED));
    await act(async () => { await result.current.updateParam([{ name: 'width', value: 50 }], { preview: true }); });
    expect(kernel.rebuild).toHaveBeenLastCalledWith(expect.objectContaining({ quality: 'coarse' }));
    expect(deps.setMeshDimensions).not.toHaveBeenCalled();
  });

  it('sends the edit to the server unchanged when the worker cannot answer', async () => {
    const deps = makeDeps();
    kernel.rebuild.mockRejectedValueOnce(new BrowserKernelError('timeout', 'too slow', true));
    const { result } = renderHook(() => useParamUpdate(CODE, null, 0, deps, DECLARED));
    await act(async () => { await result.current.updateParam([{ name: 'width', value: 70 }]); });
    expect(serverEdits()).toHaveLength(1);
    expect(serverEdits()[0]![1]).toEqual({ width: 70 });
    expect(deps.setError).not.toHaveBeenCalledWith('too slow');
  });

  it('uses the server while the worker is still warming up', async () => {
    const deps = makeDeps();
    kernel.isWarm.mockReturnValue(false);
    const { result } = renderHook(() => useParamUpdate(CODE, null, 0, deps, DECLARED));
    await act(async () => { await result.current.updateParam([{ name: 'width', value: 45 }]); });
    expect(kernel.rebuild).not.toHaveBeenCalled();
    expect(kernel.warm).toHaveBeenCalled();
    expect(serverEdits()).toHaveLength(1);
  });
});
