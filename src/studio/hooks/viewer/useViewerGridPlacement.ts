// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import { useMemo } from "react";
import type { GeometryResult } from "../../../shared/worker/geometryEngine";
import { computeGeometryBox } from "../../components/viewer/sectionRange";

/**
 * kernelCAD models are z-up, so the ground grid must lie in the XY plane at
 * the model's lowest point — drei's default y-up XZ grid would slice
 * vertically through the model. Nudged slightly below min-z to avoid
 * z-fighting with bottom faces; fade scales with model size.
 */
export function useViewerGridPlacement(geometries: GeometryResult[]) {
    return useMemo(() => {
        const box = computeGeometryBox(geometries);
        if (!box) return { z: 0, fade: 300 };
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) / 2;
        return { z: box.min.z - 0.1, fade: Math.max(300, radius * 8) };
    }, [geometries]);
}
