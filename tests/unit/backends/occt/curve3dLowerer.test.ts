import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { lowerCurve3D } from '../../../../src/modeling/backends/occt/curve3dLowerer';
import type { Curve3DMetadata } from '../../../../src/shared/intent/curve3dRecord';

describe('curve3dLowerer', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('builds a TopoDS_Edge from a cubic NURBS curve with finite linear length', () => {
    const m: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [10, 5, 0],
        [20, -5, 10],
        [30, 0, 5],
      ],
      degree: 3,
      closed: false,
    };

    const result = lowerCurve3D(m);
    expect(result.edge).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const props = new oc.GProp_GProps_1();
    oc.BRepGProp.LinearProperties(result.edge, props, false, false);
    const length = props.Mass();
    expect(Number.isFinite(length)).toBe(true);
    expect(length).toBeGreaterThan(0);
  });

  it('builds a rational NURBS edge when weights are supplied', () => {
    const m: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [5, 5, 0],
        [10, 0, 0],
      ],
      degree: 2,
      weights: [1, 2, 1],
      closed: false,
    };

    const result = lowerCurve3D(m);
    expect(result.edge).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const props = new oc.GProp_GProps_1();
    oc.BRepGProp.LinearProperties(result.edge, props, false, false);
    const length = props.Mass();
    expect(Number.isFinite(length)).toBe(true);
    expect(length).toBeGreaterThan(0);
  });
});
