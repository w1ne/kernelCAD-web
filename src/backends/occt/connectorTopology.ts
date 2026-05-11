// src/backends/occt/connectorTopology.ts
//
// Resolve a `TopologyQuery` against a lowered OcctBackend, returning a
// concrete `Vec3`. Used by `resolveConnectorOrigin` in
// `src/lib/mates/connector.ts` to ground topology-bound connector origins
// during assembly capture / validation.
//
// v0.6 T2 scope (this slice):
//   - `face-center` / `face-normal` — resolve by canonical face name on a
//     primitive (`top` / `bottom` / `left` / `right` / `front` / `back`).
//     Returns the face centroid (replicad `face.center`).
//   - `vertex` / `edge-axis` — typed but unimplemented in this slice; throws
//     `assembly.connector.topology-not-resolvable`. Followup in v0.6.x.
//
// All failure paths throw an Error whose message starts with
// `assembly.connector.topology-not-resolvable` so the caller (`mate()` etc.)
// can convert it into the structured `assembly.connector.topology-not-resolvable`
// diagnostic in T8 of the v0.6 plan.

import type { Face } from 'replicad';
import type { Vec3 } from '../../intent/types';
import type { OcctBackend } from './occtBackend';
import type { TopologyQuery } from '../../lib/mates/connector';

const CANONICAL_FACES = new Set(['top', 'bottom', 'left', 'right', 'front', 'back']);

// Centroid tolerance for matching a face to a canonical bounding-box plane.
// Matches the tolerance used in `edgeSelection.findFaceByPlane`.
const TOL = 1e-4;

/**
 * Resolve `query` against `backend` and return the resulting Vec3.
 *
 * Throws on unresolvable queries; the message always starts with
 * `assembly.connector.topology-not-resolvable`.
 */
export function resolveTopologyOriginOnBackend(
  backend: OcctBackend,
  query: TopologyQuery,
): Vec3 {
  switch (query.kind) {
    case 'face-center':
    case 'face-normal': {
      // `face-normal`'s normal direction lives on the Connector's `normal`
      // field; the origin we return here is the face centroid (same as
      // `face-center`). See spec §1.
      const face = findFaceByName(backend, query.name);
      if (face === null) {
        throw new Error(
          `assembly.connector.topology-not-resolvable: face '${query.name}' not found on shape (kind='${backend.kind ?? 'composite'}').`,
        );
      }
      return faceCentroid(face);
    }
    case 'vertex': {
      // v0.6 T2 stub: vertex labels have no resolver yet. Followup in v0.6.x.
      throw new Error(
        `assembly.connector.topology-not-resolvable: vertex query '${query.name}' is not implemented in this slice (v0.6 T2).`,
      );
    }
    case 'edge-axis': {
      // v0.6 T2 stub: edge labels have no resolver yet. Followup in v0.6.x.
      throw new Error(
        `assembly.connector.topology-not-resolvable: edge-axis query '${query.name}' is not implemented in this slice (v0.6 T2).`,
      );
    }
  }
  // Exhaustiveness — TypeScript should already have caught this.
  const _exhaustive: never = query;
  throw new Error(
    `assembly.connector.topology-not-resolvable: unknown query kind '${(_exhaustive as { kind?: string }).kind ?? '<unknown>'}'.`,
  );
}

/**
 * Locate a face on a primitive shape by canonical name. Returns null if the
 * name is not a canonical face, or no face on the shape matches the expected
 * bounding-box plane within TOL.
 *
 * Mirrors the centroid-matching logic in
 * `src/backends/occt/edgeSelection.findCanonicalFace` (which is private to
 * that module) for the primitive-without-historyMap case. Sufficient for
 * resolving connector origins on raw primitives in v0.6 T2.
 */
function findFaceByName(backend: OcctBackend, name: string): Face | null {
  if (!CANONICAL_FACES.has(name)) {
    return null;
  }
  const plane = pickFacePlane(backend.boundingBox(), name as CanonicalFaceName);
  if (plane === null) return null;
  const shape = backend.getReplicadShape();
  for (const face of shape.faces) {
    const c = face.center;
    const cv = plane.axisIndex === 0 ? c.x : plane.axisIndex === 1 ? c.y : c.z;
    if (Math.abs(cv - plane.value) < TOL) {
      return face;
    }
  }
  return null;
}

function faceCentroid(face: Face): Vec3 {
  const c = face.center;
  return [c.x, c.y, c.z];
}

type CanonicalFaceName = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
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
