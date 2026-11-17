// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `subAssembly()` copies each part's resolved `at`. A connected child also
// keeps a link to its parent. That link's part id belongs to the child
// assembly, so the import points it at the copied parent instead of
// recomputing `at`. The lowered scene reads the link from the part
// feature's `placedBy` metadata; the capture scene reads `connectParentId`.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';
import type { AssemblyState } from './assemblyState';
import type { CaptureSession } from './captureSession';
import type { AssemblyPartRef, AssemblyPartStored } from './assemblyTypes';

const IMPORT_EXAMPLE = "parent.subAssembly('nest', child)";

interface PlacedByLink {
  readonly connector: string;
  readonly to: { readonly partId: string; readonly partName: string; readonly connector: string };
}

export function assertImportedConnectParents(parts: readonly AssemblyPartStored[]): void {
  const ids = new Set(parts.map((part) => part.id));
  for (const part of parts) {
    if (part.connectParentId === undefined || ids.has(part.connectParentId)) continue;
    invalidArgs({
      api: 'subAssembly(name, other)',
      path: 'connect',
      gotText: `part '${part.name}' connects to a part this import does not copy`,
      requires: 'the connected parent to be copied in the same import',
      example: IMPORT_EXAMPLE,
      hintSlug: 'invalid-args.assembly.connect-parent-missing',
    });
  }
}

export function remapImportedConnects(
  state: AssemblyState,
  childSession: CaptureSession,
  prefix: string,
  parts: readonly AssemblyPartStored[],
  newIdByOldId: ReadonlyMap<FeatureId, FeatureId>,
  imported: ReadonlyMap<string, AssemblyPartRef>,
): void {
  const oldRecords = childSession.getRecords();
  for (const part of parts) {
    linkImportedConnect(state, prefix, part, parts, oldRecords, newIdByOldId, imported);
  }
}

function linkImportedConnect(
  state: AssemblyState,
  prefix: string,
  part: AssemblyPartStored,
  parts: readonly AssemblyPartStored[],
  oldRecords: readonly FeatureRecord[],
  newIdByOldId: ReadonlyMap<FeatureId, FeatureId>,
  imported: ReadonlyMap<string, AssemblyPartRef>,
): void {
  const parentId = part.connectParentId;
  if (parentId === undefined) return;
  const newParentId = newIdByOldId.get(parentId);
  const newChildId = newIdByOldId.get(part.id);
  if (newParentId === undefined || newChildId === undefined) return;
  const stored = state.parts.find((item) => item.id === newChildId);
  if (stored !== undefined) assignConnectParent(stored, newParentId);
  const placed = readPlacedBy(oldRecords.find((record) => record.id === part.id)?.metadata);
  if (placed === undefined) return;
  const parentName = parts.find((item) => item.id === parentId)?.name ?? placed.to.partName;
  patchPlacedBy(state.session.getRecords(), newChildId, placed, newParentId, `${prefix}${parentName}`);
  emitImportedConnect(state, prefix, part.name, parentName, placed, oldRecords, part.id, imported);
}

function assignConnectParent(part: AssemblyPartStored, parentId: FeatureId): void {
  (part as { connectParentId?: FeatureId }).connectParentId = parentId;
}

function patchPlacedBy(
  records: readonly FeatureRecord[],
  partId: FeatureId,
  placed: PlacedByLink,
  parentId: FeatureId,
  parentName: string,
): void {
  const record = records.find((item) => item.id === partId);
  if (record === undefined) return;
  record.metadata = {
    ...record.metadata,
    placedBy: {
      connector: placed.connector,
      to: { partId: parentId, partName: parentName, connector: placed.to.connector },
    },
  };
}

function emitImportedConnect(
  state: AssemblyState,
  prefix: string,
  childName: string,
  parentName: string,
  placed: PlacedByLink,
  oldRecords: readonly FeatureRecord[],
  oldChildId: FeatureId,
  imported: ReadonlyMap<string, AssemblyPartRef>,
): void {
  const parent = imported.get(parentName);
  const child = imported.get(childName);
  if (parent === undefined || child === undefined) return;
  const original = connectRecordName(oldRecords, oldChildId);
  const name = original !== undefined
    ? `${prefix}${original}`
    : `${prefix}${parentName}.${placed.to.connector}-${prefix}${childName}.${placed.connector}`;
  state.session.assemblyConnect(
    state.name,
    name,
    parent.connector(placed.to.connector),
    child.connector(placed.connector),
  );
}

function connectRecordName(records: readonly FeatureRecord[], childId: FeatureId): string | undefined {
  for (const record of records) {
    if (record.kind !== 'assemblyConnect') continue;
    const child = record.inputs.b;
    if (child?.kind !== 'feature' || child.id !== childId) continue;
    const name = record.metadata?.connectName;
    return typeof name === 'string' ? name : undefined;
  }
  return undefined;
}

function readPlacedBy(metadata: FeatureRecord['metadata']): PlacedByLink | undefined {
  const placed = metadata?.placedBy;
  if (!isRecord(placed)) return undefined;
  return placedByFrom(placed);
}

function placedByFrom(placed: Record<string, unknown>): PlacedByLink | undefined {
  const to = placed.to;
  if (typeof placed.connector !== 'string' || !isRecord(to)) return undefined;
  if (typeof to.partId !== 'string' || typeof to.partName !== 'string' || typeof to.connector !== 'string') return undefined;
  return {
    connector: placed.connector,
    to: { partId: to.partId, partName: to.partName, connector: to.connector },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
