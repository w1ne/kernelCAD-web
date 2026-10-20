// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../shared/intent/featureRecord';

/** The feature a scene, part, or diagnostic id refers to. */
export function featureForSelectionId(
    features: readonly FeatureRecord[],
    id: string,
): FeatureRecord | undefined {
    for (const feature of features) {
        if (feature.id === id) return feature;
        const meta = (feature.metadata ?? {}) as {
            partName?: string;
            jointName?: string;
            mateName?: string;
        };
        if (meta.partName === id || meta.jointName === id || meta.mateName === id) {
            return feature;
        }
    }
    return undefined;
}

/** Original-file line for a selection id, or null when capture did not record one. */
export function scriptLineForId(
    features: readonly FeatureRecord[],
    id: string,
): number | null {
    const line = featureForSelectionId(features, id)?.scriptLocation?.line;
    return typeof line === 'number' && line >= 1 ? line : null;
}
