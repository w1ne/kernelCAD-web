import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildCameraPose } from './cameraPose';

const center = new THREE.Vector3(10, 20, 30);

describe('buildCameraPose', () => {
    it('snaps arrow views around the z-up model center', () => {
        expect(buildCameraPose('x', center, 100).position.toArray()).toEqual([110, 20, 30]);
        expect(buildCameraPose('y', center, 100).position.toArray()).toEqual([10, 120, 30]);
        expect(buildCameraPose('z', center, 100).position.toArray()).toEqual([10, 20, 130]);
    });

    it('snaps plane views to their normals', () => {
        expect(buildCameraPose('xy', center, 100).position.toArray()).toEqual([10, 20, 130]);
        expect(buildCameraPose('xz', center, 100).position.toArray()).toEqual([10, -80, 30]);
        expect(buildCameraPose('yz', center, 100).position.toArray()).toEqual([110, 20, 30]);
    });

    it('uses a stable z-up vector except when looking straight down z', () => {
        expect(buildCameraPose('x', center, 100).up.toArray()).toEqual([0, 0, 1]);
        expect(buildCameraPose('xy', center, 100).up.toArray()).toEqual([0, 1, 0]);
    });
});
