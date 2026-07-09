// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ValidatorDiagnostic } from '../../modeling/mates/validator';
import type { SelectedFeatureId } from '../types';

export interface DiagnosticFocusTarget {
    readonly ids: readonly string[];
    readonly primaryId: SelectedFeatureId;
}

/**
 * Map a validator diagnostic to the selection target the tri-pane sync
 * should jump to.
 *
 * Precedence: `partName` > `mateName` > `partA` (for interference pairs;
 * `partB` is the other end and isn't the "primary" subject) > `null`.
 *
 * Returning `null` is valid — some kernel-level diagnostics don't bind to a
 * single feature. The Drawer row stays inert; SceneTab/CodeTab/Viewport
 * don't react.
 */
export function routeDiagnosticToSelection(diagnostic: ValidatorDiagnostic): SelectedFeatureId {
    if (diagnostic.partName) return diagnostic.partName;
    if (diagnostic.mateName) return diagnostic.mateName;
    if (diagnostic.partA) return diagnostic.partA;
    return null;
}

/**
 * Map a diagnostic to viewport-focus ids. Unlike selection, focus can include
 * both ends of a pair diagnostic so the camera frames the actual relationship.
 */
export function routeDiagnosticToFocusTarget(diagnostic: ValidatorDiagnostic): DiagnosticFocusTarget | null {
    const primaryId = routeDiagnosticToSelection(diagnostic);
    const ids = uniqueNonEmpty([diagnostic.partName, diagnostic.partA, diagnostic.partB]);
    if (ids.length === 0) return null;
    return { ids, primaryId };
}

function uniqueNonEmpty(values: ReadonlyArray<string | undefined>): string[] {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const value of values) {
        if (!value || seen.has(value)) continue;
        seen.add(value);
        ids.push(value);
    }
    return ids;
}
