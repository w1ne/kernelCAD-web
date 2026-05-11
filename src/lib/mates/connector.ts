//
// Connector primitive — named coordinate frame embedded in a part.
// Per spec `2026-05-11-assembly-mates-validator-design.md` §1. Origin
// can be a numeric Vec3 (this task) or a topology query (Task 2).
// Type tag governs which mates can attach (see mateTypes.ts).

import type { Vec3 } from '../../intent/types';
import type { Shape } from '../../capture/proxy';
import { resolveTopologyOriginOnBackend } from '../../backends/occt/connectorTopology';

export type ConnectorType = 'frame' | 'axis' | 'planar' | 'ball';

export type ConnectorOrigin =
  | { kind: 'vec3'; value: Vec3 }
  | { kind: 'topology'; query: TopologyQuery };

export type TopologyQuery =
  | { kind: 'face-center'; name: string }
  | { kind: 'face-normal'; name: string }
  | { kind: 'vertex'; name: string }
  | { kind: 'edge-axis'; name: string };

export interface Connector {
  readonly name: string;
  readonly type: ConnectorType;
  readonly origin: ConnectorOrigin;
  /** Set on `axis` connectors. Defaults to +Z when omitted. */
  readonly axis?: Vec3;
  /** Set on `frame` and `planar` connectors. Defaults to +Z when omitted. */
  readonly normal?: Vec3;
}

export interface MakeConnectorInput {
  name: string;
  type: ConnectorType;
  origin: ConnectorOrigin;
  axis?: Vec3;
  normal?: Vec3;
}

export function makeConnector(input: MakeConnectorInput): Connector {
  if (input.name.length === 0) {
    throw new Error('connector name must be non-empty');
  }
  return {
    name: input.name,
    type: input.type,
    origin: input.origin,
    axis: input.axis,
    normal: input.normal,
  };
}

/**
 * Resolve a `ConnectorOrigin` against a part's `Shape`.
 *
 * - For `vec3` origins, returns the value unchanged.
 * - For `topology` origins, lowers the shape and resolves the query against
 *   the underlying OCCT geometry, returning a concrete `{ kind: 'vec3' }`.
 *
 * Throws an `Error` whose message starts with
 * `assembly.connector.topology-not-resolvable` when:
 *  - the named face/vertex/edge cannot be located on the shape, or
 *  - the query kind is not yet implemented in this slice.
 *
 * v0.6 T2 scope: `face-center` / `face-normal` are implemented and resolve a
 * face by its canonical name (`top` / `bottom` / `left` / `right` / `front` /
 * `back`) on primitive shapes. `vertex` and `edge-axis` are typed but throw
 * `topology-not-resolvable` — full label/vertex/edge resolution is followup
 * work for v0.6.x. Callers convert the thrown message into a structured
 * `assembly.connector.topology-not-resolvable` diagnostic in T8.
 */
export async function resolveConnectorOrigin(
  shape: Shape,
  origin: ConnectorOrigin,
): Promise<{ kind: 'vec3'; value: Vec3 }> {
  if (origin.kind === 'vec3') {
    return { kind: 'vec3', value: origin.value };
  }
  const backend = await shape.lower();
  const value = resolveTopologyOriginOnBackend(backend, origin.query);
  return { kind: 'vec3', value };
}
