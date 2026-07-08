// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CAPTURE_HIDDEN_FLAG, captureViewerPngBase64 } from './captureViewerPng';
import { rendererSnapshot } from './rendererSnapshot';

// The capture forces a fresh render with editing-only furniture (origin
// construction planes + ground grid, tagged CAPTURE_HIDDEN_FLAG in Viewer.tsx)
// hidden, then restores visibility. These tests assert that contract without a
// real WebGL context: a fake renderer records each object's `.visible` at the
// moment `gl.render` is invoked, which is the frame that lands in the canvas.

afterEach(() => {
  rendererSnapshot.scene = null;
  rendererSnapshot.camera = null;
  rendererSnapshot.gl = null;
  vi.restoreAllMocks();
});

function buildScene() {
  const scene = new THREE.Scene();

  const model = new THREE.Mesh();
  model.name = 'model';

  const furnitureGroup = new THREE.Object3D();
  furnitureGroup.userData = { [CAPTURE_HIDDEN_FLAG]: true };
  const furnitureChild = new THREE.Mesh();
  furnitureGroup.add(furnitureChild);

  scene.add(model);
  scene.add(furnitureGroup);
  return { scene, model, furnitureGroup };
}

function fakeGl(scene: THREE.Scene, onRender: () => void) {
  const canvas = document.createElement('canvas');
  // happy-dom's canvas has no real toDataURL output; stub a valid data URL.
  canvas.toDataURL = () => 'data:image/png;base64,AAAA';
  return {
    domElement: canvas,
    render: vi.fn(() => onRender()),
  } as unknown as THREE.WebGLRenderer & { render: ReturnType<typeof vi.fn> };
}

describe('captureViewerPngBase64', () => {
  it('hides tagged furniture during the render and restores it after', () => {
    const { scene, model, furnitureGroup } = buildScene();
    let visibleAtRender: boolean | null = null;
    let modelVisibleAtRender: boolean | null = null;

    const gl = fakeGl(scene, () => {
      visibleAtRender = furnitureGroup.visible;
      modelVisibleAtRender = model.visible;
    });
    rendererSnapshot.scene = scene;
    rendererSnapshot.camera = new THREE.PerspectiveCamera();
    rendererSnapshot.gl = gl;

    const out = captureViewerPngBase64();

    // Furniture was hidden for the captured frame...
    expect(visibleAtRender).toBe(false);
    // ...the actual model stayed visible...
    expect(modelVisibleAtRender).toBe(true);
    // ...and visibility was restored before returning.
    expect(furnitureGroup.visible).toBe(true);
    expect(out).toBe('AAAA');
  });

  it('restores furniture visibility even if the render throws', () => {
    const { scene, furnitureGroup } = buildScene();
    const gl = fakeGl(scene, () => {
      throw new Error('webgl context lost');
    });
    rendererSnapshot.scene = scene;
    rendererSnapshot.camera = new THREE.PerspectiveCamera();
    rendererSnapshot.gl = gl;

    // A throwing render must not throw out of capture and must restore state.
    const out = captureViewerPngBase64();
    expect(furnitureGroup.visible).toBe(true);
    // Falls back to the buffered frame via toDataURL.
    expect(out).toBe('AAAA');
  });

  it('returns null when no renderer canvas is available', () => {
    rendererSnapshot.scene = null;
    rendererSnapshot.camera = null;
    rendererSnapshot.gl = null;
    expect(captureViewerPngBase64()).toBeNull();
  });
});
