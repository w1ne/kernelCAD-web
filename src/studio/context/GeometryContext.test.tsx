// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { GeometryProvider, useGeometry } from './GeometryContext';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mockEngine = {
  initialize: vi.fn().mockResolvedValue(undefined),
  executeCode: vi.fn(),
};

vi.mock('../../shared/worker/geometryEngine', () => ({
  GeometryEngine: {
    getInstance: () => mockEngine,
  },
}));

function Probe() {
  const {
    geometries,
    previewGeometries,
    executionCount,
    isReady,
    isComputing,
    staleMainResponsesDropped,
    stalePreviewResponsesDropped,
    currentCodeRevision,
    lastSuccessfulRevision,
    executionHistory,
    scriptParams,
    scriptReview,
    setPreviewCode,
  } = useGeometry();
  const faceCount = geometries[0]?.faces.length ?? 0;
  const firstColor = geometries[0]?.color ?? '';
  const previewFaceCount = previewGeometries[0]?.faces.length ?? 0;
  return (
    <div>
      <span data-testid="is-ready">{String(isReady)}</span>
      <span data-testid="face-count">{String(faceCount)}</span>
      <span data-testid="first-color">{firstColor}</span>
      <span data-testid="preview-face-count">{String(previewFaceCount)}</span>
      <span data-testid="execution-count">{String(executionCount)}</span>
      <span data-testid="is-computing">{String(isComputing)}</span>
      <span data-testid="stale-main">{String(staleMainResponsesDropped)}</span>
      <span data-testid="stale-preview">{String(stalePreviewResponsesDropped)}</span>
      <span data-testid="current-rev">{String(currentCodeRevision)}</span>
      <span data-testid="last-success-rev">{String(lastSuccessfulRevision)}</span>
      <span data-testid="history-length">{String(executionHistory.length)}</span>
      <span data-testid="script-param-count">{String(scriptParams.length)}</span>
      <span data-testid="script-param-name">{scriptParams[0]?.name ?? ''}</span>
      <span data-testid="script-review-ok">{String(scriptReview?.ok ?? '')}</span>
      <span data-testid="script-review-repair">{scriptReview?.suggestedRepairPrompt ?? ''}</span>
      <button data-testid="trigger-preview" onClick={() => setPreviewCode('return makeBox(1,1,1);')}>Trigger</button>
      <button data-testid="trigger-preview-2" onClick={() => setPreviewCode('return makeBox(2,2,2);')}>Trigger2</button>
      <button data-testid="clear-preview" onClick={() => setPreviewCode(null)}>Clear</button>
    </div>
  );
}

