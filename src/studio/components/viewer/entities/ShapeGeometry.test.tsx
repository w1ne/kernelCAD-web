// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import * as THREE from 'three';
import type { FaceGeometry, GeometryResult } from '../../../../shared/worker/geometryEngine';

let FaceSelectionOverlay: typeof import('./ShapeGeometry').FaceSelectionOverlay;
let GhostShape: typeof import('./ShapeGeometry').GhostShape;
let buildShapeMaterial: typeof import('./ShapeGeometry').buildShapeMaterial;

const faceA: FaceGeometry = {
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    faceId: 1,
};

const faceB: FaceGeometry = {
    vertices: new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    faceId: 2,
};

describe('ShapeGeometry disposable overlays', () => {
    beforeAll(async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        ({ FaceSelectionOverlay, GhostShape, buildShapeMaterial } = await import('./ShapeGeometry'));
    });

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('disposes ghost geometries on unmount', () => {
        const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
        const geometry: GeometryResult = { faces: [faceA, faceB] };

        const { unmount } = render(<GhostShape geometry={geometry} />);

        expect(disposeSpy).not.toHaveBeenCalled();
        unmount();
        expect(disposeSpy).toHaveBeenCalledTimes(2);
    });

    it('disposes replaced and unmounted face selection overlay geometries', () => {
        const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

        const { rerender, unmount } = render(
            <FaceSelectionOverlay face={faceA} isSelected={true} />,
        );
        expect(disposeSpy).not.toHaveBeenCalled();

        rerender(<FaceSelectionOverlay face={faceB} isSelected={true} />);
        expect(disposeSpy).toHaveBeenCalledTimes(1);

        unmount();
        expect(disposeSpy).toHaveBeenCalledTimes(2);
    });
});

describe('buildShapeMaterial — viewMode3D produces visually-distinct materials', () => {
    beforeAll(async () => {
        ({ buildShapeMaterial } = await import('./ShapeGeometry'));
    });

    // Regression test for the toolbar render-mode bug: clicking Wireframe / Shaded /
    // Shaded with Edges flipped the React state but the material never reflected it,
    // so all three modes rendered identically.

    it('shaded — wireframe off, flatShading off (fallback Lambert)', () => {
        const mat = buildShapeMaterial(undefined, false, 0xc8d2e0, 'shaded');
        expect(mat).toBeInstanceOf(THREE.MeshLambertMaterial);
        expect((mat as THREE.MeshLambertMaterial).wireframe).toBe(false);
        expect((mat as THREE.MeshLambertMaterial).flatShading).toBe(false);
    });

    it('wireframe — wireframe ON (fallback Lambert)', () => {
        const mat = buildShapeMaterial(undefined, false, 0xc8d2e0, 'wireframe');
        expect((mat as THREE.MeshLambertMaterial).wireframe).toBe(true);
        expect((mat as THREE.MeshLambertMaterial).flatShading).toBe(false);
    });

    it('shadedWithEdges — wireframe off, flatShading ON (fallback Lambert)', () => {
        const mat = buildShapeMaterial(undefined, false, 0xc8d2e0, 'shadedWithEdges');
        expect((mat as THREE.MeshLambertMaterial).wireframe).toBe(false);
        expect((mat as THREE.MeshLambertMaterial).flatShading).toBe(true);
    });

    it('wireframe propagates to PBR MeshPhysicalMaterial', () => {
        const pbr: NonNullable<GeometryResult['material']> = {
            baseColor: '#c8d2e0',
            metalness: 0.1,
            roughness: 0.6,
        };
        const shaded = buildShapeMaterial(pbr, false, 0xc8d2e0, 'shaded');
        const wire = buildShapeMaterial(pbr, false, 0xc8d2e0, 'wireframe');
        const edges = buildShapeMaterial(pbr, false, 0xc8d2e0, 'shadedWithEdges');
        expect(shaded).toBeInstanceOf(THREE.MeshPhysicalMaterial);
        expect((shaded as THREE.MeshPhysicalMaterial).wireframe).toBe(false);
        expect((shaded as THREE.MeshPhysicalMaterial).flatShading).toBe(false);
        expect((wire as THREE.MeshPhysicalMaterial).wireframe).toBe(true);
        expect((edges as THREE.MeshPhysicalMaterial).wireframe).toBe(false);
        expect((edges as THREE.MeshPhysicalMaterial).flatShading).toBe(true);
    });

    it('selected shapes use the selection-colour Lambert regardless of view mode, wireframe still honoured', () => {
        const pbr: NonNullable<GeometryResult['material']> = {
            baseColor: '#aabbcc',
        };
        // When isSelected=true, the PBR branch is skipped and we fall through to the
        // Lambert highlight. Wireframe still must propagate so a selected shape in
        // wireframe mode shows lines, not solid surface.
        const wire = buildShapeMaterial(pbr, true, 0xff0000, 'wireframe');
        expect(wire).toBeInstanceOf(THREE.MeshLambertMaterial);
        expect((wire as THREE.MeshLambertMaterial).wireframe).toBe(true);
    });
});
