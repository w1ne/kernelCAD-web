// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/context/geometry/paramEditsForMesh.worker.test.ts
//
// Routing param edits to the browser kernel and warming it on model open.
// A fake `BrowserKernel` is injected through the kernel singleton's test hook;
// the server path is asserted through a `fetch` spy. Locked semantics pinned
// here: the worker is used only for a source it is warm for and only when no
// string value was baked into the source; host-fs and crash/timeout failures
// fall back to the server within the same edit (sticky afterwards);
// script-error surfaces as the error; a hidden tab never warms until it
// becomes visible; a host-fs source never warms at all.
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  encodeMeshBinary,
  type MeshBinaryTrailer,
} from '../../../modeling/capture/featureMeshBinary';
import { __resetParamEditQueueForTests, meshParamEdits } from './paramEditsForMesh';
import { __resetMeshMergeStatesForTests, mergeMeshPayload } from './meshMergeStore';
import { useMeshFetch } from './useMeshFetch';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import {
  KernelDisposedError,
  KernelNotWarmError,
  KernelSourceError,
  KernelSupersededError,
  type BrowserKernel,
  type KernelParamsResult,
  type KernelStatus,
} from '../../kernel/browserKernelClient';
import {
  WARM_SETTLE_MS,
  __resetBrowserKernelForTests,
  __setBrowserKernelForTests,
} from '../../kernel/kernelSingleton';

const HEX_A = '0123456789abcdef';

const feature = (id: string, fingerprint?: string) => ({
  featureId: id, featureKind: 'box', predecessors: [], faces: [],
  ...(fingerprint === undefined ? {} : { fingerprint }),
});

const binFeature = (id: string) => ({
  featureId: id, featureKind: 'box', predecessors: [], faces: [],
});

const TRAILER: MeshBinaryTrailer = { unchangedIds: ['base'], removedIds: [] };

function kernelResult(overrides: Partial<KernelParamsResult> = {}): KernelParamsResult {
  return {
    payload: encodeMeshBinary([binFeature('patched')], TRAILER),
    trailer: TRAILER,
    params: { Width: { value: 60 } },
    featureRecords: [],
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    failedFeatureIds: [],
    ...overrides,
  };
}

interface FakeKernel {
  kernel: BrowserKernel;
  paramsMock: ReturnType<typeof vi.fn>;
  warmMock: ReturnType<typeof vi.fn>;
  disposeMock: ReturnType<typeof vi.fn>;
  setStatus: (status: KernelStatus) => void;
}

function fakeKernel(opts: { status?: KernelStatus } = {}): FakeKernel {
  let status: KernelStatus = opts.status ?? 'warm';
  const paramsMock = vi.fn(async () => kernelResult());
  const warmMock = vi.fn(async () => {});
  const disposeMock = vi.fn();
  const kernel: BrowserKernel = {
    status: () => status,
    warm: warmMock,
    params: paramsMock,
    fallbackReason: () => null,
    dispose: disposeMock,
  };
  return { kernel, paramsMock, warmMock, disposeMock, setStatus: (next) => { status = next; } };
}

/** The switch every routing test needs on: force skips the capability gate. */
function stubKernelEnv(): void {
  vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
  vi.stubEnv('VITE_HOSTED_MESH', '1');
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
}

/** The server mesh POST answers with a payload; the gallery-precompute GETs
 *  miss (so the edit falls through to the mesh endpoint like production). */
function stubServerFetch(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    String(input).includes('/__kernelcad/mesh')
      ? Promise.resolve({ ok: true, json: async () => ({ features: [feature('server')], params: {} }) } as Response)
      : Promise.resolve({ ok: false, status: 404, json: async () => null } as Response));
}

function forbidFetch(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    () => Promise.reject(new Error('fetch must not be called')),
  );
}

