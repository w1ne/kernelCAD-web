// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The ONE place that knows instanced objects store part identity per
// instance (userData.instanceShapeIndices / instanceParts) instead of a
// single userData.shapeIndex / ownerId. Hover, highlight, click, marking
// all read part identity through here.
import type * as THREE from 'three';

export interface PickedPart {
    readonly shapeIndex?: number;
    readonly ownerId?: string;
}

export function resolvePickedPart(hit: { object: THREE.Object3D; instanceId?: number }): PickedPart {
    const u = hit.object.userData as {
        shapeIndex?: unknown; ownerId?: unknown; instanceShapeIndices?: unknown; instanceParts?: unknown;
    };
    if (Array.isArray(u.instanceShapeIndices)) {
        if (typeof hit.instanceId !== 'number') return {};
        const shapeIndex: unknown = u.instanceShapeIndices[hit.instanceId];
        const ownerId: unknown = Array.isArray(u.instanceParts) ? u.instanceParts[hit.instanceId] : undefined;
        return {
            ...(typeof shapeIndex === 'number' ? { shapeIndex } : {}),
            ...(typeof ownerId === 'string' ? { ownerId } : {}),
        };
    }
    return {
        ...(typeof u.shapeIndex === 'number' ? { shapeIndex: u.shapeIndex } : {}),
        ...(typeof u.ownerId === 'string' ? { ownerId: u.ownerId } : {}),
    };
}