describe('GeometryContext latest-intent-wins', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/');
    mockEngine.initialize.mockResolvedValue(undefined);
    mockEngine.executeCode.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('ignores stale execute responses that finish after a newer request', async () => {
    const first = deferred<{ geometries: Array<{ faces: unknown[] }>; sketches: unknown[] }>();
    const second = deferred<{ geometries: Array<{ faces: unknown[] }>; sketches: unknown[] }>();

    mockEngine.executeCode
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { rerender } = render(
      <GeometryProvider code={'const a = 1;'}>
        <Probe />
      </GeometryProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
      await Promise.resolve();
    });

    rerender(
      <GeometryProvider code={'const b = 2;'}>
        <Probe />
      </GeometryProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
      await Promise.resolve();
    });

    await act(async () => {
      second.resolve({ geometries: [{ faces: [{}, {}] }], sketches: [] });
      await Promise.resolve();
    });

    expect(screen.getByTestId('face-count').textContent).toBe('2');
    expect(screen.getByTestId('execution-count').textContent).toBe('1');

    await act(async () => {
      first.resolve({ geometries: [{ faces: [{}] }], sketches: [] });
      await Promise.resolve();
    });

    expect(screen.getByTestId('face-count').textContent).toBe('2');
    expect(screen.getByTestId('execution-count').textContent).toBe('1');
    expect(screen.getByTestId('is-computing').textContent).toBe('false');
    expect(screen.getByTestId('stale-main').textContent).toBe('1');
    expect(Number(screen.getByTestId('current-rev').textContent)).toBeGreaterThanOrEqual(2);
    expect(Number(screen.getByTestId('last-success-rev').textContent)).toBeGreaterThanOrEqual(1);
    expect(Number(screen.getByTestId('history-length').textContent)).toBeGreaterThanOrEqual(1);
  });

  it('ignores stale preview responses', async () => {
    const mainPromise = deferred<{ geometries: Array<{ faces: unknown[] }>; sketches: unknown[] }>();
    const firstPreview = deferred<{ geometries: Array<{ faces: unknown[] }>; sketches: unknown[] }>();
    const secondPreview = deferred<{ geometries: Array<{ faces: unknown[] }>; sketches: unknown[] }>();

    let mainResolved = false;
    mockEngine.executeCode.mockImplementation((source: string) => {
      if (source.includes('makeBox(1,1,1)')) return firstPreview.promise;
      if (source.includes('makeBox(2,2,2)')) return secondPreview.promise;
      if (!mainResolved) {
        mainResolved = true;
        return mainPromise.promise;
      }
      return Promise.resolve({ geometries: [{ faces: [] }], sketches: [] });
    });

    render(
      <GeometryProvider code={'const a = 1;'}>
        <Probe />
      </GeometryProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
      await Promise.resolve();
    });

    // 1. Resolve initial main computation
    await act(async () => {
      mainPromise.resolve({ geometries: [{ faces: [] }], sketches: [] });
      await Promise.resolve();
    });

    // 2. Trigger first preview (simulation of rapid typing)
    const trigger = screen.getByTestId('trigger-preview');
    const trigger2 = screen.getByTestId('trigger-preview-2');
    await act(async () => {
      trigger.click();
      await Promise.resolve();
    });

    // Advance for preview debounce (150ms in code)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await Promise.resolve();
      await Promise.resolve();
    });

    // 3. Trigger second preview immediately
    await act(async () => {
      trigger2.click();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await Promise.resolve();
      await Promise.resolve();
    });

    // 4. Resolve second preview (it should win)
    await act(async () => {
      secondPreview.resolve({ geometries: [{ faces: [{}, {}] }], sketches: [] });
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId('preview-face-count').textContent).toBe('2');
    expect(screen.getByTestId('stale-preview').textContent).toBe('0');

    // 5. Resolve first preview (it should be ignored)
    await act(async () => {
      firstPreview.resolve({ geometries: [{ faces: [{}] }], sketches: [] });
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId('preview-face-count').textContent).toBe('2');
    expect(screen.getByTestId('stale-preview').textContent).toBe('1');
  });

  it('loads an examples script into Studio from the dev mesh endpoint', async () => {
    window.history.pushState(
      {},
      '',
      '/?script=examples/robot-arm/desktop-3axis-mates.kcad.ts',
    );

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            featureId: 'arm_link',
            featureKind: 'box',
            predecessors: [],
            color: 'beam',
            faces: [
              {
                vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                indices: [0, 1, 2],
                normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
                faceId: 0,
              },
            ],
          },
          {
            featureId: 'gripper',
            featureKind: 'box',
            predecessors: [],
            faces: [
              {
                vertices: [0, 0, 0, 2, 0, 0, 0, 2, 0],
                indices: [0, 1, 2],
                normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
                faceId: 0,
              },
            ],
          },
        ],
        bounds: { min: [0, 0, 0], max: [2, 2, 0] },
        params: {
          shoulderDeg: {
            name: 'shoulderDeg',
            type: 'number',
            value: 24,
            defaultValue: 24,
            meta: { min: -20, max: 50, description: 'Shoulder pose' },
          },
        },
      }),
    } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          diagnostics: [{ code: 'assembly.mechanical.revolute-contact-missing', message: 'elbow has no bearing contact' }],
          fitness: {
            functional: false,
            repairMode: 'topology-redesign',
            blockingReasons: [{ code: 'assembly.mechanical.revolute-contact-missing', message: 'elbow has no bearing contact' }],
          },
          suggestedRepairPrompt: 'Redesign the elbow as a supported clevis joint.',
        }),
      } as Response);

    render(
      <GeometryProvider code={'const ignored = 1;'}>
        <Probe />
      </GeometryProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1,
      '/__kernelcad/mesh?script=examples%2Frobot-arm%2Fdesktop-3axis-mates.kcad.ts',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      '/__kernelcad/review?script=examples%2Frobot-arm%2Fdesktop-3axis-mates.kcad.ts',
    );
    expect(mockEngine.executeCode).not.toHaveBeenCalled();
    expect(screen.getByTestId('face-count').textContent).toBe('1');
    expect(screen.getByTestId('first-color').textContent).toBe('beam');
    expect(screen.getByTestId('execution-count').textContent).toBe('1');
    expect(screen.getByTestId('last-success-rev').textContent).toBe('1');
    expect(screen.getByTestId('script-param-count').textContent).toBe('1');
    expect(screen.getByTestId('script-param-name').textContent).toBe('shoulderDeg');
    expect(screen.getByTestId('script-review-ok').textContent).toBe('false');
    expect(screen.getByTestId('script-review-repair').textContent).toContain('supported clevis');
  });
});
