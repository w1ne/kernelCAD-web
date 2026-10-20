// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';

interface FiberState {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  gl: { domElement: HTMLCanvasElement };
}

let fiberState: FiberState;
const frameCallbacks: Array<(state: FiberState, delta: number) => void> = [];
let sketchMode: { active: boolean; plane?: unknown } = { active: false };

vi.mock('@react-three/fiber', () => ({
  useThree: () => fiberState,
  useFrame: (callback: (state: FiberState, delta: number) => void) => { frameCallbacks.push(callback); },
}));

vi.mock('../../../context/WorkbenchContext', () => ({
  useWorkbench: () => ({ selectedFace: null, sketchMode }),
}));

const { CameraHandler } = await import('../controllers/CameraHandler');
const { MarkupCameraBridge } = await import('./MarkupCameraBridge');
const { markupStore } = await import('../../../markup/markupStore');

function boxGeometry(): GeometryResult {
  const vertices = [0, 0, 0, 40, 30, 20];
  return {
    faces: [{
      vertices: new Float32Array(vertices),
      indices: new Uint32Array(),
      normals: new Float32Array(vertices.length),
      faceId: 0,
    }],
  } as GeometryResult;
}

function runFrame() {
  act(() => {
    for (const callback of frameCallbacks) callback(fiberState, 1 / 60);
  });
}

beforeEach(() => {
  frameCallbacks.length = 0;
  sketchMode = { active: false };
  markupStore.clear();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 1000);
  camera.position.set(40, 40, 40);
  camera.lookAt(0, 0, 0);
  const canvas = document.createElement('canvas');
  const controls = new OrbitControls(camera, canvas as unknown as HTMLElement);
  fiberState = { camera, controls, gl: { domElement: canvas } };
});

afterEach(() => {
  cleanup();
  fiberState.controls.dispose();
});

describe('MarkupCameraBridge', () => {
  it('keeps the restored snapshot camera when the initial model fit arrives afterward', () => {
    const { rerender } = render(
      <>
        <CameraHandler geometries={[]} />
        <MarkupCameraBridge />
      </>,
    );
    const restoredCamera = {
      position: [250, 130, 75] as [number, number, number],
      target: [4, 5, 6] as [number, number, number],
      up: [0, 0, 1] as [number, number, number],
      projection: 'perspective' as const,
      fov: 38,
      zoom: 1.25,
    };
    markupStore.loadSnapshot({
      schemaVersion: 1,
      camera: restoredCamera,
      selection: { topologyRefs: [] },
      measurements: [],
      notes: [],
    });

    runFrame();
    // A model click emits a controls start/end pair without moving the camera.
    fiberState.controls.dispatchEvent({ type: 'start' });
    fiberState.controls.dispatchEvent({ type: 'end' });
    rerender(
      <>
        <CameraHandler geometries={[boxGeometry()]} />
        <MarkupCameraBridge />
      </>,
    );
    runFrame();

    expect(fiberState.camera.position.distanceTo(new THREE.Vector3(...restoredCamera.position))).toBeLessThan(1e-8);
    expect(fiberState.controls.target.distanceTo(new THREE.Vector3(...restoredCamera.target))).toBeLessThan(1e-8);
  });

  it('cancels active camera navigation when applying a restored snapshot', () => {
    const geometries = [boxGeometry()];
    const { rerender } = render(
      <>
        <CameraHandler geometries={[]} />
        <MarkupCameraBridge />
      </>,
    );

    // Resolve the initial immediate fit before starting an animated navigation.
    rerender(
      <>
        <CameraHandler geometries={geometries} />
        <MarkupCameraBridge />
      </>,
    );
    runFrame();

    rerender(
      <>
        <CameraHandler geometries={geometries} navigationRequest={{ target: 'xy', id: 1 }} />
        <MarkupCameraBridge />
      </>,
    );
    runFrame();

    const restoredCamera = {
      position: [250, 130, 75] as [number, number, number],
      target: [4, 5, 6] as [number, number, number],
      up: [0, 0, 1] as [number, number, number],
      projection: 'perspective' as const,
      fov: 38,
      zoom: 1.25,
    };
    markupStore.loadSnapshot({
      schemaVersion: 1,
      camera: restoredCamera,
      selection: { topologyRefs: [] },
      measurements: [],
      notes: [],
    });

    runFrame();
    const appliedPosition = fiberState.camera.position.clone();
    const appliedTarget = fiberState.controls.target.clone();
    expect(appliedPosition.distanceTo(new THREE.Vector3(...restoredCamera.position))).toBeLessThan(1e-8);
    expect(appliedTarget.distanceTo(new THREE.Vector3(...restoredCamera.target))).toBeLessThan(1e-8);

    // The next animation frame must preserve the restored pose; otherwise the
    // CameraHandler's superseded navigation target is still active.
    runFrame();
    expect(fiberState.camera.position.distanceTo(appliedPosition)).toBeLessThan(1e-8);
    expect(fiberState.controls.target.distanceTo(appliedTarget)).toBeLessThan(1e-8);
  });
});
