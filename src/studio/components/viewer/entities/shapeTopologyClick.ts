// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import { HoverManager } from '../../../features-ui/interaction/HoverManager';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { selectionCodeStore } from '../../../selectionCode/selectionCodeStore';
import { resolvePickFeature, type GeometryPick } from '../../../selectionCode/geometryLineage';

export function hasSelectionModifier(event: MouseEvent): boolean {
    return event.metaKey || event.ctrlKey || event.shiftKey;
}

/** Apply an edge picked by the current face-click raycast. The click's own
 *  intersections avoid relying on a possibly stale hover frame. */
export function selectEdgeFromFaceClick(
    intersections: THREE.Intersection[],
    shapeIndex: number,
    nativeEvent: MouseEvent,
    selectEdgeIndex: (edgeIndex: number, nativeEvent: MouseEvent) => void,
): boolean {
    const hovered = HoverManager.getBestHover(intersections);
    if (hovered?.type !== 'EDGE' || hovered.object.userData.shapeIndex !== shapeIndex
        || typeof hovered.id !== 'number' || hovered.id < 0) return false;
    selectEdgeIndex(hovered.id, nativeEvent);
    return true;
}

/** The shared edge-select operation used by both R3F line hits and the
 *  face-click edge fallback. */
export function selectGeometryEdge(
    geometry: GeometryResult,
    shapeIndex: number,
    name: string | undefined,
    features: readonly FeatureRecord[],
    setSelectedFace: (selection: { shapeIndex: number; faceId: number } | null) => void,
    setSelectedSketchName: (name: string | null) => void,
    edgeIndex: number,
    nativeEvent: MouseEvent,
): void {
    const stableId = geometry.edgeStableIds?.[edgeIndex];
    if (edgeIndex < 0 || !stableId) return;
    const pick: GeometryPick = { shapeIndex, kind: 'edge', id: edgeIndex };
    const featureId = resolvePickFeature(geometry, pick, features);
    selectionCodeStore.selectFromGeometry(
        pick,
        featureId,
        { x: nativeEvent.offsetX, y: nativeEvent.offsetY },
        hasSelectionModifier(nativeEvent),
        stableId,
        geometry.featureId ?? name,
    );
    setSelectedFace(null);
    setSelectedSketchName(null);
}
