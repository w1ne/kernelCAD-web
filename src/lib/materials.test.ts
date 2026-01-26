// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createCADMaterial, disposeMaterials } from './materials';
import { MeshLambertMaterial, LineBasicMaterial } from 'three';

describe('CAD Materials', () => {
    describe('createCADMaterial', () => {
        it('should create shaded material', () => {
            const config = createCADMaterial(0x6366f1, 'shaded');

            expect(config.mesh).toBeDefined();
            expect(config.mesh).toBeInstanceOf(MeshLambertMaterial);
            expect(config.edges).toBeUndefined();
            expect(config.wireframe).toBeUndefined();

            const material = config.mesh as MeshLambertMaterial;
            expect(material.color.getHex()).toBe(0x6366f1);
            expect(material.flatShading).toBe(false); // Smooth shading
        });

        it('should create shadedWithEdges materials', () => {
            const config = createCADMaterial(0xff0000, 'shadedWithEdges');

            expect(config.mesh).toBeDefined();
            expect(config.edges).toBeDefined();
            expect(config.wireframe).toBeUndefined();

            const meshMaterial = config.mesh as MeshLambertMaterial;
            expect(meshMaterial).toBeInstanceOf(MeshLambertMaterial);
            expect(meshMaterial.color.getHex()).toBe(0xff0000);
            expect(meshMaterial.flatShading).toBe(true); // Flat shading for facets

            const edgeMaterial = config.edges as LineBasicMaterial;
            expect(edgeMaterial).toBeInstanceOf(LineBasicMaterial);
            expect(edgeMaterial.color.getHex()).toBe(0x000000); // Black edges
        });

        it('should create wireframe material', () => {
            const config = createCADMaterial(0x00ff00, 'wireframe');

            expect(config.mesh).toBeUndefined();
            expect(config.edges).toBeUndefined();
            expect(config.wireframe).toBeDefined();

            const wireframeMaterial = config.wireframe as LineBasicMaterial;
            expect(wireframeMaterial).toBeInstanceOf(LineBasicMaterial);
            expect(wireframeMaterial.color.getHex()).toBe(0x000000); // Black lines
        });

        it('should handle different colors', () => {
            const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffffff];

            colors.forEach(color => {
                const config = createCADMaterial(color, 'shaded');
                const material = config.mesh as MeshLambertMaterial;
                expect(material.color.getHex()).toBe(color);
            });
        });
    });

    describe('disposeMaterials', () => {
        it('should dispose all materials safely', () => {
            const config = createCADMaterial(0x6366f1, 'shadedWithEdges');

            // Should not throw
            expect(() => disposeMaterials(config)).not.toThrow();
        });

        it('should dispose empty config safely', () => {
            const config = {};

            // Should not throw on undefined materials
            expect(() => disposeMaterials(config)).not.toThrow();
        });

        it('should dispose shaded material', () => {
            const config = createCADMaterial(0x6366f1, 'shaded');
            const disposed = { mesh: false };

            // Mock dispose
            if (config.mesh) {
                const originalDispose = config.mesh.dispose;
                config.mesh.dispose = () => {
                    disposed.mesh = true;
                    originalDispose.call(config.mesh);
                };
            }

            disposeMaterials(config);
            expect(disposed.mesh).toBe(true);
        });
    });
});
