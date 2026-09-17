// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { remapSketchNames } from '../../../shared/codeGeneration/sketchNaming';
import { parseCode } from '../../../shared/codeGeneration/ast';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import {
    shouldUseHostedMesh,
    meshSourceHosted,
    devMeshAvailable,
    meshSourceDev,
    needsFullKernel,
    rootVisibleFeatures,
    type BackendMeshPayload,
} from '../../scriptSource';
import { detectEmptyBuild, featureMeshesToGeometries } from './types';
import type { ExecutionApplyDeps } from './executionApplyDeps';

/** Applies a hosted/dev-kernel mesh payload to context state, incl. the
 *  empty-build guard. Shared by the hosted and dev-kernel branches of the
 *  auto-run loop below. */
function applyAutoRunPayload(deps: ExecutionApplyDeps, revision: number, executionCount: number, payload: BackendMeshPayload): void {
    const geometries = featureMeshesToGeometries(rootVisibleFeatures(payload));
    const records = (payload.featureRecords as FeatureRecord[]) ?? [];
    // Placeholder, NOT a verdict: a mesh response with no `review` block
    // means nothing validated this model. `reviewWasValidated` recognises
    // the shape (no validator / fitness / mechanism / diagnostics) so the
    // Validity panel reports "not run" instead of a green "solved" over an
    // empty set.
    const review = payload.review ?? { ok: true, diagnostics: [] };
    const emptyNotice = detectEmptyBuild(geometries.length, records, review);
    deps.setGeometries(geometries);
    deps.setGeometryTransformOverrides({});
    deps.setFeatureRecords(records);
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
}

// Hosted deploy (app.kernelcad.com): the in-process worker is the legacy
// v0.1 runtime that throws on modern API globals, so this auto-run path
// must resolve via build-time precompute / server mesh instead of
// `engine.executeCode`. Not gated on worker `isReady`.
async function runHostedAutoExecution(
    deps: ExecutionApplyDeps,
    code: string,
    revision: number,
    executionCount: number,
): Promise<void> {
    deps.setIsComputing(true);
    let staleRecorded = false;
    try {
        const payload = await meshSourceHosted(code);
        if (revision !== deps.mainRevisionRef.current) {
            deps.setStaleMainResponsesDropped((prev) => prev + 1);
            staleRecorded = true;
            return;
        }
        applyAutoRunPayload(deps, revision, executionCount, payload);
    } catch (err: unknown) {
        if (revision !== deps.mainRevisionRef.current) {
            deps.setStaleMainResponsesDropped((prev) => prev + 1);
            staleRecorded = true;
            return;
        }
        const message = err instanceof Error ? err.message : String(err);
        deps.setError(message);
        deps.pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: executionCount + 1 });
    } finally {
        if (revision === deps.mainRevisionRef.current) {
            deps.setIsComputing(false);
            deps.setExecutionCount(prev => prev + 1);
        } else if (!staleRecorded) {
            deps.setStaleMainResponsesDropped((prev) => prev + 1);
            deps.pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
        }
    }
}

function logAndDescribeWorkerError(err: unknown): string {
    console.error(err);
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    }
    return String(err);
}

