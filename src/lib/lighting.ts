/**
 * CAD-style lighting setup
 * Prioritizes consistent illumination and clarity over realism
 */

import {
    DirectionalLight,
    AmbientLight,
    type Camera,
    type Light
} from 'three';

/**
 * Creates CAD-appropriate lighting:
 * - Headlight: Follows camera, illuminates from viewer's perspective
 * - Ambient: Bright uniform fill light (CAD standard)
 * - Rim: Subtle back lighting for depth perception
 * 
 * No shadows, no realistic fall-off - optimized for technical visibility
 */
export function createCADLighting(camera: Camera): Light[] {
    const lights: Light[] = [];

    // Headlight: Attached to camera, always illuminates what you're looking at
    const headlight = new DirectionalLight(0xffffff, 0.7);
    headlight.position.set(0, 0, 1);
    camera.add(headlight);
    lights.push(headlight);

    // Bright ambient: Ensures no dark shadows (CAD philosophy)
    const ambient = new AmbientLight(0xffffff, 0.5);
    lights.push(ambient);

    // Rim light: Subtle back lighting for depth cues
    const rim = new DirectionalLight(0xffffff, 0.3);
    rim.position.set(0, 0, -1);
    lights.push(rim);

    return lights;
}
