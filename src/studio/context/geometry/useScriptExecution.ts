// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { GeometryEngine, type GeometryResult, type SketchGeometry } from '../../../shared/worker/geometryEngine';
import { shouldUseHostedMesh, devMeshAvailable, needsFullKernel } from '../../scriptSource';
import type { SerializedParamEntry } from '../../../shared/runtime/paramTable';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ExecutionRecord, ScriptReviewSummary } from './types';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import { runAutoExecutionLoop } from './runAutoExecutionLoop';
import { runExecuteGeometryAction } from './executeGeometryAction';
import { useMeshFetch } from './useMeshFetch';
import { useSessionToken } from './useSessionToken';
import { useRelowerSubscription } from './useRelowerSubscription';
import { useParamUpdate } from './useParamUpdate';

/**
 * Owns the whole script-evaluation state machine: the pooled-session
 * bridge (session token, SSE `relower` subscription, pose-only fast path —
 * `useSessionToken` / `useRelowerSubscription`), the stateless mesh+review
 * fetch pipeline (`useMeshFetch`), param edits (`useParamUpdate`), and the
 * debounced auto-run execution loop / explicit `executeGeometry` action
 * (`runAutoExecutionLoop` / `runExecuteGeometryAction`). Composes those
 * concern hooks around the shared revision counter and geometry/sketch/
 * execution-history state every branch reads and writes.
 */
export function useScriptExecution(
    code: string,
    studioScript: string | null,
    engine: GeometryEngine,
    isReady: boolean,
    setGeometryTransformOverrides: (next: Record<string, number[]>) => void,
    viewportDriverLockRef: MutableRefObject<boolean>,
    setPreviewGeometries: (geometries: GeometryResult[]) => void,
) {
    const [geometries, setGeometries] = useState<GeometryResult[]>([]);
    const [sketchesGeometries, setSketchesGeometries] = useState<SketchGeometry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isComputing, setIsComputing] = useState(false);
    const [executionCount, setExecutionCount] = useState(0);
    const [currentCodeRevision, setCurrentCodeRevision] = useState(0);
    const [lastSuccessfulRevision, setLastSuccessfulRevision] = useState<number | null>(null);
    const [executionHistory, setExecutionHistory] = useState<ExecutionRecord[]>([]);
    const [scriptParams, setScriptParams] = useState<SerializedParamEntry[]>([]);
    const [scriptReview, setScriptReview] = useState<ScriptReviewSummary | null>(null);
    const [featureRecords, setFeatureRecords] = useState<FeatureRecord[]>([]);
    const [recomputeMs, setRecomputeMs] = useState<number>(0);
    const [staleMainResponsesDropped, setStaleMainResponsesDropped] = useState(0);
    const mainRevisionRef = useRef(0);

    const pushExecutionRecord = useCallback((record: ExecutionRecord) => {
        setExecutionHistory((prev) => {
            const next = [...prev, record];
            // Keep bounded history for long sessions.
            return next.length > 200 ? next.slice(next.length - 200) : next;
        });
    }, []);

    // Shared setter/ref surface for the mesh-fetch, param-update, and
    // execution-action hooks/functions below. Memoized: every field is a
    // stable useState setter or a `[]`/near-stable useCallback, so this
    // object's identity only changes when `engine` changes — matching the
    // original inline callbacks' dependency cadence.
    const applyDeps = useMemo((): ExecutionApplyDeps => ({
        engine,
        mainRevisionRef,
        setCurrentCodeRevision,
        setIsComputing,
        setStaleMainResponsesDropped,
        setGeometries,
        setGeometryTransformOverrides,
        setFeatureRecords,
        setScriptParams,
        setScriptReview,
        setSketchesGeometries,
        setPreviewGeometries,
        setError,
        setLastSuccessfulRevision,
        setExecutionCount,
        pushExecutionRecord,
    }), [engine, setGeometryTransformOverrides, setPreviewGeometries, pushExecutionRecord]);

    const { sessionToken, sessionStatus } = useSessionToken(studioScript);
    const { requestMeshAndReview } = useMeshFetch(code, applyDeps, setRecomputeMs);

    // Initial mesh fetch — gated on `sessionStatus` so we make exactly one
    // mesh request on load. When the session is resolved we fetch by-token
    // (renderer reads from the same CaptureSession SSE/params write to);
    // when failed we fetch by-script (legacy in-process build).
    useEffect(() => {
        if (!studioScript) return;
        if (sessionStatus === 'pending' || sessionStatus === 'idle') return;
        // liveReview also on the initial fetch: the FULL review's pose-envelope
        // sweep takes minutes on a jointed assembly and would block the
        // single-threaded kernel (param edits queue behind it). The full
        // review runs on an explicit Validate press instead.
        requestMeshAndReview(studioScript, sessionToken, { liveReview: Boolean(sessionToken) });
    }, [studioScript, sessionStatus, sessionToken, requestMeshAndReview]);

    const { kernelEpoch } = useRelowerSubscription(
        studioScript, sessionToken, viewportDriverLockRef,
        setGeometryTransformOverrides, setScriptReview, requestMeshAndReview,
    );

    const { updateParam } = useParamUpdate(code, sessionToken, executionCount, applyDeps);

    // Execution Loop
    useEffect(() => {
        if (studioScript) return;
        // Hosted deploy (app.kernelcad.com): the in-process worker is the
        // legacy v0.1 runtime that throws on modern API globals, so this
        // auto-run path must resolve via build-time precompute / server mesh
        // instead of `engine.executeCode`. Not gated on worker `isReady`.
        const hosted = shouldUseHostedMesh();
        // Assembly/kinematic models route to the node kernel (below) and never
        // touch the worker, so they must not be blocked on worker `isReady` —
        // otherwise a slow or failed worker init would stall a model the worker
        // can't run anyway.
        const routesToDevKernel = devMeshAvailable() && needsFullKernel(code);
        if (!hosted && !routesToDevKernel && !isReady) return;
        setScriptParams([]);
        setScriptReview(null);

        const timer = setTimeout(() => {
            void runAutoExecutionLoop(applyDeps, code, executionCount);
        }, 600);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, isReady, engine, pushExecutionRecord, studioScript]);

    const executeGeometry = useCallback(async (codeToExecute: string) => {
        // `?script=` models already live on the node kernel session. Validate
        // must re-fetch mesh + the FULL review (no `live=1`), not the legacy
        // in-browser worker — that runtime lacks `path`/`assembly`/`helix` and
        // would paint `path is not defined` over a model that already meshed.
        // Initial load uses the cheap live review; this is the explicit
        // Validate press the comments above promise.
        if (studioScript) {
            requestMeshAndReview(studioScript, sessionToken);
            return;
        }
        await runExecuteGeometryAction(applyDeps, codeToExecute, executionCount, isReady);
    }, [isReady, executionCount, studioScript, sessionToken, requestMeshAndReview, applyDeps]);

    return {
        geometries,
        sketchesGeometries,
        error,
        isReady,
        isComputing,
        executionCount,
        currentCodeRevision,
        lastSuccessfulRevision,
        executionHistory,
        scriptParams,
        scriptReview,
        featureRecords,
        recomputeMs,
        staleMainResponsesDropped,
        sessionToken,
        kernelEpoch,
        executeGeometry,
        updateParam,
    };
}
