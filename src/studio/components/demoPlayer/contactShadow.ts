// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/demoPlayer/contactShadow.ts
//
// Soft contact shadow for the 'publish' render preset (publishStage.ts).
// The model is rendered from BELOW its footprint by an orthographic camera
// into an offscreen target, every fragment writing black with alpha that
// fades with its height above the ground; the result is blurred and shown
// on a ground plane. Geometry touching the ground gives a dark, tight
// shadow; geometry higher up gives a faint, wide one. No shadow maps, no
// light dependency, and it works on a transparent background because the
// plane only carries alpha. Baked once per stage apply (the turntable's
// model is static), so the per-frame cost is one textured quad.
//
// kernelCAD is Z-up: the ground is the XY plane at the model's min Z.

import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';

/** Ground plane edge as a multiple of the model's larger footprint edge —
 *  room for the blur to fade to zero before the plane's border. */
const PLANE_FOOTPRINT_SCALE = 2.2;
/** One baked shadow layer. `heightFraction` (of the model's largest
 *  extent) is the height over which a caster's contribution fades to zero;
 *  `blurPasses` are blur radii in shadow-texture texels. */
export interface ContactShadowLayer {
  /** Offscreen texture resolution (px per edge); lower = wider blur per pass. */
  textureSize: number;
  heightFraction: number;
  darkness: number;
  opacity: number;
  blurPasses: readonly number[];
}

/** Two layers: a wide, faint penumbra from everything near the ground, and
 *  a tight, dark core where parts actually touch it (feet, bases). */
export const CONTACT_SHADOW_LAYERS: readonly ContactShadowLayer[] = [
  { textureSize: 512, heightFraction: 0.45, darkness: 2.6, opacity: 0.75, blurPasses: [3, 2, 1] },
  { textureSize: 1024, heightFraction: 0.04, darkness: 1.2, opacity: 0.5, blurPasses: [1.5, 1] },
];

export interface ContactShadowBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface ContactShadow {
  /** Ground plane carrying the baked shadow; add it to the scene. */
  plane: THREE.Mesh;
  dispose: () => void;
}

function makeHeightFadeMaterial(darkness: number): THREE.ShaderMaterial {
  // Orthographic camera → gl_FragCoord.z is linear in height above the
  // ground plane (near = ground, far = fade height).
  const material = new THREE.ShaderMaterial({
    uniforms: { darkness: { value: darkness } },
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float darkness;
      void main() {
        float fade = 1.0 - gl_FragCoord.z;
        gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(fade * fade * darkness, 0.0, 1.0));
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.toneMapped = false;
  return material;
}

function makeTarget(size: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

/** Ping-pong the baked texture through horizontal + vertical blurs. */
function blurTarget(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  scratch: THREE.WebGLRenderTarget,
  blurPasses: readonly number[],
): void {
  const texel = 1 / target.width;
  const horizontal = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vertical = new THREE.ShaderMaterial(VerticalBlurShader);
  horizontal.depthTest = false;
  vertical.depthTest = false;
  const quad = new FullScreenQuad();
  try {
    for (const amount of blurPasses) {
      quad.material = horizontal;
      horizontal.uniforms.tDiffuse.value = target.texture;
      horizontal.uniforms.h.value = amount * texel;
      renderer.setRenderTarget(scratch);
      renderer.clear();
      quad.render(renderer);

      quad.material = vertical;
      vertical.uniforms.tDiffuse.value = scratch.texture;
      vertical.uniforms.v.value = amount * texel;
      renderer.setRenderTarget(target);
      renderer.clear();
      quad.render(renderer);
    }
  } finally {
    quad.dispose();
    horizontal.dispose();
    vertical.dispose();
  }
}

/** Render only `casters` (everything else hidden, no background) from below
 *  the ground into `target` with the height-fade material. */
function bakeFromBelow(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  casters: readonly THREE.Mesh[],
  camera: THREE.OrthographicCamera,
  target: THREE.WebGLRenderTarget,
  darkness: number,
): void {
  const casterSet = new Set<THREE.Object3D>(casters);
  const hidden: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if ((obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points)
      && obj.visible && !casterSet.has(obj)) {
      hidden.push(obj);
      obj.visible = false;
    }
  });
  const background = scene.background;
  const override = scene.overrideMaterial;
  const fade = makeHeightFadeMaterial(darkness);
  try {
    scene.background = null;
    scene.overrideMaterial = fade;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
  } finally {
    scene.overrideMaterial = override;
    scene.background = background;
    for (const obj of hidden) obj.visible = true;
    fade.dispose();
  }
}

/**
 * Bake a contact shadow for `casters` resting on the plane z = bounds.min.z.
 * Leaves the renderer's render target and clear colour as it found them.
 */
export function buildContactShadow(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  casters: readonly THREE.Mesh[],
  bounds: ContactShadowBounds,
  layer: ContactShadowLayer,
): ContactShadow {
  const size = bounds.max.clone().sub(bounds.min);
  const footprint = Math.max(size.x, size.y, 1e-3);
  const planeSize = footprint * PLANE_FOOTPRINT_SCALE;
  const fadeHeight = Math.max(size.x, size.y, size.z, 1e-3) * layer.heightFraction;
  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;
  const groundZ = bounds.min.z;

  // Looking UP (+Z) from the ground with screen-up = -Y keeps screen-right
  // = +X, so the baked image maps onto a plane rotated π about X (local +Y
  // → world -Y) without a mirror.
  const half = planeSize / 2;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0, fadeHeight);
  camera.position.set(cx, cy, groundZ);
  camera.up.set(0, -1, 0);
  camera.lookAt(cx, cy, groundZ + 1);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const target = makeTarget(layer.textureSize);
  const scratch = makeTarget(layer.textureSize);
  const originalTarget = renderer.getRenderTarget();
  const originalClear = new THREE.Color();
  renderer.getClearColor(originalClear);
  const originalAlpha = renderer.getClearAlpha();
  try {
    bakeFromBelow(renderer, scene, casters, camera, target, layer.darkness);
    blurTarget(renderer, target, scratch, layer.blurPasses);
  } finally {
    scratch.dispose();
    renderer.setRenderTarget(originalTarget);
    renderer.setClearColor(originalClear, originalAlpha);
  }

  const material = new THREE.MeshBasicMaterial({
    map: target.texture,
    color: 0x000000,
    transparent: true,
    opacity: layer.opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(planeSize, planeSize), material);
  plane.name = '__publishContactShadow';
  plane.rotation.x = Math.PI;
  // A hair below the ground so faces resting at min Z win the depth test.
  plane.position.set(cx, cy, groundZ - footprint * 1e-4);
  plane.renderOrder = -1;
  return {
    plane,
    dispose: () => {
      plane.geometry.dispose();
      material.dispose();
      target.dispose();
    },
  };
}
