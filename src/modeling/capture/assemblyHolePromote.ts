// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Promoted `bolt-holes-N` frames, and the one-time replace when the author
// declares the same name. Split out of assemblyParts.ts for the line budget.

import type { FeatureId } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import type { Connector } from '../mates/connector';
import { holeAxisAutoConnectorsForShape } from '../parts/holeAutoConnectors';
import type { Shape } from './proxy';
import type { CaptureSession } from './captureSession';
import type { AssemblyPartRef } from './assemblyTypes';

/** Names promoted from hole-axis autos. A later manual declare replaces these
 *  and then behaves like any other connector: a second declare throws. */
const promotedConnectorNames = new WeakMap<Connector[], Set<string>>();

function promotedNames(list: Connector[]): Set<string> {
  let names = promotedConnectorNames.get(list);
  if (names === undefined) {
    names = new Set();
    promotedConnectorNames.set(list, names);
  }
  return names;
}

/** Drop a promoted row so the caller can register a replacement. A name the
 *  author already declared throws `assembly.connector.duplicate-name`. */
export function takeConnectorSlot(
  mateConnectors: Connector[],
  connectorName: string,
  partName: string,
  id: FeatureId,
): void {
  const existing = mateConnectors.findIndex((connector) => connector.name === connectorName);
  if (existing < 0) return;
  const promoted = promotedNames(mateConnectors);
  if (!promoted.has(connectorName)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.connector.duplicate-name: part '${partName}' already has a connector named '${connectorName}'.`,
      id,
      `invalid-args.assembly.connector-duplicate-name — rename one of the connectors on '${partName}'.`,
    );
  }
  mateConnectors.splice(existing, 1);
  promoted.delete(connectorName);
}

/** Register authored hole-axis connectors on the part. Sub-assembly import
 *  passes `enabled: false` because it copies mate connectors itself. */
export function promoteAuthoredHoleConnectors(
  enabled: boolean,
  session: CaptureSession,
  shape: Shape,
  part: AssemblyPartRef,
): void {
  if (!enabled) return;
  const promoted = promotedNames(part.mateConnectors);
  for (const connector of holeAxisAutoConnectorsForShape(session.getRecords(), session.autoConnectors, shape.id)) {
    part.connector(connector.name, {
      type: 'frame',
      origin: { kind: 'topology', query: { kind: 'hole-axis', name: connector.topology.name } },
      normal: connector.axis,
    });
    promoted.add(connector.name);
  }
}
