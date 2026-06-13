// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ValidatorDiagnostic, ValidatorResult } from '../../modeling/mates/validator';
import type { ValidityDelta } from '../types';

/**
 * Diff two validator results to drive the bottom-drawer header.
 *
 * Identity for diff is `${code}|${partName ?? mateName ?? '*'}` — a
 * diagnostic on a renamed part counts as cleared+new, which is the right
 * thing to surface to the reviewing human.
 *
 * Empty diff for `prev === null`: first recompute of the session has no
 * prior frame; the drawer renders the unconditional "now" line.
 */
export function computeValidityDelta(
    prev: ValidatorResult | null,
    curr: ValidatorResult | null,
): ValidityDelta {
    const statusWas = prev?.status ?? null;
    const statusNow = curr?.status ?? null;

    if (prev == null || curr == null) {
        return {
            statusWas,
            statusNow,
            newCount: 0,
            clearedCount: 0,
            netCount: 0,
        };
    }

    const prevKeys = new Set(prev.diagnostics.map(diagnosticKey));
    const currKeys = new Set(curr.diagnostics.map(diagnosticKey));

    let newCount = 0;
    let clearedCount = 0;
    for (const key of currKeys) if (!prevKeys.has(key)) newCount += 1;
    for (const key of prevKeys) if (!currKeys.has(key)) clearedCount += 1;

    return {
        statusWas,
        statusNow,
        newCount,
        clearedCount,
        netCount: newCount - clearedCount,
    };
}

function diagnosticKey(d: ValidatorDiagnostic): string {
    const target = d.partName ?? d.mateName ?? `${d.partA ?? '*'}::${d.partB ?? '*'}`;
    return `${d.code}|${target}`;
}
