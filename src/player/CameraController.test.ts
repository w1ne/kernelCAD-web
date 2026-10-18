// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CameraController } from './CameraController';

describe('CameraController', () => {
  it('preserves fitted full-artifact distance when nudging to a small feature', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 5000);
    camera.position.set(140, 85, 140);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    group.name = 'porthole';
    group.position.set(0, 24, 3);
    group.add(new THREE.Mesh(new THREE.SphereGeometry(5), new THREE.MeshStandardMaterial()));
    scene.add(group);

    const before = camera.position.length();
    const controller = new CameraController(camera, scene);
    controller.nudgeTo('porthole', 300, 0);
    controller.update(300);

    expect(camera.position.length()).toBeCloseTo(before, 6);
  });

  it('does not zoom farther out when nudging to a large feature', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 5000);
    camera.position.set(100, 60, 100);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    group.name = 'plate_1';
    const geometry = new THREE.BoxGeometry(120, 80, 10);
    const material = new THREE.MeshStandardMaterial();
    group.add(new THREE.Mesh(geometry, material));
    scene.add(group);

    const before = camera.position.length();
    const controller = new CameraController(camera, scene);
    controller.nudgeTo('plate_1', 300, 0);
    controller.update(300);

    expect(camera.position.length()).toBeLessThanOrEqual(before + 0.000001);
  });
});
