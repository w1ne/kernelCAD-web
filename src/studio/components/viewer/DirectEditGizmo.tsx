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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TransformControls } from "@react-three/drei/core/TransformControls";
import type { GeometryResult } from "../../../shared/worker/geometryEngine";
import type { DirectEditAnchor } from "../../../modeling/directEdit/anchors";
import type { DragPlan } from "../../../modeling/directEdit/planDrag";
import { reviewCandidate } from "../../directEdit/candidateReview";
import { currentStudioScript } from "../../scriptSource";
import { shellStore } from "../../store/useShellStore";
import type { StagedEdit } from "../../store/shellStore";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useRecomputeResult } from "../../hooks/useRecomputeResult";
import { snapDelta } from "../../features-ui/interaction/dragMath";
import { computeGeometryBox } from "./sectionRange";
import { matrixFromGeometryTransform } from "./entities/geometryTransform";
import { GhostShape } from "./entities/ShapeGeometry";
import { isMatedAnchor, resolveAnchor } from "./directEditTarget";

export const REVIEWING_NOTICE = 'Reviewing candidate…';
export const REVIEW_BUSY_NOTICE = 'A candidate review is already running; wait for it to finish.';
export const SOURCE_CHANGED_NOTICE = 'Source changed during the drag; redo it.';
const FALLBACK_PLAN_NOTICE = 'Direct edit could not be planned.';

export type DragDelta = [number, number, number];

export interface DragEntityRequest {
    anchor: DirectEditAnchor;
    delta: DragDelta;
}

interface DirectEditGizmoProps {
    geometries: GeometryResult[];
    itemNames: (string | null)[];
}

/** Staged-edit id: monotonic enough for the single-slot store, collision-proof
 *  even for same-millisecond proposals. */
function nextStagedEditId(): string {
    return `drag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

    // Live code mirror so the post-review staleness check sees the CURRENT
    // source, not the render closure the drag started in.
    const codeRef = useRef(code);
    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    const [dragDelta, setDragDelta] = useState<DragDelta | null>(null);
    const [reviewing, setReviewing] = useState(false);
    const reviewingRef = useRef(false);
    const dragStartRef = useRef<{
        center: THREE.Vector3;
        anchor: DirectEditAnchor;
        baselineCode: string;
    } | null>(null);
    const dragDeltaRef = useRef<DragDelta | null>(null);

    const commitAnchorDrag = useCallback(
        async (
            targetAnchor: DirectEditAnchor,
            rawDelta: DragDelta,
            baselineCode: string,
            mated: boolean,
        ): Promise<StagedEdit | null> => {
            // Busy state is claimed BEFORE the lazy planDrag import awaits, so
            // a second release (pointer or dev hook) cannot start a concurrent
            // plan+review during the chunk load.
            if (reviewingRef.current) {
                shellStore.setDirectEditNotice(REVIEW_BUSY_NOTICE);
                return null;
            }
            reviewingRef.current = true;
            setReviewing(true);
            shellStore.setDirectEditNotice(REVIEWING_NOTICE);
            try {
                // Lazy so the 13MB ts-morph parser stays out of the eager
                // Studio bundle; it loads once, the first time a drag commits.
                let plan: DragPlan;
                try {
                    const { planDrag } = await import('../../../modeling/directEdit/planDrag');
                    plan = planDrag({
                        source: baselineCode,
                        anchor: targetAnchor,
                        delta: snapDelta(rawDelta, 'mm'),
                        mated,
                    });
                } catch (error) {
                    shellStore.setDirectEditNotice(
                        error instanceof Error ? error.message : String(error),
                    );
                    return null;
                }
                if (plan.toCode == null) {
                    shellStore.setDirectEditNotice(
                        plan.diagnostics[0]?.message ?? FALLBACK_PLAN_NOTICE,
                    );
                    return null;
                }

                const targetScript = currentStudioScript();
                const candidate = await reviewCandidate({
                    source: plan.toCode,
                    script: targetScript ?? '',
                    baseline: scriptReview,
                });

                // The editor may have moved while the review awaited. The
                // planned edit no longer targets the live source — refuse and
                // let the human redo the drag.
                if (codeRef.current !== baselineCode) {
                    shellStore.setDirectEditNotice(SOURCE_CHANGED_NOTICE);
                    return null;
                }

                const edit: StagedEdit = {
                    id: nextStagedEditId(),
                    intent: plan.intent,
                    fromCode: plan.fromCode,
                    toCode: plan.toCode,
                    ...(plan.spec
                        ? {
                            specLabel: plan.spec.axes
                                .map((axis, i) => `${'XYZ'[i]}:${axis.kind}`)
                                .join(' · '),
                        }
                        : {}),
                    ...(candidate.delta ? { validityDelta: candidate.delta } : {}),
                    evaluation: candidate.ok
                        ? { ok: true }
                        : { ok: false, error: candidate.error ?? 'review failed' },
                    targetScript: targetScript ?? undefined,
                    source: { kind: 'human', label: 'drag' },
                };
                shellStore.proposeStagedEdit(edit);
                shellStore.setDirectEditNotice(null);
                return edit;
            } catch (error) {
                shellStore.setDirectEditNotice(
                    error instanceof Error ? error.message : String(error),
                );
                return null;
            } finally {
                reviewingRef.current = false;
                setReviewing(false);
            }
        },
        [scriptReview],
    );

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
    }, [anchor, center]);

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
    }, [center, proxy]);

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
    }, [center, commitAnchorDrag, features, proxy]);

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
    }, [commitAnchorDrag, features]);

    // GhostShape composes its geometry's own transform, so it gets a
    // transform-free copy here and this wrapper owns the full
    // translate(delta) * matrixFromGeometryTransform matrix.
    const ghostGeometry = useMemo(
        () => (geometry ? { ...geometry, transform: undefined } : null),
        [geometry],
    );
    const ghostMatrix = useMemo(() => {
        if (!geometry || !dragDelta) return null;
        const geometryMatrix = matrixFromGeometryTransform(geometry) ?? new THREE.Matrix4();
        return new THREE.Matrix4()
            .makeTranslation(dragDelta[0], dragDelta[1], dragDelta[2])
            .multiply(geometryMatrix);
    }, [dragDelta, geometry]);

    if (isComputing || !geometry || !anchor || !center || !ghostGeometry) return null;

    return (
        <group>
            {ghostMatrix && (
                <group matrix={ghostMatrix} matrixAutoUpdate={false}>
                    <GhostShape geometry={ghostGeometry} />
                </group>
            )}
            <primitive object={proxy} />
            <TransformControls
                object={proxy}
                mode="translate"
                space="world"
                size={0.8}
                enabled={!reviewing}
                onMouseDown={handleMouseDown}
                onObjectChange={handleObjectChange}
                onMouseUp={handleMouseUp}
            />
        </group>
    );
}

export default DirectEditGizmo;
