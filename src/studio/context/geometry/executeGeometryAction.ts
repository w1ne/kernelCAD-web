// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { remapSketchNames } from '../../../shared/codeGeneration/sketchNaming';
import { parseCode } from '../../../shared/codeGeneration/ast';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import {
    shouldUseHostedMesh,
    meshSourceHosted,
    devMeshAvailable,
    meshSourceDev,
    needsFullKernel,
    type BackendMeshPayload,
} from '../../scriptSource';
import { featureMeshesToGeometries } from './types';
import type { ExecutionApplyDeps } from './executionApplyDeps';

/** Applies a stateless mesh-endpoint payload to context state for the
 *  explicit `executeGeometry` (Validate) action. Unlike the auto-run loop's
 *  `applyAutoRunPayload`, this path has no empty-build guard — it mirrors
 *  `executeGeometry`'s original inline apply blocks exactly. */
function applyExecuteGeometryPayload(deps: ExecutionApplyDeps, revision: number, executionCount: number, payload: BackendMeshPayload): void {
    deps.setGeometries(featureMeshesToGeometries(payload.features as FeatureMeshSerialized[]));
    deps.setGeometryTransformOverrides({});
    deps.setFeatureRecords((payload.featureRecords as FeatureRecord[]) ?? []);
    deps.setScriptParams(Object.values(payload.params ?? {}));
    deps.setScriptReview(payload.review ?? { ok: true, diagnostics: [] });
    deps.setSketchesGeometries([]);
    deps.setPreviewGeometries([]);
    deps.setError(null);
    deps.setLastSuccessfulRevision(revision);
    deps.pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
}

// Hosted deploy (app.kernelcad.com): no local kernel backend, and the
// in-process worker is the legacy v0.1 runtime that throws on modern
// kernelCAD API globals (assembly, setRenderEnvironment, .material, …).
// Resolve via build-time precompute (static CDN) first, then the server
// mesh endpoint for edits. Not gated on worker `isReady` — this path
// doesn't need the local worker.
async function runHostedExecuteGeometry(
    deps: ExecutionApplyDeps,
    codeToExecute: string,
    revision: number,
    executionCount: number,
): Promise<void> {
    deps.setIsComputing(true);
    try {
        const payload = await meshSourceHosted(codeToExecute);
        if (revision !== deps.mainRevisionRef.current) {
            deps.setStaleMainResponsesDropped((prev) => prev + 1);
            deps.pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
            return;
        }
        applyExecuteGeometryPayload(deps, revision, executionCount, payload);
    } catch (err: unknown) {
        if (revision !== deps.mainRevisionRef.current) {
            deps.setStaleMainResponsesDropped((prev) => prev + 1);
            deps.pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
            return;
        }
        const message = err instanceof Error ? err.message : String(err);
        deps.setError(message);
        deps.pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: executionCount + 1 });
    } finally {
        if (revision === deps.mainRevisionRef.current) deps.setIsComputing(false);
    }
}

// Same up-front router as the auto-run path: Param-method / assembly
// scripts must not be handed to the worker (Validate on the default Studio
// starter has no `?script=`).
async function runKernelOrWorkerExecuteGeometry(
    deps: ExecutionApplyDeps,
    codeToExecute: string,
    revision: number,
    executionCount: number,
    useDevKernel: boolean,
    isReady: boolean,
): Promise<void> {
    if (!useDevKernel && !isReady) return;
    deps.setIsComputing(true);
    try {
        if (useDevKernel) {
            const payload = await meshSourceDev(codeToExecute);
            if (revision !== deps.mainRevisionRef.current) {
                deps.setStaleMainResponsesDropped((prev) => prev + 1);
                deps.pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
                return;
            }
            applyExecuteGeometryPayload(deps, revision, executionCount, payload);
        } else {
            const result = await deps.engine.executeCode(codeToExecute);
            if (revision !== deps.mainRevisionRef.current) {
                deps.setStaleMainResponsesDropped((prev) => prev + 1);
                deps.pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
                return;
            }
            deps.setGeometries(result.geometries);
            deps.setGeometryTransformOverrides({});
            deps.setSketchesGeometries(remapSketchNames(result.sketches, codeToExecute));
            deps.setError(null);
            deps.setLastSuccessfulRevision(revision);
            deps.pushExecutionRecord({ revision, status: 'success', executionCountAtRecord: executionCount + 1 });
        }
    } catch (err: unknown) {
        if (revision !== deps.mainRevisionRef.current) {
            deps.setStaleMainResponsesDropped((prev) => prev + 1);
            deps.pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
            return;
        }
        const message = err instanceof Error ? err.message : String(err);
        if (!useDevKernel && devMeshAvailable() && /is not defined|is not a function/.test(message)) {
            try {
                const payload = await meshSourceDev(codeToExecute);
                if (revision !== deps.mainRevisionRef.current) {
                    deps.setStaleMainResponsesDropped((prev) => prev + 1);
                    deps.pushExecutionRecord({ revision, status: 'stale', executionCountAtRecord: executionCount + 1 });
                    return;
                }
                applyExecuteGeometryPayload(deps, revision, executionCount, payload);
                return;
            } catch {
                // Dev fallback also failed — fall through and surface the
                // original worker error below.
            }
        }
        deps.setError(message);
        deps.pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: executionCount + 1 });
    } finally {
        if (revision === deps.mainRevisionRef.current) {
            deps.setIsComputing(false);
            deps.setExecutionCount(prev => prev + 1);
        }
    }
}

/** Body of the `executeGeometry` (Validate) callback for the legacy
 *  in-process script path (no `studioScript` — that branch is handled by the
 *  caller before this is invoked). Moved out to a plain function so
 *  `useScriptExecution` stays under the length/complexity ratchet. */
export async function runExecuteGeometryAction(
    deps: ExecutionApplyDeps,
    codeToExecute: string,
    executionCount: number,
    isReady: boolean,
): Promise<void> {
    const revision = ++deps.mainRevisionRef.current;
    deps.setCurrentCodeRevision(revision);
    const useDevKernel = devMeshAvailable() && needsFullKernel(codeToExecute);
    // Acorn can't parse TypeScript; only the legacy worker path below needs
    // this pre-check. Hosted and full-kernel paths transpile modern
    // .kcad.ts themselves, so acorn must not block them (it throws
    // "Unexpected token" on TS).
    if (!shouldUseHostedMesh() && !useDevKernel) {
        try {
            parseCode(codeToExecute);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            deps.setError(message);
            deps.pushExecutionRecord({ revision, status: 'error', error: message, executionCountAtRecord: executionCount + 1 });
            return;
        }
    }

    if (shouldUseHostedMesh()) {
        await runHostedExecuteGeometry(deps, codeToExecute, revision, executionCount);
        return;
    }

    await runKernelOrWorkerExecuteGeometry(deps, codeToExecute, revision, executionCount, useDevKernel, isReady);
}
