// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import * as THREE from "three";
import type { FeatureRecord } from "../../../shared/intent/featureRecord";
import type { DirectEditAnchor } from "../../../modeling/directEdit/anchors";
import type { StagedEdit } from "../../store/shellStore";
import { shellStore } from "../../store/useShellStore";
import { snapDelta } from "../../features-ui/interaction/dragMath";
import { isMatedAnchor } from "../../components/viewer/directEditTarget";
import { REVIEW_BUSY_NOTICE, SOURCE_CHANGED_NOTICE } from "../../components/viewer/directEditNotices";
import type { DragDelta, DirectEditDragStart } from "./useDirectEditDrag";

interface DirectEditDragGestureParams {
    anchor: DirectEditAnchor | null;
    center: THREE.Vector3 | null;
    proxy: THREE.Object3D;
    codeRef: RefObject<string>;
    reviewingRef: RefObject<boolean>;
    dragStartRef: RefObject<DirectEditDragStart | null>;
    dragDeltaRef: RefObject<DragDelta | null>;
    setDragDelta: Dispatch<SetStateAction<DragDelta | null>>;
    commitAnchorDrag: (
        targetAnchor: DirectEditAnchor,
        rawDelta: DragDelta,
        baselineCode: string,
        mated: boolean,
    ) => Promise<StagedEdit | null>;
    features: readonly FeatureRecord[];
}

/**
 * Pointer gesture handlers for the translate control, plus the DEV-only
 * automation hook that drives the same commit path.
 */
export function useDirectEditDragGesture({
    anchor,
    center,
    proxy,
    codeRef,
    reviewingRef,
    dragStartRef,
    dragDeltaRef,
    setDragDelta,
    commitAnchorDrag,
    features,
}: DirectEditDragGestureParams) {
    const handleMouseDown = useCallback(() => {
        if (reviewingRef.current) {
            shellStore.setDirectEditNotice(REVIEW_BUSY_NOTICE);
            return;
        }
        if (!anchor || !center) return;
        dragStartRef.current = { center: center.clone(), anchor, baselineCode: codeRef.current };
        dragDeltaRef.current = [0, 0, 0];
        setDragDelta([0, 0, 0]);
        shellStore.setDirectEditNotice(null);
    }, [anchor, center, codeRef, reviewingRef, dragStartRef, dragDeltaRef, setDragDelta]);

    const handleObjectChange = useCallback(() => {
        const start = dragStartRef.current;
        if (!start || reviewingRef.current) {
            // A refused drag must not leave the control parked off-center.
            if (!start) proxy.position.copy(center ?? new THREE.Vector3());
            return;
        }
        const snapped = snapDelta(
            [
                proxy.position.x - start.center.x,
                proxy.position.y - start.center.y,
                proxy.position.z - start.center.z,
            ],
            'mm',
        );
        dragDeltaRef.current = snapped;
        setDragDelta((prev) =>
            prev != null
            && prev[0] === snapped[0]
            && prev[1] === snapped[1]
            && prev[2] === snapped[2]
                ? prev
                : snapped,
        );
    }, [center, proxy, reviewingRef, dragStartRef, dragDeltaRef, setDragDelta]);

    const handleMouseUp = useCallback(() => {
        const start = dragStartRef.current;
        const delta = dragDeltaRef.current;
        dragStartRef.current = null;
        dragDeltaRef.current = null;
        setDragDelta(null);
        if (center) proxy.position.copy(center);
        // `reviewing` is guarded at start, but the await may still be running
        // if the pointer was released during a stale gesture.
        if (!start || !delta || reviewingRef.current) return;
        // A click on the control without moving is not an edit.
        if (delta[0] === 0 && delta[1] === 0 && delta[2] === 0) return;
        if (codeRef.current !== start.baselineCode) {
            shellStore.setDirectEditNotice(SOURCE_CHANGED_NOTICE);
            return;
        }
        void commitAnchorDrag(
            start.anchor,
            delta,
            start.baselineCode,
            isMatedAnchor(features, start.anchor),
        );
    }, [center, commitAnchorDrag, features, proxy, codeRef, reviewingRef, dragStartRef, dragDeltaRef, setDragDelta]);

    // Dev-only automation hook (Task 11 e2e): drives the exact same
    // plan → review → propose path without synthetic pointer control.
    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === 'undefined') return;
        window.__kernelcad_drag_entity = async ({ anchor: requestedAnchor, delta }) => {
            if (reviewingRef.current) {
                shellStore.setDirectEditNotice(REVIEW_BUSY_NOTICE);
                return null;
            }
            return commitAnchorDrag(
                requestedAnchor,
                [delta[0], delta[1], delta[2]],
                codeRef.current,
                isMatedAnchor(features, requestedAnchor),
            );
        };
        return () => {
            delete window.__kernelcad_drag_entity;
        };
    }, [commitAnchorDrag, features, codeRef, reviewingRef]);

    return { handleMouseDown, handleObjectChange, handleMouseUp };
}
