// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/directEdit/candidateReview.ts
//
// Evaluate a candidate source through the dev mesh endpoint WITHOUT
// committing it. Returns the mesh payload plus a validity delta against a
// baseline review. Side-effect free: the caller decides whether to apply.
//
// This module deliberately defines its own delta shape (rather than
// importing the shell store's) so the Studio store is not a dependency here.

import { meshSourceDev, type BackendMeshPayload } from '../scriptSource';
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
    readonly ok: boolean;
    readonly error?: string;
    readonly payload?: BackendMeshPayload;
    readonly review: ScriptReviewSummary | null;
    readonly delta: CandidateValidityDelta;
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
    readonly baseline: ScriptReviewSummary | null;
    readonly evaluate?: (source: string) => Promise<BackendMeshPayload>;
}): Promise<CandidateReview> {
    const evaluate = input.evaluate ?? meshSourceDev;
    const baselinePairs = input.baseline?.rawInterferencePairs;
    const fromInterferences = pairCount(baselinePairs);
    const fromVolumeMm3 = volumeSum(baselinePairs);
    const fromOk = input.baseline?.ok ?? true;

    try {
        const payload = await evaluate(input.source);
        const review = payload.review ?? null;
        const toPairs = review?.rawInterferencePairs;
        return {
            ok: true,
            payload,
            review,
            delta: {
                fromInterferences,
                toInterferences: pairCount(toPairs),
                fromVolumeMm3,
                toVolumeMm3: volumeSum(toPairs),
                fromOk,
                toOk: review?.ok ?? true,
            },
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            review: null,
            delta: {
                fromInterferences,
                toInterferences: 0,
                fromVolumeMm3,
                toVolumeMm3: 0,
                fromOk,
                toOk: false,
            },
        };
    }
}
