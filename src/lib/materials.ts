/**
 * CAD-style materials for technical visualization
 * Prioritizes clarity over photorealism
 */

import {
    MeshLambertMaterial,
    LineBasicMaterial,
    type Material
} from 'three';

export interface CADMaterialConfig {
    mesh?: Material;
    edges?: LineBasicMaterial;
    wireframe?: LineBasicMaterial;
}

/**
 * Creates CAD-appropriate materials
 * - Shaded: Simple Lambertian (matte, no specular)
 * - ShadedWithEdges: Returns mesh + edge materials
 * - Wireframe: Returns line material only
 */
export function createCADMaterial(
    color: number,
    mode: 'shaded' | 'wireframe' | 'shadedWithEdges'
): CADMaterialConfig {
    switch (mode) {
        case 'shaded':
            return {
                mesh: new MeshLambertMaterial({
                    color,
                    flatShading: false  // Smooth shading for clean look
                })
            };

        case 'shadedWithEdges':
            return {
                mesh: new MeshLambertMaterial({
                    color,
                    flatShading: true  // Flat shading shows facets clearly
                }),
                edges: new LineBasicMaterial({
                    color: 0x000000,  // Black edges for contrast
                    linewidth: 1      // Note: linewidth > 1 not supported on all platforms
                })
            };

        case 'wireframe':
            return {
                wireframe: new LineBasicMaterial({
                    color: 0x000000  // Black wireframe lines
                })
            };
    }
}

/**
 * Dispose materials to prevent memory leaks
 */
export function disposeMaterials(config: CADMaterialConfig) {
    config.mesh?.dispose();
    config.edges?.dispose();
    config.wireframe?.dispose();
}

/**
 * Creates a material for sketches (blue lines)
 */
export function createSketchMaterial(color: number = 0x3b82f6): LineBasicMaterial {
    return new LineBasicMaterial({
        color,
        linewidth: 2,
        // Sketches should remain visible when coplanar with faces.
        // Disabling depth test avoids z-fighting and matches typical CAD overlays.
        depthTest: false,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2.0, // Stronger push towards camera
        polygonOffsetUnits: -2.0
    });
}
