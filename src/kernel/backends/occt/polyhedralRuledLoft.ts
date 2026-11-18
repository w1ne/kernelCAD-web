// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Fast path for loft({ ruled: true, faceted: true }) of matching polyline
// sections: a triangulated frustum instead of bilinear NURBS sides.

function vec3Of(point: { x?: number; y?: number; z?: number; toTuple?: () => number[] } | number[]): [number, number, number] {
  if (Array.isArray(point)) return [Number(point[0]), Number(point[1]), Number(point[2])];
  if (typeof point.toTuple === 'function') {
    const tuple = point.toTuple();
    return [Number(tuple[0]), Number(tuple[1]), Number(tuple[2])];
  }
  return [Number(point.x), Number(point.y), Number(point.z)];
}

function sub3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot3(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function centroid3(points: Array<[number, number, number]>): [number, number, number] {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
    z += p[2];
  }
  const n = points.length || 1;
  return [x / n, y / n, z / n];
}

/** Ordered LINE vertices of a lifted replicad Sketch wire, or null if any edge is curved. */
function polylinePointsFromLiftedSketch(sketch: unknown): Array<[number, number, number]> | null {
  const wire = (sketch as { wire?: { edges?: Array<{ geomType?: string; startPoint: unknown }> } })?.wire;
  const edges = wire?.edges;
  if (!Array.isArray(edges) || edges.length < 3) return null;
  const points: Array<[number, number, number]> = [];
  for (const edge of edges) {
    if (edge.geomType !== 'LINE') return null;
    const start = vec3Of(edge.startPoint as never);
    if (!start.every(Number.isFinite)) return null;
    points.push(start);
  }
  return points.length >= 3 ? points : null;
}

function sectionIsConvex(points: Array<[number, number, number]>): boolean {
  const n = points.length;
  if (n < 3) return false;
  const ref = cross3(sub3(points[1]!, points[0]!), sub3(points[2]!, points[0]!));
  if (ref[0] ** 2 + ref[1] ** 2 + ref[2] ** 2 < 1e-18) return false;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    const c = points[(i + 2) % n]!;
    const trip = dot3(ref, cross3(sub3(b, a), sub3(c, b)));
    if (Math.abs(trip) < 1e-12) continue;
    const s = trip > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/**
 * Build a triangulated frustum from matching polyline sections.
 * `loft({ ruled: true })` is documented as the polyhedral path; ThruSections
 * still produces bilinear NURBS sides when the sections are not similar,
 * which makes later boolean/tessellation much more expensive than planar
 * triangles spanning the same corresponding edges.
 */
function polyhedralSolidFromSections(
  sectionsIn: Array<Array<[number, number, number]>>,
): { vertices: Float32Array; indices: Uint32Array } | null {
  if (sectionsIn.length < 2) return null;
  const count = sectionsIn[0]!.length;
  if (count < 3 || sectionsIn.some((s) => s.length !== count || !sectionIsConvex(s))) {
    return null;
  }
  const sections = sectionsIn.map((s) => s.map((p) => [...p] as [number, number, number]));
  const loftDir = sub3(centroid3(sections[sections.length - 1]!), centroid3(sections[0]!));
  if (loftDir[0] ** 2 + loftDir[1] ** 2 + loftDir[2] ** 2 < 1e-18) return null;
  const n0 = cross3(sub3(sections[0]![1]!, sections[0]![0]!), sub3(sections[0]![2]!, sections[0]![0]!));
  if (dot3(n0, loftDir) < 0) {
    for (const sec of sections) sec.reverse();
  }

  const vertices = new Float32Array(sections.length * count * 3);
  for (let s = 0; s < sections.length; s++) {
    for (let i = 0; i < count; i++) {
      const o = (s * count + i) * 3;
      vertices[o] = sections[s]![i]![0];
      vertices[o + 1] = sections[s]![i]![1];
      vertices[o + 2] = sections[s]![i]![2];
    }
  }
  const idx: number[] = [];
  const indexAt = (section: number, i: number) => section * count + i;
  // Start cap faces backward (opposite loftDir).
  for (let i = 1; i < count - 1; i++) {
    idx.push(indexAt(0, 0), indexAt(0, i + 1), indexAt(0, i));
  }
  // End cap faces forward.
  const last = sections.length - 1;
  for (let i = 1; i < count - 1; i++) {
    idx.push(indexAt(last, 0), indexAt(last, i), indexAt(last, i + 1));
  }
  for (let s = 0; s < sections.length - 1; s++) {
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const a = indexAt(s, i);
      const b = indexAt(s, j);
      const c = indexAt(s + 1, j);
      const d = indexAt(s + 1, i);
      idx.push(a, b, c, a, c, d);
    }
  }
  return { vertices, indices: new Uint32Array(idx) };
}

export function tryPolyhedralRuledLoft(
  lifted: unknown[],
): { vertices: Float32Array; indices: Uint32Array } | null {
  const sections = lifted.map(polylinePointsFromLiftedSketch);
  if (!sections.every((section): section is Array<[number, number, number]> => section !== null)) {
    return null;
  }
  return polyhedralSolidFromSections(sections);
}

export function completeLoftFromLifted<T>(
  lifted: unknown[],
  opts: {
    ruled?: boolean;
    faceted?: boolean;
    startPoint?: [number, number, number];
    endPoint?: [number, number, number];
  },
  fromTriangleMesh: (vertices: Float32Array, indices: Uint32Array) => T,
  wrap: (shape: unknown) => T,
): T {
  const [first, ...rest] = lifted;
  const loftConfig: { ruled?: boolean; startPoint?: unknown; endPoint?: unknown } = {};
  if (opts.ruled !== undefined) loftConfig.ruled = opts.ruled;
  if (opts.startPoint) loftConfig.startPoint = opts.startPoint;
  if (opts.endPoint) loftConfig.endPoint = opts.endPoint;
  if (opts.faceted === true && opts.ruled === true && !opts.startPoint && !opts.endPoint) {
    const mesh = tryPolyhedralRuledLoft(lifted);
    if (mesh !== null) {
      try {
        return fromTriangleMesh(mesh.vertices, mesh.indices);
      } catch {
        // Fall through to loftWith if sewing rejects the mesh.
      }
    }
  }
  const lofted = (first as { loftWith: (others: unknown[], cfg: typeof loftConfig) => unknown })
    .loftWith(rest, loftConfig);
  return wrap(lofted);
}
