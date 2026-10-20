// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Seam selection for `filletIntersection(body, cutter, r)`.
 *
 * A boolean cut leaves the seam edges in the result but gives them no durable
 * user-facing ID. The one geometric relation that is stable is the exact
 * intersection of the operands: `body ∩ cutter`. This module builds that
 * section with `BRepAlgoAPI_Section` and returns the body edges whose minimum
 * distance to the section is within tolerance.
 *
 * Hashing is session-local (OCCT `TopoDS_Shape::HashCode`), which is exactly
 * what the lowerer needs: selection happens on the same lowered body that the
 * history-aware fillet will consume.
 */
import { getOC } from 'replicad';
import type { OcctBackend } from './occtBackend';
import { computeDihedralPublic } from './edgeQueries';

const HASH_UPPER = 2147483647;
const DEFAULTS = { toleranceMm: 0.05, minLengthMm: 0 } as const;

export interface SeamEdge {
  /** Session-local OCCT edge hash, resolvable on the same body. */
  hash: string;
  /** Edge length in mm. */
  lengthMm: number;
}

export interface IntersectionSeamResult {
  /** Number of edges produced by the exact body ∩ cutter section. */
  sectionEdgeCount: number;
  /** Every body edge within tolerance of the section. */
  matched: SeamEdge[];
  /** Matched edges shorter than `2 * radius` (they may be skipped on retry). */
  short: SeamEdge[];
}

export interface FindSeamOptions {
  toleranceMm?: number;
  radius: number;
}

function wrappedOf(shape: OcctBackend): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (shape.getReplicadShape() as any).wrapped as unknown;
}

function buildSection(bodyShape: unknown, cutterShape: unknown): unknown | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const section = new oc.BRepAlgoAPI_Section_3(bodyShape, cutterShape, false);
  const progress = new oc.Message_ProgressRange_1();
  try {
    section.ComputePCurveOn1(false);
    section.Approximation(true);
    section.Build(progress);
    if (!section.IsDone()) return null;
    return section.Shape();
  } finally {
    section.delete?.();
    progress.delete?.();
  }
}

function edgeLength(edge: unknown): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const props = new oc.GProp_GProps_1();
  try {
    oc.BRepGProp.LinearProperties(edge, props, false, false);
    const length = props.Mass();
    return Number.isFinite(length) ? length : 0;
  } finally {
    props.delete?.();
  }
}

function distancePointToShape(point: { X: () => number; Y: () => number; Z: () => number }, shape: unknown, deflection: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const pnt = new oc.gp_Pnt_3(point.X(), point.Y(), point.Z());
  const maker = new oc.BRepBuilderAPI_MakeVertex(pnt);
  const vertex = maker.Vertex();
  const dist = new oc.BRepExtrema_DistShapeShape_1();
  const progress = new oc.Message_ProgressRange_1();
  try {
    dist.LoadS1(vertex);
    dist.LoadS2(shape);
    dist.SetDeflection(Math.max(deflection, 1e-6));
    dist.Perform(progress);
    if (!dist.IsDone() || dist.NbSolution() < 1) return Number.POSITIVE_INFINITY;
    return dist.Value();
  } finally {
    vertex.delete?.();
    maker.delete?.();
    pnt.delete?.();
    dist.delete?.();
    progress.delete?.();
  }
}

/**
 * True when the edge runs along the section for its whole length, not merely
 * touches it at a vertex. The cylinder-bore wall's vertical seam touches both
 * section circles at its endpoints but is not part of the seam; sampling the
 * interior rejects it.
 */
function edgeRunsOnSection(edge: unknown, sectionShape: unknown, toleranceMm: number): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const curve = new oc.BRepAdaptor_Curve_2(edge);
  try {
    const first = curve.FirstParameter();
    const last = curve.LastParameter();
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const point = curve.Value(first + (last - first) * t);
      const d = distancePointToShape(point, sectionShape, toleranceMm);
      if (d > toleranceMm) return false;
    }
    return true;
  } finally {
    curve.delete?.();
  }
}

