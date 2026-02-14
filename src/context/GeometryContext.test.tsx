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

const mockMainEngine = {
  initialize: vi.fn().mockResolvedValue(undefined),
  executeCode: vi.fn(),
};

const mockPreviewEngine = {
  initialize: vi.fn().mockResolvedValue(undefined),
  executeCode: vi.fn(),
};

vi.mock('../lib/geometryEngine', () => ({
  GeometryEngine: {
    getInstance: (channel?: 'main' | 'preview') => (channel === 'preview' ? mockPreviewEngine : mockMainEngine),
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
    setPreviewCode,
  } = useGeometry();
  const faceCount = geometries[0]?.faces.length ?? 0;
  const previewFaceCount = previewGeometries[0]?.faces.length ?? 0;
  return (
    <div>
      <span data-testid="is-ready">{String(isReady)}</span>
      <span data-testid="face-count">{String(faceCount)}</span>
      <span data-testid="preview-face-count">{String(previewFaceCount)}</span>
      <span data-testid="execution-count">{String(executionCount)}</span>
      <span data-testid="is-computing">{String(isComputing)}</span>
      <span data-testid="stale-main">{String(staleMainResponsesDropped)}</span>
      <span data-testid="stale-preview">{String(stalePreviewResponsesDropped)}</span>
      <span data-testid="current-rev">{String(currentCodeRevision)}</span>
      <span data-testid="last-success-rev">{String(lastSuccessfulRevision)}</span>
      <span data-testid="history-length">{String(executionHistory.length)}</span>
      <button data-testid="trigger-preview" onClick={() => setPreviewCode('return makeBox(1,1,1);')}>Trigger</button>
      <button data-testid="trigger-preview-2" onClick={() => setPreviewCode('return makeBox(2,2,2);')}>Trigger2</button>
      <button data-testid="clear-preview" onClick={() => setPreviewCode(null)}>Clear</button>
    </div>
  );
}

describe('GeometryContext latest-intent-wins', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMainEngine.initialize.mockResolvedValue(undefined);
    mockMainEngine.executeCode.mockReset();
    mockPreviewEngine.initialize.mockResolvedValue(undefined);
    mockPreviewEngine.executeCode.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('ignores stale execute responses that finish after a newer request', async () => {
    const first = deferred<{ geometries: Array<{ faces: unknown[] }>; sketches: unknown[] }>();
    const second = deferred<{ geometries: Array<{ faces: unknown[] }>; sketches: unknown[] }>();

    mockMainEngine.executeCode
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
    mockMainEngine.executeCode.mockImplementation((source: string) => {
      if (source.includes('makeBox(1,1,1)') || source.includes('makeBox(2,2,2)')) {
        return Promise.resolve({ geometries: [{ faces: [] }], sketches: [] });
      }
      if (!mainResolved) {
        mainResolved = true;
        return mainPromise.promise;
      }
      return Promise.resolve({ geometries: [{ faces: [] }], sketches: [] });
    });

    mockPreviewEngine.executeCode.mockImplementation((source: string) => {
      if (source.includes('makeBox(1,1,1)')) return firstPreview.promise;
      if (source.includes('makeBox(2,2,2)')) return secondPreview.promise;
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

  it('keeps preview responsive while main execution is still blocked', async () => {
    const mainDeferred = deferred<{ geometries: Array<{ faces: unknown[] }>; sketches: unknown[] }>();

    mockMainEngine.executeCode.mockImplementation(() => mainDeferred.promise);
    mockPreviewEngine.executeCode.mockImplementation((source: string) => {
      if (source.includes('makeBox(1,1,1)')) {
        return Promise.resolve({ geometries: [{ faces: [{}, {}] }], sketches: [] });
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

    // Main is still running, preview should still be able to execute independently.
    await act(async () => {
      screen.getByTestId('trigger-preview').click();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('face-count').textContent).toBe('0');
    expect(screen.getByTestId('preview-face-count').textContent).toBe('2');

    await act(async () => {
      mainDeferred.resolve({ geometries: [{ faces: [{}] }], sketches: [] });
      await Promise.resolve();
    });
    expect(screen.getByTestId('is-computing').textContent).toBe('false');
  });
});
