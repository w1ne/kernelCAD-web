// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import { GeometryEngine, type GeometryResult, type SketchGeometry } from '../../shared/worker/geometryEngine';
import { remapSketchNames } from '../../shared/codeGeneration/sketchNaming';
import { parseCode } from '../../shared/codeGeneration/ast';
import { rehydrateFromBridge, type FeatureMeshSerialized } from '../../modeling/capture/featureMeshSerialize';
import type { SerializedParamEntry, SerializedParamTable } from '../../shared/runtime/paramTable';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { shouldUseHostedMesh, meshSourceHosted, devMeshAvailable, meshSourceDev, needsFullKernel, type BackendMeshPayload, type ParamOverrides } from '../scriptSource';
import { apiCall, rewritePath, bearerToken, buildEventsUrl } from '../api/apiBase';

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

/**
 * Detect a *silent* build failure in an otherwise-200 mesh response.
 *
 * The kernel can return a successful payload that renders nothing: an assembly
 * whose parts all failed to mesh (`meshFeaturesPerFeature` skips them), a
 * boolean that subtracted everything, or a feature that compiled to an empty
 * solid. Left alone the viewport just goes blank under a green "Ready / 0
 * bodies" — the swallowed-error symptom reported for app.kernelcad.com/p/43PSZn6U.
 *
 * Returns a message to surface via `error`, or null when the empty result is
 * legitimate (an empty or sketch-only script renders no solids by design and
 * must NOT be flagged). When the kernel attached its own error diagnostic
 * (the hosted server includes `review`), that message is preferred.
 */
function detectEmptyBuild(
    renderedMeshCount: number,
    featureRecords: FeatureRecord[],
    review: ScriptReviewSummary | null | undefined,
): string | null {
    if (renderedMeshCount > 0) return null;
    // Empty or sketch-only scripts render no solids by design — not a failure.
    if (!featureRecords.some((r) => r.kind !== 'sketch')) return null;
    // A solid-producing model that rendered nothing is a swallowed build
    // failure. Prefer the kernel's own error diagnostic when present.
    const firstError = (review?.diagnostics ?? []).find((d) => (d.severity ?? 'error') === 'error');
    if (firstError?.message) {
        return `Model produced no visible geometry: ${firstError.message}`;
    }
    return 'Model compiled but produced no visible geometry. Open the Validity panel for diagnostics.';
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
    // While true, animation playback owns the override map; the SSE pose-only
    // fast path must not replace it (see `setViewportDriverLock`). A ref, not
    // state, so reads inside the long-lived SSE handler always see the current
    // value without re-subscribing the EventSource.
    const viewportDriverLockRef = useRef(false);
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
                            // pairs — keep the last FULL review's validator and
                            // envelope output and overlay the live channel.
                            setScriptReview((prev) => prev
                                ? { ...prev, rawInterferencePairs: reviewPayload.rawInterferencePairs }
                                : reviewPayload);
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
    }, []);

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
            setScriptReview((prev) => prev
                ? { ...prev, rawInterferencePairs: payload.rawInterferencePairs }
                : payload);
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
    }, [executionCount, pushExecutionRecord]);

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

    const setGeometryTransformOverride = useCallback((partName: string, transform: number[]) => {
        if (transform.length !== 16) return;
        setGeometryTransformOverrides((prev) => ({ ...prev, [partName]: [...transform] }));
    }, []);

    const clearGeometryTransformOverrides = useCallback(() => {
        setGeometryTransformOverrides({});
    }, []);

    const setViewportDriverLock = useCallback((locked: boolean) => {
        viewportDriverLockRef.current = locked;
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
                    const hostedGeometries = featureMeshesToGeometries(payload.features as FeatureMeshSerialized[]);
                    const hostedRecords = (payload.featureRecords as FeatureRecord[]) ?? [];
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
            // `param`/`box`/`cylinder`/`sphere`/`Sketcher`. Models built with the
            // modern assembly/joint/tendon kernel can ONLY run on the node kernel,
            // so handing them to the worker is a guaranteed "assembly is not
            // defined" throw. On localhost dev, detect those up front and route
            // straight to the node-backed dev mesh endpoint — the worker is never
            // given code it can't evaluate, so there is no throw-then-recover
            // "choke". The reactive fallback in the catch below stays as a safety
            // net for any other API the worker happens to lack.
            const useDevKernel = devMeshAvailable() && needsFullKernel(code);
            const applyDevPayload = (payload: BackendMeshPayload) => {
                const devGeometries = featureMeshesToGeometries(payload.features as FeatureMeshSerialized[]);
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
        // Acorn can't parse TypeScript; only the legacy worker path below needs
        // this pre-check. The hosted server-mesh path transpiles modern .kcad.ts
        // itself, so acorn must not block it (it throws "Unexpected token" on TS).
        if (!shouldUseHostedMesh()) {
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
        kernelEpoch,
        executeGeometry,
        setPreviewCode,
        updateParam,
        setGeometryTransformOverride,
        clearGeometryTransformOverrides,
        setViewportDriverLock,
    }), [displayGeometries, previewGeometries, sketchesGeometries, showSketches, toggleSketchVisibility, error, isReady, isComputing, executionCount, currentCodeRevision, lastSuccessfulRevision, executionHistory, scriptParams, scriptReview, featureRecords, recomputeMs, staleMainResponsesDropped, stalePreviewResponsesDropped, sessionToken, kernelEpoch, executeGeometry, updateParam, setGeometryTransformOverride, clearGeometryTransformOverrides, setViewportDriverLock]);

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
