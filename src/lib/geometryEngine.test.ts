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
  static mode: 'success' | 'initError' | 'crashOnExecute' | 'noResponse' = 'success';
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  postMessage(data: { id: string; type: string }) {
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
    MockWorker.mode = 'success';
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
    await expect(GeometryEngine.getInstance().initialize()).rejects.toThrow('init failed');
  });

  it('should reject pending requests when worker crashes', async () => {
    MockWorker.mode = 'crashOnExecute';
    const code = 'return replicad.makeBox(1, 1, 1);';
    await expect(executeCode(code)).rejects.toThrow('Geometry worker crashed.');
  });

  it('should timeout worker requests without response', async () => {
    vi.useFakeTimers();
    MockWorker.mode = 'noResponse';
    const code = 'return replicad.makeBox(1, 1, 1);';

    const pending = executeCode(code);
    const assertion = expect(pending).rejects.toThrow('Worker request timed out (EXECUTE)');
    await vi.advanceTimersByTimeAsync(31_000);
    await assertion;
  });
});
