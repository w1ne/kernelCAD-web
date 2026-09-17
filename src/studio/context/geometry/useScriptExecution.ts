// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { GeometryEngine, type GeometryResult, type SketchGeometry } from '../../../shared/worker/geometryEngine';
import { remapSketchNames } from '../../../shared/codeGeneration/sketchNaming';
import { parseCode } from '../../../shared/codeGeneration/ast';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import type { SerializedParamEntry, SerializedParamTable } from '../../../shared/runtime/paramTable';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import {
    shouldUseHostedMesh,
    meshSourceHosted,
    devMeshAvailable,
    meshSourceDev,
    needsFullKernel,
    rootVisibleFeatures,
    type BackendMeshPayload,
    type ParamOverrides,
} from '../../scriptSource';
import { apiCall, rewritePath, bearerToken, buildEventsUrl } from '../../api/apiBase';
import {
    detectEmptyBuild,
    overlayLiveReview,
    featureMeshesToGeometries,
    isAbortError,
    type ExecutionRecord,
    type ScriptReviewSummary,
} from './types';

/**
 * Owns the whole script-evaluation state machine: the pooled-session
 * bridge (session token, SSE `relower` subscription, pose-only fast path),
 * the stateless mesh+review fetch pipeline (hosted / dev-kernel / legacy
 * worker), param edits, and the debounced auto-run execution loop. This is
 * the tightly-coupled core of `GeometryProvider` — every branch shares the
 * same revision counter, execution-history log, and geometry/sketch state,
 * so it stays as one hook rather than being fractured further.
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
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    // Kernel-state epoch: bumped on every SSE relower (both fast and full
    // paths) so kernel-derived caches (the Animation tab's baked timeline) can
    // invalidate on any kernel mutation. See GeometryContextType.kernelEpoch.
    const [kernelEpoch, setKernelEpoch] = useState(0);
    // Slice 2E.bridge: tracks whether the GET /session attempt has settled
    // so the mesh effect knows to wait. 'idle' → no studio script (legacy
    // in-process path); 'pending' → fetch in flight; 'resolved' → token set;
    // 'failed' → session fetch failed, mesh effect falls back to by-script.
    const [sessionStatus, setSessionStatus] = useState<'idle' | 'pending' | 'resolved' | 'failed'>('idle');
    const mainRevisionRef = useRef(0);
    // Accumulated param-slider overrides for the no-live-session recompute path
    // (hosted viewer / arbitrary edited code). A param edit re-runs the whole
    // script through the stateless mesh endpoint with these applied. Cleared
    // when `code` changes (a fresh build starts from the script's defaults).
    const paramOverridesRef = useRef<ParamOverrides>({});
    const activeMeshFetchAbortRef = useRef<AbortController | null>(null);
    const meshFetchBusyRef = useRef(false);
    const meshFetchTrailingRef = useRef<{
        script: string;
        token: string | null;
        opts?: { keepExistingOnError?: boolean; skipReview?: boolean };
    } | null>(null);

    const pushExecutionRecord = useCallback((record: ExecutionRecord) => {
        setExecutionHistory((prev) => {
            const next = [...prev, record];
            // Keep bounded history for long sessions.
            return next.length > 200 ? next.slice(next.length - 200) : next;
        });
    }, []);

    // Slice 2E.bridge: fetch the studio mesh + review for the current script,
    // optionally against a pooled session token so the data is read from the
    // same long-lived CaptureSession that SSE `relower` events fire from.
    // Returns the new revision number so callers can detect staleness.
    const fetchMeshAndReview = useCallback((
        script: string,
        token: string | null,
        opts?: { keepExistingOnError?: boolean; skipReview?: boolean; liveReview?: boolean },
    ): { revision: number; promise: Promise<void> } => {
        const revision = ++mainRevisionRef.current;
        setCurrentCodeRevision(revision);
        setIsComputing(true);
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

        let aborted = false;
        if (!token && shouldUseHostedMesh()) {
            const promise = meshSourceHosted(code)
                .then((payload) => {
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        return;
                    }
                    setGeometries(featureMeshesToGeometries(payload.features));
                    setGeometryTransformOverrides({});
                    setFeatureRecords(payload.featureRecords ?? []);
                    setRecomputeMs(Math.max(0, Math.round(performance.now() - fetchStart)));
                    setScriptParams(Object.values(payload.params ?? {}));
                    setScriptReview(payload.review ?? null);
                    setSketchesGeometries([]);
                    setPreviewGeometries([]);
                    setError(null);
                    setLastSuccessfulRevision(revision);
                    pushExecutionRecord({
                        revision,
                        status: 'success',
                        executionCountAtRecord: revision,
                    });
                })
                .catch((err: unknown) => {
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        return;
                    }
                    const message = err instanceof Error ? err.message : String(err);
                    setError(message);
                    if (!opts?.keepExistingOnError) {
                        setScriptParams([]);
                        setScriptReview(null);
                    }
                    pushExecutionRecord({
                        revision,
                        status: 'error',
                        error: message,
                        executionCountAtRecord: revision,
                    });
                })
                .finally(() => {
                    if (revision === mainRevisionRef.current && !aborted) {
                        setIsComputing(false);
                        setExecutionCount((prev) => prev + 1);
                    } else if (revision === mainRevisionRef.current) {
                        setIsComputing(false);
                    }
                });
            return { revision, promise };
        }

        const promise = apiCall().then(({ base, headers }) => {
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
                return payload as {
                    features: FeatureMeshSerialized[];
                    featureRecords?: FeatureRecord[];
                    bounds: { min: [number, number, number]; max: [number, number, number] };
                    params?: SerializedParamTable;
                };
            })
            .then((payload) => {
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    return;
                }
                setGeometries(featureMeshesToGeometries(payload.features));
                setGeometryTransformOverrides({});
                setFeatureRecords(payload.featureRecords ?? []);
                setRecomputeMs(Math.max(0, Math.round(performance.now() - fetchStart)));
                setScriptParams(Object.values(payload.params ?? {}));
                if (!opts?.skipReview && !opts?.liveReview) setScriptReview(null);
                setSketchesGeometries([]);
                setPreviewGeometries([]);
                setError(null);
                setLastSuccessfulRevision(revision);
                pushExecutionRecord({
                    revision,
                    status: 'success',
                    executionCountAtRecord: revision,
                });
                if (opts?.skipReview) return;
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
                        if (revision !== mainRevisionRef.current) return;
                        if (opts?.liveReview) {
                            // Live payload carries only the fresh interference
                            // data — keep the last FULL review's validator and
                            // envelope output and overlay the live channel.
                            setScriptReview((prev) => overlayLiveReview(prev, reviewPayload));
                            return;
                        }
                        setScriptReview(reviewPayload);
                    })
                    .catch((err: unknown) => {
                        if (isAbortError(err)) return;
                        if (revision !== mainRevisionRef.current) return;
                        // A failed LIVE refresh keeps the last full review —
                        // dropping it would blank the Validity tab mid-drag.
                        if (!opts?.liveReview) setScriptReview(null);
                    });
            })
            .catch((err: unknown) => {
                if (isAbortError(err)) {
                    aborted = true;
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                    }
                    return;
                }
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    return;
                }
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                if (!opts?.keepExistingOnError) {
                    setScriptParams([]);
                    setScriptReview(null);
                }
                pushExecutionRecord({
                    revision,
                    status: 'error',
                    error: message,
                    executionCountAtRecord: revision,
                });
            })
            .finally(() => {
                if (activeMeshFetchAbortRef.current === abortController) {
                    activeMeshFetchAbortRef.current = null;
                }
                if (revision === mainRevisionRef.current && !aborted) {
                    setIsComputing(false);
                    setExecutionCount(prev => prev + 1);
                } else if (revision === mainRevisionRef.current) {
                    setIsComputing(false);
                }
            });
        });
        return { revision, promise };
        // This callback reads `code` at call time by design (it's invoked
        // imperatively, not on every keystroke); resubscribing on each `code`
        // change would churn the executor. Intentional omission.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pushExecutionRecord]);

    const requestMeshAndReview = useCallback((
        script: string,
        token: string | null,
        opts?: { keepExistingOnError?: boolean; skipReview?: boolean; liveReview?: boolean },
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

    // Slice 2E.bridge: acquire the session token for the script. The pool
    // reuses an existing session if one already exists for this script, so
    // a tab refresh doesn't lose params edits. The mesh effect below waits
    // for `sessionStatus` to settle before fetching, so we never make two
    // mesh requests (one by-script, one by-session) on initial load.
    useEffect(() => {
        if (!studioScript) {
            setSessionToken(null);
            setSessionStatus('idle');
            return;
        }
        let cancelled = false;
        setSessionStatus('pending');
        setSessionToken(null);
        apiCall()
            .then(({ base, headers }) =>
                fetch(
                    rewritePath(
                        `/__kernelcad/session?script=${encodeURIComponent(studioScript)}`,
                        base,
                    ),
                    { headers },
                ),
            )
            .then(async (r) => {
                const body = await r.json();
                if (!r.ok) throw new Error(body?.error ?? r.statusText);
                return body as { sessionToken: string };
            })
            .then(({ sessionToken: token }) => {
                if (cancelled) return;
                setSessionToken(token);
                setSessionStatus('resolved');
            })
            .catch(() => {
                if (cancelled) return;
                // Fall back to the legacy per-request mesh path: token stays
                // null and the mesh effect fetches by-script.
                setSessionStatus('failed');
            });
        return () => { cancelled = true; };
    }, [studioScript]);

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

    // Pose-only fast path: fetch the live per-part world transforms from the
    // pooled session and swap them into the override map wholesale. The
    // `displayGeometries` memo REPLACES each geometry's `transform` slot with
    // its override (matched by `assemblyPartName`), so the viewport re-poses
    // existing Three.js geometries without re-fetching the ~740KB mesh
    // payload. Returns false on any failure so the caller can fall back to
    // the full mesh re-fetch.
    const applyPoseOnlyRelower = useCallback(async (token: string): Promise<boolean> => {
        // Animation playback owns the override map while driving the viewport.
        // Honour the SSE event (return true = handled, no full-mesh fallback)
        // but do NOT replace the overrides — the player's baked pose stands.
        if (viewportDriverLockRef.current) return true;
        try {
            const { base, headers } = await apiCall();
            const url = rewritePath(
                `/__kernelcad/transforms?session=${encodeURIComponent(token)}`,
                base,
            );
            const response = await fetch(url, { headers });
            if (!response.ok) return false;
            const payload = await response.json() as {
                parts?: Array<{ name?: unknown; transform?: unknown }>;
            };
            if (!Array.isArray(payload.parts)) return false;
            const next: Record<string, number[]> = {};
            for (const part of payload.parts) {
                if (typeof part?.name !== 'string') continue;
                if (!Array.isArray(part.transform) || part.transform.length !== 16) continue;
                next[part.name] = part.transform as number[];
            }
            setGeometryTransformOverrides(next);
            return true;
        } catch {
            return false;
        }
    }, [setGeometryTransformOverrides, viewportDriverLockRef]);

    // Lightweight review-only refresh for the pose-only fast path: hits the
    // cheap `live=1` channel and overlays the fresh interference pairs onto
    // the last full review — same merge the liveReview mesh path performs.
    const fetchLiveReview = useCallback(async (script: string, token: string): Promise<void> => {
        try {
            const { base, headers } = await apiCall();
            const url = rewritePath(
                `/__kernelcad/review?session=${encodeURIComponent(token)}&script=${encodeURIComponent(script)}&live=1`,
                base,
            );
            const response = await fetch(url, { headers });
            const payload = await response.json() as ScriptReviewSummary;
            if (!response.ok) return;
            setScriptReview((prev) => overlayLiveReview(prev, payload));
        } catch {
            // A failed LIVE refresh keeps the last review — dropping it would
            // blank the Validity tab mid-drag.
        }
    }, []);

    // Slice 2E.bridge: SSE subscription. Opens an EventSource against the
    // pooled CaptureSession's onRelower channel. Each `relower` frame
    // triggers a fresh mesh+review fetch so ParamsTab / ValidityDrawer
    // reflect the kernel's latest state without a full script re-run.
    useEffect(() => {
        if (!studioScript || !sessionToken) return;
        let es: EventSource | null = null;
        let cancelled = false;
        let liveReviewTimer: ReturnType<typeof setTimeout> | undefined;
        // Typed as a plain Event listener — 'relower' is a custom SSE event
        // name, so addEventListener resolves to the generic overload; the
        // frame is a MessageEvent carrying `{"affectedIds": [...]}`.
        const onRelower = (event: Event) => {
            // Bump the kernel-state epoch on EVERY relower (both the pose-only
            // fast path and the full mesh+review path below) so kernel-derived
            // caches can invalidate on any mutation — notably the Animation
            // tab's baked timeline, which would otherwise keep playing
            // pre-edit transforms after a Params-tab edit that doesn't touch
            // the animationView metadata.
            setKernelEpoch((e) => e + 1);
            // Pose-only fast path: when EVERY affected record is a
            // `solvedAssembly*` (a param-driven mate pose edit), only per-part
            // worldTransforms changed — part-LOCAL meshes are untouched — so
            // fetch the ~1KB transforms payload instead of the full mesh.
            // The live interference review still runs, but DEBOUNCED
            // trailing-edge so a slider drag-storm costs one review, not a
            // queue of them. Anything else (empty affectedIds = synthetic
            // rebuild relower, geometry-changing records) takes the full
            // mesh+review path below.
            let affectedIds: string[] = [];
            try {
                const parsed = JSON.parse((event as MessageEvent).data) as { affectedIds?: unknown };
                if (Array.isArray(parsed.affectedIds)) {
                    affectedIds = parsed.affectedIds.filter((id): id is string => typeof id === 'string');
                }
            } catch {
                // Malformed frame — treat as a full refresh.
            }
            const poseOnly = affectedIds.length > 0
                && affectedIds.every((id) => id.startsWith('solvedAssembly'));
            if (poseOnly) {
                void applyPoseOnlyRelower(sessionToken).then((applied) => {
                    if (cancelled) return;
                    if (!applied) {
                        // Transforms fetch failed (non-scene tail, network) —
                        // fall back to the full path so the viewport never
                        // shows a stale pose.
                        requestMeshAndReview(studioScript, sessionToken, { keepExistingOnError: true, liveReview: true });
                        return;
                    }
                    if (liveReviewTimer) clearTimeout(liveReviewTimer);
                    liveReviewTimer = setTimeout(() => {
                        if (cancelled) return;
                        void fetchLiveReview(studioScript, sessionToken);
                    }, 1000);
                });
                return;
            }
            // Re-fetch BOTH mesh AND review on relower. The review side carries
            // the live `rawInterferencePairs` channel the Studio status-bar
            // HUD reads — without re-fetching review on each param change the
            // HUD never updates and the user can drag a slider into a clipping
            // pose with the indicator stuck at the original count. (The prior
            // `skipReview: true` flag was a perf optimisation that predated
            // the live-interference channel.)
            requestMeshAndReview(studioScript, sessionToken, { keepExistingOnError: true, liveReview: true });
        };
        // Route the SSE URL through apiCall so signed-in users hit the hosted
        // /events endpoint. EventSource can't carry custom headers, so the
        // Supabase JWT is appended as an `access_token` query param (the
        // hosted server validates it via its injected authenticate hook; see
        // eventsEndpoint.ts). For unsigned-in local dev the base is '' and the
        // JWT is undefined, so buildEventsUrl omits access_token and behavior
        // is bit-for-bit identical to today.
        void apiCall().then(({ base, headers }) => {
            if (cancelled) return;
            const url = buildEventsUrl(base, sessionToken, bearerToken(headers));
            es = new EventSource(url);
            es.addEventListener('relower', onRelower);
            // The browser auto-reconnects on transient drops; we only log here.
            es.onerror = () => {
                // EventSource will retry on its own; a sustained outage surfaces
                // as a stale ParamsTab — which is acceptable degradation.
                // Intentionally silent: no console noise during dev reloads.
            };
        });
        return () => {
            cancelled = true;
            if (liveReviewTimer) clearTimeout(liveReviewTimer);
            if (es) {
                es.removeEventListener('relower', onRelower);
                es.close();
            }
        };
    }, [studioScript, sessionToken, requestMeshAndReview, applyPoseOnlyRelower, fetchLiveReview]);

    // Slice 2E.bridge: callback exposed to consumers (forwarded by
    // `useRecomputeResult`). Awaits the server ack; the SSE push that
    // follows is what actually refreshes context state.
    // Apply a stateless re-run mesh payload to context state (mirrors the main
    // execution loop's apply, incl. the empty-build guard). Used by the
    // no-session param recompute path.
    const applyBridgePayload = useCallback((payload: BackendMeshPayload, revision: number) => {
        const geos = featureMeshesToGeometries(payload.features as FeatureMeshSerialized[]);
        const recs = (payload.featureRecords as FeatureRecord[]) ?? [];
        const review = payload.review ?? { ok: true, diagnostics: [] };
        const emptyNotice = detectEmptyBuild(geos.length, recs, review);
        setGeometries(geos);
        setGeometryTransformOverrides({});
        setFeatureRecords(recs);
        setScriptParams(Object.values(payload.params ?? {}));
        setScriptReview(review);
        setSketchesGeometries([]);
        setPreviewGeometries([]);
        setError(emptyNotice);
        if (emptyNotice) {
            pushExecutionRecord({ revision, status: 'error', error: emptyNotice, executionCountAtRecord: executionCount + 1 });
        } else {
            setLastSuccessfulRevision(revision);
            pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
        }
    }, [executionCount, pushExecutionRecord, setGeometryTransformOverrides, setPreviewGeometries]);

    // Clear accumulated param overrides whenever the script changes — a code
    // edit re-meshes from the declared defaults (main loop), and stale
    // overrides must not leak onto the new build.
    useEffect(() => {
        paramOverridesRef.current = {};
    }, [code]);

    const updateParam = useCallback(async (
        edits: { name: string; value: number | boolean }[],
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
                    body: JSON.stringify({ edits }),
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
        const hosted = shouldUseHostedMesh();
        if (!hosted && !devMeshAvailable()) {
            throw new Error(
                'Editing parameters needs a live kernel session or a compute backend.',
            );
        }
        const overrides: ParamOverrides = { ...paramOverridesRef.current };
        for (const edit of edits) overrides[edit.name] = edit.value;
        paramOverridesRef.current = overrides;

        const revision = ++mainRevisionRef.current;
        setCurrentCodeRevision(revision);
        setIsComputing(true);
        try {
            const payload = hosted
                ? await meshSourceHosted(code, overrides)
                : await meshSourceDev(code, overrides);
            // Superseded by a newer edit (code change or another param drag).
            if (revision !== mainRevisionRef.current) return;
            applyBridgePayload(payload, revision);
        } catch (err) {
            if (revision !== mainRevisionRef.current) return;
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            if (revision === mainRevisionRef.current) {
                setIsComputing(false);
                setExecutionCount(prev => prev + 1);
            }
        }
    }, [sessionToken, code, applyBridgePayload]);

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

        const run = async () => {
            const revision = ++mainRevisionRef.current;
            setCurrentCodeRevision(revision);
            let staleRecorded = false;
            // Only the legacy in-browser worker (plain-JS `new Function`) needs an
            // acorn syntax pre-check — acorn can't parse TypeScript. The hosted and
            // dev-kernel paths transpile TS server-side and surface their own
            // diagnostics, so acorn must NOT gate them: it throws "Unexpected token
            // (line:col)" on type annotations in modern .kcad.ts (e.g. gallery
            // models), blanking a model the server renders fine.
            if (!hosted && !routesToDevKernel) {
                try {
                    parseCode(code);
                } catch (err) {
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        staleRecorded = true;
                        return;
                    }
                    const message = err instanceof Error ? err.message : String(err);
                    setError(message);
                    pushExecutionRecord({
                        revision,
                        status: 'error',
                        error: message,
                        executionCountAtRecord: executionCount + 1,
                    });
                    return;
                }
            }
            if (hosted) {
                setIsComputing(true);
                try {
                    const payload = await meshSourceHosted(code);
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        staleRecorded = true;
                        return;
                    }
                    const hostedGeometries = featureMeshesToGeometries(rootVisibleFeatures(payload));
                    const hostedRecords = (payload.featureRecords as FeatureRecord[]) ?? [];
                    // Placeholder, NOT a verdict: a mesh response with no
                    // `review` block means nothing validated this model.
                    // `reviewWasValidated` recognises the shape (no
                    // validator / fitness / mechanism / diagnostics) so the
                    // Validity panel reports "not run" instead of a green
                    // "solved" over an empty set.
                    const hostedReview = payload.review ?? { ok: true, diagnostics: [] };
                    const emptyNotice = detectEmptyBuild(hostedGeometries.length, hostedRecords, hostedReview);
                    setGeometries(hostedGeometries);
                    setGeometryTransformOverrides({});
                    setFeatureRecords(hostedRecords);
                    setScriptParams(Object.values(payload.params ?? {}));
                    setScriptReview(hostedReview);
                    setSketchesGeometries([]);
                    setPreviewGeometries([]);
                    setError(emptyNotice);
                    if (emptyNotice) {
                        pushExecutionRecord({ revision, status: 'error', error: emptyNotice, executionCountAtRecord: executionCount + 1 });
                    } else {
                        setLastSuccessfulRevision(revision);
                        pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
                    }
                } catch (err: unknown) {
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        staleRecorded = true;
                        return;
                    }
                    const message = err instanceof Error ? err.message : String(err);
                    setError(message);
                    pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: executionCount + 1 });
                } finally {
                    if (revision === mainRevisionRef.current) {
                        setIsComputing(false);
                        setExecutionCount(prev => prev + 1);
                    } else if (!staleRecorded) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
                    }
                }
                return;
            }
            setIsComputing(true);
            // The in-browser worker is the legacy v0.1 runtime — it only exposes
            // `param`/`box`/`cylinder`/`sphere`/`Sketcher`, and `param()` returns
            // a plain number. Models built with the modern assembly/joint/tendon
            // kernel, or ParamRef arithmetic (`.add` / `.divide`), can ONLY run
            // on the node kernel — handing them to the worker is a guaranteed
            // throw (`assembly is not defined` / `t.add is not a function`).
            // On localhost dev, detect those up front and route straight to the
            // node-backed dev mesh endpoint — the worker is never given code it
            // can't evaluate, so there is no throw-then-recover "choke". The
            // reactive fallback in the catch below stays as a safety net for
            // any other API the worker happens to lack.
            const useDevKernel = devMeshAvailable() && needsFullKernel(code);
            const applyDevPayload = (payload: BackendMeshPayload) => {
                const devGeometries = featureMeshesToGeometries(rootVisibleFeatures(payload));
                const devRecords = (payload.featureRecords as FeatureRecord[]) ?? [];
                const devReview = payload.review ?? { ok: true, diagnostics: [] };
                const emptyNotice = detectEmptyBuild(devGeometries.length, devRecords, devReview);
                setGeometries(devGeometries);
                setGeometryTransformOverrides({});
                setFeatureRecords(devRecords);
                setScriptParams(Object.values(payload.params ?? {}));
                setScriptReview(devReview);
                setSketchesGeometries([]);
                setPreviewGeometries([]);
                setError(emptyNotice);
                if (emptyNotice) {
                    pushExecutionRecord({ revision, status: 'error', error: emptyNotice, executionCountAtRecord: executionCount + 1 });
                } else {
                    setLastSuccessfulRevision(revision);
                    pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
                }
            };
            try {
                if (useDevKernel) {
                    const payload = await meshSourceDev(code);
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        staleRecorded = true;
                        return;
                    }
                    applyDevPayload(payload);
                } else {
                    const result = await engine.executeCode(code);
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        staleRecorded = true;
                        return;
                    }
                    setGeometries(result.geometries);
                    setGeometryTransformOverrides({});
                    const remappedSketches = remapSketchNames(result.sketches, code);
                    setSketchesGeometries(remappedSketches);
                    setError(null);
                    setLastSuccessfulRevision(revision);
                    pushExecutionRecord({
                        revision,
                        status: 'success',
                        executionCountAtRecord: executionCount + 1,
                    });
                }
            } catch (err: unknown) {
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    staleRecorded = true;
                    return;
                }
                console.error(err);
                let message = "Unknown error";
                if (err instanceof Error) {
                    message = err.message;
                } else if (typeof err === 'object' && err !== null) {
                    try {
                        message = JSON.stringify(err);
                    } catch {
                        message = String(err);
                    }
                } else {
                    message = String(err);
                }
                // Safety net: if the worker path threw because it lacks an API
                // global (and we didn't already route to the node kernel up
                // front), retry once through the dev mesh endpoint before
                // surfacing the error. Genuine user errors still surface
                // immediately without a wasted round-trip.
                if (!useDevKernel && devMeshAvailable() && /is not defined|is not a function/.test(message)) {
                    try {
                        const payload = await meshSourceDev(code);
                        if (revision !== mainRevisionRef.current) {
                            setStaleMainResponsesDropped((prev) => prev + 1);
                            staleRecorded = true;
                            return;
                        }
                        applyDevPayload(payload);
                        return;
                    } catch {
                        // Dev fallback also failed — fall through and surface
                        // the original worker error below.
                    }
                }
                setError(message);
                // Preserve last successful geometry; only track failed execution metadata.
                pushExecutionRecord({
                    revision,
                    status: 'error',
                    error: message,
                    executionCountAtRecord: executionCount + 1,
                });
            } finally {
                if (revision === mainRevisionRef.current) {
                    setIsComputing(false);
                    setExecutionCount(prev => prev + 1);
                } else if (!staleRecorded) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    pushExecutionRecord({
                        revision,
                        status: 'stale',
                        executionCountAtRecord: executionCount + 1,
                    });
                }
            }
        };

        const timer = setTimeout(run, 600);
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

        const revision = ++mainRevisionRef.current;
        setCurrentCodeRevision(revision);
        const useDevKernel = devMeshAvailable() && needsFullKernel(codeToExecute);
        // Acorn can't parse TypeScript; only the legacy worker path below needs
        // this pre-check. Hosted and full-kernel paths transpile modern .kcad.ts
        // themselves, so acorn must not block them (it throws "Unexpected token"
        // on TS).
        if (!shouldUseHostedMesh() && !useDevKernel) {
            try {
                parseCode(codeToExecute);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                pushExecutionRecord({
                    revision,
                    status: 'error',
                    error: message,
                    executionCountAtRecord: executionCount + 1,
                });
                return;
            }
        }

        // Hosted deploy (app.kernelcad.com): no local kernel backend, and the
        // in-process worker is the legacy v0.1 runtime that throws on modern
        // kernelCAD API globals (assembly, setRenderEnvironment, .material, …).
        // Resolve via build-time precompute (static CDN) first, then the
        // server mesh endpoint for edits. Not gated on worker `isReady` — this
        // path doesn't need the local worker.
        if (shouldUseHostedMesh()) {
            setIsComputing(true);
            try {
                const payload = await meshSourceHosted(codeToExecute);
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
                    return;
                }
                setGeometries(featureMeshesToGeometries(payload.features as FeatureMeshSerialized[]));
                setGeometryTransformOverrides({});
                setFeatureRecords((payload.featureRecords as FeatureRecord[]) ?? []);
                setScriptParams(Object.values(payload.params ?? {}));
                setScriptReview(payload.review ?? { ok: true, diagnostics: [] });
                setSketchesGeometries([]);
                setPreviewGeometries([]);
                setError(null);
                setLastSuccessfulRevision(revision);
                pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
            } catch (err: unknown) {
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
                    return;
                }
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: executionCount + 1 });
            } finally {
                if (revision === mainRevisionRef.current) setIsComputing(false);
            }
            return;
        }

        // Same up-front router as the auto-run path: Param-method / assembly
        // scripts must not be handed to the worker (Validate on the default
        // Studio starter has no `?script=`).
        if (!useDevKernel && !isReady) return;
        setIsComputing(true);
        try {
            if (useDevKernel) {
                const payload = await meshSourceDev(codeToExecute);
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    pushExecutionRecord({
                        revision,
                        status: 'stale',
                        executionCountAtRecord: executionCount + 1,
                    });
                    return;
                }
                setGeometries(featureMeshesToGeometries(payload.features as FeatureMeshSerialized[]));
                setGeometryTransformOverrides({});
                setFeatureRecords((payload.featureRecords as FeatureRecord[]) ?? []);
                setScriptParams(Object.values(payload.params ?? {}));
                setScriptReview(payload.review ?? { ok: true, diagnostics: [] });
                setSketchesGeometries([]);
                setPreviewGeometries([]);
                setError(null);
                setLastSuccessfulRevision(revision);
                pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
            } else {
                const result = await engine.executeCode(codeToExecute);
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    pushExecutionRecord({
                        revision,
                        status: 'stale',
                        executionCountAtRecord: executionCount + 1,
                    });
                    return;
                }
                setGeometries(result.geometries);
                setGeometryTransformOverrides({});
                const remappedSketches = remapSketchNames(result.sketches, codeToExecute);
                setSketchesGeometries(remappedSketches);
                setError(null);
                setLastSuccessfulRevision(revision);
                pushExecutionRecord({
                    revision,
                    status: 'success',
                    executionCountAtRecord: executionCount + 1,
                });
            }
        } catch (err: unknown) {
            if (revision !== mainRevisionRef.current) {
                setStaleMainResponsesDropped((prev) => prev + 1);
                pushExecutionRecord({
                    revision,
                    status: 'stale',
                    executionCountAtRecord: executionCount + 1,
                });
                return;
            }
            const message = err instanceof Error ? err.message : String(err);
            if (!useDevKernel && devMeshAvailable() && /is not defined|is not a function/.test(message)) {
                try {
                    const payload = await meshSourceDev(codeToExecute);
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        pushExecutionRecord({
                            revision,
                            status: 'stale',
                            executionCountAtRecord: executionCount + 1,
                        });
                        return;
                    }
                    setGeometries(featureMeshesToGeometries(payload.features as FeatureMeshSerialized[]));
                    setGeometryTransformOverrides({});
                    setFeatureRecords((payload.featureRecords as FeatureRecord[]) ?? []);
                    setScriptParams(Object.values(payload.params ?? {}));
                    setScriptReview(payload.review ?? { ok: true, diagnostics: [] });
                    setSketchesGeometries([]);
                    setPreviewGeometries([]);
                    setError(null);
                    setLastSuccessfulRevision(revision);
                    pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
                    return;
                } catch {
                    // Dev fallback also failed — fall through and surface
                    // the original worker error below.
                }
            }
            setError(message);
            pushExecutionRecord({
                revision,
                status: 'error',
                error: message,
                executionCountAtRecord: executionCount + 1,
            });
        } finally {
            if (revision === mainRevisionRef.current) {
                setIsComputing(false);
                setExecutionCount(prev => prev + 1);
            }
        }
    }, [engine, isReady, executionCount, pushExecutionRecord, studioScript, sessionToken, requestMeshAndReview, setGeometryTransformOverrides, setPreviewGeometries]);

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
