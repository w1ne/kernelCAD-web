// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

/**
 * Assign a value to a three.js scene's `background` slot. Three's API is
 * designed-mutable, but eslint's react-hooks immutability rule treats
 * useThree()-returned scenes as readonly; this helper is the single
 * choke-point where we cross that boundary, so the type erasure stays
 * out of the React component.
 */
export function setSceneBackground(
  scene: THREE.Scene,
  value: THREE.Color | THREE.Texture | null,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (scene as any).background = value;
}

/** Default opaque dark color — matches the historical Studio look. */
export const BACKGROUND_DARK_HEX = 0x202126;

/** Light surface — near-white, easy on lamps and metallic finishes. */
export const BACKGROUND_LIGHT_HEX = 0xf0f0f0;

/** Two greys for the checker pattern (lighter / darker). */
export const CHECKER_LIGHT_HEX = 0x808080;
export const CHECKER_DARK_HEX  = 0x606060;

/** Tile size in pixels per checker square; full tile = 2*TILE px. */
export const CHECKER_TILE_PX = 16;

/**
 * Build the checker pattern as a `THREE.CanvasTexture`. The texture is 2-cell
 * wide so the repeat wrapping produces an infinite checker; callers set
 * `texture.repeat` based on the viewport size so squares stay pixel-square
 * regardless of the canvas resolution.
 *
 * Lives in its own module (not co-located with the React component) so the
 * react-refresh rule can fast-refresh the component without rebuilding the
 * texture helper too, and so the unit test imports the helper without
 * pulling the R3F hook chain in.
 */
export function makeCheckerTexture(
  tilePx: number = CHECKER_TILE_PX,
  lightHex: number = CHECKER_LIGHT_HEX,
  darkHex: number = CHECKER_DARK_HEX,
): THREE.CanvasTexture {
  // 2-cell tile so wrapping = checker.
  const size = tilePx * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('SceneBackground: 2D context unavailable');
  }
  const light = '#' + lightHex.toString(16).padStart(6, '0');
  const dark  = '#' + darkHex.toString(16).padStart(6, '0');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, tilePx, tilePx);
  ctx.fillRect(tilePx, tilePx, tilePx, tilePx);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
