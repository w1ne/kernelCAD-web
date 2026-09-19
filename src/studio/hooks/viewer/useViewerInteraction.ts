// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useMemo, useState } from "react";
import type { HoverResult } from "../../features-ui/interaction/HoverManager";
import type { SnapResult } from "../../features-ui/interaction/SnapManager";
import type { ViewportFocusTarget } from "../../store/shellStore";
import type { ViewTarget } from "../../components/viewer/controllers/cameraPose";

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
    const focusRequest = useMemo(
        () => (
            viewportFocusTarget == null
                ? null
                : { target: viewportFocusTarget, id: viewportFocusTargetVersion }
        ),
        [viewportFocusTarget, viewportFocusTargetVersion],
    );

    useEffect(() => {
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
