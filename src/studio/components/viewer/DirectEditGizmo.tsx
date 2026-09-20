// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/viewer/DirectEditGizmo.tsx
//
// Direct-edit translate gizmo. Selecting a rendered body parks a world-space
// translate control at its bounds center; dragging it previews a translucent
// ghost at the snapped delta. The source edit is planned and candidate-revised
// only on release (never per pointer frame) and handed to the shell store as a
// staged edit for human approval. This component never writes the script.

import * as THREE from "three";
import { useEffect, useMemo } from "react";
import type { GeometryResult } from "../../../shared/worker/geometryEngine";
import type { DirectEditAnchor } from "../../../modeling/directEdit/anchors";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useRecomputeResult } from "../../hooks/useRecomputeResult";
import { computeGeometryBox } from "./sectionRange";
import { resolveAnchor } from "./directEditTarget";
import { DirectEditGizmoControls } from "./DirectEditGizmoControls";
import { useDirectEditDrag } from "../../hooks/viewer/useDirectEditDrag";
import type { DragDelta } from "../../hooks/viewer/useDirectEditDrag";
import { useDirectEditDragGesture } from "../../hooks/viewer/useDirectEditDragGesture";

export { REVIEWING_NOTICE, REVIEW_BUSY_NOTICE, SOURCE_CHANGED_NOTICE } from "./directEditNotices";
export type { DragDelta };

export type DragEntityRequest = {
    anchor: DirectEditAnchor;
    delta: DragDelta;
};

interface DirectEditGizmoProps {
    geometries: GeometryResult[];
    itemNames: (string | null)[];
}

export function DirectEditGizmo({ geometries, itemNames }: DirectEditGizmoProps) {
    const { selectedItemIds, code, scriptReview, isComputing } = useWorkbench();
    const { features } = useRecomputeResult();

    const selection = useMemo(
        () => resolveAnchor(selectedItemIds[0], geometries, itemNames),
        [geometries, itemNames, selectedItemIds],
    );
    const geometry = selection?.geometry;
    const anchor = selection?.anchor ?? null;

    const center = useMemo(() => {
        if (!geometry) return null;
        const box = computeGeometryBox([geometry]);
        return box ? box.getCenter(new THREE.Vector3()) : null;
    }, [geometry]);

    // Stable proxy the control writes into. Parked at the selected geometry's
    // world bounds center; reset there after every drag so each gesture starts
    // from zero delta.
    const proxy = useMemo(() => new THREE.Object3D(), []);
    useEffect(() => {
        if (center) proxy.position.copy(center);
        else proxy.position.set(0, 0, 0);
    }, [proxy, center]);

    const drag = useDirectEditDrag(code, scriptReview);
    const { dragDelta, reviewing, commitAnchorDrag } = drag;

    const { handleMouseDown, handleObjectChange, handleMouseUp } = useDirectEditDragGesture({
        anchor,
        center,
        proxy,
        codeRef: drag.codeRef,
        reviewingRef: drag.reviewingRef,
        dragStartRef: drag.dragStartRef,
        dragDeltaRef: drag.dragDeltaRef,
        setDragDelta: drag.setDragDelta,
        commitAnchorDrag,
        features,
    });

    if (isComputing || !geometry || !anchor || !center) return null;

    return (
        <DirectEditGizmoControls
            geometry={geometry}
            dragDelta={dragDelta}
            proxy={proxy}
            reviewing={reviewing}
            onMouseDown={handleMouseDown}
            onObjectChange={handleObjectChange}
            onMouseUp={handleMouseUp}
        />
    );
}

export default DirectEditGizmo;
