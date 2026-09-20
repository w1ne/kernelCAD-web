// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef } from 'react';
import {
    shouldUseHostedMesh, meshSourceHosted, devMeshAvailable, meshSourceDev,
    type BackendMeshPayload, type ParamOverrides,
} from '../../scriptSource';
import { apiCall, rewritePath } from '../../api/apiBase';
import { detectEmptyBuild, featureMeshesToGeometries } from './types';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ExecutionApplyDeps } from './executionApplyDeps';

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
    const paramOverridesRef = useRef<ParamOverrides>({});

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
        deps.setGeometries(geos);
        deps.setGeometryTransformOverrides({});
        deps.setFeatureRecords(recs);
        deps.setScriptParams(Object.values(payload.params ?? {}));
        deps.setScriptReview(review);
        deps.setSketchesGeometries([]);
        deps.setPreviewGeometries([]);
        deps.setError(emptyNotice);
        if (emptyNotice) {
            deps.pushExecutionRecord({ revision, status: 'error', error: emptyNotice, executionCountAtRecord: executionCount + 1 });
        } else {
            deps.setLastSuccessfulRevision(revision);
            deps.pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
        }
    }, [executionCount, deps]);

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

        const revision = ++deps.mainRevisionRef.current;
        deps.setCurrentCodeRevision(revision);
        deps.setIsComputing(true);
        try {
            const payload = hosted
                ? await meshSourceHosted(code, overrides)
                : await meshSourceDev(code, overrides);
            // Superseded by a newer edit (code change or another param drag).
            if (revision !== deps.mainRevisionRef.current) return;
            applyBridgePayload(payload, revision);
        } catch (err) {
            if (revision !== deps.mainRevisionRef.current) return;
            deps.setError(err instanceof Error ? err.message : String(err));
        } finally {
            if (revision === deps.mainRevisionRef.current) {
                deps.setIsComputing(false);
                deps.setExecutionCount(prev => prev + 1);
            }
        }
    }, [sessionToken, code, applyBridgePayload, deps]);

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
