// src/shared/render/environment.ts
//
// HDRI / IBL environment helper. Resolves a RenderEnvironmentSpec to a URL,
// loads the .hdr via RGBELoader, prefilters with PMREMGenerator, writes the
// resulting cubemap to scene.environment, applies rotation + intensity, and
// caches the prefiltered envmap by URL.
//
// scene.background is NEVER set here — silhouette IoU + SSIM gates require
// the renderer's flat #909090 background; the env map only affects shading.

import {
  Euler,
  PMREMGenerator,
  type Mesh,
  type MeshStandardMaterial,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import {
  HDRI_PRESET_URLS,
  type RenderEnvironmentSpec,
} from '../intent/renderEnvironmentRecord';

const envCache = new Map<string, Texture>();

export function __resetEnvCacheForTest(): void {
  for (const tex of envCache.values()) tex.dispose();
  envCache.clear();
}

export function resolveEnvironmentUrl(spec: RenderEnvironmentSpec): string | null {
  if (spec.preset !== undefined) return HDRI_PRESET_URLS[spec.preset] ?? null;
  if (spec.url !== undefined) return spec.url;
  return null;
}

function walkMeshes(scene: Scene, intensity: number): void {
  scene.traverse((obj) => {
    const mesh = obj as Mesh;
    const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) {
        if ('envMapIntensity' in m) m.envMapIntensity = intensity;
      }
    } else if ('envMapIntensity' in mat) {
      mat.envMapIntensity = intensity;
    }
  });
}

/**
 * Apply (or clear) an HDRI environment on the given scene.
 *
 * When spec is null OR resolves to a null URL:
 *   - scene.environment is cleared
 *   - envMapIntensity is reset to 1 on every PBR material
 *
 * When spec is non-null:
 *   - resolves to a URL (preset → /hdri/<slug>_1k.hdr, or spec.url verbatim)
 *   - loads + PMREM-prefilters once per URL (cached)
 *   - sets scene.environment to the prefiltered cubemap
 *   - sets scene.environmentRotation.y to spec.rotation (degrees → radians)
 *   - walks meshes and sets envMapIntensity to spec.intensity ?? 1
 */
export async function applyEnvironment(
  renderer: WebGLRenderer,
  scene: Scene,
  spec: RenderEnvironmentSpec | null,
): Promise<void> {
  if (spec === null) {
    scene.environment = null;
    walkMeshes(scene, 1);
    return;
  }

  const url = resolveEnvironmentUrl(spec);
  if (url === null) {
    // Defense-in-depth: capture-side validation should have caught this.
    scene.environment = null;
    walkMeshes(scene, 1);
    return;
  }

  let prefiltered = envCache.get(url);
  if (!prefiltered) {
    const loader = new RGBELoader();
    const rawTex = await loader.loadAsync(url);
    const pmrem = new PMREMGenerator(renderer);
    prefiltered = pmrem.fromEquirectangular(rawTex).texture;
    pmrem.dispose();
    rawTex.dispose();
    envCache.set(url, prefiltered);
  }

  scene.environment = prefiltered;
  const rotation = spec.rotation ?? 0;
  scene.environmentRotation = new Euler(0, (rotation * Math.PI) / 180, 0);
  walkMeshes(scene, spec.intensity ?? 1);
}
