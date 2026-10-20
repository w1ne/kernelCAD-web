// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ThreeEvent } from '@react-three/fiber';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { selectionCodeStore } from '../../../selectionCode/selectionCodeStore';
import { resolvePickFeature, type GeometryPick } from '../../../selectionCode/geometryLineage';
import { placeMarkupNoteFromModelHit } from '../../../markup/markupPlacement';

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

export interface ShapeClickActions {
  geometry: GeometryResult;
  shapeIndex: number;
  name: string | undefined;
  featureRecords: readonly FeatureRecord[];
  setSelectedFace: (selection: { shapeIndex: number; faceId: number }) => void;
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
  if (name && isMulti) {
    actions.toggleSelection(name, true);
    return;
  }

  actions.setSelectedSketchName(null);
  actions.setSelectedFace({ shapeIndex, faceId });
  if (name) actions.setSelectedItemId(name);
  linkClickToCode(geometry, shapeIndex, faceId, event.nativeEvent, featureRecords);

  actions.setContextMenu({
    visible: true,
    position: { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY },
    type: 'FACE',
  });
}
