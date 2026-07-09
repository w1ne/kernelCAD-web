// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { ViewportFocusTarget } from '../../../store/shellStore';

export function filterGeometriesForFocusTarget(
    geometries: readonly GeometryResult[],
    focusTarget: ViewportFocusTarget,
): GeometryResult[] {
    const ids = new Set(focusTarget.ids);
    return geometries.filter((geometry) => {
        const name = geometry.assemblyPartName;
        return name != null && ids.has(name);
    });
}
