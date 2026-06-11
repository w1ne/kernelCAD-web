// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { rendererSnapshot } from './rendererSnapshot';

/**
 * Inside-the-Canvas R3F component that publishes the active scene + camera
 * + WebGL renderer to a module-level handle. Read by the MarkingOverlay's
 * raycaster to look up which assembly parts the user just painted over.
 * Renders nothing.
 */
export function RendererSnapshotPublisher() {
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    rendererSnapshot.scene = scene;
    rendererSnapshot.camera = camera;
    rendererSnapshot.gl = gl;
    return () => {
      rendererSnapshot.scene = null;
      rendererSnapshot.camera = null;
      rendererSnapshot.gl = null;
    };
  }, [scene, camera, gl]);
  return null;
}
