// tests/unit/backends/occt/edgeQueries.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { resolveEdgeQuery, resolveFaceQuery, selectEdges, selectEdge } from '../../../../src/kernel/backends/occt/edgeQueries';
import * as replicad from 'replicad';

describe('resolveEdgeQuery', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns 12 edges for an empty query on a box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, {});
    expect(edges).toHaveLength(12);
  });

  it('returns 4 top edges for { atZ: 5 } on a 10x10x5 box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { atZ: 5 });
    expect(edges).toHaveLength(4);
  });

  it('returns 4 bottom edges for { atZ: 0 } on a box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { atZ: 0 });
    expect(edges).toHaveLength(4);
  });

  it('returns 4 vertical edges for { parallel: [0,0,1] }', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { parallel: [0, 0, 1] });
    expect(edges).toHaveLength(4);
  });

  it('returns 12 convex edges for { convex: true } on a box (all box edges convex)', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { convex: true });
    expect(edges).toHaveLength(12);
  });

  it('AND-combines multiple keys: { atZ: 5, parallel: [1,0,0] } -> 2 top edges parallel to X', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { atZ: 5, parallel: [1, 0, 0] });
    expect(edges).toHaveLength(2);
  });

  it('returns no edges when query matches nothing', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { atZ: 999 });
    expect(edges).toHaveLength(0);
  });
});

describe('resolveFaceQuery', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns 6 faces for an empty query on a box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const faces = resolveFaceQuery(box, {});
    expect(faces).toHaveLength(6);
  });

  it('returns 1 top face for { atZ: 5 } on a 10x10x5 box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const faces = resolveFaceQuery(box, { atZ: 5 });
    expect(faces).toHaveLength(1);
  });

  it('returns 2 faces for { parallelTo: "XY" } on a box (top + bottom)', () => {
    const box = OcctBackend.box(10, 10, 5);
    const faces = resolveFaceQuery(box, { parallelTo: 'XY' });
    expect(faces).toHaveLength(2);
  });

  it('I3: FaceQuery.inPlane filters faces correctly (XY plane → 2 faces on a box)', () => {
    const box = OcctBackend.box(10, 10, 5);
    const xy = resolveFaceQuery(box, { inPlane: 'XY' });
    // XY plane normal is Z. Only faces with normal parallel to Z (top + bottom) match.
    expect(xy).toHaveLength(2);
    const yz = resolveFaceQuery(box, { inPlane: 'YZ' });
    expect(yz).toHaveLength(2);
  });

  it('I3: inPlane combines with atZ to filter by both orientation AND position', () => {
    const box = OcctBackend.box(10, 10, 5);
    const top = resolveFaceQuery(box, { inPlane: 'XY', atZ: 5 });
    expect(top).toHaveLength(1);
    expect(top[0].center.z).toBeCloseTo(5, 1);
  });
});

describe('selectEdges / selectEdge', () => {
  beforeAll(async () => { await initOcct(); });

  it('selectEdges returns EdgeSegment[] with full metadata', () => {
    const box = OcctBackend.box(10, 10, 5);
    const segments = selectEdges(box, { atZ: 5 });
    expect(segments).toHaveLength(4);
    expect(segments[0]).toHaveProperty('id');
    expect(segments[0]).toHaveProperty('midpoint');
    expect(segments[0]).toHaveProperty('direction');
    expect(segments[0]).toHaveProperty('length');
    expect(segments[0]).toHaveProperty('curveType');
  });

  it('selectEdge returns single EdgeSegment when query matches one', () => {
    const box = OcctBackend.box(10, 10, 5);
    const seg = selectEdge(box, { atZ: 5, parallel: [1, 0, 0], near: [5, 0, 5] });
    expect(seg).toHaveProperty('id');
    expect(seg.midpoint[2]).toBeCloseTo(5, 1);
  });

  it('selectEdge throws when query matches multiple edges', () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(() => selectEdge(box, { atZ: 5 })).toThrow(/ambiguous|multiple/i);
  });

  it('selectEdge throws when query matches zero edges', () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(() => selectEdge(box, { atZ: 999 })).toThrow(/no edges|zero/i);
  });

  it('I2: EdgeSegment.normalA and normalB are populated for non-boundary edges', () => {
    const box = OcctBackend.box(10, 10, 5);
    const segments = selectEdges(box, { atZ: 5 });
    for (const seg of segments) {
      expect(seg.normalA).not.toBeNull();
      expect(seg.normalB).not.toBeNull();
      expect(Array.isArray(seg.normalA)).toBe(true);
      if (seg.normalA) expect(seg.normalA).toHaveLength(3);
    }
  });

  it('I2: normalA / normalB on a 90-degree corner edge are perpendicular to each other', () => {
    const box = OcctBackend.box(10, 10, 5);
    const seg = selectEdge(box, { atZ: 5, parallel: [1, 0, 0], near: [5, 0, 5] });
    if (seg.normalA && seg.normalB) {
      const dot = seg.normalA[0] * seg.normalB[0] + seg.normalA[1] * seg.normalB[1] + seg.normalA[2] * seg.normalB[2];
      expect(Math.abs(dot)).toBeLessThan(0.01); // perpendicular
    }
  });
});

