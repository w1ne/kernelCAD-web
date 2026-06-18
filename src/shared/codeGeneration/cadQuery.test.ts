// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';
import { executeCode } from '../worker/geometryEngine';

// Mock replicad and its methods
vi.mock('replicad', () => {
    return {
        Sketcher: class {
            hLine() { return this; }
            vLine() { return this; }
            close() { return this; }
            extrude() { return { fillet: vi.fn().mockReturnThis(), chamfer: vi.fn().mockReturnThis(), faces: vi.fn().mockReturnThis(), edges: vi.fn().mockReturnThis(), mesh: () => ({ vertices: [], triangles: [], normals: [] }) }; }
        },
        makeBox: vi.fn(() => ({
            fillet: vi.fn().mockReturnThis(),
            chamfer: vi.fn().mockReturnThis(),
            faces: vi.fn().mockReturnThis(),
            edges: vi.fn().mockReturnThis(),
            mesh: vi.fn(() => ({ vertices: [0, 0, 0], triangles: [0, 0, 0], normals: [0, 0, 0] })),
        })),
        setOC: vi.fn(),
    };
});

// Mock Worker
class MockWorker {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    postMessage(data: { id: string; type: string }) {
        if (!this.onmessage) return;
        setTimeout(() => {
            if (data.type === 'INIT') {
                this.onmessage!({ data: { type: 'SUCCESS', id: data.id } });
                return;
            }
            this.onmessage!({
                data: {
                    type: 'SUCCESS',
                    id: data.id,
                    geometries: { geometries: [{ faces: [] }], sketches: [] },
                },
            });
        }, 10);
    }
    terminate() { }
}
vi.stubGlobal('Worker', MockWorker);

describe('CAD Query Support', () => {
    it('should support select helper for faces', async () => {
        const code = `
      const box = replicad.makeBox(10, 10, 10);
      return select(box, ">Z", "faces");
    `;
        const results = await executeCode(code);
        expect(results.geometries).toHaveLength(1);
    });

    it('should support select helper for edges', async () => {
        const code = `
      const box = replicad.makeBox(10, 10, 10);
      return select(box, "|Z", "edges");
    `;
        const results = await executeCode(code);
        expect(results.geometries).toHaveLength(1);
    });

    it('should support fillet with selector', async () => {
        const code = `
      const box = replicad.makeBox(10, 10, 10);
      return fillet(box, 1, ">Z");
    `;
        const results = await executeCode(code);
        expect(results.geometries).toHaveLength(1);
    });
});
