// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/directEdit/candidateReview.ts
//
// Evaluate a candidate source through the dev review endpoint WITHOUT
// committing it (or meshing it). Returns the review summary plus a validity
// delta against a baseline review. Side-effect free: the caller decides
// whether to apply.
//
// The delta is NEVER fabricated: it is `null` unless the evaluator returned
// a review that actually carries the interference channel. A review without
// `rawInterferencePairs` (e.g. a pre-build compile failure, which the review
// tool emits without an assembly scene) is treated as "no data" — `ok:false`,
// `delta:null` — never as "zero interferences, valid".
//
// This module deliberately defines its own delta shape (rather than
// importing the shell store's) so the Studio store is not a dependency here.

import { reviewSourceDev } from '../scriptSource';
import type { ScriptReviewSummary } from '../context/GeometryContext';

export interface CandidateValidityDelta {
    readonly fromInterferences: number;
    readonly toInterferences: number;
    readonly fromVolumeMm3: number;
    readonly toVolumeMm3: number;
    readonly fromOk: boolean;
    readonly toOk: boolean;
}

export interface CandidateReview {
    /** True only when the evaluator resolved AND returned interference data. */
    readonly ok: boolean;
    readonly error?: string;
    readonly review: ScriptReviewSummary | null;
    /** Null when there is no baseline/candidate interference data — the six
     *  fields are populated only when a real candidate review exists. */
    readonly delta: CandidateValidityDelta | null;
}

/** Structural subset of a raw interference pair — tolerates malformed
 *  runtime entries where `volumeMm3` is missing. */
type InterferencePairLike = { readonly volumeMm3?: number };

function pairCount(pairs: ReadonlyArray<InterferencePairLike> | null | undefined): number {
    return pairs?.length ?? 0;
}

function volumeSum(pairs: ReadonlyArray<InterferencePairLike> | null | undefined): number {
    let total = 0;
    for (const pair of pairs ?? []) total += pair.volumeMm3 ?? 0;
    return total;
}

export async function reviewCandidate(input: {
    readonly source: string;
    readonly script: string;
    readonly baseline: ScriptReviewSummary | null;
    readonly evaluate?: (source: string) => Promise<ScriptReviewSummary>;
}): Promise<CandidateReview> {
    const evaluate = input.evaluate ?? ((source: string) => reviewSourceDev(source, input.script));
    const baselinePairs = input.baseline?.rawInterferencePairs;
    const fromInterferences = pairCount(baselinePairs);
    const fromVolumeMm3 = volumeSum(baselinePairs);
    // No baseline review means nothing is known to be wrong with the current
    // state; the candidate verdict below is always the real one.
    const fromOk = input.baseline?.ok ?? true;

    try {
        const review: ScriptReviewSummary | null = await evaluate(input.source);
        if (review === null || review.rawInterferencePairs === undefined) {
            return { ok: false, review, delta: null };
        }
        return {
            ok: true,
            review,
            delta: {
                fromInterferences,
                toInterferences: pairCount(review.rawInterferencePairs),
                fromVolumeMm3,
                toVolumeMm3: volumeSum(review.rawInterferencePairs),
                fromOk,
                toOk: review.ok,
            },
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            review: null,
            delta: null,
        };
    }
}
