// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import type { ViewportBackground } from '../../../shared/types/viewMode';
import {
  BACKGROUND_DARK_HEX,
  BACKGROUND_LIGHT_HEX,
  CHECKER_TILE_PX,
  makeCheckerTexture,
  setSceneBackground,
} from './sceneBackgroundTexture';

interface Props {
  mode: ViewportBackground;
}

/**
 * In-Canvas R3F component that drives the active scene's `background`
 * property from the selected viewport background mode. Renders nothing.
 *
 *  - `dark`       — opaque dark grey (preserves historical Studio look).
 *  - `light`      — opaque near-white surface.
 *  - `checkered`  — two-tone grey checker (transparency-style); useful when
 *                   judging part silhouettes against a neutral pattern.
 *
 * The checker texture is created once per mount and disposed on unmount or
 * when the user switches mode.
 */
export function SceneBackground({ mode }: Props) {
  const { scene, size } = useThree();

  useEffect(() => {
    if (mode === 'dark') {
      setSceneBackground(scene, new THREE.Color(BACKGROUND_DARK_HEX));
      return;
    }
    if (mode === 'light') {
      setSceneBackground(scene, new THREE.Color(BACKGROUND_LIGHT_HEX));
      return;
    }
    // Checkered.
    const tex = makeCheckerTexture();
    const tileTotalPx = CHECKER_TILE_PX * 2;
    tex.repeat.set(size.width / tileTotalPx, size.height / tileTotalPx);
    setSceneBackground(scene, tex);
    return () => {
      tex.dispose();
    };
  }, [mode, scene, size.width, size.height]);

  // Always restore to null when this component unmounts so callers that
  // remove the switcher reset to the canvas's transparent default.
  useEffect(() => {
    return () => {
      setSceneBackground(scene, null);
    };
  }, [scene]);

  return null;
}
