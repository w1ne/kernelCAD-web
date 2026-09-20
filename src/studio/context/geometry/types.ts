// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GeometryResult } from '../../../shared/worker/geometryEngine';
import { rehydrateFromBridge, type FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';

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
    /**
     * Assembly-validator block. `reviewPipeline` returns this on BOTH its
     * ok and not-ok branches with the real counts (`validateAssembly`'s own
     * `partCount` / `jointCount`), but the Studio used to drop it and render
     * `0 parts · 0 joints` for every model. Absent on the `live=1`
     * short-circuit and on the placeholder review synthesised below, which is
     * exactly what `reviewWasValidated` keys off.
     */
    validator?: {
        status?: string;
        partCount?: number;
        jointCount?: number;
    };
    /** Set by the dev review endpoint's `live=1` short-circuit: interference
     *  channel only, no validator pass. Never a verdict. */
    live?: boolean;
    suggestedRepairPrompt?: string;
    /**
     * Raw pairwise interference results at the script's current/default pose,
     * BEFORE any `ignore` filtering applied by `assembly.solvedModel`. The
     * Studio uses this as the live raw channel and pairs it with
     * `interferenceSummary` for the actionable footer count/tooltip. The
     * validator's filtered diagnostics still flow through `diagnostics` above
     * for the Validity tab and the `validate: 'error'` throw path.
     */
    rawInterferencePairs?: Array<{
        a: string;
        b: string;
        volumeMm3: number;
    }>;
    interferenceSummary?: {
        rawCount: number;
        contactNoiseCount: number;
        actionableCount: number;
        capMm3: number;
    };
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
    livePhysicalUseCaseReview?: boolean;
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
export function detectEmptyBuild(
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

function isPhysicalUseCaseReviewCode(code: string | undefined): boolean {
    return code?.startsWith('assembly.physical-use-case.') === true;
}

type BlockingReasons = NonNullable<NonNullable<ScriptReviewSummary['fitness']>['blockingReasons']>;

/**
 * `hasLivePhysicalUseCaseReview` branch of `overlayLiveReview`: the live
 * payload carries a fresh physical-use-case pass, so previous
 * physical-use-case diagnostics/blocking-reasons are dropped and replaced
 * wholesale while every other diagnostic is kept. Split out purely to keep
 * `overlayLiveReview` under the complexity ratchet.
 */
function mergePhysicalUseCaseReview(
    previous: ScriptReviewSummary,
    live: ScriptReviewSummary,
    liveDiagnostics: NonNullable<ScriptReviewSummary['diagnostics']>,
): ScriptReviewSummary {
    const nonPhysicalDiagnostics = (previous.diagnostics ?? []).filter((diagnostic) =>
        !isPhysicalUseCaseReviewCode(diagnostic.code),
    );
    const nonPhysicalBlockingReasons = (previous.fitness?.blockingReasons ?? []).filter((reason) =>
        !isPhysicalUseCaseReviewCode(reason.code),
    );
    const mergedBlockingReasons = mergeLiveBlockingReasons(live, liveDiagnostics, nonPhysicalBlockingReasons);
    const mergedFitness = mergePhysicalUseCaseFitness(previous, live, liveDiagnostics, nonPhysicalBlockingReasons, mergedBlockingReasons);
    return {
        ...previous,
        ok: nonPhysicalDiagnostics.length === 0 && nonPhysicalBlockingReasons.length === 0
            ? live.ok
            : false,
        diagnostics: [...nonPhysicalDiagnostics, ...liveDiagnostics],
        fitness: mergedFitness,
        rawInterferencePairs: live.rawInterferencePairs,
        interferenceSummary: live.interferenceSummary,
    };
}

function mergeLiveBlockingReasons(
    live: ScriptReviewSummary,
    liveDiagnostics: NonNullable<ScriptReviewSummary['diagnostics']>,
    nonPhysicalBlockingReasons: BlockingReasons,
): BlockingReasons {
    const liveBlockingReasons = live.fitness?.blockingReasons ?? liveDiagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        message: diagnostic.message,
        repairHint: diagnostic.hint,
    }));
    return [...nonPhysicalBlockingReasons, ...liveBlockingReasons];
}

function selectPhysicalUseCaseRepairMode(
    previous: ScriptReviewSummary,
    live: ScriptReviewSummary,
    liveDiagnostics: NonNullable<ScriptReviewSummary['diagnostics']>,
    nonPhysicalBlockingReasons: BlockingReasons,
): string | undefined {
    return nonPhysicalBlockingReasons.length > 0
        ? previous.fitness?.repairMode
        : liveDiagnostics.length > 0
            ? live.fitness?.repairMode ?? 'physical-use-case'
            : previous.fitness?.repairMode;
}

function mergePhysicalUseCaseFitness(
    previous: ScriptReviewSummary,
    live: ScriptReviewSummary,
    liveDiagnostics: NonNullable<ScriptReviewSummary['diagnostics']>,
    nonPhysicalBlockingReasons: BlockingReasons,
    mergedBlockingReasons: BlockingReasons,
): ScriptReviewSummary['fitness'] {
    return previous.fitness !== undefined || live.fitness !== undefined
        ? mergedBlockingReasons.length > 0
            ? {
                ...(previous.fitness ?? {}),
                ...(live.fitness ?? {}),
                functional: false,
                repairMode: selectPhysicalUseCaseRepairMode(previous, live, liveDiagnostics, nonPhysicalBlockingReasons),
                blockingReasons: mergedBlockingReasons,
            }
            : undefined
        : undefined;
}

export function overlayLiveReview(
    previous: ScriptReviewSummary | null,
    live: ScriptReviewSummary,
): ScriptReviewSummary {
    if (!previous) return live;
    const liveDiagnostics = live.diagnostics ?? [];
    if (live.livePhysicalUseCaseReview === true) {
        return mergePhysicalUseCaseReview(previous, live, liveDiagnostics);
    }
    const hasLiveDiagnostics = liveDiagnostics.length > 0;
    const hasLiveFitness = live.fitness !== undefined;
    return {
        ...previous,
        ...(hasLiveDiagnostics ? { ok: live.ok, diagnostics: liveDiagnostics } : {}),
        ...(hasLiveFitness ? { ok: live.ok, fitness: live.fitness } : {}),
        rawInterferencePairs: live.rawInterferencePairs,
        interferenceSummary: live.interferenceSummary,
    };
}

export function readStudioScriptParam(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('script');
}

export function featureMeshesToGeometries(features: FeatureMeshSerialized[]): GeometryResult[] {
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

export function isAbortError(err: unknown): boolean {
    return typeof err === 'object'
        && err !== null
        && 'name' in err
        && err.name === 'AbortError';
}
