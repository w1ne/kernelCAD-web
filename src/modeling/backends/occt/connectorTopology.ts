// src/backends/occt/connectorTopology.ts
//
// Resolve a `TopologyQuery` against a lowered OcctBackend, returning a
// concrete `Vec3`. Used by `resolveConnectorOrigin` in
// `src/lib/mates/connector.ts` to ground topology-bound connector origins
// during assembly capture / validation.
//
// v0.6 T2 scope (this slice):
//   - `face-center` / `face-normal` — resolve by canonical face name on a
//     primitive (`top` / `bottom` / `left` / `right` / `front` / `back`) or
//     by a user-defined label declared in an upstream feature's
//     `metadata.faceLabels` (when `records` are supplied). Returns the face
//     centroid (replicad `face.center`).
//   - `edge-axis` — resolve canonical box edges by name
//     (`edge-<face>-<face>`, e.g. `edge-top-front`) or canonical cylinder
//     cap edges (`edge-top` / `edge-bottom`). Returns the edge midpoint.
//   - `vertex` — typed but unimplemented (no vertex-labeling infrastructure
//     yet). Deferred to v0.7. Throws `topology-not-resolvable` with a clear
//     `vertex labeling not yet supported` message.
//
// All failure paths throw an Error whose message starts with
// `assembly.connector.topology-not-resolvable` so the caller (`mate()` etc.)
// can convert it into the structured `assembly.connector.topology-not-resolvable`
// diagnostic in T8 of the v0.6 plan.
//
// Composite/post-boolean shapes: `boundingBox()` survives `.translate` /
// `.rotate` correctly (transforms are baked into the lowered shape and the
// bbox tracks them). Post-boolean cases where the canonical face/edge was
// split or removed are NOT handled here — the caller sees a clean
// `topology-not-resolvable` miss with hint to use a vertex or label that
// was declared upstream. Full historyMap-based resolution after booleans is
// a v0.7 problem and out of scope for T2.

import type { Edge, Face } from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';
import type { FeatureId } from '../../../shared/intent/types';
import type { FeatureRecord, FaceLabelsMap, CanonicalFace } from '../../../shared/intent/featureRecord';
import type { FaceQuery } from '../../../kernel/backends/occt/edgeQueries';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { TopologyQuery } from '../../mates/connector';
import { resolveFaceQuery } from '../../../kernel/backends/occt/edgeQueries';

type CanonicalFaceName = CanonicalFace;

const CANONICAL_FACES = new Set<CanonicalFaceName>([
  'top', 'bottom', 'left', 'right', 'front', 'back',
]);

// Centroid tolerance for matching a face to a canonical bounding-box plane.
// Matches the tolerance used in `edgeSelection.findFaceByPlane`.
const TOL = 1e-4;

/** Context passed in from `resolveConnectorOrigin` so the resolver can walk
 *  upstream feature records for label lookups. Both fields are optional —
 *  when absent, only canonical names resolve (suitable for unit tests with
 *  no session). */
export interface TopologyResolutionContext {
  /** Feature records from the capture session, ordered oldest → newest. */
  records?: readonly FeatureRecord[];
  /** ID of the consumer shape (the Connector's parent shape). Used to scope
   *  the upstream walk so labels declared after the consumer are ignored. */
  consumerId?: FeatureId;
}

/**
 * Resolve `query` against `backend` and return the resulting Vec3.
 *
 * Throws on unresolvable queries; the message always starts with
 * `assembly.connector.topology-not-resolvable`.
 */