// The in-browser worker is the legacy v0.1 runtime — it only exposes
// `param`/`box`/`cylinder`/`sphere`/`Sketcher`, and `param()` returns a
// plain number. Models built with the modern assembly/joint/tendon kernel,
// or ParamRef arithmetic (`.add` / `.divide`), can ONLY run on the node
// kernel — handing them to the worker is a guaranteed throw (`assembly is
// not defined` / `t.add is not a function`). On localhost dev, detect those
// up front and route straight to the node-backed dev mesh endpoint — the
// worker is never given code it can't evaluate, so there is no
// throw-then-recover "choke". The reactive fallback in the catch below
// stays as a safety net for any other API the worker happens to lack.
async function runWorkerOrDevKernelAutoExecution(
    deps: ExecutionApplyDeps,
    code: string,
    revision: number,
    executionCount: number,
): Promise<void> {
    deps.setIsComputing(true);
    const useDevKernel = devMeshAvailable() && needsFullKernel(code);
    let staleRecorded = false;
    try {
        if (useDevKernel) {
            const payload = await meshSourceDev(code);
            if (revision !== deps.mainRevisionRef.current) {
                deps.setStaleMainResponsesDropped((prev) => prev + 1);
                staleRecorded = true;
                return;
            }
            applyAutoRunPayload(deps, revision, executionCount, payload);
        } else {
            const result = await deps.engine.executeCode(code);
            if (revision !== deps.mainRevisionRef.current) {
                deps.setStaleMainResponsesDropped((prev) => prev + 1);
                staleRecorded = true;
                return;
            }
            deps.setGeometries(result.geometries);
            deps.setGeometryTransformOverrides({});
            deps.setSketchesGeometries(remapSketchNames(result.sketches, code));
            deps.setError(null);
            deps.setLastSuccessfulRevision(revision);
            deps.pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
        }
    } catch (err: unknown) {
        if (revision !== deps.mainRevisionRef.current) {
            deps.setStaleMainResponsesDropped((prev) => prev + 1);
            staleRecorded = true;
            return;
        }
        const message = logAndDescribeWorkerError(err);
        // Safety net: if the worker path threw because it lacks an API
        // global (and we didn't already route to the node kernel up
        // front), retry once through the dev mesh endpoint before
        // surfacing the error. Genuine user errors still surface
        // immediately without a wasted round-trip.
        if (!useDevKernel && devMeshAvailable() && /is not defined|is not a function/.test(message)) {
            try {
                const payload = await meshSourceDev(code);
                if (revision !== deps.mainRevisionRef.current) {
                    deps.setStaleMainResponsesDropped((prev) => prev + 1);
                    staleRecorded = true;
                    return;
                }
                applyAutoRunPayload(deps, revision, executionCount, payload);
                return;
            } catch {
                // Dev fallback also failed — fall through and surface the
                // original worker error below.
            }
        }
        deps.setError(message);
        // Preserve last successful geometry; only track failed execution metadata.
        deps.pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: executionCount + 1 });
    } finally {
        if (revision === deps.mainRevisionRef.current) {
            deps.setIsComputing(false);
            deps.setExecutionCount(prev => prev + 1);
        } else if (!staleRecorded) {
            deps.setStaleMainResponsesDropped((prev) => prev + 1);
            deps.pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
        }
    }
}

/** Body of the debounced auto-run execution loop's `run()` closure, moved
 *  out to a plain function so it can be unit-testable and to keep
 *  `useScriptExecution` under the length/complexity ratchet. Only called for
 *  the legacy in-process script path (no `studioScript`). */
export async function runAutoExecutionLoop(
    deps: ExecutionApplyDeps,
    code: string,
    executionCount: number,
): Promise<void> {
    const revision = ++deps.mainRevisionRef.current;
    deps.setCurrentCodeRevision(revision);
    // These two probes now run inside the 600ms debounce timer instead of
    // the effect body (the original computed them before scheduling the
    // timer). Inert: `shouldUseHostedMesh()` reads `window.location.hostname`
    // and `devMeshAvailable()` reads `import.meta.env.DEV` — both are fixed
    // for the page's whole lifetime, so evaluating them ~600ms later never
    // changes the result.
    const hosted = shouldUseHostedMesh();
    // Assembly/kinematic models route to the node kernel and never touch
    // the worker, so they must not be blocked on worker `isReady` —
    // otherwise a slow or failed worker init would stall a model the
    // worker can't run anyway.
    const routesToDevKernel = devMeshAvailable() && needsFullKernel(code);
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
            if (revision !== deps.mainRevisionRef.current) {
                deps.setStaleMainResponsesDropped((prev) => prev + 1);
                return;
            }
            const message = err instanceof Error ? err.message : String(err);
            deps.setError(message);
            deps.pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: executionCount + 1 });
            return;
        }
    }
    if (hosted) {
        await runHostedAutoExecution(deps, code, revision, executionCount);
        return;
    }
    await runWorkerOrDevKernelAutoExecution(deps, code, revision, executionCount);
}
