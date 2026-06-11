// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Module-level handle to the R3F three.js context so non-R3F React components
// (the MarkingOverlay overlay canvas lives outside the <Canvas> tree) can
// reach into the scene to raycast — e.g. to figure out which assembly parts
// the user just painted over.
//
// The Canvas owns the lifecycle; a tiny invisible <Publisher /> inside it
// updates these fields and clears them on unmount.

import type * as THREE from 'three';

export const rendererSnapshot: {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  gl: THREE.WebGLRenderer | null;
} = {
  scene: null,
  camera: null,
  gl: null,
};
