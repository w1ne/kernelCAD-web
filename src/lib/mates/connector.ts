//
// Connector primitive — named coordinate frame embedded in a part.
// Per spec `2026-05-11-assembly-mates-validator-design.md` §1. Origin
// can be a numeric Vec3 (this task) or a topology query (Task 2).
// Type tag governs which mates can attach (see mateTypes.ts).

import type { Vec3 } from '../../intent/types';

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
