// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type * as THREE from "three";
import type { DirectEditAnchor } from "../../../modeling/directEdit/anchors";
import type { DragPlan } from "../../../modeling/directEdit/planDrag";
import type { StagedEdit } from "../../store/shellStore";
import type { ScriptReviewSummary } from "../../context/GeometryContext";
import { shellStore } from "../../store/useShellStore";
import { reviewCandidate } from "../../directEdit/candidateReview";
import { currentStudioScript } from "../../scriptSource";
import { snapDelta } from "../../features-ui/interaction/dragMath";
import {
    FALLBACK_PLAN_NOTICE,
    REVIEWING_NOTICE,
    REVIEW_BUSY_NOTICE,
    SOURCE_CHANGED_NOTICE,
    nextStagedEditId,
} from "../../components/viewer/directEditNotices";

export type DragDelta = [number, number, number];

export interface DirectEditDragStart {
    center: THREE.Vector3;
    anchor: DirectEditAnchor;
    baselineCode: string;
}

export interface DirectEditDrag {
    codeRef: RefObject<string>;
    dragDelta: DragDelta | null;
    setDragDelta: Dispatch<SetStateAction<DragDelta | null>>;
    reviewing: boolean;
    reviewingRef: RefObject<boolean>;
    dragStartRef: RefObject<DirectEditDragStart | null>;
    dragDeltaRef: RefObject<DragDelta | null>;
    commitAnchorDrag: (
        targetAnchor: DirectEditAnchor,
        rawDelta: DragDelta,
        baselineCode: string,
        mated: boolean,
    ) => Promise<StagedEdit | null>;
}

interface PlannedDrag extends DragPlan {
    readonly toCode: string;
}

async function planDragWithNotice(
    targetAnchor: DirectEditAnchor,
    rawDelta: DragDelta,
    baselineCode: string,
    mated: boolean,
): Promise<PlannedDrag | null> {
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
    return { ...plan, toCode: plan.toCode };
}

/**
 * Drag bookkeeping for the direct-edit gizmo plus the plan → review → propose
 * commit path. The commit is deliberately kept next to the refs it guards so
 * busy/staleness checks share one closure.
 */
export function useDirectEditDrag(code: string, scriptReview: ScriptReviewSummary | null): DirectEditDrag {
    // Live code mirror so the post-review staleness check sees the CURRENT
    // source, not the render closure the drag started in.
    const codeRef = useRef(code);
    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    const [dragDelta, setDragDelta] = useState<DragDelta | null>(null);
    const [reviewing, setReviewing] = useState(false);
    const reviewingRef = useRef(false);
    const dragStartRef = useRef<DirectEditDragStart | null>(null);
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
                const plan = await planDragWithNotice(
                    targetAnchor,
                    rawDelta,
                    baselineCode,
                    mated,
                );
                if (plan == null) return null;

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

    return {
        codeRef,
        dragDelta,
        setDragDelta,
        reviewing,
        reviewingRef,
        dragStartRef,
        dragDeltaRef,
        commitAnchorDrag,
    };
}
