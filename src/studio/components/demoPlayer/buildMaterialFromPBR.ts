import * as THREE from 'three';
import { resolveColor } from '../../../shared/render/palette';
import type { PBRMaterial } from '../../../shared/intent/material';
import type { TextureRef, TextureSet } from '../../../shared/intent/textureRef';

/** Default mesh color when a feature has no .color() metadata. Held as a
 *  number for THREE; mirrors the long-standing "neutral CAD silver" tone the
 *  demo player has always rendered. resolveColor() returns hex strings, which
 *  THREE.Material.color.set() also accepts. */
export const DEFAULT_MESH_COLOR = 0xc8d2e0;

/** Slots on `MeshPhysicalMaterial` that receive a texture; pairs the source
 *  `TextureSet` key with the destination material property and the color-space
 *  it expects. */
const TEXTURE_SLOTS: ReadonlyArray<{
  key: keyof TextureSet;
  prop:
    | 'map'
    | 'normalMap'
    | 'roughnessMap'
    | 'metalnessMap'
    | 'anisotropyMap'
    | 'emissiveMap';
  colorSpace: typeof THREE.SRGBColorSpace | typeof THREE.LinearSRGBColorSpace;
}> = [
  { key: 'albedo', prop: 'map', colorSpace: THREE.SRGBColorSpace },
  { key: 'normal', prop: 'normalMap', colorSpace: THREE.LinearSRGBColorSpace },
  { key: 'roughness', prop: 'roughnessMap', colorSpace: THREE.LinearSRGBColorSpace },
  { key: 'metalness', prop: 'metalnessMap', colorSpace: THREE.LinearSRGBColorSpace },
  { key: 'anisotropy', prop: 'anisotropyMap', colorSpace: THREE.LinearSRGBColorSpace },
  { key: 'emissive', prop: 'emissiveMap', colorSpace: THREE.SRGBColorSpace },
];

/** Browser-side URL prefix for the dev-server texture route. */
function browserTextureUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/__kernelcad/')) return path;
  return `/__kernelcad/texture?path=${encodeURIComponent(path)}`;
}

/** Apply UV transform (repeat / offset / rotation) from a TextureRef to a
 *  loaded THREE.Texture. */
function applyUvTransform(tex: THREE.Texture, ref: TextureRef): void {
  const repeat = ref.repeat ?? [1, 1];
  const offset = ref.offset ?? [0, 0];
  const rotDeg = ref.rotation ?? 0;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.offset.set(offset[0], offset[1]);
  tex.rotation = (rotDeg * Math.PI) / 180;
  // Repeat-by-default — texture artists assume tileable UVs.
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
}

/**
 * Fire-and-forget async attachment of `TextureSet` slots to a
 * `MeshPhysicalMaterial`. The factory `buildMaterialFromPBR` returns
 * synchronously; textures pop in once `THREE.TextureLoader` resolves each
 * file. Mirrors the existing reference-image attachment pattern in
 * DemoPlayerPage.tsx.
 *
 * SSR / unit-test note: `THREE.TextureLoader` works in the browser and in
 * jsdom (no DOM image element needed via `ImageBitmapLoader`); in Node-only
 * vitest contexts (no `document`), this function silently no-ops because the
 * underlying loader needs `XMLHttpRequest`. Tests that need to assert texture
 * wiring should run in jsdom or use the dedicated server-side route.
 */
export function attachTextures(
  material: THREE.MeshPhysicalMaterial,
  textures: TextureSet | undefined,
): void {
  if (textures === undefined) return;
  // Guard: only run in environments with the DOM Image surface.
  if (typeof document === 'undefined' || typeof Image === 'undefined') return;

  const loader = new THREE.TextureLoader();

  for (const slot of TEXTURE_SLOTS) {
    const ref = textures[slot.key];
    if (ref === undefined) continue;
    const url = browserTextureUrl(ref.path);

    loader.load(
      url,
      (tex) => {
        tex.colorSpace = slot.colorSpace;
        applyUvTransform(tex, ref);
        // Cast: TS sees keyof Material; we already validated `prop` is a known
        // map slot on MeshPhysicalMaterial.
        (material as unknown as Record<string, THREE.Texture | null>)[slot.prop] = tex;
        // Emissive map needs an explicit non-zero emissiveIntensity to be
        // visible; default to 1 unless the agent overrode it via PBR fields.
        if (slot.prop === 'emissiveMap' && material.emissiveIntensity === 0) {
          material.emissiveIntensity = 1;
        }
        material.needsUpdate = true;
      },
      undefined,
      () => {
        // Load failed; leave the material as-is. The clamper in proxy.ts ran
        // path-existence validation at capture time, so this is most likely a
        // transient network blip on a URL-cached texture.
      },
    );
  }
}

/**
 * Construct a MeshPhysicalMaterial from a full PBR record. All optional PBR
 * fields default to physically neutral values so the output is always a valid
 * renderable material. When `pbr` is undefined the renderer's default neutral
 * CAD silver (DEFAULT_MESH_COLOR) is used.
 *
 * This is the canonical material factory for the demo player. Exported so
 * unit tests can exercise it without mounting a full React tree.
 *
 * Returns synchronously; if `pbr.textures` is supplied, textures are attached
 * via `attachTextures` in a separate microtask — meshes appear immediately
 * (with the base-color, normal/roughness/metalness/etc. uniforms) and the
 * texture maps pop in when each image loads. Same pattern as the existing
 * reference-image hook in `DemoPlayerPage.tsx`.
 */
export function buildMaterialFromPBR(pbr: PBRMaterial | undefined): THREE.Material {
  const baseColor = pbr?.baseColor ?? DEFAULT_MESH_COLOR;
  const resolved: number | string =
    resolveColor(typeof baseColor === 'string' ? baseColor : undefined) ??
    DEFAULT_MESH_COLOR;

  // Attenuation color: resolveColor returns a hex string or null; default to
  // pure white so neutral glass doesn't tint the transmission.
  const attenuationColorResolved =
    pbr?.attenuationColor !== undefined
      ? resolveColor(pbr.attenuationColor) ?? '#ffffff'
      : '#ffffff';

  const material = new THREE.MeshPhysicalMaterial({
    color: resolved,
    metalness: pbr?.metalness ?? 0,
    roughness: pbr?.roughness ?? 0.5,
    clearcoat: pbr?.clearcoat ?? 0,
    clearcoatRoughness: pbr?.clearcoatRoughness ?? 0.03,
    ior: pbr?.ior ?? 1.5,
    transmission: pbr?.transmission ?? 0,
    sheen: pbr?.sheen ?? 0,
    opacity: pbr?.opacity ?? 1,
    transparent: (pbr?.opacity ?? 1) < 1 || (pbr?.transmission ?? 0) > 0,
    thickness: pbr?.thickness ?? 0,
    attenuationColor: new THREE.Color(attenuationColorResolved),
    attenuationDistance: pbr?.attenuationDistance ?? Infinity,
    anisotropy: pbr?.anisotropy ?? 0,
    anisotropyRotation: ((pbr?.anisotropyRotation ?? 0) * Math.PI) / 180,
  });
  material.userData.authoredOpacity = pbr?.opacity ?? 1;

  // Fire-and-forget texture attachment. Synchronous return value above is the
  // material that the renderer uses immediately; textures pop in on load.
  if (pbr?.textures !== undefined) {
    attachTextures(material, pbr.textures);
  }

  return material;
}
