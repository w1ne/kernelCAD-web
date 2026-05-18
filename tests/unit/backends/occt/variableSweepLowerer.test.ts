import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import {
  lowerVariableSweep,
  type VariableSweepSectionLowered,
} from '../../../../src/modeling/backends/occt/variableSweepLowerer';

/**
 * Helpers — build OCCT primitives inline so the test exercises the lowerer
 * in isolation, bypassing the dispatch arm + sketch lifter. Keeps the test
 * dependencies small (just `replicad` + `initOcct`).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildLineEdge(a: [number, number, number], b: [number, number, number]): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const p1 = new oc.gp_Pnt_3(a[0], a[1], a[2]);
  const p2 = new oc.gp_Pnt_3(b[0], b[1], b[2]);
  return new oc.BRepBuilderAPI_MakeEdge_3(p1, p2).Edge();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRectWire(halfX: number, halfY: number, z: number): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const p1 = new oc.gp_Pnt_3(-halfX, -halfY, z);
  const p2 = new oc.gp_Pnt_3(halfX, -halfY, z);
  const p3 = new oc.gp_Pnt_3(halfX, halfY, z);
  const p4 = new oc.gp_Pnt_3(-halfX, halfY, z);
  const e1 = new oc.BRepBuilderAPI_MakeEdge_3(p1, p2).Edge();
  const e2 = new oc.BRepBuilderAPI_MakeEdge_3(p2, p3).Edge();
  const e3 = new oc.BRepBuilderAPI_MakeEdge_3(p3, p4).Edge();
  const e4 = new oc.BRepBuilderAPI_MakeEdge_3(p4, p1).Edge();
  const wb = new oc.BRepBuilderAPI_MakeWire_5(e1, e2, e3, e4);
  return wb.Wire();
}

describe('variableSweepLowerer', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('builds a positive-volume tapered solid from a Z-axis spine + 2 square profiles', () => {
    // Spine: 30mm straight line on Z from (0,0,0) → (0,0,30).
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 30]);

    // Two square profiles in XY plane: 2×2 at z=0, 1×1 at z=30 (the
    // half-extents are 1 and 0.5; profile wires live on the plane the
    // anchor vertex sits on, which matches a perpendicular Z spine).
    const profileA = buildRectWire(1, 1, 0);
    const profileB = buildRectWire(0.5, 0.5, 30);

    const sections: VariableSweepSectionLowered[] = [
      { t: 0, profileWire: profileA, locationPnt: [0, 0, 0] },
      { t: 1, profileWire: profileB, locationPnt: [0, 0, 30] },
    ];

    const shape = lowerVariableSweep(spineEdge, sections, { continuity: 'C1' });
    expect(shape).toBeDefined();

    // Positive volume: average cross-section × spine length ≈
    // ((2*2) + (1*1)) / 2 * 30 = 75 mm³ as a rough order of magnitude. We
    // don't assert exact volume — MakePipeShell blending is implementation-
    // dependent — but the result MUST be a positive-volume solid.
    const v = shape.volume();
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);

    // Bounding box: x and y within ±1mm (the larger profile half-extent);
    // z spans roughly [0, 30] (the spine length). Be generous on bounds —
    // the swept surface can overshoot the profile slightly at corners.
    const bbox = shape.boundingBox();
    expect(bbox.min[2]).toBeGreaterThan(-1);
    expect(bbox.max[2]).toBeLessThan(31);
    expect(bbox.max[0]).toBeLessThan(1.5);
    expect(bbox.max[1]).toBeLessThan(1.5);
  });

  it('throws when fewer than 2 sections are supplied', () => {
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 10]);
    const profile = buildRectWire(1, 1, 0);
    expect(() =>
      lowerVariableSweep(spineEdge, [
        { t: 0, profileWire: profile, locationPnt: [0, 0, 0] },
      ]),
    ).toThrow(/at least 2 sections/);
  });

  it('honors `orientation: { up: Vec3 }` by selecting the binormal mode', () => {
    // Smoke test — the orientation switch produces a valid solid; we don't
    // verify the specific binormal effect here (would need a curved spine
    // to make the difference observable).
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 10]);
    const profileA = buildRectWire(1, 1, 0);
    const profileB = buildRectWire(1, 1, 10);
    const shape = lowerVariableSweep(
      spineEdge,
      [
        { t: 0, profileWire: profileA, locationPnt: [0, 0, 0] },
        { t: 1, profileWire: profileB, locationPnt: [0, 0, 10] },
      ],
      { orientation: { up: [0, 1, 0] } },
    );
    expect(shape.volume()).toBeGreaterThan(0);
  });
});
