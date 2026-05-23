// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import * as THREE from 'three';
import type { FaceGeometry, GeometryResult } from '../../../../shared/worker/geometryEngine';

let FaceSelectionOverlay: typeof import('./ShapeGeometry').FaceSelectionOverlay;
let GhostShape: typeof import('./ShapeGeometry').GhostShape;

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