export function resolveTopologyOriginOnBackend(
  backend: OcctBackend,
  query: TopologyQuery,
  ctx: TopologyResolutionContext = {},
): Vec3 {
  switch (query.kind) {
    case 'face-center':
    case 'face-normal': {
      // `face-normal`'s normal direction lives on the Connector's `normal`
      // field; the origin we return here is the face centroid (same as
      // `face-center`). See spec §1.
      const face = findFaceByName(backend, query.name, ctx);
      if (face === null) {
        throw new Error(
          `assembly.connector.topology-not-resolvable: face '${query.name}' not found on shape (kind='${backend.kind ?? 'composite'}').`,
        );
      }
      return faceCentroid(face);
    }
    case 'vertex': {
      // Deferred to v0.7. There is no vertex-labeling infrastructure today
      // (faceLabels has no edgeLabels/vertexLabels analog), and the
      // workhorse use cases — face centers and edge axes — cover what
      // OnShape's `evMateConnector` solves for assemblies. See CHANGELOG.
      throw new Error(
        `assembly.connector.topology-not-resolvable: vertex labeling not yet supported (query '${query.name}'). Deferred to v0.7 — use a face-center or edge-axis query instead.`,
      );
    }
    case 'edge-axis': {
      const edge = findEdgeByName(backend, query.name);
      if (edge === null) {
        throw new Error(
          `assembly.connector.topology-not-resolvable: edge '${query.name}' not found on shape (kind='${backend.kind ?? 'composite'}'). Use 'edge-<face1>-<face2>' (e.g. 'edge-top-front') for box edges or 'edge-top'/'edge-bottom' for cylinder caps.`,
        );
      }
      return edgeMidpoint(edge);
    }
  }
  // Exhaustiveness — TypeScript should already have caught this.
  const _exhaustive: never = query;
  throw new Error(
    `assembly.connector.topology-not-resolvable: unknown query kind '${(_exhaustive as { kind?: string }).kind ?? '<unknown>'}'.`,
  );
}

// ─── face resolution ─────────────────────────────────────────────────────────

/**
 * Locate a face by canonical name OR by a user-declared label in an upstream
 * feature's `metadata.faceLabels`.
 *
 * - Canonical name (`top` / `bottom` / `left` / `right` / `front` / `back`):
 *   matches against the bounding-box plane (mirrors
 *   `edgeSelection.findCanonicalFace`).
 * - Label declared via `box(..., { faceLabels: { lid: 'top' } })`:
 *   resolved through the upstream record's faceLabels map. The map's value
 *   is either a `CanonicalFace` string or a `FaceQuery`; both are supported.
 *
 * Returns null on miss. Caller raises the
 * `assembly.connector.topology-not-resolvable` error.
 */
function findFaceByName(
  backend: OcctBackend,
  name: string,
  ctx: TopologyResolutionContext,
): Face | null {
  if (CANONICAL_FACES.has(name as CanonicalFaceName)) {
    return findCanonicalFace(backend, name as CanonicalFaceName);
  }
  // Non-canonical name → must be a user-declared label. Need records.
  if (!ctx.records || ctx.records.length === 0) {
    return null;
  }
  const resolved = lookupFaceLabel(ctx.records, ctx.consumerId, name);
  if (resolved === null) return null;
  if (typeof resolved === 'string') {
    // Canonical alias from the label map.
    if (!CANONICAL_FACES.has(resolved as CanonicalFaceName)) return null;
    return findCanonicalFace(backend, resolved as CanonicalFaceName);
  }
  // FaceQuery from the label map. Resolve against the lowered shape; require
  // exactly one match (multiple matches are ambiguous for a connector origin).
  const matched = resolveFaceQuery(backend, resolved);
  if (matched.length !== 1) return null;
  return matched[0];
}

function findCanonicalFace(
  backend: OcctBackend,
  face: CanonicalFaceName,
): Face | null {
  const plane = pickFacePlane(backend.boundingBox(), face);
  if (plane === null) return null;
  const shape = backend.getReplicadShape();
  for (const f of shape.faces) {
    const c = f.center;
    const cv = plane.axisIndex === 0 ? c.x : plane.axisIndex === 1 ? c.y : c.z;
    if (Math.abs(cv - plane.value) < TOL) {
      return f;
    }
  }
  return null;
}

function faceCentroid(face: Face): Vec3 {
  const c = face.center;
  return [c.x, c.y, c.z];
}

/** Walk upstream records (up to and including the consumer) and return the
 *  `faceLabels[name]` value declared by the most recent upstream feature.
 *  Returns null if no upstream record declares `name`. */
function lookupFaceLabel(
  records: readonly FeatureRecord[],
  consumerId: FeatureId | undefined,
  name: string,
): CanonicalFace | FaceQuery | null {
  // Walk in declaration order so the latest declaration wins. Bound the walk
  // at the consumer so labels declared after the connector's shape don't
  // leak in.
  let resolved: CanonicalFace | FaceQuery | null = null;
  for (const rec of records) {
    const fl = (rec.metadata as { faceLabels?: FaceLabelsMap } | undefined)?.faceLabels;
    if (fl && Object.prototype.hasOwnProperty.call(fl, name)) {
      resolved = fl[name] as CanonicalFace | FaceQuery;
    }
    if (consumerId !== undefined && rec.id === consumerId) break;
  }
  return resolved;
}

