// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { GeometryEngine, type GeometryResult, type SketchGeometry } from '../../../shared/worker/geometryEngine';
import { shouldUseHostedMesh, devMeshAvailable, needsFullKernel, currentHostedProject } from '../../scriptSource';
import type { SerializedParamEntry } from '../../../shared/runtime/paramTable';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ExecutionRecord, ScriptReviewSummary } from './types';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import type { MeshDimensionsInfo } from '../../components/viewer/dimensions/boundsDimensions';
import { runAutoExecutionLoop } from './runAutoExecutionLoop';
import { runExecuteGeometryAction } from './executeGeometryAction';
import { useMeshFetch } from './useMeshFetch';
import { useSessionToken } from './useSessionToken';
import { useRelowerSubscription } from './useRelowerSubscription';
import { useParamUpdate } from './useParamUpdate';

/** Bounded log of execution outcomes for long sessions. */
function useExecutionHistory() {
    const [executionHistory, setExecutionHistory] = useState<ExecutionRecord[]>([]);
    const pushExecutionRecord = useCallback((record: ExecutionRecord) => {
        setExecutionHistory((prev) => {
            const next = [...prev, record];
            // Keep bounded history for long sessions.
            return next.length > 200 ? next.slice(next.length - 200) : next;
        });
    }, []);
    return { executionHistory, pushExecutionRecord };
}

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
    suspendSourceExecution = false,
) {
    const [geometries, setGeometries] = useState<GeometryResult[]>([]);
    const [sketchesGeometries, setSketchesGeometries] = useState<SketchGeometry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isComputing, setIsComputing] = useState(false);
    const [executionCount, setExecutionCount] = useState(0);
    const [currentCodeRevision, setCurrentCodeRevision] = useState(0);
    const [lastSuccessfulRevision, setLastSuccessfulRevision] = useState<number | null>(null);
    const [scriptParams, setScriptParams] = useState<SerializedParamEntry[]>([]);
    const [scriptReview, setScriptReview] = useState<ScriptReviewSummary | null>(null);
    const [featureRecords, setFeatureRecords] = useState<FeatureRecord[]>([]);
    const [meshDimensions, setMeshDimensions] = useState<MeshDimensionsInfo | null>(null);
    const [recomputeMs, setRecomputeMs] = useState<number>(0);
    const [staleMainResponsesDropped, setStaleMainResponsesDropped] = useState(0);
    const mainRevisionRef = useRef(0);

    const { executionHistory, pushExecutionRecord } = useExecutionHistory();

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
        setMeshDimensions,
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

    useHostedSourceRun(
        code, studioScript, suspendSourceExecution, applyDeps, executionCount,
        setScriptParams, setScriptReview,
    );
    useWorkerSourceRun(
        code, studioScript, suspendSourceExecution, isReady, applyDeps, executionCount,
        setScriptParams, setScriptReview,
    );

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
        isComputing,
        executionCount,
        currentCodeRevision,
        lastSuccessfulRevision,
        executionHistory,
        scriptParams,
        scriptReview,
        featureRecords,
        meshDimensions,
        recomputeMs,
        staleMainResponsesDropped,
        sessionToken,
        kernelEpoch,
        executeGeometry,
        updateParam,
    };
}

/** Hosted deploy: the in-process worker is the legacy runtime, so this path
 *  resolves via the stored artifact. Not gated on worker `isReady` — a later
 *  ready flip must not schedule a second fetch. */
function useHostedSourceRun(
    code: string,
    studioScript: string | null,
    suspendSourceExecution: boolean,
    applyDeps: ExecutionApplyDeps,
    executionCount: number,
    setScriptParams: (next: SerializedParamEntry[]) => void,
    setScriptReview: (next: ScriptReviewSummary | null) => void,
): void {
    const hostedOpenRef = useRef(true);
    useEffect(() => {
        if (!shouldUseHostedMesh()) return undefined;
        if (suspendSourceExecution || studioScript) return undefined;
        setScriptParams([]);
        setScriptReview(null);
        // First open paints the CDN artifact immediately. Later edits keep
        // the debounce so a keystroke does not remesh on every character.
        const delay = hostedOpenRef.current ? 0 : 600;
        const timer = setTimeout(() => {
            hostedOpenRef.current = false;
            void runAutoExecutionLoop(applyDeps, code, executionCount);
        }, delay);
        return () => clearTimeout(timer);
        // The loop reads executionCount when the timer fires; listing it
        // would restart the timer on every successful run.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, studioScript, suspendSourceExecution]);
}

/** Localhost worker / dev kernel. Assembly models route to the node kernel
 *  and must not wait on worker `isReady`. */
function useWorkerSourceRun(
    code: string,
    studioScript: string | null,
    suspendSourceExecution: boolean,
    isReady: boolean,
    applyDeps: ExecutionApplyDeps,
    executionCount: number,
    setScriptParams: (next: SerializedParamEntry[]) => void,
    setScriptReview: (next: ScriptReviewSummary | null) => void,
): void {
    useEffect(() => {
        if (shouldUseHostedMesh()) return;
        if (suspendSourceExecution) return;
        if (studioScript) return;
        const routesToDevKernel = devMeshAvailable() && needsFullKernel(code);
        if (!routesToDevKernel && !isReady) return;
        setScriptParams([]);
        setScriptReview(null);
        // A share page with a stored artifact paints on the first turn.
        // The 600ms debounce is for local edits.
        const delay = currentHostedProject() ? 0 : 600;
        const timer = setTimeout(() => {
            void runAutoExecutionLoop(applyDeps, code, executionCount);
        }, delay);
        return () => clearTimeout(timer);
        // applyDeps stands in for engine and pushExecutionRecord, which were
        // the original dependencies of this loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, isReady, studioScript, suspendSourceExecution, applyDeps]);
}
