// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import * as THREE from 'three';
import type { FaceGeometry, GeometryResult } from '../../../../shared/worker/geometryEngine';

let FaceSelectionOverlay: typeof import('./ShapeGeometry').FaceSelectionOverlay;
let GhostShape: typeof import('./ShapeGeometry').GhostShape;
let ConsolidatedShape: typeof import('./ShapeGeometry').ConsolidatedShape;
let buildShapeMaterial: typeof import('./buildShapeMaterial').buildShapeMaterial;

vi.mock('../../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        selectedFace: null,
        setSelectedFace: vi.fn(),
        setSelectedSketchName: vi.fn(),
        setSelectedItemId: vi.fn(),
        toggleSelection: vi.fn(),
    }),
}));

vi.mock('../../../context/UIContext', () => ({
    useUI: () => ({
        setContextMenu: vi.fn(),
    }),
}));

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
        ({ FaceSelectionOverlay, GhostShape } = await import('./ShapeGeometry'));
        ({ buildShapeMaterial } = await import('./buildShapeMaterial'));
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

describe('ConsolidatedShape scene graph per view mode', () => {
    beforeAll(async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        ({ ConsolidatedShape } = await import('./ShapeGeometry'));
        ({ buildShapeMaterial } = await import('./buildShapeMaterial'));
    });

    afterEach(() => {
        cleanup();
    });

    // BREP edge polylines from the kernel payload (two segments).
    const edges = new Float32Array([
        0, 0, 0, 1, 0, 0,
        1, 0, 0, 1, 1, 0,
    ]);

    const geometryWithEdges: GeometryResult = { faces: [faceA, faceB], edges };

    function renderShape(viewMode3D: 'shaded' | 'wireframe' | 'shadedWithEdges') {
        return render(
            <ConsolidatedShape
                geometry={geometryWithEdges}
                shapeIndex={0}
                viewMode3D={viewMode3D}
                isSelected={false}
                name="body_1"
            />,
        );
    }

    it('wireframe — edge lines visible, faces ghosted (never the triangulation)', () => {
        const { container } = renderShape('wireframe');

        // The BREP edge curves are present...
        expect(container.querySelectorAll('lineSegments')).toHaveLength(1);

        // ...and the face mesh is a barely-visible ghost, not a wireframed
        // triangulation: transparent, ghost opacity, material.wireframe off.
        const meshes = container.querySelectorAll('mesh');
        expect(meshes).toHaveLength(1);
        const material = buildShapeMaterial(undefined, false, 0xbfc4c8, 'wireframe');
        expect(material.transparent).toBe(true);
        expect((material as THREE.MeshBasicMaterial).wireframe).toBe(false);
    });

    it('shadedWithEdges — edge lines visible over opaque faces', () => {
        const { container } = renderShape('shadedWithEdges');
        expect(container.querySelectorAll('lineSegments')).toHaveLength(1);
        expect(container.querySelectorAll('mesh')).toHaveLength(1);
    });

    it('shaded — no edge lines', () => {
        const { container } = renderShape('shaded');
        expect(container.querySelectorAll('lineSegments')).toHaveLength(0);
        expect(container.querySelectorAll('mesh')).toHaveLength(1);
    });
});

describe('buildShapeMaterial — viewMode3D produces visually-distinct materials', () => {
    let WIREFRAME_GHOST_OPACITY: number;

    beforeAll(async () => {
        ({ buildShapeMaterial } = await import('./buildShapeMaterial'));
        ({ WIREFRAME_GHOST_OPACITY } = await import('./buildShapeMaterial'));
    });

    // Regression test for the toolbar render-mode bug: clicking Wireframe / Shaded /
    // Shaded with Edges flipped the React state but the material never reflected it,
    // so all three modes rendered identically.

    it('shaded — opaque, flatShading off (fallback Lambert)', () => {
        const mat = buildShapeMaterial(undefined, false, 0xc8d2e0, 'shaded');
        expect(mat).toBeInstanceOf(THREE.MeshLambertMaterial);
        expect((mat as THREE.MeshLambertMaterial).wireframe).toBe(false);
        expect((mat as THREE.MeshLambertMaterial).flatShading).toBe(false);
        expect(mat.transparent).toBe(false);
    });

    it('wireframe — faces become a barely-visible ghost, triangulation never shown', () => {
        // Wireframe mode must NOT set material.wireframe (that draws the
        // tessellation). Faces are ghosted; the BREP edge lines carry the view.
        const mat = buildShapeMaterial(undefined, false, 0xc8d2e0, 'wireframe');
        expect(mat).toBeInstanceOf(THREE.MeshBasicMaterial);
        expect((mat as THREE.MeshBasicMaterial).wireframe).toBe(false);
        expect(mat.transparent).toBe(true);
        expect(mat.opacity).toBe(WIREFRAME_GHOST_OPACITY);
        expect(mat.depthWrite).toBe(false);
    });

    it('shadedWithEdges — opaque, flatShading ON (fallback Lambert)', () => {
        const mat = buildShapeMaterial(undefined, false, 0xc8d2e0, 'shadedWithEdges');
        expect((mat as THREE.MeshLambertMaterial).wireframe).toBe(false);
        expect((mat as THREE.MeshLambertMaterial).flatShading).toBe(true);
    });

    it('wireframe overrides PBR materials with the ghost film', () => {
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
        expect(wire).toBeInstanceOf(THREE.MeshBasicMaterial);
        expect((wire as THREE.MeshBasicMaterial).wireframe).toBe(false);
        expect(wire.transparent).toBe(true);
        expect(wire.opacity).toBe(WIREFRAME_GHOST_OPACITY);
        expect((edges as THREE.MeshPhysicalMaterial).wireframe).toBe(false);
        expect((edges as THREE.MeshPhysicalMaterial).flatShading).toBe(true);
    });

    it('selected shapes in wireframe mode still ghost the faces (selection shows via edge colour)', () => {
        const pbr: NonNullable<GeometryResult['material']> = {
            baseColor: '#aabbcc',
        };
        const wire = buildShapeMaterial(pbr, true, 0xff0000, 'wireframe');
        expect(wire).toBeInstanceOf(THREE.MeshBasicMaterial);
        expect((wire as THREE.MeshBasicMaterial).wireframe).toBe(false);
        expect(wire.transparent).toBe(true);
    });

    it('wireframe ghost still honours clipping planes', () => {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);
        const mat = buildShapeMaterial(undefined, false, 0xc8d2e0, 'wireframe', [plane]);
        expect(mat.clippingPlanes).toHaveLength(1);
        expect(mat.clippingPlanes![0]).toBe(plane);
    });
});