afterEach(() => {
  __resetParamEditQueueForTests();
  __resetMeshMergeStatesForTests();
  __resetBrowserKernelForTests();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('meshParamEdits routing to a warm kernel', () => {
  it('uses the warm kernel, never fetches, and merges the decoded patch', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    mergeMeshPayload(source, { features: [feature('base', HEX_A)] });
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = forbidFetch();

    const payload = await meshParamEdits(source, { Width: 60 });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.paramsMock).toHaveBeenCalledWith([{ name: 'Width', value: 60 }], { base: HEX_A });
    // The decoded patch is merged into the held state, like the server path.
    expect(payload?.features.map((f) => f.featureId)).toEqual(['base', 'patched']);
    expect(payload?.trailer).toEqual(TRAILER);
    expect(payload?.params).toEqual({ Width: { value: 60 } });
    expect(payload?.bounds).toEqual({ min: [0, 0, 0], max: [1, 1, 1] });
    expect(payload).not.toHaveProperty('review');
  });

  it('passes only hex16 fingerprints as have', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 44); return box(w, 1, 1);";
    mergeMeshPayload(source, { features: [feature('draft', 'not-a-fingerprint')] });
    const h = fakeKernel();
    h.paramsMock.mockImplementation(async (_edits: unknown, have?: Record<string, string>) => {
      expect(have).toBeUndefined();
      return kernelResult({
        payload: encodeMeshBinary([binFeature('fresh')]),
        trailer: undefined,
        params: {},
      });
    });
    __setBrowserKernelForTests(h.kernel, source);
    forbidFetch();

    const payload = await meshParamEdits(source, { Width: 60 });

    expect(h.paramsMock.mock.calls[0]?.[1]).toBeUndefined();
    expect(payload?.features.map((f) => f.featureId)).toEqual(['fresh']);
  });

  it('uses the server when the kernel is not warm, without touching it', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = stubServerFetch();

    const payload = await meshParamEdits(source, { Width: 60 });

    expect(h.paramsMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload?.features.map((f) => f.featureId)).toEqual(['server']);
  });

  it('uses the server when the warm kernel holds a different source', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'some other model');
    const fetchMock = stubServerFetch();

    await meshParamEdits(source, { Width: 60 });

    expect(h.paramsMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the server for a baked string edit even when warm', async () => {
    stubKernelEnv();
    const source = [
      "const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });",
      'return box(1, 1, 1);',
    ].join('\n');
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = stubServerFetch();

    await meshParamEdits(source, { Screw: 'M5' });

    expect(h.paramsMock).not.toHaveBeenCalled();
    const postCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/__kernelcad/mesh'));
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall![1] as RequestInit).body as string) as { source: string };
    expect(body.source).toContain("param('Screw', 'M5'");
  });
});

