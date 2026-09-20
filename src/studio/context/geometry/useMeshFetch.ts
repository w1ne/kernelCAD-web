// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import type { SerializedParamTable } from '../../../shared/runtime/paramTable';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { shouldUseHostedMesh, meshSourceHosted } from '../../scriptSource';
import { apiCall, rewritePath } from '../../api/apiBase';
import { overlayLiveReview, featureMeshesToGeometries, isAbortError, type ScriptReviewSummary } from './types';
import type { ExecutionApplyDeps } from './executionApplyDeps';

export type MeshFetchOpts = { keepExistingOnError?: boolean; skipReview?: boolean; liveReview?: boolean };

/** The hosted-mesh branch of `fetchMeshAndReview`: no session token, and the
 *  deploy resolves mesh data via build-time precompute / the hosted mesh
 *  endpoint instead of the node dev-kernel `mesh`/`review` routes below. */
function fetchHostedMeshAndReview(
    deps: ExecutionApplyDeps,
    code: string,
    revision: number,
    fetchStart: number,
    opts: MeshFetchOpts | undefined,
    setRecomputeMs: (ms: number) => void,
): Promise<void> {
    return meshSourceHosted(code)
        .then((payload) => {
            if (revision !== deps.mainRevisionRef.current) {
                deps.setStaleMainResponsesDropped((prev) => prev + 1);
                return;
            }
            deps.setGeometries(featureMeshesToGeometries(payload.features));
            deps.setGeometryTransformOverrides({});
            deps.setFeatureRecords(payload.featureRecords ?? []);
            setRecomputeMs(Math.max(0, Math.round(performance.now() - fetchStart)));
            deps.setPreviewGeometries([]);
            deps.setScriptParams(Object.values(payload.params ?? {}));
            deps.setScriptReview(payload.review ?? null);
            deps.setSketchesGeometries([]);
            deps.setError(null);
            deps.setLastSuccessfulRevision(revision);
            deps.pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: revision });
        })
        .catch((err: unknown) => {
            if (revision !== deps.mainRevisionRef.current) {
                deps.setStaleMainResponsesDropped((prev) => prev + 1);
                return;
            }
            const message = err instanceof Error ? err.message : String(err);
            deps.setError(message);
            if (!opts?.keepExistingOnError) {
                deps.setScriptParams([]);
                deps.setScriptReview(null);
            }
            deps.pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: revision });
        })
        .finally(() => {
            if (revision === deps.mainRevisionRef.current) {
                deps.setIsComputing(false);
                deps.setExecutionCount((prev) => prev + 1);
            }
        });
}

interface DevMeshPayload {
    features: FeatureMeshSerialized[];
    featureRecords?: FeatureRecord[];
    bounds: { min: [number, number, number]; max: [number, number, number] };
    params?: SerializedParamTable;
}

/** The review sub-fetch chained after a successful dev-kernel mesh fetch. */
function fetchDevReview(
    deps: ExecutionApplyDeps,
    reviewUrl: string,
    fetchInit: RequestInit,
    revision: number,
    opts: MeshFetchOpts | undefined,
): Promise<void> {
    if (opts?.skipReview) return Promise.resolve();
    return fetch(reviewUrl, fetchInit)
        .then(async (response) => {
            const reviewPayload = await response.json();
            if (!response.ok) {
                const message = typeof reviewPayload?.error === 'string' ? reviewPayload.error : response.statusText;
                throw new Error(message);
            }
            return reviewPayload as ScriptReviewSummary;
        })
        .then((reviewPayload) => {
            if (revision !== deps.mainRevisionRef.current) return;
            if (opts?.liveReview) {
                // Live payload carries only the fresh interference data —
                // keep the last FULL review's validator and envelope output
                // and overlay the live channel.
                deps.setScriptReview((prev) => overlayLiveReview(prev, reviewPayload));
                return;
            }
            deps.setScriptReview(reviewPayload);
        })
        .catch((err: unknown) => {
            if (isAbortError(err)) return;
            if (revision !== deps.mainRevisionRef.current) return;
            // A failed LIVE refresh keeps the last full review — dropping it
            // would blank the Validity tab mid-drag.
            if (!opts?.liveReview) deps.setScriptReview(null);
        });
}

/** The dev-kernel / by-script mesh branch of `fetchMeshAndReview` (token or
 *  script query, node dev-kernel `mesh`/`review` routes). */
