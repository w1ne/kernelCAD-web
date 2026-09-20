import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import {
  lowerVariableSweep,
  type VariableSweepSectionLowered,
} from '../../../../src/modeling/backends/occt/variableSweepLowerer';
import { lowerCurve3D } from '../../../../src/modeling/backends/occt/curve3dLowerer';

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

/** Circle wire of `radius` centered on the Z axis at height `z`. */
function buildCircleWire(radius: number, z: number): any {
  const oc = getOC() as any;
  const ax2 = new oc.gp_Ax2_3(new oc.gp_Pnt_3(0, 0, z), new oc.gp_Dir_4(0, 0, 1));
  const circle = new oc.gp_Circ_2(ax2, radius);
  const edge = new oc.BRepBuilderAPI_MakeEdge_8(circle).Edge();
  return new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
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

  it('builds a 3-station sweep with an intermediate station at t=0.5', () => {
    // Straight Z spine 0→30. Middle station at t=0.5 → (0,0,15) in the
    // spine's normalized curve parameter (the edge's range is [0,1] for a
    // line edge, so t maps 1:1 onto it).
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 30]);
    const shape = lowerVariableSweep(
      spineEdge,
      [
        { t: 0, profileWire: buildCircleWire(2, 0), locationPnt: [0, 0, 0] },
        { t: 0.5, profileWire: buildCircleWire(5, 15), locationPnt: [0, 0, 15] },
        { t: 1, profileWire: buildCircleWire(1, 30), locationPnt: [0, 0, 30] },
      ],
      { continuity: 'C1' },
    );

    // Positive volume. Mid-section circle (r=5) dominates: the blend
    // interpolates from r=2 through r=5 down to r=1, so the widest extent
    // must reflect the middle station.
    const v = shape.volume();
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);

    // `boundingBox({ exact: true })` (tessellation) is used because the
    // plain Bnd_Box pads curved B-spline faces by their control-point hull
    // (it reports ~7.8 for this shape even though the surface maxes at ~5).
    const bbox = shape.boundingBox({ exact: true });
    // bbox radius around the Z spine matches the middle circle (r=5).
    expect(bbox.max[0]).toBeGreaterThan(4.95);
    expect(bbox.max[0]).toBeLessThan(5.05);
    expect(bbox.max[1]).toBeGreaterThan(4.95);
    expect(bbox.max[1]).toBeLessThan(5.05);
    expect(bbox.min[2]).toBeGreaterThan(-0.01);
    expect(bbox.max[2]).toBeLessThan(30.01);
  });

  it('builds a 3-station sweep on a NURBS spine (subdivision path)', () => {
    // Same geometry, but the spine is a cubic NURBS edge like the ones
    // `lowerCurve3D` produces — exercises `BRep_Tool.Curve_2` on a
    // Geom_BSplineCurve rather than a Geom_Line.
    const spineEdge = lowerCurve3D({
      controlPoints: [
        [0, 0, 0],
        [0, 0, 10],
        [0, 0, 20],
        [0, 0, 30],
      ],
      degree: 3,
    }).edge;
    const shape = lowerVariableSweep(spineEdge, [
      { t: 0, profileWire: buildCircleWire(2, 0), locationPnt: [0, 0, 0] },
      { t: 0.5, profileWire: buildCircleWire(5, 15), locationPnt: [0, 0, 15] },
      { t: 1, profileWire: buildCircleWire(1, 30), locationPnt: [0, 0, 30] },
    ]);
    expect(shape.volume()).toBeGreaterThan(0);
    const bbox = shape.boundingBox({ exact: true });
    expect(bbox.max[0]).toBeGreaterThan(4.95);
    expect(bbox.max[0]).toBeLessThan(5.05);
    expect(bbox.max[1]).toBeGreaterThan(4.95);
    expect(bbox.max[1]).toBeLessThan(5.05);
  });

  it('builds a 4-station sweep (t = 0, 1/3, 2/3, 1)', () => {
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 30]);
    const shape = lowerVariableSweep(spineEdge, [
      { t: 0, profileWire: buildCircleWire(2, 0), locationPnt: [0, 0, 0] },
      { t: 1 / 3, profileWire: buildCircleWire(3, 10), locationPnt: [0, 0, 10] },
      { t: 2 / 3, profileWire: buildCircleWire(5, 20), locationPnt: [0, 0, 20] },
      { t: 1, profileWire: buildCircleWire(1, 30), locationPnt: [0, 0, 30] },
    ]);

    const v = shape.volume();
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);

    const bbox = shape.boundingBox({ exact: true });
    // Largest station (r=5 at t=2/3) dominates the bbox radius.
    expect(bbox.max[0]).toBeGreaterThan(4.95);
    expect(bbox.max[0]).toBeLessThan(5.05);
    expect(bbox.max[1]).toBeGreaterThan(4.95);
    expect(bbox.max[1]).toBeLessThan(5.05);
    expect(bbox.min[2]).toBeGreaterThan(-0.01);
    expect(bbox.max[2]).toBeLessThan(30.01);
  });

  it('rejects duplicate station t values with a clear error', () => {
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 30]);
    const profile = buildCircleWire(1, 0);
    expect(() =>
      lowerVariableSweep(spineEdge, [
        { t: 0, profileWire: profile, locationPnt: [0, 0, 0] },
        { t: 0.5, profileWire: profile, locationPnt: [0, 0, 15] },
        { t: 0.5, profileWire: profile, locationPnt: [0, 0, 15] },
        { t: 1, profileWire: profile, locationPnt: [0, 0, 30] },
      ]),
    ).toThrow(/strictly increasing/);
  });

  it('rejects unsorted station t values with a clear error', () => {
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 30]);
    const profile = buildCircleWire(1, 0);
    expect(() =>
      lowerVariableSweep(spineEdge, [
        { t: 0, profileWire: profile, locationPnt: [0, 0, 0] },
        { t: 0.75, profileWire: profile, locationPnt: [0, 0, 22.5] },
        { t: 0.5, profileWire: profile, locationPnt: [0, 0, 15] },
        { t: 1, profileWire: profile, locationPnt: [0, 0, 30] },
      ]),
    ).toThrow(/strictly increasing/);
  });

  it('rejects a station outside [0, 1] with a clear error', () => {
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 30]);
    const profile = buildCircleWire(1, 0);
    expect(() =>
      lowerVariableSweep(spineEdge, [
        { t: 0, profileWire: profile, locationPnt: [0, 0, 0] },
        { t: 1.5, profileWire: profile, locationPnt: [0, 0, 45] },
        { t: 1, profileWire: profile, locationPnt: [0, 0, 30] },
      ]),
    ).toThrow(/outside \[0, 1\]/);
  });

  it('rejects sections that leave the spine ends uncovered', () => {
    const spineEdge = buildLineEdge([0, 0, 0], [0, 0, 30]);
    const profile = buildCircleWire(1, 0);
    expect(() =>
      lowerVariableSweep(spineEdge, [
        { t: 0.1, profileWire: profile, locationPnt: [0, 0, 3] },
        { t: 0.5, profileWire: profile, locationPnt: [0, 0, 15] },
        { t: 0.9, profileWire: profile, locationPnt: [0, 0, 27] },
      ]),
    ).toThrow(/span the full spine/);
  });
});