describe('meshParamEdits kernel fallback', () => {
  it('falls back to the server within the edit on host-fs, sticky afterwards', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    const h = fakeKernel();
    h.paramsMock.mockImplementation(async () => {
      h.setStatus('failed');
      throw new KernelSourceError('host-fs', 'needs the host filesystem');
    });
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = stubServerFetch();

    const first = await meshParamEdits(source, { Width: 60 });
    expect(h.paramsMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first?.features.map((f) => f.featureId)).toEqual(['server']);

    const second = await meshParamEdits(source, { Width: 61 });
    expect(h.paramsMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second?.features.map((f) => f.featureId)).toEqual(['server']);
  });

  it('falls back to the server on a crash, later edits skip the kernel', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    const h = fakeKernel();
    h.paramsMock.mockImplementation(async () => {
      h.setStatus('failed');
      throw new KernelSourceError('crash', 'worker crashed during params');
    });
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = stubServerFetch();

    const first = await meshParamEdits(source, { Width: 60 });
    expect(first?.features.map((f) => f.featureId)).toEqual(['server']);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await meshParamEdits(source, { Width: 61 });
    expect(h.paramsMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the server on a KernelNotWarmError, keeping the kernel eligible', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    const h = fakeKernel();
    h.paramsMock.mockImplementation(async () => {
      throw new KernelNotWarmError('warming');
    });
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = stubServerFetch();

    const first = await meshParamEdits(source, { Width: 60 });
    expect(h.paramsMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first?.features.map((f) => f.featureId)).toEqual(['server']);

    // Not sticky: the next edit consults the kernel again (still not warm,
    // so the server answers it too).
    const second = await meshParamEdits(source, { Width: 61 });
    expect(h.paramsMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second?.features.map((f) => f.featureId)).toEqual(['server']);
  });

  it('falls back to the server on a KernelSupersededError', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    const h = fakeKernel();
    h.paramsMock.mockImplementation(async () => {
      throw new KernelSupersededError();
    });
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = stubServerFetch();

    const payload = await meshParamEdits(source, { Width: 60 });

    expect(h.paramsMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload?.features.map((f) => f.featureId)).toEqual(['server']);
  });

  it('falls back to the server on a KernelDisposedError', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    const h = fakeKernel();
    h.paramsMock.mockImplementation(async () => {
      throw new KernelDisposedError();
    });
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = stubServerFetch();

    const payload = await meshParamEdits(source, { Width: 60 });

    expect(h.paramsMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload?.features.map((f) => f.featureId)).toEqual(['server']);
  });

  it('surfaces a script-error instead of falling back within the edit', async () => {
    stubKernelEnv();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    const h = fakeKernel();
    h.paramsMock.mockImplementation(async () => {
      throw new KernelSourceError('script-error', 'w is not a function');
    });
    __setBrowserKernelForTests(h.kernel, source);
    const fetchMock = forbidFetch();

    await expect(meshParamEdits(source, { Width: 60 })).rejects.toMatchObject({
      name: 'KernelSourceError',
      reason: 'script-error',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('kernel warm on the hosted apply', () => {
  const CODE = "const w = param('Width', 40); return box(w, 1, 1);";
  let visibility: 'visible' | 'hidden';
  let visibilitySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    visibility = 'visible';
    visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  });

  afterEach(() => {
    visibilitySpy.mockRestore();
  });

  function stubHostedFetch(): ReturnType<typeof vi.spyOn> {
    return vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      String(input).includes('/__kernelcad/mesh')
        ? Promise.resolve({ ok: true, json: async () => ({ features: [feature('server')], params: {} }) } as Response)
        : Promise.resolve({ ok: false, status: 404, json: async () => null } as Response));
  }

  function fakeDeps(): ExecutionApplyDeps {
    return {
      engine: {} as ExecutionApplyDeps['engine'],
      mainRevisionRef: { current: 0 },
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

  function renderFetch(code = CODE): { result: { current: ReturnType<typeof useMeshFetch> }; deps: ExecutionApplyDeps } {
    const deps = fakeDeps();
    const { result } = renderHook(() => useMeshFetch(code, deps, vi.fn()));
    return { result, deps };
  }

  async function applyHosted(
    result: { current: ReturnType<typeof useMeshFetch> },
    deps: ExecutionApplyDeps,
    script = 'gallery/sample.kcad.ts',
  ): Promise<void> {
    await act(async () => {
      result.current.requestMeshAndReview(script, null);
    });
    await vi.waitFor(() => expect(deps.setGeometries).toHaveBeenCalled());
  }

  it('warms once for the applied source with the script as fileName', async () => {
    stubKernelEnv();
    stubHostedFetch();
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, null);
    const { result, deps } = renderFetch();

    await applyHosted(result, deps);

    expect(h.warmMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledWith(CODE, 'gallery/sample.kcad.ts');
  });

  it('defers a hidden tab until the first visibilitychange', async () => {
    stubKernelEnv();
    stubHostedFetch();
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, null);
    visibility = 'hidden';
    const { result, deps } = renderFetch();

    await applyHosted(result, deps);
    expect(h.warmMock).not.toHaveBeenCalled();

    visibility = 'visible';
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(h.warmMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the old worker through the settle window, then swaps to the new source', async () => {
    stubKernelEnv();
    stubHostedFetch();
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, null);

    const first = renderFetch();
    await applyHosted(first.result, first.deps, 'gallery/a.kcad.ts');
    expect(h.warmMock).toHaveBeenCalledTimes(1);

    const secondCode = 'return box(2, 2, 2);';
    const second = renderFetch(secondCode);
    // Fake timers from here so the settle delay elapses without real waiting.
    vi.useFakeTimers();
    await applyHosted(second.result, second.deps, 'gallery/b.kcad.ts');

    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(WARM_SETTLE_MS);
    expect(h.disposeMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledTimes(2);
    expect(h.warmMock).toHaveBeenLastCalledWith(secondCode, 'gallery/b.kcad.ts');
  });

  it('never warms a source with a host-fs import or a literal relative import', async () => {
    stubKernelEnv();
    stubHostedFetch();
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, null);

    const hostFs = "const s = await lib.fromSTEP('./part.step'); return s;";
    const hostFsRun = renderFetch(hostFs);
    await applyHosted(hostFsRun.result, hostFsRun.deps, 'gallery/part.kcad.ts');

    const relative = "import part from './part.kcad.ts';\nreturn part;";
    const relativeRun = renderFetch(relative);
    await applyHosted(relativeRun.result, relativeRun.deps, 'gallery/relative.kcad.ts');

    expect(h.warmMock).not.toHaveBeenCalled();
  });
});
