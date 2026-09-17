// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { apiCall, rewritePath, bearerToken, buildEventsUrl } from '../../api/apiBase';
import { overlayLiveReview, type ScriptReviewSummary } from './types';
import type { MeshFetchOpts } from './useMeshFetch';

type RequestMeshAndReview = (script: string, token: string | null, opts?: MeshFetchOpts) => void;

/**
 * Owns the pooled-session live-update surface: the pose-only fast path
 * (`applyPoseOnlyRelower`), the lightweight live-review refresh
 * (`fetchLiveReview`), the SSE `relower` subscription that drives both, and
 * the `kernelEpoch` counter bumped on every relower.
 */
export function useRelowerSubscription(
    studioScript: string | null,
    sessionToken: string | null,
    viewportDriverLockRef: MutableRefObject<boolean>,
    setGeometryTransformOverrides: (next: Record<string, number[]>) => void,
    setScriptReview: Dispatch<SetStateAction<ScriptReviewSummary | null>>,
    requestMeshAndReview: RequestMeshAndReview,
) {
    const [kernelEpoch, setKernelEpoch] = useState(0);

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
    }, [setScriptReview]);

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

    return { kernelEpoch };
}
