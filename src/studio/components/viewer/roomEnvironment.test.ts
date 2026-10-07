// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    installRoomEnvironment,
    pinRoomEnvironment,
    registerRoomForTest,
    roomEnvironmentFor,
} from './roomEnvironment';
import { ROOM_ENVIRONMENT_INTENSITY, ROOM_ENVIRONMENT_ROTATION_X } from './viewerLighting';

describe('installRoomEnvironment', () => {
    it('does nothing when the renderer cannot build a PMREM map', () => {
        const scene = new THREE.Scene();
        installRoomEnvironment({}, scene);
        expect(scene.environment).toBeNull();
    });

    it('does not clear an environment the renderer cannot replace', () => {
        const scene = new THREE.Scene();
        const existing = new THREE.Texture();
        scene.environment = existing;
        const dispose = installRoomEnvironment({}, scene);
        dispose();
        expect(scene.environment).toBe(existing);
        existing.dispose();
    });

    it('keeps two scenes independent when neither renderer can build a map', () => {
        const first = new THREE.Scene();
        const second = new THREE.Scene();
        const texture = new THREE.Texture();
        first.environment = texture;
        installRoomEnvironment({}, second);
        expect(first.environment).toBe(texture);
        expect(second.environment).toBeNull();
        texture.dispose();
    });
});

describe('room environment is per scene', () => {
    function standard(): THREE.MeshPhysicalMaterial {
        return new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3 });
    }

    it('pins the room of the scene the mesh is drawn in, at the viewer intensity', () => {
        const scene = new THREE.Scene();
        const env = new THREE.Texture();
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), standard());
        scene.add(mesh);
        const release = registerRoomForTest(scene, env);
        const later = standard();
        pinRoomEnvironment(mesh, later);
        expect(later.envMap).toBe(env);
        expect(later.envMapIntensity).toBe(0.62);
        expect(later.envMapIntensity).toBe(ROOM_ENVIRONMENT_INTENSITY);
        expect(later.envMapRotation.x).toBeCloseTo(ROOM_ENVIRONMENT_ROTATION_X);
        expect(scene.environmentIntensity).toBe(0.62);
        expect(scene.environmentRotation.x).toBeCloseTo(Math.PI / 2);
        const pinned = mesh.material as THREE.MeshPhysicalMaterial;
        expect(pinned.envMap).toBe(env);
        expect(pinned.envMapIntensity).toBe(0.62);
        expect(pinned.envMapRotation.x).toBeCloseTo(Math.PI / 2);
        release();
    });

    it('never hands one canvas\'s texture to a material in another scene', () => {
        const first = new THREE.Scene();
        const second = new THREE.Scene();
        const firstEnv = new THREE.Texture();
        const release = registerRoomForTest(first, firstEnv);
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), standard());
        second.add(mesh);
        const material = standard();
        pinRoomEnvironment(mesh, material);
        expect(material.envMap).toBeNull();
        expect(roomEnvironmentFor(second)).toBeNull();
        expect(roomEnvironmentFor(first)).toBe(firstEnv);
        release();
    });

    it('pins each scene\'s own room when two are installed', () => {
        const a = new THREE.Scene();
        const b = new THREE.Scene();
        const envA = new THREE.Texture();
        const envB = new THREE.Texture();
        const meshA = new THREE.Mesh(new THREE.BufferGeometry(), standard());
        const meshB = new THREE.Mesh(new THREE.BufferGeometry(), standard());
        a.add(meshA);
        b.add(meshB);
        const releaseA = registerRoomForTest(a, envA);
        const releaseB = registerRoomForTest(b, envB);
        expect((meshA.material as THREE.MeshPhysicalMaterial).envMap).toBe(envA);
        expect((meshB.material as THREE.MeshPhysicalMaterial).envMap).toBe(envB);
        releaseA();
        releaseB();
    });

    it('unpins a released room from the scene\'s materials', async () => {
        const scene = new THREE.Scene();
        const env = new THREE.Texture();
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), standard());
        scene.add(mesh);
        const release = registerRoomForTest(scene, env);
        release();
        await Promise.resolve();
        expect((mesh.material as THREE.MeshPhysicalMaterial).envMap).toBeNull();
        expect(scene.environment).toBeNull();
    });

    it('ignores objects that are not three.js nodes', () => {
        const material = standard();
        pinRoomEnvironment(null, material);
        pinRoomEnvironment({}, material);
        expect(material.envMap).toBeNull();
    });
});