describe('resolveFaceQuery — v0.2-finish polish keys', () => {
  beforeAll(async () => { await initOcct(); });

  // byNormal ---------------------------------------------------------------

  it('byNormal: "Z" returns only the +Z face on a 10x10x10 box', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = resolveFaceQuery(box, { byNormal: 'Z' });
    expect(faces).toHaveLength(1);
    const n = faces[0].normalAt();
    expect(n.z).toBeCloseTo(1, 2);
  });

  it('byNormal: "-Z" returns only the -Z face on a 10x10x10 box', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = resolveFaceQuery(box, { byNormal: '-Z' });
    expect(faces).toHaveLength(1);
    const n = faces[0].normalAt();
    expect(n.z).toBeCloseTo(-1, 2);
  });

  it('byNormal: "X" returns only the +X face', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = resolveFaceQuery(box, { byNormal: 'X' });
    expect(faces).toHaveLength(1);
    const n = faces[0].normalAt();
    expect(n.x).toBeCloseTo(1, 2);
  });

  it('byNormal: "-X" returns only the -X face', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = resolveFaceQuery(box, { byNormal: '-X' });
    expect(faces).toHaveLength(1);
    const n = faces[0].normalAt();
    expect(n.x).toBeCloseTo(-1, 2);
  });

  it('byNormal: rejects invalid axis string at runtime', () => {
    const box = OcctBackend.box(10, 10, 10);
    // Cast to any to simulate an agent sending an invalid key
    expect(() => resolveFaceQuery(box, { byNormal: 'Q' as never })).toThrow();
  });

  // minArea ----------------------------------------------------------------

  it('minArea: filters out faces below threshold on a 20x10x5 box', () => {
    // top/bottom = 200mm², side-Y faces = 100mm², side-X faces = 50mm²
    // minArea: 150 should keep top+bottom only (2 faces)
    const box = OcctBackend.box(20, 10, 5);
    const faces = resolveFaceQuery(box, { minArea: 150 });
    expect(faces).toHaveLength(2);
    for (const f of faces) {
      expect(replicad.measureArea(f)).toBeGreaterThanOrEqual(150);
    }
  });

  it('minArea: 0 returns all faces', () => {
    const box = OcctBackend.box(20, 10, 5);
    const faces = resolveFaceQuery(box, { minArea: 0 });
    expect(faces).toHaveLength(6);
  });

  // maxArea ----------------------------------------------------------------

  it('maxArea: filters out faces above threshold on a 20x10x5 box', () => {
    // maxArea: 75 should keep only side-X faces (50mm²) = 2 faces
    const box = OcctBackend.box(20, 10, 5);
    const faces = resolveFaceQuery(box, { maxArea: 75 });
    expect(faces).toHaveLength(2);
    for (const f of faces) {
      expect(replicad.measureArea(f)).toBeLessThanOrEqual(75);
    }
  });

  // minArea + maxArea AND-combined -----------------------------------------

  it('minArea + maxArea AND-combined keeps only faces in the area range', () => {
    // 20x10x5 box: top/bottom=200, sideY=100, sideX=50
    // minArea:75, maxArea:150 → only sideY faces (100mm²) = 2 faces
    const box = OcctBackend.box(20, 10, 5);
    const faces = resolveFaceQuery(box, { minArea: 75, maxArea: 150 });
    expect(faces).toHaveLength(2);
    for (const f of faces) {
      const a = replicad.measureArea(f);
      expect(a).toBeGreaterThanOrEqual(75);
      expect(a).toBeLessThanOrEqual(150);
    }
  });

  // boundingBoxIn ----------------------------------------------------------

  it('boundingBoxIn: { zMin: 9.5, zMax: 10.5 } returns only the top face of a 10mm cube', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = resolveFaceQuery(box, { boundingBoxIn: { zMin: 9.5, zMax: 10.5 } });
    expect(faces).toHaveLength(1);
    const n = faces[0].normalAt();
    expect(n.z).toBeCloseTo(1, 1);
  });

  it('boundingBoxIn: { zMin: -0.5, zMax: 0.5 } returns only the bottom face of a 10mm cube', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = resolveFaceQuery(box, { boundingBoxIn: { zMin: -0.5, zMax: 0.5 } });
    expect(faces).toHaveLength(1);
    const n = faces[0].normalAt();
    expect(n.z).toBeCloseTo(-1, 1);
  });

  it('boundingBoxIn: rejects faces partially outside the region', () => {
    // { zMin: 3, zMax: 7 } — no face on a 10mm cube has its bbox fully inside this z range
    const box = OcctBackend.box(10, 10, 10);
    const faces = resolveFaceQuery(box, { boundingBoxIn: { zMin: 3, zMax: 7 } });
    expect(faces).toHaveLength(0);
  });

  it('boundingBoxIn: combines with byNormal to select a specific face', () => {
    const box = OcctBackend.box(10, 10, 10);
    const faces = resolveFaceQuery(box, { byNormal: 'Z', boundingBoxIn: { zMin: 9.5, zMax: 10.5 } });
    expect(faces).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// EdgeSegment.radius — the metric backing `ShapeList.sortBy('radius')`.
// Verified against real OCCT geometry, not a fixture, because the whole point
// is that the three-point circumradius solve agrees with the kernel.
// ---------------------------------------------------------------------------
describe('EdgeSegment.radius', () => {
  beforeAll(async () => { await initOcct(); });

  it('reports the exact radius on the circular edges of a cylinder', () => {
    const cyl = OcctBackend.cylinder(10, 4);
    const circles = selectEdges(cyl, {}).filter(e => e.curveType === 'CIRCLE');
    expect(circles.length).toBeGreaterThan(0);
    for (const c of circles) {
      expect(c.radius).toBeCloseTo(4, 6);
    }
  });

  it('distinguishes two different bore sizes on one solid', () => {
    const plate = OcctBackend.box(40, 20, 5);
    const smallBore = OcctBackend.cylinder(20, 2).translate(10, 10, -5);
    const bigBore = OcctBackend.cylinder(20, 5).translate(30, 10, -5);
    const drilled = plate.subtract(smallBore).subtract(bigBore);

    const radii = selectEdges(drilled, {})
      .filter(e => e.curveType === 'CIRCLE')
      .map(e => e.radius)
      .filter((r): r is number => r !== undefined)
      .map(r => Math.round(r * 1e6) / 1e6);

    expect(radii).toContain(2);
    expect(radii).toContain(5);
  });

  it('is absent (not approximated) on non-circular edges', () => {
    const box = OcctBackend.box(10, 10, 5);
    for (const e of selectEdges(box, {})) {
      expect(e.curveType).toBe('LINE');
      expect(e.radius).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// FIX-03 — one selector vocabulary, no silent selector failures.
// ---------------------------------------------------------------------------

/** 40×40×10 plate with a 10×10×3 pocket centred on the top face. Top-face
 *  edges at z=10: 4 outer perimeter edges + 4 pocket-rim edges. */
function pocketedPlate(): OcctBackend {
  return OcctBackend.box(40, 40, 10).subtract(OcctBackend.box(10, 10, 3).translate(15, 15, 7));
}

describe('FIX-03 EdgeQuery vocabulary', () => {
  beforeAll(async () => { await initOcct(); });

  it("parallel: 'Z' matches the same 4 vertical edges as parallel: [0,0,1]", () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(resolveEdgeQuery(box, { parallel: 'Z' })).toHaveLength(4);
    expect(resolveEdgeQuery(box, { parallel: '-Z' as never })).toHaveLength(4);
  });

  it('parallelTo is an alias of parallel on EdgeQuery', () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(resolveEdgeQuery(box, { parallelTo: 'X', atZ: 5 })).toHaveLength(2);
  });

  it('within: { min, max } is honoured (only the 4 pocket-rim edges at z=10)', () => {
    const plate = pocketedPlate();
    expect(resolveEdgeQuery(plate, { atZ: 10 })).toHaveLength(8);
    const rim = resolveEdgeQuery(plate, { atZ: 10, within: { min: [14, 14, 9], max: [26, 26, 11] } });
    expect(rim).toHaveLength(4);
  });

  it('an empty / misspelt within region throws instead of matching every edge', () => {
    const plate = pocketedPlate();
    expect(() => resolveEdgeQuery(plate, { atZ: 10, within: {} })).toThrow(/within/);
    expect(() => resolveEdgeQuery(plate, { within: { lo: [0, 0, 0] } } as never)).toThrow(/within/);
  });

  it('unknown keys and bad values throw feature.invalid-args', () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(() => resolveEdgeQuery(box, { atz: 5 } as never)).toThrow(/unknown key/);
    expect(() => resolveEdgeQuery(box, { parallel: 'up' } as never)).toThrow(/EdgeQuery: parallel/);
  });

  it('pocket-rim edges are classified convex (they used to read concave)', () => {
    const plate = pocketedPlate();
    const rim = selectEdges(plate, { atZ: 10, within: { min: [14, 14, 9], max: [26, 26, 11] } });
    expect(rim).toHaveLength(4);
    for (const e of rim) {
      expect(e.convex).toBe(true);
      expect(e.dihedralAngleDeg).toBeCloseTo(90, 6);
    }
    // Pocket-floor edges (z=7) are concave.
    const floor = selectEdges(plate, { atZ: 7 });
    expect(floor).toHaveLength(4);
    for (const e of floor) expect(e.convex).toBe(false);
    expect(resolveEdgeQuery(plate, { convex: true, atZ: 10 })).toHaveLength(8);
    expect(resolveEdgeQuery(plate, { concave: true })).toHaveLength(8); // floor + 4 vertical pocket corners
  });
});

describe('FIX-03 FaceQuery vocabulary', () => {
  beforeAll(async () => { await initOcct(); });

  it("ofSurfaceType: 'CYLINDER' matches the lateral face (OCCT calls it 'CYLINDRE')", () => {
    const cyl = OcctBackend.cylinder(20, 5);
    expect(resolveFaceQuery(cyl, { ofSurfaceType: 'CYLINDER' })).toHaveLength(1);
    expect(resolveFaceQuery(cyl, { ofSurfaceType: 'CYLINDRE' as never })).toHaveLength(1);
    expect(resolveFaceQuery(cyl, { ofSurfaceType: 'PLANE' })).toHaveLength(2);
  });

  it("accepts axis letters and the EdgeQuery spelling `parallel`", () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(resolveFaceQuery(box, { parallelTo: 'Z' })).toHaveLength(2);
    expect(resolveFaceQuery(box, { parallel: 'XY' })).toHaveLength(2);
    expect(resolveFaceQuery(box, { parallel: [1, 0, 0] })).toHaveLength(2);
  });

  it('containsPoint filters by distance to the trimmed face (it used to match every face)', () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(resolveFaceQuery(box, { containsPoint: [5, 5, 5] })).toHaveLength(1);
    expect(resolveFaceQuery(box, { containsPoint: [50, 50, 50] })).toHaveLength(0);
  });
});

describe('FIX-03 EdgeSegment circle data', () => {
  beforeAll(async () => { await initOcct(); });

  it('circular edges carry centre, axis-as-direction, unit normals and a real dihedral', () => {
    const cyl = OcctBackend.cylinder(10, 4); // h=10, r=4
    const circles = selectEdges(cyl, { ofCurveType: 'CIRCLE' });
    expect(circles).toHaveLength(2);
    for (const c of circles) {
      expect(c.radius).toBeCloseTo(4, 6);
      expect(c.center).toBeDefined();
      expect(Math.hypot(c.center![0], c.center![1])).toBeLessThan(1e-6);
      expect(Math.abs(c.axis![2])).toBeCloseTo(1, 9);
      expect(c.direction).toEqual(c.axis);
      expect(c.convex).toBe(true);
      expect(c.dihedralAngleDeg).toBeCloseTo(90, 6);
      expect(Math.hypot(...c.normalA!)).toBeCloseTo(1, 9);
      expect(Math.hypot(...c.normalB!)).toBeCloseTo(1, 9);
      expect(c.boundary).toBe(false);
    }
    const zs = circles.map((c) => c.center![2]).sort((a, b) => a - b);
    expect(zs[0]).toBeCloseTo(0, 6);
    expect(zs[1]).toBeCloseTo(10, 6);
  });

  it('the cylinder seam edge is not reported as an open boundary', () => {
    const cyl = OcctBackend.cylinder(10, 4);
    const seam = selectEdges(cyl, { ofCurveType: 'LINE' });
    expect(seam).toHaveLength(1);
    expect(seam[0].boundary).toBe(false);
  });
});
