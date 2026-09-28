// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/directEdit/candidateReview.ts
//
// Evaluate a candidate source through the dev review endpoint WITHOUT
// committing it (or meshing it). Returns the review summary plus a validity
// delta against a baseline review. Side-effect free: the caller decides
// whether to apply.
//
// Evaluation success is kept separate from interference evidence:
// - `ok`       — the evaluation call itself succeeded (candidate compiled and
//                was reviewed). A valid single-body model with no assembly
//                still yields `ok: true`.
// - `reviewed` — the review actually carries the `rawInterferencePairs`
//                channel, so `delta` is meaningful. A review without that
//                channel (e.g. a model with no assembly scene) yields
//                `reviewed: false`, `delta: null` — never a fabricated
//                "zero interferences, valid" delta.
//
// Evaluator: the dev review endpoint on localhost; on the hosted app (which
// has no review route) the server mesh endpoint, whose success/failure is the
// run verdict and which carries no interference channel (`reviewed: false`).
//
// This module deliberately defines its own delta shape (rather than
// importing the shell store's) so the Studio store is not a dependency here.

import { meshSourceHosted, reviewSourceDev, shouldUseHostedMesh } from '../scriptSource';
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
    /** The evaluation call succeeded (candidate compiled and was reviewed). */
    readonly ok: boolean;
    /** The review supplied an interference channel; delta is only meaningful
     *  when this is true. */
    readonly reviewed: boolean;
    readonly error?: string;
    readonly review: ScriptReviewSummary | null;
    /** Null unless the candidate review carries the interference channel. */
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

/** Run the candidate on the hosted server kernel; a thrown error is a failed
 *  run. The mesh payload's review (if any) is the verdict. */
async function reviewSourceHosted(source: string): Promise<ScriptReviewSummary | null> {
    const payload = await meshSourceHosted(source);
    return payload.review ?? null;
}

export function defaultCandidateEvaluator(script: string): (source: string) => Promise<ScriptReviewSummary | null> {
    return shouldUseHostedMesh()
        ? reviewSourceHosted
        : (source: string) => reviewSourceDev(source, script);
}

export async function reviewCandidate(input: {
    readonly source: string;
    readonly script: string;
    readonly baseline: ScriptReviewSummary | null;
    readonly evaluate?: (source: string) => Promise<ScriptReviewSummary | null>;
}): Promise<CandidateReview> {
    const evaluate = input.evaluate ?? defaultCandidateEvaluator(input.script);
    const baselinePairs = input.baseline?.rawInterferencePairs;
    const fromInterferences = pairCount(baselinePairs);
    const fromVolumeMm3 = volumeSum(baselinePairs);
    // No baseline review means nothing is known to be wrong with the current
    // state; the candidate verdict below is always the real one.
    const fromOk = input.baseline?.ok ?? true;

    try {
        const review: ScriptReviewSummary | null = await evaluate(input.source);
        // Presence of the channel is an OWN-property check: an absent
        // `rawInterferencePairs` key means the review ran no interference
        // pass (e.g. no assembly), which is different from "zero pairs".
        if (review === null || !Object.prototype.hasOwnProperty.call(review, 'rawInterferencePairs')) {
            return { ok: true, reviewed: false, review, delta: null };
        }
        return {
            ok: true,
            reviewed: true,
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
            reviewed: false,
            error: error instanceof Error ? error.message : String(error),
            review: null,
            delta: null,
        };
    }
}
