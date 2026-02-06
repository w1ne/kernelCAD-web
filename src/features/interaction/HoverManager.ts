import * as THREE from 'three';

export type InteractionType = 'VERTEX' | 'EDGE' | 'FACE';

export interface HoverResult {
    type: InteractionType;
    id: string | number; // ID of the entity/face
    object: THREE.Object3D;
    point: THREE.Vector3;
}

export class HoverManager {
    // Threshold to consider objects "at the same depth" for priority sorting
    // This allows a Vertex that is slightly "behind" an Edge (due to rendering or precision) to still win priority.
    private static DEPTH_TOLERANCE = 0.2;

    static getBestHover(intersects: THREE.Intersection[]): HoverResult | null {
        if (intersects.length === 0) return null;

        // Filter out objects that don't have our interaction userData
        const validIntersects = intersects.filter(i => i.object.userData && i.object.userData.type);
        if (validIntersects.length === 0) return null;

        // 1. Get the closest distance
        const closestDist = validIntersects[0].distance;

        // 2. Collect all hits within tolerance of the closest
        const candidates = validIntersects.filter(i => (i.distance - closestDist) < this.DEPTH_TOLERANCE);

        // 3. Sort by Priority: VERTEX > EDGE > FACE
        // We assume object.userData has { type: InteractionType }
        candidates.sort((a, b) => {
            const pA = this.getPriority(a.object.userData.type);
            const pB = this.getPriority(b.object.userData.type);

            // If priorities are different, use that
            if (pA !== pB) return pB - pA; // Descending (Higher priority first)

            // If priorities are same (e.g. two edges), prefer the closer one
            return a.distance - b.distance;
        });

        const winner = candidates[0];
        const type = winner.object.userData.type as InteractionType;

        return {
            type,
            id: winner.object.userData.id,
            object: winner.object,
            point: winner.point
        };
    }

    private static getPriority(type?: string): number {
        switch (type) {
            case 'VERTEX': return 3;
            case 'EDGE': return 2;
            case 'FACE': return 1;
            default: return 0;
        }
    }
}