function fetchDevMeshAndReview(
    deps: ExecutionApplyDeps,
    revision: number,
    fetchStart: number,
    meshPath: string,
    reviewPath: string,
    abortController: AbortController | null,
    activeMeshFetchAbortRef: MutableRefObject<AbortController | null>,
    opts: MeshFetchOpts | undefined,
    setRecomputeMs: (ms: number) => void,
): Promise<void> {
    let aborted = false;
    return apiCall().then(({ base, headers }) => {
        const meshUrl = rewritePath(meshPath, base);
        const reviewUrl = rewritePath(reviewPath, base);
        const fetchInit: RequestInit = {
            ...(abortController ? { signal: abortController.signal } : {}),
            headers,
        };
        return fetch(meshUrl, fetchInit)
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok) {
                    const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
                    throw new Error(message);
                }
                return payload as DevMeshPayload;
            })
            .then((payload) => {
                if (revision !== deps.mainRevisionRef.current) {
                    deps.setStaleMainResponsesDropped((prev) => prev + 1);
                    return;
                }
                deps.setGeometries(featureMeshesToGeometries(payload.features));
                deps.setGeometryTransformOverrides({});
                deps.setFeatureRecords(payload.featureRecords ?? []);
                setRecomputeMs(Math.max(0, Math.round(performance.now() - fetchStart)));
                deps.setScriptParams(Object.values(payload.params ?? {}));
                if (!opts?.skipReview && !opts?.liveReview) deps.setScriptReview(null);
                deps.setSketchesGeometries([]);
                deps.setPreviewGeometries([]);
                deps.setError(null);
                deps.setLastSuccessfulRevision(revision);
                deps.pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: revision });
                return fetchDevReview(deps, reviewUrl, fetchInit, revision, opts);
            })
            .catch((err: unknown) => {
                if (isAbortError(err)) {
                    aborted = true;
                    if (revision !== deps.mainRevisionRef.current) {
                        deps.setStaleMainResponsesDropped((prev) => prev + 1);
                    }
                    return;
                }
                if (revision !== deps.mainRevisionRef.current) {
                    deps.setStaleMainResponsesDropped((prev) => prev + 1);
                    return;
                }
                const message = err instanceof Error ? err.message : String(err);
                deps.setError(message);
                if (!opts?.keepExistingOnError) {
                    deps.setScriptParams([]);
                    deps.setScriptReview(null);
                }
                deps.pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: revision });
            })
            .finally(() => {
                if (activeMeshFetchAbortRef.current === abortController) {
                    activeMeshFetchAbortRef.current = null;
                }
                if (revision === deps.mainRevisionRef.current && !aborted) {
                    deps.setIsComputing(false);
                    deps.setExecutionCount(prev => prev + 1);
                } else if (revision === deps.mainRevisionRef.current) {
                    deps.setIsComputing(false);
                }
            });
    });
}

/**
 * Owns the studio mesh+review fetch pipeline: `fetchMeshAndReview` (raw
 * fetch against the hosted/dev-kernel mesh+review endpoints, or the
 * hosted-mesh client) and `requestMeshAndReview` (the serialized wrapper the
 * rest of the provider calls — coalesces a request that arrives while one is
 * already in flight into a single trailing retry).
 */
export function useMeshFetch(
    code: string,
    deps: ExecutionApplyDeps,
    setRecomputeMs: (ms: number) => void,
) {
    const activeMeshFetchAbortRef = useRef<AbortController | null>(null);
    const meshFetchBusyRef = useRef(false);
    const meshFetchTrailingRef = useRef<{
        script: string;
        token: string | null;
        opts?: MeshFetchOpts;
    } | null>(null);

    // Slice 2E.bridge: fetch the studio mesh + review for the current script,
    // optionally against a pooled session token so the data is read from the
    // same long-lived CaptureSession that SSE `relower` events fire from.
    // Returns the new revision number so callers can detect staleness.
    const fetchMeshAndReview = useCallback((
        script: string,
        token: string | null,
        opts?: MeshFetchOpts,
    ): { revision: number; promise: Promise<void> } => {
        const revision = ++deps.mainRevisionRef.current;
        deps.setCurrentCodeRevision(revision);
        deps.setIsComputing(true);
        const fetchStart = performance.now();
        const abortController = typeof AbortController === 'function'
            ? new AbortController()
            : null;
        activeMeshFetchAbortRef.current?.abort();
        activeMeshFetchAbortRef.current = abortController;
        const meshPath = token
            ? `/__kernelcad/mesh?session=${encodeURIComponent(token)}`
            : `/__kernelcad/mesh?script=${encodeURIComponent(script)}`;
        // `live=1` asks the dev middleware for the cheap relower-path review:
        // raw interference pairs from the live pooled session only, skipping
        // the full script re-eval + pose-envelope sweep (minutes on jointed
        // assemblies). Used by the SSE relower refresh; the full review still
        // runs on initial load / explicit Validate.
        const reviewPath = token
            ? `/__kernelcad/review?session=${encodeURIComponent(token)}&script=${encodeURIComponent(script)}${opts?.liveReview ? '&live=1' : ''}`
            : `/__kernelcad/review?script=${encodeURIComponent(script)}`;

        if (!token && shouldUseHostedMesh()) {
            const promise = fetchHostedMeshAndReview(deps, code, revision, fetchStart, opts, setRecomputeMs);
            return { revision, promise };
        }

        const promise = fetchDevMeshAndReview(
            deps, revision, fetchStart, meshPath, reviewPath, abortController,
            activeMeshFetchAbortRef, opts, setRecomputeMs,
        );
        return { revision, promise };
        // This callback reads `code` at call time by design (it's invoked
        // imperatively, not on every keystroke); resubscribing on each `code`
        // change would churn the executor. Intentional omission.
        //
        // Invariant this callback depends on: every field of `deps` (an
        // `ExecutionApplyDeps`) must be render-stable (a raw useState setter
        // or a `[]`-deps useCallback). This closure pins the FIRST `deps`
        // object it ever receives — if a future field is added that is not
        // render-stable (e.g. a value that changes with `executionCount`),
        // this callback would silently keep reading the stale one with no
        // lint warning.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deps.pushExecutionRecord]);

    const requestMeshAndReview = useCallback((
        script: string,
        token: string | null,
        opts?: MeshFetchOpts,
    ) => {
        if (meshFetchBusyRef.current) {
            meshFetchTrailingRef.current = { script, token, opts };
            return;
        }

        meshFetchBusyRef.current = true;
        const { promise } = fetchMeshAndReview(script, token, opts);
        void promise.finally(() => {
            meshFetchBusyRef.current = false;
            const trailing = meshFetchTrailingRef.current;
            meshFetchTrailingRef.current = null;
            if (trailing) {
                requestMeshAndReview(trailing.script, trailing.token, trailing.opts);
            }
        });
    }, [fetchMeshAndReview]);

    useEffect(() => {
        return () => {
            meshFetchTrailingRef.current = null;
            activeMeshFetchAbortRef.current?.abort();
        };
    }, []);

    return { requestMeshAndReview };
}
