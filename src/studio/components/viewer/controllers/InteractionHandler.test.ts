// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { edgePickingTarget, edgeRaycastThreshold } from './edgeRaycastThreshold';

describe('edge picking tolerance', () => {
  it('keeps perspective edge targets seven CSS pixels wide at different viewport heights', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const target = new THREE.Vector3(0, 0, -100);
    const atTallViewport = edgeRaycastThreshold(camera, 1000, target);
    const atShortViewport = edgeRaycastThreshold(camera, 500, target);
    const worldPerPixel = (height: number) => 2 * 100 * Math.tan(THREE.MathUtils.degToRad(25)) / height;

    expect(atTallViewport / worldPerPixel(1000)).toBeCloseTo(7);
    expect(atShortViewport / worldPerPixel(500)).toBeCloseTo(7);
  });

  it('uses the orthographic world scale for a fixed CSS-pixel edge target', () => {
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    expect(edgeRaycastThreshold(camera, 1000)).toBeCloseTo(0.07);
  });

  it('uses the camera-to-edge-target distance for translated models', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(100, 0, 10);
    camera.lookAt(100, 0, 0);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0], 3));
    const edge = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial());
    edge.position.x = 100;
    edge.userData.type = 'EDGE';
    const scene = new THREE.Scene();
    scene.add(edge);

    const target = edgePickingTarget(scene, camera);
    const threshold = edgeRaycastThreshold(camera, 1000, target);
    const expectedWorldPerPixel = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(25)) / 1000;

    expect(target.toArray()).toEqual([100, 0, 0]);
    expect(threshold / expectedWorldPerPixel).toBeCloseTo(7);
    geometry.dispose();
    edge.material.dispose();
  });
});
