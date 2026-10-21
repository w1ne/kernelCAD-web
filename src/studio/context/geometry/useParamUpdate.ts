// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef } from 'react';
import {
    shouldUseHostedMesh, devMeshAvailable,
    type BackendMeshPayload,
} from '../../scriptSource';
import { apiCall, rewritePath } from '../../api/apiBase';
import { detectEmptyBuild, featureMeshesToGeometries } from './types';
import { mergeFeatureGeometries } from './mergeFeatureGeometries';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import { meshDimensionsOf } from '../../components/viewer/dimensions/boundsDimensions';
import { meshParamEdits, type ParamEditValues } from './paramEditsForMesh';
import { createSingleFlight, type SingleFlight } from './singleFlight';

interface HostedMeshJob {
    snapshot: ParamEditValues;
    bakeIntoSource?: boolean;
    preview?: boolean;
    epoch: number;
}

interface HostedMeshRun {
    code: string;
    executionCount: number;
    deps: ExecutionApplyDeps;
    epochRef: { current: number };
    followUpPending: () => boolean;
}

/** Paint one stateless param mesh. Kept outside the hook so `useParamUpdate`
 *  stays inside the function-length ratchet. */
async function runHostedParamMesh(job: HostedMeshJob, run: HostedMeshRun): Promise<void> {
    if (job.epoch !== run.epochRef.current) return;
    const revision = ++run.deps.mainRevisionRef.current;
    run.deps.setCurrentCodeRevision(revision);
    run.deps.setIsComputing(true);
    try {
        const payload = await meshParamEdits(run.code, job.snapshot, job.bakeIntoSource, job.preview);
        if (job.epoch !== run.epochRef.current || revision !== run.deps.mainRevisionRef.current) return;
        applyParamMeshPayload(run.deps, run.executionCount, payload, revision);
    } catch (err) {
        if (job.epoch !== run.epochRef.current || revision !== run.deps.mainRevisionRef.current) return;
        run.deps.setError(err instanceof Error ? err.message : String(err));
    } finally {
        const stillCurrent = job.epoch === run.epochRef.current
            && revision === run.deps.mainRevisionRef.current
            && !run.followUpPending();
        if (stillCurrent) {
            run.deps.setIsComputing(false);
            run.deps.setExecutionCount(prev => prev + 1);
        }
    }
}

function applyParamMeshPayload(
    deps: ExecutionApplyDeps,
    executionCount: number,
    payload: BackendMeshPayload,
    revision: number,
): void {
    const incoming = featureMeshesToGeometries(payload.features as FeatureMeshSerialized[]);
    const previous = deps.geometriesRef?.current ?? [];
    const geos = payload.changedFeatureIds && previous.length > 0
        ? mergeFeatureGeometries(previous, incoming, payload.changedFeatureIds)
        : incoming;
    const recs = (payload.featureRecords as FeatureRecord[]) ?? [];
    const review = payload.review ?? { ok: true, diagnostics: [] };
    const emptyNotice = detectEmptyBuild(geos.length, recs, review);
    deps.setGeometries(geos);
    if (deps.geometriesRef) deps.geometriesRef.current = geos;
    deps.setGeometryTransformOverrides({});
    deps.setFeatureRecords(recs);
    deps.setScriptParams(Object.values(payload.params ?? {}));
    deps.setScriptReview(review);
    deps.setMeshDimensions(meshDimensionsOf(payload));
    deps.setSketchesGeometries([]);
    deps.setPreviewGeometries([]);
    deps.setError(emptyNotice);
    if (emptyNotice) {
        deps.pushExecutionRecord({ revision, status: 'error', error: emptyNotice, executionCountAtRecord: executionCount + 1 });
    } else {
        deps.setLastSuccessfulRevision(revision);
        deps.pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
    }
}

export interface ParamUpdateOptions {
    /** Stateless path only: write every value into the source and re-run the
     *  whole script (see `paramEditsForMesh`). The public-page customizer uses
     *  it so the view matches its export. */
    bakeIntoSource?: boolean;
    /** Drag. Finish features that do not read the edit pass their solid through. */
    preview?: boolean;
}

/**
 * Owns the param-edit bridge: the accumulated param-override map for the
 * no-live-session recompute path, `updateParam` itself (incremental SSE
 * update when a pooled session exists, full stateless re-mesh otherwise),
 * and the DEV-only `window.__kernelcad` smoke-test install.
 */
