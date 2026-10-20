// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { edgeRaycastThreshold } from './edgeRaycastThreshold';

describe('edge picking tolerance', () => {
  it('keeps perspective edge targets seven CSS pixels wide at different viewport heights', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const atTallViewport = edgeRaycastThreshold(camera, 1000, 100);
    const atShortViewport = edgeRaycastThreshold(camera, 500, 100);
    const worldPerPixel = (height: number) => 2 * 100 * Math.tan(THREE.MathUtils.degToRad(25)) / height;

    expect(atTallViewport / worldPerPixel(1000)).toBeCloseTo(7);
    expect(atShortViewport / worldPerPixel(500)).toBeCloseTo(7);
  });

  it('uses the orthographic world scale for a fixed CSS-pixel edge target', () => {
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    expect(edgeRaycastThreshold(camera, 1000)).toBeCloseTo(0.07);
  });
});
