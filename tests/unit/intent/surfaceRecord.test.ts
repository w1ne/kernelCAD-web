import { describe, it, expect } from 'vitest';
import type { SurfaceRecord, NurbsSurfaceData } from '../../../src/intent/surfaceRecord';
import { createSurfaceIdGenerator } from '../../../src/intent/featureId';

describe('SurfaceRecord shape', () => {
  it('NurbsSurfaceData structurally accepts the planar 2x2 test surface', () => {
    const data: NurbsSurfaceData = {
      kind: 'nurbsSurface',
      controls: [
        [[0, 0, 0], [0, 10, 0]],
        [[10, 0, 0], [10, 10, 0]],
      ],
      degree: { u: 1, v: 1 },
    };
    const rec: SurfaceRecord = { id: 'surface_1', kind: 'nurbsSurface', params: {}, data };
    expect(rec.data.kind).toBe('nurbsSurface');
  });
});

describe('createSurfaceIdGenerator', () => {
  it('mints surface_1, surface_2, ... and resets', () => {
    const gen = createSurfaceIdGenerator();
    expect(gen.next()).toBe('surface_1');
    expect(gen.next()).toBe('surface_2');
    gen.reset();
    expect(gen.next()).toBe('surface_1');
  });
});
