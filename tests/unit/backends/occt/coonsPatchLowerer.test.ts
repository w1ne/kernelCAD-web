import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { lowerCoonsPatch } from '../../../../src/modeling/backends/occt/coonsPatchLowerer';
import { lowerCurve3D } from '../../../../src/modeling/backends/occt/curve3dLowerer';
import type { Curve3DMetadata } from '../../../../src/shared/intent/curve3dRecord';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { ShapeBackend } from '../../../../src/kernel/backends/backend';
import type { CoonsPatchData } from '../../../../src/shared/intent/surfaceRecord';

/** Build a synthetic curve3d FeatureRecord for use as input to the
 *  Coons-patch lowerer. The id matches what `data.curveIds[i]` references. */
function curveRecord(id: string, controlPoints: [number, number, number][]): FeatureRecord {
  const m: Curve3DMetadata = {
    controlPoints,
    degree: 1,
    closed: false,
  };
  return {
    id,
    kind: 'curve3d',
    params: {},
    inputs: {},
    transforms: [],
    suppressed: false,
    metadata: { curve3d: m, virtual: true },
  };
}

describe('lowerCoonsPatch', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('builds a planar Coons patch from 4 line edges (unit square 10×10)', () => {
    const records: FeatureRecord[] = [
      curveRecord('curve3d_1', [[0, 0, 0], [10, 0, 0]]),
      curveRecord('curve3d_2', [[10, 0, 0], [10, 10, 0]]),
      curveRecord('curve3d_3', [[10, 10, 0], [0, 10, 0]]),
      curveRecord('curve3d_4', [[0, 10, 0], [0, 0, 0]]),
    ];
    const data: CoonsPatchData = {
      kind: 'coonsPatch',
      curveIds: ['curve3d_1', 'curve3d_2', 'curve3d_3', 'curve3d_4'],
      continuity: ['C0', 'C0', 'C0', 'C0'],
    };
    const importedGeometry = new Map<string, ShapeBackend>();
    const result = lowerCoonsPatch(data, records, importedGeometry);
    expect(result.face).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const props = new oc.GProp_GProps_1();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topoFace = (result.face as any).wrapped;
    oc.BRepGProp.SurfaceProperties_1(topoFace, props, false, false);
    const area = props.Mass();
    expect(area).toBeGreaterThan(0);
    // Expected area for a 10×10 square is 100 mm² — Coons-patch fitting
    // may introduce a small relative error; allow 10% slack on the smoke.
    expect(area).toBeGreaterThan(90);
    expect(area).toBeLessThan(110);
  });

  it('reuses a parked edge from importedGeometry instead of re-lowering', () => {
    const records: FeatureRecord[] = [
      curveRecord('curve3d_1', [[0, 0, 0], [10, 0, 0]]),
      curveRecord('curve3d_2', [[10, 0, 0], [10, 10, 0]]),
      curveRecord('curve3d_3', [[10, 10, 0], [0, 10, 0]]),
      curveRecord('curve3d_4', [[0, 10, 0], [0, 0, 0]]),
    ];
    const data: CoonsPatchData = {
      kind: 'coonsPatch',
      curveIds: ['curve3d_1', 'curve3d_2', 'curve3d_3', 'curve3d_4'],
      continuity: ['C0', 'C0', 'C0', 'C0'],
    };
    const importedGeometry = new Map<string, ShapeBackend>();
    // Pre-park one of the edges; lowerer should pick it up directly.
    const parked = lowerCurve3D({
      controlPoints: [[0, 0, 0], [10, 0, 0]],
      degree: 1,
      closed: false,
    }).edge;
    importedGeometry.set('curve3d_1', parked as unknown as ShapeBackend);

    const result = lowerCoonsPatch(data, records, importedGeometry);
    expect(result.face).toBeDefined();
    // The freshly-lowered edges for curve3d_2..4 should now be parked too.
    expect(importedGeometry.has('curve3d_2')).toBe(true);
    expect(importedGeometry.has('curve3d_3')).toBe(true);
    expect(importedGeometry.has('curve3d_4')).toBe(true);
  });
});
