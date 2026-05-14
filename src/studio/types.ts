// Studio adaptive UI — shared types.
//
// The Studio shell is a pure function of the latest recompute result. These
// types are the contract every shell component reads against; Phase 3
// components import from here, never from the underlying primitives directly.

import type { FeatureRecord } from '../intent/featureRecord';
import type { GeometryResult } from '../lib/workerTypes';
import type { ValidatorResult, ValidatorStatus } from '../lib/mates/validator';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import type { ParamTable } from '../runtime/paramTable';

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
    readonly validity: ValidatorResult | null;
    readonly paramTable: ParamTable | null;
    readonly diagnostics: readonly CompilerDiagnostic[];
    readonly recomputeMs: number;
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
