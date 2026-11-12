// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { FeatureId } from '../../../../shared/intent/types';
import { Transform } from '../../../../shared/runtime/se3';
import type { AssemblyJointStored } from '../../../capture/assembly';
import { parseConnectorRef } from '../../../mates/mate';

/** Apply a moved parent's scene transform to a child placed with `connect:`.
 *  Capture bakes the initial connected placement into the child's `at`;
 *  connected children inherit later mate motion while independently placed
 *  mate and joint parts retain their solver transforms. */
export function propagateConnectedSolvedPartMotion(
  worldT: Map<FeatureId, Transform>,
  partIds: readonly FeatureId[],
  records: readonly FeatureRecord[],
  mates: readonly { a: string; b: string }[],
  joints: readonly AssemblyJointStored[],
): void {
  const jointPartIds = new Set<FeatureId>();
  for (const joint of joints) {
    jointPartIds.add(joint.parentPartId);
    jointPartIds.add(joint.childPartId);
  }
  propagateConnectedPartMotion(worldT, partIds, records, mates, jointPartIds);
}

export function propagateConnectedPartMotion(
  worldT: Map<FeatureId, Transform>,
  partIds: readonly FeatureId[],
  records: readonly FeatureRecord[],
  mates: readonly { a: string; b: string }[],
  jointPartIds: ReadonlySet<FeatureId> = new Set(),
): void {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const matedPartIds = matedPartIdsFor(partIds, records, mates);
  for (const partId of partIds) {
    if (matedPartIds.has(partId) || jointPartIds.has(partId)) continue;
    const parentId = connectedParentId(recordById.get(partId));
    const parentTransform = parentId === undefined ? undefined : worldT.get(parentId);
    if (parentTransform !== undefined) worldT.set(partId, parentTransform);
  }
}

function matedPartIdsFor(
  partIds: readonly FeatureId[],
  records: readonly FeatureRecord[],
  mates: readonly { a: string; b: string }[],
): Set<FeatureId> {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const idByName = new Map<string, FeatureId>();
  for (const partId of partIds) {
    const name = (recordById.get(partId)?.metadata as { partName?: string } | undefined)?.partName ?? partId;
    idByName.set(name, partId);
  }

  const mated = new Set<FeatureId>();
  for (const mate of mates) {
    const a = idByName.get(parseConnectorRef(mate.a).partName);
    const b = idByName.get(parseConnectorRef(mate.b).partName);
    if (a !== undefined) mated.add(a);
    if (b !== undefined) mated.add(b);
  }
  return mated;
}

function connectedParentId(partRec: FeatureRecord | undefined): FeatureId | undefined {
  return (partRec?.metadata as {
    placedBy?: { to?: { partId?: FeatureId } };
  } | undefined)?.placedBy?.to?.partId;
}
