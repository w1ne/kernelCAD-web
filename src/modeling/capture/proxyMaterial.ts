// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { formatScalarForError } from '../../shared/intent/types';
import type { PBRMaterial } from '../../shared/intent/material';
import type { SoftWarning } from '../../shared/runtime/softWarning';
import { resolveColor } from '../../shared/render/palette';
import type { TextureRef, TextureSet } from '../../shared/intent/textureRef';
import { isTextureRef, normalizeTextureRef } from '../../shared/intent/textureRef';
import type { TextureProjection } from '../../shared/intent/textureProjection';
import { isTextureProjection } from '../../shared/intent/textureProjection';
import type { TypedParamRef } from '../../shared/runtime/paramRef';
import { isTypedParamRef } from '../../shared/runtime/paramRef';
import { normalizeColor } from '../../shared/runtime/paramColor';
import { expandFinish, isFinishToken, unknownFinishMessage } from '../../shared/render/finishes';
import { tryResolveMaterial, type MaterialName } from '../properties/materialLibrary';
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

/** Keys `.material()` reads. `textureProjection` is not here: only
 *  `.wrapTexture()` writes it, and `.material()` used to drop it silently. */
const MATERIAL_OPTION_KEYS: ReadonlySet<string> = new Set([
  'face', 'name', 'baseColor', 'metalness', 'roughness', 'clearcoat', 'clearcoatRoughness', 'ior',
  'transmission', 'sheen', 'opacity', 'thickness', 'attenuationColor', 'attenuationDistance',
  'anisotropy', 'anisotropyRotation', 'textures',
]);

/** A misspelt key (`metalnes`, `colour`) used to be dropped and the default
 *  rendered with no diagnostic; name the first unknown key instead. */
export function assertMaterialOptionKeys(opts: MaterialCallOpts, id: string): void {
  const unknown = Object.keys(opts).find((key) => !MATERIAL_OPTION_KEYS.has(key));
  if (unknown === undefined) return;
  invalidArgs({
    api: 'Shape.material(opts)',
    path: `opts.${unknown}`,
    got: (opts as unknown as Record<string, unknown>)[unknown],
    requires: unknown === 'textureProjection'
      ? 'no textureProjection key; call .wrapTexture(imageRef, projection) to set the UV projection'
      : `a known option key; .material() accepts ${[...MATERIAL_OPTION_KEYS].join(', ')}`,
    example: "shape.material({ baseColor: '#b0b0b0', metalness: 1, roughness: 0.3 })",
    featureId: id,
  });
}

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
  if (opts.name !== undefined) {
    if (typeof opts.name !== 'string' || opts.name.trim().length === 0) {
      invalidArgs({
        api: 'Shape.material(opts)',
        path: 'opts.name',
        got: opts.name,
        showType: true,
        requires: 'a non-empty string',
        example: "shape.material({ baseColor: '#c8a24a', name: 'brass' })",
        featureId: id,
      });
    }
    cleaned.name = opts.name.trim();
  }
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

/** Validate + clean a PBR material given outside `.material()` (e.g. a tendon's
 *  render material): the same checks, clamps and texture-ref handling. `owner`
 *  names the caller in errors; soft warnings go to `warnings`. */
export function cleanPbrMaterial(opts: PBRMaterial, owner: string, warnings: SoftWarning[] = []): PBRMaterial {
  validateMaterialBaseColor(opts, owner);
  const state = cleanMaterialScalars(opts, owner);
  cleanMaterialAttenuation(opts, owner, state);
  cleanMaterialAnisotropyRotation(opts, owner, state, warnings);
  const textures = cleanMaterialTextures(opts, owner);
  if (textures !== undefined) state.cleaned.textures = textures;
  return state.cleaned;
}

/**
 * `.color()` stores any string, but every exporter and the viewer resolve it
 * with `resolveColor()` (role token or `#hex`); anything else silently
 * falls back to the default colour. Warn and name the call that does the job.
 */
export function unresolvedColorWarning(value: unknown, id: string): SoftWarning | undefined {
  if (typeof value !== 'string' || resolveColor(value) !== undefined) return undefined;
  const hex = normalizeColor(value);
  const material = isFinishToken(value) || tryResolveMaterial(value).ok;
  const fix = hex !== undefined
    ? `use '${hex}'`
    : material
      ? `use .finish('${value}') for a material look`
      : 'use a role token (servo, gear, beam, shaft, plate, pin, frame, tool) or a #rrggbb hex';
  return {
    code: 'feature.color.unresolved',
    hint: `Shape.color() takes a role token or a #rrggbb hex; ${fix}.`,
    message: `Shape.color('${value}') is not a role token or #rrggbb hex, so renders and exports fall back to the default colour; ${fix}.`,
    recordId: id,
    phase: 'build',
  };
}

/**
 * Expand a `.finish()` name to PBR. A finish token wins when the name is both
 * (steel, pla, abs, nylon map to the identically named token anyway).
 * Otherwise an engineering material name applies its registry default finish,
 * so one material vocabulary covers mass, FEA and appearance. `expandFinish`
 * throws `feature.finish.unknown-token` (with this shape's id) for an unknown
 * name.
 */
export function resolveFinishPbr(
  name: string,
  color: string | TypedParamRef<string> | undefined,
  id: string,
): PBRMaterial {
  let token = name;
  if (!isFinishToken(name)) {
    const resolved = tryResolveMaterial(name);
    if (resolved.ok) {
      if (resolved.material.finish === undefined) {
        throw new KernelError(
          'feature.finish.unknown-token',
          unknownFinishMessage(name),
          id,
          `'${name}' is a material (${resolved.material.name as MaterialName}) with no default finish. ` +
            'Pass a finish token such as plastic-glossy, or set the look with .color().',
        );
      }
      token = resolved.material.finish;
    }
  }
  return expandFinish(token, color !== undefined ? { color: isTypedParamRef(color) ? color.value : color } : undefined, id);
}

export function assertWrapTextureArgs(imageRef: unknown, projection: unknown, id: string): void {
  if (!isTextureRef(imageRef)) {
    throw new KernelError(
      'feature.invalid-args',
      `Shape.wrapTexture: imageRef must be a TextureRef ({ path, ... }) with a non-empty 'path' string; got ${formatScalarForError(imageRef)}.`,
      id,
      'Pass { path: "<file-or-url>" } as the first argument.',
    );
  }
  if (!isTextureProjection(projection)) {
    throw new KernelError(
      'feature.invalid-args',
      `Shape.wrapTexture: projection must be one of flat({onto?}), cylinder({axis}), sphere(), box(); got ${formatScalarForError(projection)}.`,
      id,
      "Pass { type: 'cylinder', axis: [0,0,1] } or one of the other three projection shapes.",
    );
  }
}

/** Existing `metadata.material.baseColor` on a record, so a texture wrap keeps the tint. */
export function existingMaterialBaseColor(session: CaptureSession, id: string): string | undefined {
  const record = session.getRecords().find(r => r.id === id);
  return (record?.metadata as { material?: PBRMaterial } | undefined)?.material?.baseColor;
}

/** Attach a wrap projection next to the albedo texture `.material()` just wrote. */
export function attachTextureProjection(session: CaptureSession, id: string, projection: TextureProjection): void {
  const record = session.getRecords().find(r => r.id === id);
  if (record === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `Shape.wrapTexture: feature record '${id}' not found in session.`,
      id,
      'Call .wrapTexture() on a Shape produced by the current session.',
    );
  }
  (record.metadata as { material: PBRMaterial }).material.textureProjection = projection;
}