interface FacePlane { axisIndex: 0 | 1 | 2; value: number; }

function pickFacePlane(
  bb: { min: Vec3; max: Vec3 },
  face: CanonicalFaceName,
): FacePlane | null {
  switch (face) {
    case 'top':    return { axisIndex: 2, value: bb.max[2] };
    case 'bottom': return { axisIndex: 2, value: bb.min[2] };
    case 'right':  return { axisIndex: 0, value: bb.max[0] };
    case 'left':   return { axisIndex: 0, value: bb.min[0] };
    case 'back':   return { axisIndex: 1, value: bb.max[1] };
    case 'front':  return { axisIndex: 1, value: bb.min[1] };
  }
}

// ─── edge resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a named edge to its midpoint via two intersecting canonical faces.
 *
 * Accepted name forms:
 *   - `edge-<face1>-<face2>` (box): the edge that lies on both canonical
 *     faces. Order is insignificant (`edge-top-front` ≡ `edge-front-top`).
 *   - `edge-top` / `edge-bottom` (cylinder): the circular cap edge.
 *
 * Returns null on miss; caller raises `topology-not-resolvable`.
 */
function findEdgeByName(backend: OcctBackend, name: string): Edge | null {
  if (!name.startsWith('edge-')) return null;
  const rest = name.slice('edge-'.length); // e.g. 'top-front' or 'top'
  const parts = rest.split('-').filter(p => p.length > 0);

  if (parts.length === 1) {
    // Cylinder cap edge (`edge-top` / `edge-bottom`).
    const f = parts[0] as CanonicalFaceName;
    if (!CANONICAL_FACES.has(f)) return null;
    if (backend.kind !== 'cylinder') return null;
    if (f !== 'top' && f !== 'bottom') return null;
    const face = findCanonicalFace(backend, f);
    if (face === null) return null;
    // A cylinder cap is a single circular face; its outer edge is the cap edge.
    const edges = (face as unknown as { edges?: Edge[] }).edges ?? [];
    return edges.length > 0 ? edges[0] : null;
  }

  if (parts.length === 2) {
    // Box edge: intersection of two canonical faces.
    const [a, b] = parts as [CanonicalFaceName, CanonicalFaceName];
    if (!CANONICAL_FACES.has(a) || !CANONICAL_FACES.has(b)) return null;
    // The two faces must define a real edge (i.e. their bounding planes must
    // share an axis-perpendicular intersection — not e.g. top+bottom).
    const faceA = findCanonicalFace(backend, a);
    const faceB = findCanonicalFace(backend, b);
    if (faceA === null || faceB === null) return null;
    const eA = (faceA as unknown as { edges?: Edge[] }).edges ?? [];
    const eB = (faceB as unknown as { edges?: Edge[] }).edges ?? [];
    // Find an edge that appears on both faces (endpoint match within TOL).
    for (const ea of eA) {
      for (const eb of eB) {
        if (isSameEdgeApprox(ea, eb)) return ea;
      }
    }
    return null;
  }

  return null;
}

function isSameEdgeApprox(a: Edge, b: Edge): boolean {
  const ap1 = a.startPoint, ap2 = a.endPoint;
  const bp1 = b.startPoint, bp2 = b.endPoint;
  const eq = (
    p: { x: number; y: number; z: number },
    q: { x: number; y: number; z: number },
  ): boolean =>
    Math.abs(p.x - q.x) < TOL && Math.abs(p.y - q.y) < TOL && Math.abs(p.z - q.z) < TOL;
  return (eq(ap1, bp1) && eq(ap2, bp2)) || (eq(ap1, bp2) && eq(ap2, bp1));
}

function edgeMidpoint(edge: Edge): Vec3 {
  const s = edge.startPoint;
  const e = edge.endPoint;
  return [(s.x + e.x) / 2, (s.y + e.y) / 2, (s.z + e.z) / 2];
}
