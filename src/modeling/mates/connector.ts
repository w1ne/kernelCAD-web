//
// Connector primitive — named coordinate frame embedded in a part.
// Per spec `2026-05-11-assembly-mates-validator-design.md` §1. Origin
// can be a numeric Vec3 (this task) or a topology query (Task 2).
// Type tag governs which mates can attach (see mateTypes.ts).

import type { Vec3 } from '../../shared/intent/types';
import type { Shape } from '../capture/proxy';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { resolveTopologyOriginOnBackend } from '../backends/occt/connectorTopology';
import { parseTopoRef } from '../../kernel/naming';
import { KernelError } from '../../shared/intent/kernelError';

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

/** Capture-time input form for `Connector.origin`. Accepts the canonical
 *  structured `ConnectorOrigin` union OR a `@kc[<part>/<kind>/<name>]` string
 *  ref. The string form is normalised via `normalizeConnectorOriginInput`
 *  before the connector record is built. */
export type ConnectorOriginInput = ConnectorOrigin | string;

/**
 * Normalise a capture-time connector-origin input into the structured
 * `ConnectorOrigin` union.
 *
 * - Structured forms (`{ kind: 'vec3', ... }` / `{ kind: 'topology', ... }`)
 *   pass through unchanged.
 * - `@kc[<partName>/<kind>/<name>]` strings parse into a topology query.
 *   * `face` refs default to `face-center`; `#normal` modifier yields
 *     `face-normal`.
 *   * `edge` refs map to `edge-axis`.
 *   * `vertex` refs map to `vertex`.
 * - Any other string form (bare canonical names, dot-form refs, etc.) is
 *   rejected with `feature.invalid-args` — the only string acceptance at
 *   the capture-time origin slot is the `@kc[...]` ref form, so authors
 *   never accidentally bind a connector to a stale label string.
 *
 * The ref's `owner` must equal the `partName` argument. This pins
 * connectors to the part they live on (a `arm.part('servo')` connector
 * cannot reference `@kc[other/face/...]`) and prevents accidental cross-
 * part topology binding.
 */
export function normalizeConnectorOriginInput(
  input: ConnectorOriginInput,
  partName: string,
): ConnectorOrigin {
  if (typeof input !== 'string') {
    return input;
  }
  if (!input.startsWith('@kc[')) {
    throw new KernelError(
      'feature.invalid-args',
      `connector origin string '${input}' must be a @kc[...] topology ref.`,
      undefined,
      `Pass either a structured ConnectorOrigin ({ kind: 'vec3' | 'topology', ... }) or a @kc[<part>/face/<name>] / @kc[<part>/edge/<name>] / @kc[<part>/vertex/<name>] ref.`,
    );
  }
  const parsed = parseTopoRef(input);
  if ('error' in parsed) {
    throw new KernelError(
      'feature.invalid-args',
      `connector origin '${input}' is malformed: ${parsed.error}.`,
      undefined,
      `Topology refs use the @kc[owner/kind/name] grammar. ${parsed.error}.`,
    );
  }
  if (parsed.owner !== partName) {
    throw new KernelError(
      'feature.invalid-args',
      `connector origin '${input}' references part '${parsed.owner}', but the connector is being added to part '${partName}'.`,
      undefined,
      `Use a ref whose owner segment matches the part name: '@kc[${partName}/${parsed.kind}/<name>]'.`,
    );
  }
  const name = parsed.segments[parsed.segments.length - 1];
  if (name === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `connector origin '${input}' has no entity name segment.`,
      undefined,
      `Append a name segment: '@kc[${parsed.owner}/${parsed.kind}/<name>]'.`,
    );
  }
  if (parsed.kind === 'face') {
    const isNormal = parsed.modifier === 'normal';
    return {
      kind: 'topology',
      query: isNormal
        ? { kind: 'face-normal', name }
        : { kind: 'face-center', name },
    };
  }
  if (parsed.kind === 'edge') {
    return { kind: 'topology', query: { kind: 'edge-axis', name } };
  }
  if (parsed.kind === 'vertex') {
    return { kind: 'topology', query: { kind: 'vertex', name } };
  }
  throw new KernelError(
    'feature.invalid-args',
    `connector origin '${input}' has kind '${parsed.kind}'; expected face/edge/vertex.`,
    undefined,
    `Use a topology ref of kind face, edge, or vertex.`,
  );
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
 * The optional `records` argument is the capture session's
 * `FeatureRecord[]` (e.g. from `session.getRecords()`). When supplied, the
 * resolver can look up non-canonical face labels declared via the creating
 * op's `faceLabels` metadata (e.g. `box(10, 10, 10, false, { faceLabels:
 * { lid: 'top' } })`). When omitted, only the six canonical face names
 * resolve and any non-canonical name throws `topology-not-resolvable`.
 *
 * Throws an `Error` whose message starts with
 * `assembly.connector.topology-not-resolvable` when:
 *  - the named face/vertex/edge cannot be located on the shape, or
 *  - the query kind is not yet implemented in this slice.
 *
 * v0.6 T2 scope: `face-center` / `face-normal` resolve by canonical face name
 * or by a user-declared label from upstream `metadata.faceLabels` (when
 * `records` is supplied). `edge-axis` resolves canonical box edges
 * (`edge-<face>-<face>`) and canonical cylinder cap edges (`edge-top` /
 * `edge-bottom`). `vertex` is deferred to v0.7 (no vertex-labeling
 * infrastructure exists yet — see v0.7 followup). Callers convert the
 * thrown message into a structured `assembly.connector.topology-not-resolvable`
 * diagnostic in T8.
 */
export async function resolveConnectorOrigin(
  shape: Shape,
  origin: ConnectorOrigin,
  records?: readonly FeatureRecord[],
): Promise<{ kind: 'vec3'; value: Vec3 }> {
  if (origin.kind === 'vec3') {
    return { kind: 'vec3', value: origin.value };
  }
  const backend = await shape.lower();
  const value = resolveTopologyOriginOnBackend(backend, origin.query, {
    records,
    consumerId: shape.id,
  });
  return { kind: 'vec3', value };
}
