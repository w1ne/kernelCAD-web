import { describe, it, expect } from 'vitest';
import { createCADMaterial } from './materials';
import { MeshLambertMaterial, LineBasicMaterial } from 'three';

describe('materials', () => {
    const testColor = 0xff0000;

    it('should create shaded material with correct color', () => {
        const material = createCADMaterial(testColor, 'shaded');
        expect(material.mesh).toBeDefined();
        expect(material.mesh).toBeInstanceOf(MeshLambertMaterial);
        expect((material.mesh as MeshLambertMaterial).color.getHex()).toBe(testColor);
        expect(material.edges).toBeUndefined();
        expect(material.wireframe).toBeUndefined();
    });

    it('should create shadedWithEdges material with correct colors', () => {
        const material = createCADMaterial(testColor, 'shadedWithEdges');
        expect(material.mesh).toBeDefined();
        expect(material.mesh).toBeInstanceOf(MeshLambertMaterial);
        expect((material.mesh as MeshLambertMaterial).color.getHex()).toBe(testColor);

        expect(material.edges).toBeDefined();
        expect(material.edges).toBeInstanceOf(LineBasicMaterial);
        // color: 0x222222
        expect(material.edges?.color.getHex()).toBe(0x222222);
        expect(material.wireframe).toBeUndefined();
    });

    it('should create wireframe material with white color', () => {
        const material = createCADMaterial(testColor, 'wireframe');
        expect(material.mesh).toBeUndefined();
        expect(material.edges).toBeUndefined();

        expect(material.wireframe).toBeDefined();
        expect(material.wireframe).toBeInstanceOf(LineBasicMaterial);
        // color: 0xffffff
        expect(material.wireframe?.color.getHex()).toBe(0xffffff);
    });
});
