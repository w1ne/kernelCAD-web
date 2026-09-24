// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { GeometryResult, SketchGeometry } from '../../shared/worker/geometryEngine';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { useEngineReady } from './geometry/useEngineReady';
import { useShowSketches } from './geometry/useShowSketches';
import { useGeometryTransforms } from './geometry/useGeometryTransforms';
import { usePreviewExecution } from './geometry/usePreviewExecution';
import { useScriptExecution } from './geometry/useScriptExecution';
import { readStudioScriptParam, type ExecutionRecord, type ExecutionStatus, type ScriptReviewSummary } from './geometry/types';

export type { ExecutionStatus, ExecutionRecord, ScriptReviewSummary };

export interface GeometryContextType {
    geometries: GeometryResult[];
    previewGeometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    toggleSketchVisibility: () => void;
    error: string | null;
    isReady: boolean;
    isComputing: boolean;
    executionCount: number;
    currentCodeRevision: number;
    lastSuccessfulRevision: number | null;
    executionHistory: ExecutionRecord[];
    scriptParams: SerializedParamEntry[];
    scriptReview: ScriptReviewSummary | null;
    featureRecords: FeatureRecord[];
    recomputeMs: number;
    staleMainResponsesDropped: number;
    stalePreviewResponsesDropped: number;
    /** Slice 2E.bridge: token issued by `GET /__kernelcad/session` for the
     *  current script. `null` until the first session fetch lands; remains
     *  `null` for the legacy in-process script path (no studioScript). */
    sessionToken: string | null;
    /** Monotonic kernel-state epoch, bumped on EVERY relower the pooled session
     *  pushes over SSE (pose-only fast path AND full mesh+review path). Lets
     *  consumers that cache kernel-derived results — notably the Animation tab's
     *  baked timeline — invalidate on ANY kernel mutation, including a
     *  Params-tab edit that changes a param's current value without touching the
     *  animationView metadata. Starts at 0. */
    kernelEpoch: number;
    // Execute code to update geometries
    executeGeometry: (code: string) => Promise<void>;
    setPreviewCode: (code: string | null) => void;
    /** Slice 2E.bridge: POST edits to the pooled CaptureSession's
     *  `params.update`. Returns once the server has acked; the SSE
     *  `relower` push that follows refreshes `scriptParams` + `scriptReview`. */
    updateParam: (edits: { name: string; value: number | boolean }[]) => Promise<void>;
    setGeometryTransformOverride: (partName: string, transform: number[]) => void;
    clearGeometryTransformOverrides: () => void;
    /** Animation playback claims sole ownership of the part-transform override
     *  map while it is driving the viewport (baking or playing). While locked,
     *  the SSE pose-only fast path (`applyPoseOnlyRelower`) does NOT replace the
     *  override map — otherwise the single post-bake/restore relower (or a
     *  ParamsTab edit mid-playback) would yank the viewport off the baked pose.
     *  Idempotent; the player releases on pause/stop/unmount. */
    setViewportDriverLock: (locked: boolean) => void;
}

const GeometryContext = createContext<GeometryContextType | undefined>(undefined);

export function GeometryProvider({
    children,
    code,
    suspendSourceExecution = false,
    externalGeometries = null,
}: {
    children: ReactNode;
    code: string;
    /** Mesh-artifact path: do not evaluate `code`. */
    suspendSourceExecution?: boolean;
    /** Geometries loaded from a revision-matched mesh artifact. */
    externalGeometries?: GeometryResult[] | null;
}) {
    const studioScript = readStudioScriptParam();
    const { engine, isReady } = useEngineReady(!suspendSourceExecution);
    const { showSketches, toggleSketchVisibility } = useShowSketches();
    const transforms = useGeometryTransforms();
    const {
        setPreviewCode,
        previewGeometries,
        setPreviewGeometries,
        stalePreviewResponsesDropped,
    } = usePreviewExecution(code, isReady, engine, studioScript);

    const script = useScriptExecution(
        code,
        studioScript,
        engine,
        isReady,
        transforms.setGeometryTransformOverrides,
        transforms.viewportDriverLockRef,
        setPreviewGeometries,
        suspendSourceExecution,
    );

    // Apply viewport transform overrides to BOTH script-evaluated meshes and
    // CDN mesh-artifact geometries. Embed / FunnelViewer ChatGPT widgets load
    // via `externalGeometries`; skipping overrides there left Play/scrub
    // advancing the timeline while part groups stayed at rest pose.
    const displayGeometries = useMemo(() => {
        const base = externalGeometries ?? script.geometries;
        return base.map((geometry) => {
            if (!geometry.assemblyPartName) return geometry;
            const transform = transforms.geometryTransformOverrides[geometry.assemblyPartName];
            return transform ? { ...geometry, transform } : geometry;
        });
    }, [externalGeometries, script.geometries, transforms.geometryTransformOverrides]);

    const value: GeometryContextType = useMemo(() => ({
        geometries: displayGeometries,
        previewGeometries,
        sketchesGeometries: script.sketchesGeometries,
        showSketches,
        toggleSketchVisibility,
        error: externalGeometries ? null : script.error,
        isReady: externalGeometries ? true : isReady,
        isComputing: externalGeometries ? false : script.isComputing,
        executionCount: script.executionCount,
        currentCodeRevision: script.currentCodeRevision,
        lastSuccessfulRevision: script.lastSuccessfulRevision,
        executionHistory: script.executionHistory,
        scriptParams: script.scriptParams,
        scriptReview: script.scriptReview,
        featureRecords: script.featureRecords,
        recomputeMs: script.recomputeMs,
        staleMainResponsesDropped: script.staleMainResponsesDropped,
        stalePreviewResponsesDropped,
        sessionToken: script.sessionToken,
        kernelEpoch: script.kernelEpoch,
        executeGeometry: script.executeGeometry,
        setPreviewCode,
        updateParam: script.updateParam,
        setGeometryTransformOverride: transforms.setGeometryTransformOverride,
        clearGeometryTransformOverrides: transforms.clearGeometryTransformOverrides,
        setViewportDriverLock: transforms.setViewportDriverLock,
    }), [
        displayGeometries, externalGeometries, previewGeometries, script.sketchesGeometries, showSketches,
        toggleSketchVisibility, script.error, isReady, script.isComputing, script.executionCount,
        script.currentCodeRevision, script.lastSuccessfulRevision, script.executionHistory,
        script.scriptParams, script.scriptReview, script.featureRecords, script.recomputeMs,
        script.staleMainResponsesDropped, stalePreviewResponsesDropped, script.sessionToken,
        script.kernelEpoch, script.executeGeometry, setPreviewCode, script.updateParam,
        transforms.setGeometryTransformOverride, transforms.clearGeometryTransformOverrides,
        transforms.setViewportDriverLock,
    ]);

    return <GeometryContext.Provider value={value}>{children}</GeometryContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGeometry() {
    const context = useContext(GeometryContext);
    if (!context) {
        throw new Error("useGeometry must be used within a GeometryProvider");
    }
    return context;
}

export { GeometryContext };
