// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ThreeEvent } from '@react-three/fiber';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { selectionCodeStore } from '../../../selectionCode/selectionCodeStore';
import { resolvePickFeature, type GeometryPick } from '../../../selectionCode/geometryLineage';
import { placeMarkupNoteFromModelHit } from '../../../markup/markupPlacement';
import { markupStore } from '../../../markup/markupStore';
import type { TopologyRef } from '../../../markup/markupSnapshot';

function faceIdFromClick(event: ThreeEvent<MouseEvent>): number {
  const data = event.object.userData;
  if (data.faceMap && event.faceIndex != null) return data.faceMap[event.faceIndex] ?? -1;
  return typeof data.id === 'number' ? data.id : -1;
}

/** Geometry → code: publish the clicked face — or the hovered edge of this
 *  shape, which wins when the pointer is on an edge — with its creating feature. */
function linkClickToCode(
  geometry: GeometryResult,
  shapeIndex: number,
  faceId: number,
  nativeEvent: MouseEvent,
  features: readonly FeatureRecord[],
): void {
  const hovered = selectionCodeStore.getPreselect();
  const pick: GeometryPick = hovered && hovered.kind === 'edge' && hovered.shapeIndex === shapeIndex
    ? hovered
    : { shapeIndex, kind: 'face', id: faceId };
  selectionCodeStore.linkFromGeometry(
    pick,
    resolvePickFeature(geometry, pick, features),
    { x: nativeEvent.offsetX, y: nativeEvent.offsetY },
  );
}

function topologyRefFromClick(geometry: GeometryResult, shapeIndex: number, faceId: number): TopologyRef | null {
  const hovered = selectionCodeStore.getPreselect();
  const pick: GeometryPick = hovered && hovered.kind === 'edge' && hovered.shapeIndex === shapeIndex
    ? hovered
    : { shapeIndex, kind: 'face', id: faceId };
  if (faceId < 0) return null;
  const featureId = pick.kind === 'edge'
    ? geometry.edgeOwners?.[pick.id] ?? geometry.featureId
    : geometry.faceOwners?.[pick.id] ?? geometry.featureId;
  return {
    shapeIndex: pick.shapeIndex,
    kind: pick.kind,
    id: pick.id,
    ...(featureId ? { featureId } : {}),
  };
}

function syncMarkupTopologyPick(ref: TopologyRef | null, multi: boolean, deselectingShape: boolean, shapeIndex: number): void {
  const current = markupStore.getSnapshot().topologyRefs;
  if (!ref) {
    markupStore.setSelection([]);
  } else if (!multi) {
    markupStore.setSelection([ref]);
  } else if (deselectingShape) {
    markupStore.setSelection(current.filter((item) => item.shapeIndex !== shapeIndex));
  } else {
    const sameRef = (item: TopologyRef) => item.shapeIndex === ref.shapeIndex && item.kind === ref.kind && item.id === ref.id;
    markupStore.setSelection(current.some(sameRef)
      ? current.filter((item) => !sameRef(item))
      : [...current, ref]);
  }
}

export interface ShapeClickActions {
  geometry: GeometryResult;
  shapeIndex: number;
  name: string | undefined;
  selectedItemIds?: readonly string[];
  selectedFace?: { shapeIndex: number; faceId: number } | null;
  enableMarkup?: boolean;
  featureRecords: readonly FeatureRecord[];
  setSelectedFace: (selection: { shapeIndex: number; faceId: number } | null) => void;
  setSelectedSketchName: (name: string | null) => void;
  setSelectedItemId: (id: string | null) => void;
  toggleSelection: (id: string, multi: boolean) => void;
  setContextMenu: (menu: { visible: boolean; position: { x: number; y: number } | null; type: 'FACE' }) => void;
}

/** The click route attached to the real model mesh. Keeping the routing in a
 *  named function lets tests exercise the same hit, note, and selection path
 *  that React Three Fiber invokes in the viewer. */
export function handleShapeModelClick(event: ThreeEvent<MouseEvent>, actions: ShapeClickActions): void {
  event.stopPropagation();
  const { geometry, shapeIndex, name, featureRecords } = actions;
  const faceId = faceIdFromClick(event);

  if (placeMarkupNoteFromModelHit(event.point.toArray() as [number, number, number], shapeIndex, faceId, geometry)) {
    return;
  }

  const isMulti = event.metaKey || event.ctrlKey || event.shiftKey;
  const topologyRef = actions.enableMarkup ? topologyRefFromClick(geometry, shapeIndex, faceId) : null;
  if (name && isMulti) {
    const deselectingShape = actions.selectedItemIds?.includes(name) ?? false;
    actions.toggleSelection(name, true);
    if (deselectingShape && actions.selectedFace?.shapeIndex === shapeIndex) actions.setSelectedFace(null);
    if (actions.enableMarkup) syncMarkupTopologyPick(topologyRef, true, deselectingShape, shapeIndex);
    return;
  }

  actions.setSelectedSketchName(null);
  actions.setSelectedFace({ shapeIndex, faceId });
  if (actions.enableMarkup) syncMarkupTopologyPick(topologyRef, isMulti, false, shapeIndex);
  if (name) actions.setSelectedItemId(name);
  linkClickToCode(geometry, shapeIndex, faceId, event.nativeEvent, featureRecords);

  actions.setContextMenu({
    visible: true,
    position: { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY },
    type: 'FACE',
  });
}
