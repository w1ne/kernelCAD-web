import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCode, GeometryEngine } from './geometryEngine';

// Mock replicad and its methods
vi.mock('replicad', () => {
  return {
    Sketcher: class {
      hLine() { return this; }
      vLine() { return this; }
      close() { return this; }
      extrude() { return { fillet: vi.fn(), chamfer: vi.fn(), mesh: () => ({ vertices: [], triangles: [], normals: [] }) }; }
    },
    makeBox: vi.fn(() => ({
      fillet: vi.fn().mockReturnThis(),
      chamfer: vi.fn().mockReturnThis(),
      translate: vi.fn().mockReturnThis(),
      cut: vi.fn().mockReturnThis(),
      mesh: vi.fn(() => ({ vertices: [0, 0, 0], triangles: [0, 0, 0], normals: [0, 0, 0] })),
      blobSTEP: vi.fn(),
      blobSTL: vi.fn(),
    })),
    makeCylinder: vi.fn(() => ({
      translate: vi.fn().mockReturnThis(),
    })),
    compoundShapes: vi.fn(() => ({
      mesh: vi.fn(() => ({ vertices: [0], triangles: [0], normals: [0] }))
    })),
    setOC: vi.fn(),
  };
});

// Mock Worker
class MockWorker {
  static mode: 'success' | 'initError' | 'crashOnExecute' | 'noResponse' | 'invalidResponse' = 'success';
  static sentMessages: Array<{ id: string; type: string }> = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  postMessage(data: { id: string; type: string }) {
    MockWorker.sentMessages.push({ id: data.id, type: data.type });
    setTimeout(() => {
      // INIT handshake
      if (data.type === 'INIT') {
        if (MockWorker.mode === 'initError') {
          this.onmessage?.({ data: { type: 'ERROR', id: data.id, error: 'init failed' } });
          return;
        }
        this.onmessage?.({ data: { type: 'SUCCESS', id: data.id } });
        return;
      }

      if (MockWorker.mode === 'crashOnExecute') {
        this.onerror?.({ message: 'worker crashed' });
        return;
      }

      if (MockWorker.mode === 'noResponse') {
        return;
      }

      if (MockWorker.mode === 'invalidResponse') {
        this.onmessage?.({ data: { foo: 'bar' } });
        return;
      }

      // Simulate execute success response
      this.onmessage?.({
        data: {
          type: 'SUCCESS',
          id: data.id,
          geometries: {
            geometries: [{ faces: [] }],
            sketches: [],
          },
        },
      });
    }, 10);
  }
  terminate() { }
}
vi.stubGlobal('Worker', MockWorker);

describe('Geometry Engine', () => {
  beforeEach(() => {
    // Reset singleton if possible, or just terminate existing
    GeometryEngine.getInstance().terminate();
    GeometryEngine.getInstance().resetDiagnostics();
    MockWorker.mode = 'success';
    MockWorker.sentMessages = [];
    vi.useRealTimers();
  });

  it('should maintain a singleton instance', () => {
    const instance1 = GeometryEngine.getInstance();
    const instance2 = GeometryEngine.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should generate a simple box using standalone function', async () => {
    const code = `
      const { makeBox } = replicad;
      return makeBox(10, 10, 10);
    `;
    const results = await executeCode(code);
    expect(results.geometries).toHaveLength(1);
  });

  it('should support fillet helper', async () => {
    const code = `
      const { makeBox } = replicad;
      const box = makeBox(10, 10, 10);
      return fillet(box, 1);
    `;
    const results = await executeCode(code);
    expect(results.geometries).toHaveLength(1);
  });

  it('should support chamfer helper', async () => {
    const code = `
      const { makeBox } = replicad;
      const box = makeBox(10, 10, 10);
      return chamfer(box, 1);
    `;
    const results = await executeCode(code);
    expect(results.geometries).toHaveLength(1);
  });

  it('should support makeCompound helper', async () => {
    const code = `
      const { makeBox } = replicad;
      const b1 = makeBox(10, 10, 10);
      return makeCompound([b1]);
    `;
    const results = await executeCode(code);
    expect(results.geometries).toHaveLength(1);
  });

  it('should reject initialize when worker init fails', async () => {
    MockWorker.mode = 'initError';
    const engine = GeometryEngine.getInstance();
    await expect(engine.initialize()).rejects.toThrow('init failed');
    expect(engine.getDiagnostics().initFailures).toBe(1);
  });

  it('should reject pending requests when worker crashes', async () => {
    MockWorker.mode = 'crashOnExecute';
    const code = 'return replicad.makeBox(1, 1, 1);';
    const engine = GeometryEngine.getInstance();
    await expect(executeCode(code)).rejects.toThrow('Geometry worker crashed.');
    expect(engine.getDiagnostics().workerCrashes).toBe(1);
    expect(engine.getDiagnostics().requestsRejected).toBeGreaterThanOrEqual(1);
  });

  it('should timeout worker requests without response', async () => {
    vi.useFakeTimers();
    MockWorker.mode = 'noResponse';
    const code = 'return replicad.makeBox(1, 1, 1);';
    const engine = GeometryEngine.getInstance();

    const pending = executeCode(code);
    const assertion = expect(pending).rejects.toThrow('Worker request timed out (EXECUTE)');
    await vi.advanceTimersByTimeAsync(31_000);
    await assertion;
    const diagnostics = engine.getDiagnostics();
    expect(diagnostics.requestTimeouts).toBe(1);
    expect(diagnostics.requestsRejected).toBeGreaterThanOrEqual(1);
  });

  it('should reject pending requests on protocol violation', async () => {
    MockWorker.mode = 'invalidResponse';
    const engine = GeometryEngine.getInstance();
    await expect(executeCode('return replicad.makeBox(1,1,1);')).rejects.toThrow('Worker protocol violation.');
    const diagnostics = engine.getDiagnostics();
    expect(diagnostics.protocolViolations).toBe(1);
    expect(diagnostics.requestsRejected).toBeGreaterThanOrEqual(1);
  });

  it('should generate monotonic deterministic request IDs', async () => {
    await executeCode('return replicad.makeBox(1,1,1);');
    await executeCode('return replicad.makeBox(2,2,2);');

    const executeIds = MockWorker.sentMessages
      .filter((m) => m.type === 'EXECUTE')
      .map((m) => m.id);

    expect(executeIds.length).toBe(2);
    const [first, second] = executeIds;
    expect(first).toMatch(/^req_\d+$/);
    expect(second).toMatch(/^req_\d+$/);
    const firstNum = Number(first?.replace('req_', ''));
    const secondNum = Number(second?.replace('req_', ''));
    expect(secondNum).toBeGreaterThan(firstNum);
  });

  it('should recover and process requests after a worker crash', async () => {
    // 1. Crash the worker
    MockWorker.mode = 'crashOnExecute';
    await expect(executeCode('return 1;')).rejects.toThrow('Geometry worker crashed.');

    // 2. Setup success for next run
    MockWorker.mode = 'success';
    const results = await executeCode('return replicad.makeBox(1,1,1);');

    expect(results.geometries).toHaveLength(1);
    expect(GeometryEngine.getInstance().getDiagnostics().workerCrashes).toBe(1);
    // Verify it was a new worker or at least it works
    expect(MockWorker.sentMessages.filter(m => m.type === 'INIT').length).toBeGreaterThanOrEqual(2);
  });
});