function distanceTo(edge: unknown, shape: unknown, deflection: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const dist = new oc.BRepExtrema_DistShapeShape_1();
  const progress = new oc.Message_ProgressRange_1();
  try {
    dist.LoadS1(edge);
    dist.LoadS2(shape);
    dist.SetDeflection(Math.max(deflection, 1e-6));
    dist.Perform(progress);
    if (!dist.IsDone() || dist.NbSolution() < 1) return Number.POSITIVE_INFINITY;
    return dist.Value();
  } finally {
    dist.delete?.();
    progress.delete?.();
  }
}

/** Collect the body edges that lie on the exact `body ∩ cutter` curve. */
export function findIntersectionSeamEdges(
  body: OcctBackend,
  cutter: OcctBackend,
  opts: FindSeamOptions,
): IntersectionSeamResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const toleranceMm = opts.toleranceMm ?? DEFAULTS.toleranceMm;
  const bodyShape = wrappedOf(body);
  const cutterShape = wrappedOf(cutter);
  const sectionShape = buildSection(bodyShape, cutterShape);
  if (sectionShape === null) {
    return { sectionEdgeCount: 0, matched: [], short: [] };
  }

  // Count the section edges so an empty section and a section with no matching
  // body edge produce different diagnostics.
  const sectionExplorer = new oc.TopExp_Explorer_2(
    sectionShape,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let sectionEdgeCount = 0;
  try {
    while (sectionExplorer.More()) {
      sectionEdgeCount++;
      sectionExplorer.Next();
    }
  } finally {
    sectionExplorer.delete?.();
  }

  // Map hashes to replicad edges so the dihedral probe (which needs the
  // owning shape's face list) can reject smooth parametric seams. The bore
  // wall's vertical seam lies on the cylinder surface and is reported by the
  // section, but it is not a cut edge and must never be filleted.
  const replicadShape = body.getReplicadShape();
  const edgeByHash = new Map<string, import('replicad').Edge>();
  for (const edge of replicadShape.edges) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = ((edge as any).wrapped as { HashCode: (n: number) => number }).HashCode(HASH_UPPER).toString(16);
    edgeByHash.set(h, edge);
  }
  const matched: SeamEdge[] = [];
  const short: SeamEdge[] = [];
  const seen = new Set<string>();
  const explorer = new oc.TopExp_Explorer_2(
    bodyShape,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (explorer.More()) {
      const raw = explorer.Current();
      const edge = oc.TopoDS.Edge_1(raw);
      const hash = (raw as { HashCode: (n: number) => number }).HashCode(HASH_UPPER).toString(16);
      if (seen.has(hash)) {
        explorer.Next();
        continue;
      }
      seen.add(hash);
      // An edge may touch the section at its endpoints (e.g. the bore wall's
      // vertical seam) without lying on it. Sample the interior too.
      const d = distanceTo(edge, sectionShape, toleranceMm);
      if (d <= toleranceMm && edgeRunsOnSection(edge, sectionShape, toleranceMm)) {
        const replicadEdge = edgeByHash.get(hash);
        const dihedral = replicadEdge
          ? computeDihedralPublic(replicadShape as unknown as { faces: import('replicad').Face[] }, replicadEdge, { convexity: false })
          : null;
        // null = the parametric seam of a cylinder/cone/sphere (normal probe
        // cannot decide); >= 175° = already smooth. Neither is a boolean cut
        // seam, so do not fillet it.
        if (dihedral === null || dihedral.angleDeg >= 175) {
          explorer.Next();
          continue;
        }
        const lengthMm = edgeLength(edge);
        const item: SeamEdge = { hash, lengthMm };
        matched.push(item);
        if (lengthMm < 2 * opts.radius) short.push(item);
      }
      explorer.Next();
    }
  } finally {
    explorer.delete?.();
  }
  return { sectionEdgeCount, matched, short };
}
