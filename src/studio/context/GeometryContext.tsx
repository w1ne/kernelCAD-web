import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import { GeometryEngine, type GeometryResult, type SketchGeometry } from '../../shared/worker/geometryEngine';
import { remapSketchNames } from '../../shared/codeGeneration/sketchNaming';
import { parseCode } from '../../shared/codeGeneration/ast';
import { rehydrateFromBridge, type FeatureMeshSerialized } from '../../modeling/capture/featureMeshSerialize';
import type { SerializedParamEntry, SerializedParamTable } from '../../shared/runtime/paramTable';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { shouldUseHostedMesh, meshSourceHosted, devMeshAvailable, meshSourceDev } from '../scriptSource';
import { apiCall, rewritePath } from '../api/apiBase';

export type ExecutionStatus = 'success' | 'error' | 'stale';

export interface ExecutionRecord {
    revision: number;
    status: ExecutionStatus;
    error?: string;
    executionCountAtRecord: number;
}

export interface ScriptReviewSummary {
    ok: boolean;
    diagnostics?: Array<{
        code?: string;
        severity?: string;
        message?: string;
        hint?: string;
        partName?: string;
        mateName?: string;
        partA?: string;
        partB?: string;
    }>;
    fitness?: {
        functional?: boolean;
        repairMode?: string;
        blockingReasons?: Array<{ code?: string; message?: string; repairHint?: string }>;
    };
    suggestedRepairPrompt?: string;
    /**
     * Raw pairwise interference results at the script's current/default pose,
     * BEFORE any `ignore` filtering applied by `assembly.solvedModel`. The
     * Studio status-bar HUD reads `.length` of this for the interferences
     * counter so users see what's overlapping right now even when the script
     * silences a known-acceptable pair (e.g. an elbow knuckle). The validator's
     * filtered diagnostics still flow through `diagnostics` above for the
     * Validity tab and the `validate: 'error'` throw path.
     */
    rawInterferencePairs?: Array<{
        a: string;
        b: string;
        volumeMm3: number;
    }>;
    /**
     * Physics-grounded loop verdict (P1 surface convergence).
     *
     * - `'real'` — every mechanism-truth criterion holds at every sampled pose
     * - `'broken'` — at least one criterion fails; `mechanismFailures`
     *               carries the actionable failure list
     * - `'unverified'` — the mechanism probe wasn't run (no assembly in the
     *                   script, or evaluation failed before lowering)
     *
     * The Validity panel reads this to surface a red banner above the legacy
     * diagnostics when broken. Spec:
     * `docs/specs/2026-06-01-physics-grounded-loop-design.md`.
     */
    mechanism?: 'real' | 'broken' | 'unverified';
    /** Structured mechanism failures (one entry per failing criterion at
     *  each sampled pose). Empty when `mechanism !== 'broken'`. Each entry
     *  carries `code`, `message`, and `hint` — the Validity banner renders
     *  the hint as the actionable repair direction. */
    mechanismFailures?: Array<{
        code?: string;
        severity?: string;
        message?: string;
        hint?: string;
    }>;
}

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
    // Execute code to update geometries
    executeGeometry: (code: string) => Promise<void>;
    setPreviewCode: (code: string | null) => void;
    /** Slice 2E.bridge: POST edits to the pooled CaptureSession's
     *  `params.update`. Returns once the server has acked; the SSE
     *  `relower` push that follows refreshes `scriptParams` + `scriptReview`. */
    updateParam: (edits: { name: string; value: number | boolean }[]) => Promise<void>;
    setGeometryTransformOverride: (partName: string, transform: number[]) => void;
    clearGeometryTransformOverrides: () => void;
}

const GeometryContext = createContext<GeometryContextType | undefined>(undefined);

const STORAGE_KEY_SHOW_SKETCHES = 'kernelcad:showSketches';

function readStudioScriptParam(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('script');
}

function featureMeshesToGeometries(features: FeatureMeshSerialized[]): GeometryResult[] {
    return features.map((feature) => {
        const mesh = rehydrateFromBridge(feature);
        return {
            faces: mesh.faces,
            volume: mesh.volume,
            edges: mesh.edges,
            color: mesh.color,
            material: mesh.material,
            transform: mesh.transform ? [...mesh.transform] : undefined,
            assemblyFeatureId: mesh.assemblyFeatureId,
            assemblyPartName: mesh.assemblyPartName,
        };
    });
}

function readStoredShowSketches(): boolean {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem(STORAGE_KEY_SHOW_SKETCHES);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return true;
}

function isAbortError(err: unknown): boolean {
    return typeof err === 'object'
        && err !== null
        && 'name' in err
        && err.name === 'AbortError';
}

