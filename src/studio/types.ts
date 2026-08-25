// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Studio adaptive UI — shared types.
//
// The Studio shell is a pure function of the latest recompute result. These
// types are the contract every shell component reads against; Phase 3
// components import from here, never from the underlying primitives directly.

import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { GeometryResult } from '../shared/worker/workerTypes';
import type { ValidatorResult, ValidatorStatus } from '../modeling/mates/validator';
import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';
import type { ParamTable } from '../shared/runtime/paramTable';
import type { JointPoseSnapshot } from './adapters/featureRecordsToMates';

/**
 * A `ValidatorResult` plus the shell-only provenance flag the panel needs to
 * stay honest.
 *
 * `validated` is `false` when the review payload the shell is holding carries
 * no evidence a validation actually ran — the `{ ok: true, diagnostics: [] }`
 * placeholder `GeometryContext` substitutes for a missing `review` block, or
 * the `live=1` short-circuit the dev review endpoint returns on a
 * session-backed load. Both read as `ok`, so the derived `status` is
 * `'solved'`; consumers that paint a verdict MUST check `validated` before
 * showing that green, or they publish a pass nothing computed.
 */
export type StudioValidity = ValidatorResult & {
    readonly validated: boolean;
};

export interface StudioRepairEvidence {
    readonly repairMode: string | null;
    readonly blockingReasons: ReadonlyArray<{
        readonly code: string;
        readonly message: string;
        readonly repairHint: string;
    }>;
}

/**
 * All inspector tabs the shell knows about. Phase 1 surfaces `scene` and
 * `code` unconditionally, `params` and `validity` adaptively (see
 * `getVisibleTabs`). The rest are reserved for downstream workstreams —
 * Phase 3 renders them dim-disabled with a tooltip until their owning
 * features ship.
 */
export type TabId =
    | 'scene'
    | 'code'
    | 'params'
    | 'validity'
    | 'joints'
    | 'export'
    | 'sections'
    | 'cut'
    | 'animation'
    | 'render';

/**
 * The single snapshot every shell subscriber reads from. Aggregates the
 * primitives the existing pipeline produces (features, geometries, param
 * table, kernel diagnostics) plus the optional v0.6 validator result. The
 * aggregation lives in `useRecomputeResult`; consumers never reach into the
 * primitives directly.
 */
export interface StudioRecomputeResult {
    readonly features: readonly FeatureRecord[];
    readonly geometries: readonly GeometryResult[];
    readonly validity: StudioValidity | null;
    readonly paramTable: ParamTable | null;
    readonly diagnostics: readonly CompilerDiagnostic[];
    readonly suggestedRepairPrompt: string | null;
    readonly repairEvidence: StudioRepairEvidence | null;
    readonly recomputeMs: number;
    /**
     * Raw pairwise interference pairs at the current pose, BEFORE any `ignore`
     * filtering done by `assembly.solvedModel({ ignore: [...] })`. Inspector
     * surfaces keep this raw channel for detail, while the status footer
     * prefers `interferenceSummary.actionableCount` and only falls back to
     * locally classifying raw pairs when older review payloads omit the
     * summary.
     */
    readonly rawInterferencePairs: ReadonlyArray<{
        readonly a: string;
        readonly b: string;
        readonly volumeMm3: number;
    }>;
    readonly interferenceSummary: {
        readonly rawCount: number;
        readonly contactNoiseCount: number;
        readonly actionableCount: number;
        readonly capMm3: number;
    } | null;
    /**
     * Slice 2C — assembly joints with declared pose, extracted from
     * `solvedAssembly` FeatureRecords. Empty array when the script doesn't
     * build an assembly, or builds one with no posed mates. JointsTab uses
     * `poseParamNames` to drive `updateParam` on slider scrub.
     */
    readonly joints: readonly JointPoseSnapshot[];
    /**
     * Physics-loop banner data (P1 surface convergence). Non-null when
     * the script's mechanism is `'broken'` — carries the structured
     * failure list the Validity tab renders as a red "MECHANISM BROKEN"
     * banner above the legacy diagnostic rows. `null` when the
     * mechanism is real, unverified, or the review payload is absent.
     *
     * Spec: docs/specs/2026-06-01-physics-grounded-loop-design.md
     */
    readonly mechanismBanner: {
        readonly entries: ReadonlyArray<{
            readonly code: string;
            readonly message: string;
            readonly hint: string;
        }>;
    } | null;
    /**
     * Slice 2E.bridge — POST `edits` to the server's `/__kernelcad/params`
     * endpoint via the pooled `CaptureSession`. Returns once the server has
     * acked; the actual refresh of `paramTable` / `validity` happens on the
     * SSE `relower` push that follows. `undefined` when no session token has
     * been issued yet (e.g. the legacy in-process script path) — UI should
     * fall back to disabling the live-edit controls.
     */
    readonly updateParam?: (edits: { name: string; value: number | boolean }[]) => Promise<void>;
    readonly setGeometryTransformOverride?: (partName: string, transform: number[]) => void;
    readonly clearGeometryTransformOverrides?: () => void;
    /** Claim/release sole ownership of the part-transform override map for
     *  animation playback. While locked the SSE pose-only fast path will not
     *  replace the override map, so a baked playback pose isn't yanked off by a
     *  trailing relower. `undefined` on the legacy in-process path. */
    readonly setViewportDriverLock?: (locked: boolean) => void;
}

/**
 * `null` means nothing is selected. Selection is a soft binding — subscribers
 * tolerate "id not currently present in the result" with a no-op, not an
 * error.
 */
export type SelectedFeatureId = string | null;

/**
 * Output of `computeValidityDelta(prev, curr)`. Drives the bottom-drawer
 * header ("was: solved → now: inconsistent · +2 new · 0 cleared").
 *
 * `statusWas` is `null` on the first recompute of a session (no prior
 * snapshot); the drawer renders the unconditional "now" line in that case.
 */
export interface ValidityDelta {
    readonly statusWas: ValidatorStatus | null;
    readonly statusNow: ValidatorStatus | null;
    readonly newCount: number;
    readonly clearedCount: number;
    readonly netCount: number;
}
