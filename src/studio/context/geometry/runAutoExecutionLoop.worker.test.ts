// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/context/geometry/runAutoExecutionLoop.worker.test.ts
//
// The gallery (`?gallery=`) hosted apply must warm the browser kernel exactly
// like the `?script=` `useMeshFetch` seam, so gallery param edits stay in the
// browser. Same fake-kernel + visibility-stub pattern as
// paramEditsForMesh.worker.test.ts. Locked here: warm once after a successful
// hosted apply with the `studio.kcad.ts` fallback fileName (the `?script=`
// path when present), deferred while hidden until `visibilitychange`, and
// none for a host-fs / literal-relative-import source. The two hosted seams
// cannot both fire for one run (`useHostedSourceRun` skips when `?script=` is
// set, and `useMeshFetch`'s hosted fetch only runs for `?script=`), and if
// they ever did, a same-source warm is idempotent inside `browserKernelClient`
// (pinned at the bottom with the real client + a counting fake worker).
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAutoExecutionLoop } from './runAutoExecutionLoop';
import { __resetMeshMergeStatesForTests } from './meshMergeStore';
import { clearStoredMeshCache, setHostedRevisionHint } from '../../scriptSource';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import {
  createBrowserKernel,
  type BrowserKernel,
  type KernelStatus,
} from '../../kernel/browserKernelClient';
import type { KernelRequest } from '../../kernel/protocol';
import {
  __resetBrowserKernelForTests,
  __setBrowserKernelForTests,
  warmKernelOnOpen,
} from '../../kernel/kernelSingleton';

const CODE = "const w = param('Width', 40); return box(w, 1, 1);";

const feature = (id: string) => ({
  featureId: id, featureKind: 'box', predecessors: [], faces: [],
});

interface FakeKernel {
  kernel: BrowserKernel;
  warmMock: ReturnType<typeof vi.fn>;
  disposeMock: ReturnType<typeof vi.fn>;
}

function fakeKernel(opts: { status?: KernelStatus } = {}): FakeKernel {
  const status: KernelStatus = opts.status ?? 'warm';
  const warmMock = vi.fn(async () => {});
  const disposeMock = vi.fn();
  const kernel: BrowserKernel = {
    status: () => status,
    warm: warmMock,
    params: vi.fn(async () => { throw new Error('params not expected'); }),
    fallbackReason: () => null,
    dispose: disposeMock,
  };
  return { kernel, warmMock, disposeMock };
}

/** The switch the warm routing tests need on: force skips the capability gate. */
function stubKernelEnv(): void {
  vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
  vi.stubEnv('VITE_HOSTED_MESH', '1');
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
}

/** The hosted mesh POST answers with a payload; the gallery-precompute GETs
 *  miss, so the auto-run loop settles on the server mesh endpoint step. */
function stubHostedFetch(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    String(input).includes('/__kernelcad/mesh')
      ? Promise.resolve({ ok: true, json: async () => ({ features: [feature('server')], params: {} }) } as Response)
      : Promise.resolve({ ok: false, status: 404, json: async () => null } as Response));
}

function fakeDeps(): ExecutionApplyDeps & { setGeometries: ReturnType<typeof vi.fn> } {
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

afterEach(() => {
  __resetMeshMergeStatesForTests();
  __resetBrowserKernelForTests();
  clearStoredMeshCache();
  setHostedRevisionHint(null);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('gallery hosted apply warms the kernel on open', () => {
  let visibility: 'visible' | 'hidden';
  let visibilitySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    visibility = 'visible';
    visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  });

  afterEach(() => {
    visibilitySpy.mockRestore();
  });

  it('warms once with the studio.kcad.ts fileName when the page has no ?script=', async () => {
    stubKernelEnv();
    stubHostedFetch();
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, null);
    const deps = fakeDeps();

    await runAutoExecutionLoop(deps, CODE, 0);

    expect(deps.setGeometries).toHaveBeenCalled();
    expect(h.warmMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledWith(CODE, 'studio.kcad.ts');
  });

  it('uses the ?script= path as fileName when one is present in the URL', async () => {
    stubKernelEnv();
    stubHostedFetch();
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, null);
    window.history.replaceState(null, '', '/?script=examples/gallery/part.kcad.ts');

    await runAutoExecutionLoop(fakeDeps(), CODE, 0);

    expect(h.warmMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledWith(CODE, 'examples/gallery/part.kcad.ts');
  });

  it('defers a hidden gallery apply until the first visibilitychange', async () => {
    stubKernelEnv();
    stubHostedFetch();
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, null);
    visibility = 'hidden';

    await runAutoExecutionLoop(fakeDeps(), CODE, 0);
    expect(h.warmMock).not.toHaveBeenCalled();

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(h.warmMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledWith(CODE, 'studio.kcad.ts');
  });

  it('never warms a source with a host-fs import or a literal relative import', async () => {
    stubKernelEnv();
    stubHostedFetch();
    const h = fakeKernel({ status: 'idle' });
    __setBrowserKernelForTests(h.kernel, null);

    await runAutoExecutionLoop(fakeDeps(), "const s = await lib.fromSTEP('./part.step'); return s;", 0);
    await runAutoExecutionLoop(fakeDeps(), "import part from './part.kcad.ts';\nreturn part;", 0);

    expect(h.warmMock).not.toHaveBeenCalled();
  });
});

describe('both hosted seams against one source', () => {
  // The seams are mutually exclusive per run (`?script=` routes the apply
  // through useMeshFetch and skips the auto-run loop; `?gallery=` does the
  // reverse), so production never calls both for one source. This pins the
  // client-side guarantee that even a concurrent double call stays one warm:
  // the real client shares the pending build for the same source, so the
  // worker spawns once and exactly one build request is posted.
  class FakeWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    onmessageerror: ((e: unknown) => void) | null = null;
    posted: KernelRequest[] = [];
    terminated = false;

    postMessage(msg: unknown): void {
      this.posted.push(msg as KernelRequest);
    }

    terminate(): void {
      this.terminated = true;
    }
  }

  it('spawns one worker when both seams kick the same source', () => {
    stubKernelEnv();
    const workers: FakeWorker[] = [];
    const kernel = createBrowserKernel({
      spawn: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker as unknown as Worker;
      },
    });
    __setBrowserKernelForTests(kernel, null);

    warmKernelOnOpen(CODE, 'examples/gallery/part.kcad.ts');
    warmKernelOnOpen(CODE, 'studio.kcad.ts');

    expect(workers).toHaveLength(1);
    expect(workers[0]!.posted.filter((msg) => msg.type === 'build')).toHaveLength(1);
  });
});
