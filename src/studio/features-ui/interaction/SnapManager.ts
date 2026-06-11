// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import type { HoverResult } from './HoverManager';

export type SnapType = 'ENDPOINT' | 'MIDPOINT' | 'CENTER' | 'NONE';

export interface SnapResult {
    type: SnapType;
    position: THREE.Vector3;
}

export class SnapManager {
    // Distance in world units to trigger a snap
    private static SNAP_THRESHOLD = 0.5;

    static getSnapFromHover(hover: HoverResult | null): SnapResult | null {
        if (!hover) return null;

        const { type, object, point } = hover;

        // 1. If we are already hovering a Vertex explicitly, that is an endpoint snap
        if (type === 'VERTEX') {
            // The object position is the vertex position (since it's a sphere mesh at the vertex)
            return {
                type: 'ENDPOINT',
                position: object.position.clone() // Assuming object world position is correct
            };
        }

        // 2. If hovering an Edge, check for Endpoints and Midpoint
        if (type === 'EDGE') {
            return this.getLineSnap(object, point);
        }

        // 3. If hovering a Face, maybe Center? (Not prioritized for now unless requested)
        // For now, no face snapping.

        return null;
    }

    private static getLineSnap(object: THREE.Object3D, point: THREE.Vector3): SnapResult | null {
        // We expect object to be a THREE.Line or LineSegments
        const geometry = (object as THREE.Line).geometry;
        if (!geometry) return null;

        // Get vertices of the line segment we are hovering
        // This is tricky for LineSegments or a single Line.
        // If it's a single Line sketch entity, it usually has 2 points.

        const posAttr = geometry.getAttribute('position');
        if (!posAttr || posAttr.count < 2) return null;

        const start = new THREE.Vector3().fromBufferAttribute(posAttr, 0);
        const end = new THREE.Vector3().fromBufferAttribute(posAttr, posAttr.count - 1); // Assuming simple line for now

        // Transform to world space
        start.applyMatrix4(object.matrixWorld);
        end.applyMatrix4(object.matrixWorld);

        // Check distance to Start
        if (point.distanceTo(start) < this.SNAP_THRESHOLD) {
            return { type: 'ENDPOINT', position: start };
        }

        // Check distance to End
        if (point.distanceTo(end) < this.SNAP_THRESHOLD) {
            return { type: 'ENDPOINT', position: end };
        }

        // Check Midpoint
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        if (point.distanceTo(mid) < this.SNAP_THRESHOLD) {
            return { type: 'MIDPOINT', position: mid };
        }

        return null; // Just on edge
    }
}
