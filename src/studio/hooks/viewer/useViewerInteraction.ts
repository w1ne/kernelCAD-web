// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useMemo, useState } from "react";
import type { HoverResult } from "../../features-ui/interaction/HoverManager";
import type { SnapResult } from "../../features-ui/interaction/SnapManager";
import type { ViewportFocusTarget } from "../../store/shellStore";
import type { ViewTarget } from "../../components/viewer/controllers/cameraPose";
import { selectionCodeStore } from "../../selectionCode/selectionCodeStore";
import type { GeometryPick } from "../../selectionCode/geometryLineage";
import { useViewTargetRequests } from "../studioNavigation";

/** The hovered shape face or BREP edge as a selection ↔ code pick. */
export function hoverToPick(hovered: HoverResult | null): GeometryPick | null {
    const userData = hovered?.object?.userData;
    if (!hovered || typeof userData?.shapeIndex !== 'number' || typeof hovered.id !== 'number') return null;
    if (hovered.type === 'FACE' && userData.faceMap) {
        return { shapeIndex: userData.shapeIndex, kind: 'face', id: hovered.id };
    }
    if (hovered.type === 'EDGE' && userData.edgeRanges && hovered.id >= 0) {
        return { shapeIndex: userData.shapeIndex, kind: 'edge', id: hovered.id };
    }
    return null;
}

interface ViewerInteractionParams {
    setHoveredItemId: (id: string | null) => void;
    sketchActive: boolean;
    viewportFocusTarget: ViewportFocusTarget | null;
    viewportFocusTargetVersion: number;
}

/**
 * Hover/snap/navigation state plus the derived cursor and camera-focus
 * request for the viewport.
 */
export function useViewerInteraction({
    setHoveredItemId,
    sketchActive,
    viewportFocusTarget,
    viewportFocusTargetVersion,
}: ViewerInteractionParams) {
    const [hoveredItem, setHoveredItem] = useState<HoverResult | null>(null);
    const [snapPoint, setSnapPoint] = useState<SnapResult | null>(null);
    const [navigationRequest, setNavigationRequest] = useState<{ target: ViewTarget; id: number } | null>(null);
    // Camera presets from commands (the palette) take the same path as the view gizmo.
    useViewTargetRequests((target) => setNavigationRequest((prev) => ({ target, id: (prev?.id ?? 0) + 1 })));
    const focusRequest = useMemo(
        () => (
            viewportFocusTarget == null
                ? null
                : { target: viewportFocusTarget, id: viewportFocusTargetVersion }
        ),
        [viewportFocusTarget, viewportFocusTargetVersion],
    );

    useEffect(() => {
        selectionCodeStore.setPreselect(hoverToPick(hoveredItem));
        if (hoveredItem?.object?.userData?.ownerId) {
            setHoveredItemId(hoveredItem.object.userData.ownerId);
        } else {
            setHoveredItemId(null);
        }
    }, [hoveredItem, setHoveredItemId]);

    const cursor = useMemo(() => {
        if (sketchActive) return 'crosshair';
        if (hoveredItem) {
            if (hoveredItem.type === 'VERTEX') return 'move';
            return 'pointer';
        }
        return 'default';
    }, [hoveredItem, sketchActive]);

    return {
        hoveredItem,
        setHoveredItem,
        snapPoint,
        setSnapPoint,
        navigationRequest,
        setNavigationRequest,
        focusRequest,
        cursor,
    };
}