export function GeometryProvider({ children, code }: { children: ReactNode; code: string }) {
    const [geometries, setGeometries] = useState<GeometryResult[]>([]);
    const [geometryTransformOverrides, setGeometryTransformOverrides] = useState<Record<string, number[]>>({});
    const [previewGeometries, setPreviewGeometries] = useState<GeometryResult[]>([]);
    const [previewCode, setPreviewCode] = useState<string | null>(null);
    const [sketchesGeometries, setSketchesGeometries] = useState<SketchGeometry[]>([]);
    const [showSketches, setShowSketches] = useState(() => readStoredShowSketches());
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
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
    const [stalePreviewResponsesDropped, setStalePreviewResponsesDropped] = useState(0);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    // Slice 2E.bridge: tracks whether the GET /session attempt has settled
    // so the mesh effect knows to wait. 'idle' → no studio script (legacy
    // in-process path); 'pending' → fetch in flight; 'resolved' → token set;
    // 'failed' → session fetch failed, mesh effect falls back to by-script.
    const [sessionStatus, setSessionStatus] = useState<'idle' | 'pending' | 'resolved' | 'failed'>('idle');
    const mainRevisionRef = useRef(0);
    const previewRevisionRef = useRef(0);
    const activeMeshFetchAbortRef = useRef<AbortController | null>(null);
    const meshFetchBusyRef = useRef(false);
    const meshFetchTrailingRef = useRef<{
        script: string;
        token: string | null;
        opts?: { keepExistingOnError?: boolean; skipReview?: boolean };
    } | null>(null);
    const studioScript = readStudioScriptParam();
    const displayGeometries = useMemo(
        () => geometries.map((geometry) => {
            if (!geometry.assemblyPartName) return geometry;
            const transform = geometryTransformOverrides[geometry.assemblyPartName];
            return transform ? { ...geometry, transform } : geometry;
        }),
        [geometries, geometryTransformOverrides],
    );

    // Get singleton instance
    const engine = GeometryEngine.getInstance();

    const toggleSketchVisibility = useCallback(() => {
        setShowSketches(prev => !prev);
    }, []);

    const pushExecutionRecord = useCallback((record: ExecutionRecord) => {
        setExecutionHistory((prev) => {
            const next = [...prev, record];
            // Keep bounded history for long sessions.
            return next.length > 200 ? next.slice(next.length - 200) : next;
        });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY_SHOW_SKETCHES, String(showSketches));
    }, [showSketches]);

    // Initialize Engine
    useEffect(() => {
        engine.initialize().then(() => setIsReady(true));
        return () => {
        };
    }, [engine]);

    // Slice 2E.bridge: fetch the studio mesh + review for the current script,
    // optionally against a pooled session token so the data is read from the
    // same long-lived CaptureSession that SSE `relower` events fire from.
    // Returns the new revision number so callers can detect staleness.
    const fetchMeshAndReview = useCallback((
        script: string,
        token: string | null,
        opts?: { keepExistingOnError?: boolean; skipReview?: boolean },
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
        const reviewPath = token
            ? `/__kernelcad/review?session=${encodeURIComponent(token)}&script=${encodeURIComponent(script)}`
            : `/__kernelcad/review?script=${encodeURIComponent(script)}`;

        let aborted = false;
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
                if (!opts?.skipReview) setScriptReview(null);
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
                        setScriptReview(reviewPayload);
                    })
                    .catch((err: unknown) => {
                        if (isAbortError(err)) return;
                        if (revision !== mainRevisionRef.current) return;
                        setScriptReview(null);
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
    }, [pushExecutionRecord]);

    const requestMeshAndReview = useCallback((
        script: string,
        token: string | null,
        opts?: { keepExistingOnError?: boolean; skipReview?: boolean },
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
        requestMeshAndReview(studioScript, sessionToken);
    }, [studioScript, sessionStatus, sessionToken, requestMeshAndReview]);

    // Slice 2E.bridge: SSE subscription. Opens an EventSource against the
    // pooled CaptureSession's onRelower channel. Each `relower` frame
    // triggers a fresh mesh+review fetch so ParamsTab / ValidityDrawer
    // reflect the kernel's latest state without a full script re-run.
    useEffect(() => {
        if (!studioScript || !sessionToken) return;
        let es: EventSource | null = null;
        let cancelled = false;
        const onRelower = () => {
            // Re-fetch BOTH mesh AND review on relower. The review side carries
            // the live `rawInterferencePairs` channel the Studio status-bar
            // HUD reads — without re-fetching review on each param change the
            // HUD never updates and the user can drag a slider into a clipping
            // pose with the indicator stuck at the original count. (The prior
            // `skipReview: true` flag was a perf optimisation that predated
            // the live-interference channel.)
            requestMeshAndReview(studioScript, sessionToken, { keepExistingOnError: true });
        };
        // S1: route the SSE URL through apiCall so signed-in users hit the
        // hosted /events endpoint. (EventSource can't carry custom headers,
        // so signed-in auth for SSE is an S3 concern — for unsigned-in the
        // base is '' and behavior is bit-for-bit identical to today.)
        void apiCall().then(({ base }) => {
            if (cancelled) return;
            const url = rewritePath(
                `/__kernelcad/events?session=${encodeURIComponent(sessionToken)}`,
                base,
            );
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
            if (es) {
                es.removeEventListener('relower', onRelower);
                es.close();
            }
        };
    }, [studioScript, sessionToken, requestMeshAndReview]);

    // Slice 2E.bridge: callback exposed to consumers (forwarded by
    // `useRecomputeResult`). Awaits the server ack; the SSE push that
    // follows is what actually refreshes context state.
    const updateParam = useCallback(async (
        edits: { name: string; value: number | boolean }[],
    ) => {
        if (!sessionToken) {
            throw new Error('updateParam called before a session token was issued');
        }
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
    }, [sessionToken]);

    const setGeometryTransformOverride = useCallback((partName: string, transform: number[]) => {
        if (transform.length !== 16) return;
        setGeometryTransformOverrides((prev) => ({ ...prev, [partName]: [...transform] }));
    }, []);

    const clearGeometryTransformOverrides = useCallback(() => {
        setGeometryTransformOverrides({});
    }, []);

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
        if (!hosted && !isReady) return;
        setScriptParams([]);
        setScriptReview(null);

        const run = async () => {
            const revision = ++mainRevisionRef.current;
            setCurrentCodeRevision(revision);
            let staleRecorded = false;
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
            if (hosted) {
                setIsComputing(true);
                try {
                    const payload = await meshSourceHosted(code);
                    if (revision !== mainRevisionRef.current) {
                        setStaleMainResponsesDropped((prev) => prev + 1);
                        staleRecorded = true;
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
            try {
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
                // P11 follow-up: the in-browser worker is the legacy v0.1
                // runtime and can't evaluate the modern assembly/joint/tendon
                // API (throws "<global> is not defined"). On localhost dev,
                // fall back to the node-backed dev mesh endpoint, which runs
                // the full kernel. Gated on the API-gap signature so genuine
                // user errors still surface immediately without a round-trip.
                if (devMeshAvailable() && /is not defined|is not a function/.test(message)) {
                    try {
                        const payload = await meshSourceDev(code);
                        if (revision !== mainRevisionRef.current) {
                            setStaleMainResponsesDropped((prev) => prev + 1);
                            staleRecorded = true;
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

    // Preview Execution Loop
    useEffect(() => {
        if (studioScript) {
            setPreviewGeometries([]);
            return;
        }
        if (!isReady || !previewCode) {
            setPreviewGeometries([]);
            return;
        }

        const runPreview = async () => {
            const revision = ++previewRevisionRef.current;
            try {
                parseCode(code);
                parseCode(`${code}\n${previewCode}`);
                // Combine current code (as library) with preview code
                // Or just run the preview code if it's independent
                // For live modeling, it's usually current code + the new operation
                const result = await engine.executeCode(`${code}\n${previewCode}`);
                if (revision !== previewRevisionRef.current) {
                    setStalePreviewResponsesDropped((prev) => prev + 1);
                    return;
                }
                setPreviewGeometries(result.geometries);
            } catch (err) {
                if (revision !== previewRevisionRef.current) {
                    setStalePreviewResponsesDropped((prev) => prev + 1);
                    return;
                }
                // Silently ignore preview errors to avoid flickering red screens
                console.warn('Live Preview Error:', err);
            }
        };

        const timer = setTimeout(runPreview, 150); // Aggressive debounce for preview
        return () => clearTimeout(timer);
    }, [code, previewCode, isReady, engine, studioScript]);

    const executeGeometry = useCallback(async (codeToExecute: string) => {
        const revision = ++mainRevisionRef.current;
        setCurrentCodeRevision(revision);
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

        if (!isReady) return;
        setIsComputing(true);
        try {
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
    }, [engine, isReady, executionCount, pushExecutionRecord]);

    const value: GeometryContextType = useMemo(() => ({
        geometries: displayGeometries,
        previewGeometries,
        sketchesGeometries,
        showSketches,
        toggleSketchVisibility,
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
        stalePreviewResponsesDropped,
        sessionToken,
        executeGeometry,
        setPreviewCode,
        updateParam,
        setGeometryTransformOverride,
        clearGeometryTransformOverrides,
    }), [displayGeometries, previewGeometries, sketchesGeometries, showSketches, toggleSketchVisibility, error, isReady, isComputing, executionCount, currentCodeRevision, lastSuccessfulRevision, executionHistory, scriptParams, scriptReview, featureRecords, recomputeMs, staleMainResponsesDropped, stalePreviewResponsesDropped, sessionToken, executeGeometry, updateParam, setGeometryTransformOverride, clearGeometryTransformOverrides]);

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
