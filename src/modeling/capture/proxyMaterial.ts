// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import { formatScalarForError } from '../../shared/intent/types';
import type { PBRMaterial } from '../../shared/intent/material';
import type { SoftWarning } from '../../shared/runtime/softWarning';
import { resolveColor } from '../../shared/render/palette';
import type { TextureRef, TextureSet } from '../../shared/intent/textureRef';
import { isTextureRef, normalizeTextureRef } from '../../shared/intent/textureRef';
import type { CaptureSession } from './captureSession';

type MaterialCallOpts = PBRMaterial & { face?: string };

interface CleanedMaterial {
  cleaned: PBRMaterial;
  anyClamped: boolean;
}

/** Scalars accepted by `.material()` with their clamp ranges (ior is not [0,1]). */
const MATERIAL_SCALAR_RANGES: ReadonlyArray<[keyof PBRMaterial, number, number]> = [
  ['metalness', 0, 1],
  ['roughness', 0, 1],
  ['clearcoat', 0, 1],
  ['clearcoatRoughness', 0, 1],
  ['ior', 1.0, 2.5],
  ['transmission', 0, 1],
  ['sheen', 0, 1],
  ['opacity', 0, 1],
  ['anisotropy', 0, 1],
];

export function validateMaterialBaseColor(opts: MaterialCallOpts, id: string): void {
  if (!opts || typeof opts.baseColor !== 'string' || opts.baseColor.length === 0) {
    throw new KernelError(
      'feature.material.invalid-base-color',
      `Shape.material: baseColor is required and must be a non-empty string; got ${formatScalarForError(opts?.baseColor)}.`,
      id,
      'Pass a CSS color string or a registered role token to baseColor.',
    );
  }
}

export function resolveMaterialFaceLabel(opts: MaterialCallOpts, id: string): string | undefined {
  if (opts.face === undefined) return undefined;
  if (typeof opts.face !== 'string' || opts.face.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `Shape.material: 'face' must be a non-empty string label; got ${formatScalarForError(opts.face)}.`,
      id,
      "Pass a face-label string declared upstream via `<creator>(..., { faceLabels: { <label>: <CanonicalFace|FaceQuery> } })`.",
    );
  }
  return opts.face;
}

export function cleanMaterialScalars(opts: MaterialCallOpts, id: string): CleanedMaterial {
  const cleaned: PBRMaterial = { baseColor: opts.baseColor };
  let anyClamped = false;
  const maybeAssign = (
    key: keyof PBRMaterial,
    raw: number | undefined,
    min: number,
    max: number,
  ): void => {
    if (raw === undefined) return;
    if (!Number.isFinite(raw)) {
      throw new KernelError(
        'feature.invalid-args',
        `Shape.material: field '${key}' must be a finite number; got ${raw}.`,
        id,
        'Fix the named field on the call args; check type, sign, and units.',
      );
    }
    const clamped = Math.max(min, Math.min(max, raw));
    if (clamped !== raw) anyClamped = true;
    (cleaned as Record<keyof PBRMaterial, unknown>)[key] = clamped;
  };
  for (const [key, min, max] of MATERIAL_SCALAR_RANGES) {
    maybeAssign(key, opts[key] as number | undefined, min, max);
  }

  // thickness — non-negative finite mm. Negative is a hard error.
  if (opts.thickness !== undefined) {
    if (!Number.isFinite(opts.thickness)) {
      throw new KernelError(
        'feature.invalid-args',
        `Shape.material: field 'thickness' must be a finite number; got ${opts.thickness}.`,
        id,
        'Fix the named field on the call args; check type, sign, and units.',
      );
    }
    if (opts.thickness < 0) {
      throw new KernelError(
        'feature.material.thickness-negative',
        `Shape.material: thickness must be non-negative mm; got ${opts.thickness}.`,
        id,
        'Pass a non-negative number of mm for the volume thickness, or omit the field.',
      );
    }
    cleaned.thickness = opts.thickness;
  }

  return { cleaned, anyClamped };
}

