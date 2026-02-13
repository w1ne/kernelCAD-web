// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

vi.mock('../lib/geometryEngine', () => ({
  GeometryEngine: {
    getInstance: () => mockEngine,
  },
}));

function Probe() {
  const { geometries, executionCount, isComputing, staleMainResponsesDropped, stalePreviewResponsesDropped } = useGeometry();
  const faceCount = geometries[0]?.faces.length ?? 0;
  return (
    <div>
      <span data-testid="face-count">{String(faceCount)}</span>
      <span data-testid="execution-count">{String(executionCount)}</span>
      <span data-testid="is-computing">{String(isComputing)}</span>
      <span data-testid="stale-main">{String(staleMainResponsesDropped)}</span>
      <span data-testid="stale-preview">{String(stalePreviewResponsesDropped)}</span>
    </div>
  );
}

describe('GeometryContext latest-intent-wins', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockEngine.initialize.mockResolvedValue(undefined);
    mockEngine.executeCode.mockReset();
  });

  afterEach(() => {
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
  });
});
