// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createCADLighting } from './lighting';
import { PerspectiveCamera, DirectionalLight, AmbientLight } from 'three';

describe('CAD Lighting', () => {
    describe('createCADLighting', () => {
        it('should create 3 lights', () => {
            const camera = new PerspectiveCamera();
            const lights = createCADLighting(camera);

            expect(lights).toHaveLength(3);
        });

        it('should create headlight attached to camera', () => {
            const camera = new PerspectiveCamera();
            const lights = createCADLighting(camera);

            const headlight = lights[0];
            expect(headlight).toBeInstanceOf(DirectionalLight);
            expect((headlight as DirectionalLight).intensity).toBe(0.7);

            // Headlight should be added to camera
            expect(camera.children).toContain(headlight);
        });

        it('should create bright ambient light', () => {
            const camera = new PerspectiveCamera();
            const lights = createCADLighting(camera);

            const ambient = lights[1];
            expect(ambient).toBeInstanceOf(AmbientLight);
            expect((ambient as AmbientLight).intensity).toBe(0.5); // Bright for CAD
            expect((ambient as AmbientLight).color.getHex()).toBe(0xffffff);
        });

        it('should create rim light for depth', () => {
            const camera = new PerspectiveCamera();
            const lights = createCADLighting(camera);

            const rim = lights[2];
            expect(rim).toBeInstanceOf(DirectionalLight);
            expect((rim as DirectionalLight).intensity).toBe(0.3);
        });

        it('should not cast shadows (CAD principle)', () => {
            const camera = new PerspectiveCamera();
            const lights = createCADLighting(camera);

            // DirectionalLights should NOT have castShadow enabled
            const directionals = lights.filter(l => l instanceof DirectionalLight);
            directionals.forEach(light => {
                expect((light as DirectionalLight).castShadow).toBe(false);
            });
        });

        it('should have consistent white light color', () => {
            const camera = new PerspectiveCamera();
            const lights = createCADLighting(camera);

            lights.forEach(light => {
                expect(light.color.getHex()).toBe(0xffffff);
            });
        });

        it('should sum to adequate total intensity', () => {
            const camera = new PerspectiveCamera();
            const lights = createCADLighting(camera);

            const totalIntensity = lights.reduce((sum, light) => {
                if (light instanceof DirectionalLight) {
                    return sum + light.intensity;
                }
                if (light instanceof AmbientLight) {
                    return sum + light.intensity;
                }
                return sum;
            }, 0);

            // Total should be bright for CAD (0.7 + 0.5 + 0.3 = 1.5)
            expect(totalIntensity).toBe(1.5);
            expect(totalIntensity).toBeGreaterThan(1.0); // Brighter than typical game lighting
        });
    });
});
