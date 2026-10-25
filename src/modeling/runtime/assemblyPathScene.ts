// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { meshShapeForExport } from '../../kernel/backends/occt/occtBackend';
import { transformScenePart } from './dfm/clearance';
import { checkAssemblyPathMeshes, type AssemblyPathOptions, type AssemblyPathReport } from './assemblyPath';
/** Reuse DFM's clone/world-transform path; never transform original shapes. */
export function checkAssemblyPathScene(scene: SceneBackend, options: AssemblyPathOptions = {}): AssemblyPathReport {
    const parts = scene.parts.map(part => {
        const transformed = transformScenePart(part, []);
        if (!transformed.shape)
            throw new Error(`Cannot transform part '${part.name}'.`);
        return { name: part.name, mesh: meshShapeForExport(transformed.shape.getReplicadShape()) };
    });
    return checkAssemblyPathMeshes(parts, {
        ...options,
        tessellation: options.tessellation ?? {
            linearMm: 0.01,
            relative: true,
            angularRad: 0.05,
            source: 'meshShapeForExport default: relative linear 0.01, angular 0.05 rad; per-face fallback absolute 0.02 mm, 0.1 rad',
        },
    });
}