export function useParamUpdate(
    code: string,
    sessionToken: string | null,
    executionCount: number,
    deps: ExecutionApplyDeps,
) {
    // Accumulated param-slider overrides for the no-live-session recompute path
    // (hosted viewer / arbitrary edited code). A param edit re-runs the whole
    // script through the stateless mesh endpoint with these applied. Cleared
    // when `code` changes (a fresh build starts from the script's defaults).
    const paramOverridesRef = useRef<ParamEditValues>({});
    // Bumped when `code` changes so a mesh started for the previous script
    // cannot paint over the new one. A param edit does not change `code`.
    const codeEpochRef = useRef(0);
    const hostedRunRef = useRef<(job: HostedMeshJob) => Promise<void>>(async () => {});
    const hostedFlightRef = useRef<SingleFlight<HostedMeshJob> | null>(null);

    // Clear accumulated param overrides whenever the script changes — a code
    // edit re-meshes from the declared defaults (main loop), and stale
    // overrides must not leak onto the new build.
    useEffect(() => {
        paramOverridesRef.current = {};
        codeEpochRef.current += 1;
    }, [code]);

    const updateParam = useCallback(async (
        edits: { name: string; value: number | boolean | string }[],
        options?: ParamUpdateOptions,
    ) => {
        // Live session (pooled `?script=`): incremental params.update — only the
        // edited feature + downstream re-lower, pushed back over SSE.
        if (sessionToken) {
            const { base, headers } = await apiCall();
            const res = await fetch(
                rewritePath(
                    `/__kernelcad/params?session=${encodeURIComponent(sessionToken)}`,
                    base,
                ),
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json', ...headers },
                    body: JSON.stringify({
                        edits,
                        ...(options?.preview ? { preview: true } : {}),
                    }),
                },
            );
            if (!res.ok) {
                let message = res.statusText;
                try {
                    const body = await res.json();
                    if (typeof body?.error === 'string') message = body.error;
                } catch { /* keep statusText fallback */ }
                throw new Error(message);
            }
            return;
        }

        // No live session (hosted viewer / arbitrary edited code): re-run the
        // whole script through the stateless mesh endpoint with the param
        // overrides applied. This is what makes a declared parameter actually
        // move the model when there is no pooled kernel session behind the tab.
        if (!shouldUseHostedMesh() && !devMeshAvailable()) {
            throw new Error(
                'Editing parameters needs a live kernel session or a compute backend.',
            );
        }
        const overrides: ParamEditValues = { ...paramOverridesRef.current };
        for (const edit of edits) overrides[edit.name] = edit.value;
        paramOverridesRef.current = overrides;

        // One stateless mesh at a time. A second value waits, then runs once.
        // Two overlapping cold builds of a heavy gallery model exhaust the API,
        // and bumping the revision up front would drop the first result.
        const meshRun: HostedMeshRun = {
            code,
            executionCount,
            deps,
            epochRef: codeEpochRef,
            followUpPending: () => hostedFlightRef.current?.followUpPending() ?? false,
        };
        hostedRunRef.current = (job) => runHostedParamMesh(job, meshRun);
        if (!hostedFlightRef.current) {
            hostedFlightRef.current = createSingleFlight((job) => hostedRunRef.current(job));
        }
        return hostedFlightRef.current.push({
            snapshot: overrides,
            bakeIntoSource: options?.bakeIntoSource,
            preview: options?.preview,
            epoch: codeEpochRef.current,
        });
    }, [sessionToken, code, executionCount, deps]);

    // Slice 2E.bridge: smoke hook for browser-console verification (see the
    // PR description). Mirrors the production path — same fetch, same
    // validation — so a `window.__kernelcad.updateParam([...])` call
    // exercises the full SSE round-trip end-to-end. DEV-only: the global
    // surface is gated behind `import.meta.env.DEV` so it never ships to
    // production bundles.
    useEffect(() => {
        if (!import.meta.env.DEV) return;
        if (typeof window === 'undefined') return;
        (window as { __kernelcad?: Record<string, unknown> }).__kernelcad = {
            ...(window as { __kernelcad?: Record<string, unknown> }).__kernelcad,
            sessionToken,
            updateParam,
        };
        return () => {
            // Cleanup is reached only when the install above ran, so the
            // DEV gate is implicit. Re-check `window` defensively for SSR.
            if (typeof window === 'undefined') return;
            delete (window as { __kernelcad?: Record<string, unknown> }).__kernelcad;
        };
    }, [sessionToken, updateParam]);

    return { updateParam };
}
