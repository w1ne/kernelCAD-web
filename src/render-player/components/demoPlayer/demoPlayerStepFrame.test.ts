// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createDemoPlayerWindowApi, type DemoPlayerApiDeps } from './demoPlayerApiFactory';

it('keeps the final camera identical when visible model extents change inside one frame', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 10000);
  const deps = {
    sceneRef: { current: { scene, camera, renderer: { render: vi.fn() } } },
    animEngineRef: { current: null }, cameraCtrlRef: { current: null },
    elapsedMsRef: { current: 0 }, terminalOriginRef: { current: 0 },
    cameraTargetRef: { current: null }, centroidOffsetRef: { current: [50, 20, 10] },
    setTerminalLines: vi.fn(), setTitleCard: vi.fn(), setVersion: vi.fn(),
  } as unknown as DemoPlayerApiDeps;
  const api = createDemoPlayerWindowApi(deps);
  const frame = { min: [0, 0, 0], max: [100, 40, 20] } as { min: [number, number, number]; max: [number, number, number] };
  const small = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
  small.position.set(-30, 0, 0); scene.add(small);
  api.setRenderView('iso', 1, frame);
  const position = camera.position.toArray();
  const rotation = camera.quaternion.toArray();
  scene.remove(small); scene.add(new THREE.Mesh(new THREE.BoxGeometry(100, 40, 20)));
  api.setRenderView('iso', 1, frame);
  expect(camera.position.toArray()).toEqual(position);
  expect(camera.quaternion.toArray()).toEqual(rotation);
});