export function cleanMaterialAttenuation(opts: MaterialCallOpts, id: string, state: CleanedMaterial): void {
  // attenuationColor — route through resolveColor; on null return drop +
  // soft warn (matches the value-clamped convention).
  if (opts.attenuationColor !== undefined) {
    if (typeof opts.attenuationColor !== 'string') {
      throw new KernelError(
        'feature.invalid-args',
        `Shape.material: field 'attenuationColor' must be a string; got ${formatScalarForError(opts.attenuationColor)}.`,
        id,
        'Pass a CSS color string or a registered role token.',
      );
    }
    const resolved = resolveColor(opts.attenuationColor);
    if (resolved === undefined) {
      state.anyClamped = true;
    } else {
      state.cleaned.attenuationColor = resolved;
    }
  }

  // attenuationDistance — positive finite mm, or Infinity. Anything else
  // is a hard error (zero / negative / NaN).
  if (opts.attenuationDistance !== undefined) {
    const ad = opts.attenuationDistance;
    const isInf = ad === Number.POSITIVE_INFINITY;
    if (!isInf && (!Number.isFinite(ad) || ad <= 0)) {
      throw new KernelError(
        'feature.material.attenuation-distance-invalid',
        `Shape.material: attenuationDistance must be positive finite mm or Infinity; got ${ad}.`,
        id,
        'Pass a positive distance in mm (e.g. 10 for a typical glass volume) or Infinity for no attenuation.',
      );
    }
    state.cleaned.attenuationDistance = ad;
  }
}

export function cleanMaterialAnisotropyRotation(
  opts: MaterialCallOpts,
  id: string,
  state: CleanedMaterial,
  warnings: SoftWarning[],
): void {
  // anisotropyRotation — degrees; normalize to [0, 360). If normalized
  // value differs from raw, emit a soft warning so the agent can clean up
  // its call.
  if (opts.anisotropyRotation === undefined) return;
  if (!Number.isFinite(opts.anisotropyRotation)) {
    throw new KernelError(
      'feature.invalid-args',
      `Shape.material: field 'anisotropyRotation' must be a finite number; got ${opts.anisotropyRotation}.`,
      id,
      'Fix the named field on the call args; check type, sign, and units.',
    );
  }
  const raw = opts.anisotropyRotation;
  const norm = ((raw % 360) + 360) % 360;
  state.cleaned.anisotropyRotation = norm;
  if (norm !== raw) {
    warnings.push({
      code: 'feature.material.anisotropy-rotation-normalized',
      hint: 'anisotropyRotation is in degrees and was normalized to [0, 360).',
      message: `Shape.material: anisotropyRotation ${raw}° normalized to ${norm}°.`,
      recordId: id,
      phase: 'build',
    });
  }
}

export function cleanMaterialTextures(opts: MaterialCallOpts, id: string): TextureSet | undefined {
  // textures — validate each TextureRef.path is a non-empty string and
  // pass through with defaults applied. Existence / format / dimension
  // checks happen at load time (src/shared/textures/index.ts).
  if (opts.textures === undefined) return undefined;
  if (typeof opts.textures !== 'object' || opts.textures === null) {
    throw new KernelError(
      'feature.invalid-args',
      `Shape.material: field 'textures' must be an object; got ${formatScalarForError(opts.textures)}.`,
      id,
      'Pass a TextureSet — { albedo?, normal?, roughness?, metalness?, anisotropy?, emissive? } of TextureRef.',
    );
  }
  const cleanedTextures: TextureSet = {};
  const slots: Array<keyof TextureSet> = [
    'albedo',
    'normal',
    'roughness',
    'metalness',
    'anisotropy',
    'emissive',
  ];
  for (const slot of slots) {
    const raw = (opts.textures as TextureSet)[slot];
    if (raw === undefined) continue;
    if (!isTextureRef(raw)) {
      throw new KernelError(
        'feature.invalid-args',
        `Shape.material: textures.${slot} must be a TextureRef ({ path, ... }) with a non-empty 'path' string; got ${formatScalarForError(raw)}.`,
        id,
        'Pass { path: "<file-or-url>", repeat?, offset?, rotation? }.',
      );
    }
    cleanedTextures[slot] = normalizeTextureRef(raw as TextureRef);
  }
  return Object.keys(cleanedTextures).length > 0 ? cleanedTextures : undefined;
}

export function assignMaterialMetadata(
  session: CaptureSession,
  id: string,
  faceLabel: string | undefined,
  cleaned: PBRMaterial,
): void {
  const records = session.getRecords();
  const record = records.find(r => r.id === id);
  if (record === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `Shape.material: feature record '${id}' not found in session.`,
      id,
      'Call .material() on a Shape produced by the current session.',
    );
  }
  if (record.metadata === undefined) {
    (record as { metadata: Record<string, unknown> }).metadata = {};
  }
  const metadata = record.metadata as Record<string, unknown>;
  if (faceLabel !== undefined) {
    // Per-face: route to materialByLabel, leave whole-shape material
    // untouched (the two forms compose — whole-shape acts as default for
    // unmatched faces).
    const existing = (metadata.materialByLabel as Record<string, PBRMaterial> | undefined) ?? {};
    // Last-write-wins on the same label.
    metadata.materialByLabel = { ...existing, [faceLabel]: cleaned };
  } else {
    metadata.material = cleaned;
  }
}
