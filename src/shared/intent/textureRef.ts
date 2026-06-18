// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/textureRef.ts
//
// TextureRef + TextureSet — image-map references attached to a PBRMaterial.
//
// A `TextureRef` is a path/URL to a 2D image plus optional UV transform
// (repeat, offset, rotation). The renderer (`buildMaterialFromPBR.ts`) attaches
// the loaded image to the matching `MeshPhysicalMaterial` slot:
//   - albedo    → .map           (sRGB)
//   - normal    → .normalMap     (linear)
//   - roughness → .roughnessMap  (linear)
//   - metalness → .metalnessMap  (linear)
//   - anisotropy→ .anisotropyMap (linear)
//   - emissive  → .emissiveMap   (sRGB)
//
// Paths are resolved by `src/shared/textures/index.ts` at load time —
// `https?://` URLs are fetched + sha256-cached at `~/.cache/kernelcad/textures/`;
// absolute paths are used verbatim; relative paths resolve against the script
// directory (mirrors `referenceImage()` semantics).

/**
 * Reference to an image file or URL used as a texture map. Path is resolved
 * lazily at render time — the clamper at `Shape.material()` only validates
 * that `path` is a non-empty string (existence + format + dimension checks
 * happen in the loader so this record stays serializable).
 */
export interface TextureRef {
  /** Path or URL to the texture image. Required; non-empty. */
  path: string;
  /** UV repeat (default `[1, 1]`). Both components must be finite. */
  repeat?: [number, number];
  /** UV offset (default `[0, 0]`). Both components must be finite. */
  offset?: [number, number];
  /** UV rotation in degrees (default `0`). Normalized to `[0, 360)`. */
  rotation?: number;
}

/**
 * Bundle of image-map slots on a PBRMaterial. Every slot is optional; the
 * renderer attaches only the ones present.
 */
export interface TextureSet {
  albedo?: TextureRef;
  normal?: TextureRef;
  roughness?: TextureRef;
  metalness?: TextureRef;
  anisotropy?: TextureRef;
  emissive?: TextureRef;
}

/** Runtime type guard for TextureRef. Rejects null/undefined/non-string path. */
export function isTextureRef(value: unknown): value is TextureRef {
  if (typeof value !== 'object' || value === null) return false;
  const p = (value as { path?: unknown }).path;
  return typeof p === 'string' && p.length > 0;
}

function isFinitePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' && Number.isFinite(value[0]) &&
    typeof value[1] === 'number' && Number.isFinite(value[1])
  );
}

/**
 * Validate a TextureRef and apply defaults. Throws when invariants violated
 * (path empty / non-string, repeat/offset not finite pairs, rotation not finite).
 * Rotation is normalized to `[0, 360)`.
 */
export function normalizeTextureRef(ref: TextureRef): Required<TextureRef> {
  if (typeof ref.path !== 'string' || ref.path.length === 0) {
    throw new Error(
      `TextureRef.path must be a non-empty string; got ${JSON.stringify(ref.path)}.`,
    );
  }
  if (ref.repeat !== undefined && !isFinitePair(ref.repeat)) {
    throw new Error(
      `TextureRef.repeat must be a [number, number] of finite values; got ${JSON.stringify(ref.repeat)}.`,
    );
  }
  if (ref.offset !== undefined && !isFinitePair(ref.offset)) {
    throw new Error(
      `TextureRef.offset must be a [number, number] of finite values; got ${JSON.stringify(ref.offset)}.`,
    );
  }
  if (ref.rotation !== undefined && !Number.isFinite(ref.rotation)) {
    throw new Error(
      `TextureRef.rotation must be a finite number of degrees; got ${ref.rotation}.`,
    );
  }
  const rotRaw = ref.rotation ?? 0;
  const rotation = ((rotRaw % 360) + 360) % 360;
  return {
    path: ref.path,
    repeat: ref.repeat ?? [1, 1],
    offset: ref.offset ?? [0, 0],
    rotation,
  };
}
