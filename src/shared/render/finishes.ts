// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/render/finishes.ts
//
// Named surface finishes → PBR floats. An engineer knows "black anodised
// aluminium" or "matte ABS", not "metalness 0.9, roughness 0.45". This table
// is the front door: `.finish('anodized-black')` looks up an entry here and
// writes the SAME metadata.material record `.material({...})` produces, so the
// renderer and every exporter consume it with no downstream change.
//
// Sibling to palette.ts (hue tokens) and materialRoles.ts (role → PBR). Those
// stay as they are — palette is `.color()` (hue only), materialRoles powers the
// role-token render fallback. This file is keyed by MATERIAL, not by mechanical
// role, and backs the first-class `.finish()` verb.
//
// The table is deliberately small (~22 entries). It is a curated DEFAULT
// library, the same way Fusion/Onshape ship a short appearance list you extend,
// not a 7000-grade ISO catalogue. Resist inflating it: a new archetype earns a
// token only when a named finish genuinely reads better than raw PBR.

import type { PBRMaterial } from '../intent/material';
import { KernelError } from '../intent/kernelError';

export type FinishToken =
  // Metals — colour is intrinsic; a `{ color }` override is accepted but off
  // for raw metals (the metal IS its colour). `anodized` is the exception:
  // anodising takes a dye, so overriding its hue is the normal case.
  | 'aluminium'
  | 'aluminium-brushed'
  | 'anodized-black'
  | 'anodized'
  | 'steel'
  | 'stainless'
  | 'brass'
  | 'copper'
  | 'titanium'
  // Plastics — housings and printed parts. Hue is a free parameter for the
  // matte/gloss shells (`abs`, `plastic-glossy`); the rest carry a natural tint.
  | 'abs'
  | 'pla'
  | 'nylon'
  | 'delrin'
  | 'polycarbonate'
  | 'rubber'
  | 'plastic-glossy'
  // Glass / transmissive — real refraction, no floats to reason about.
  | 'glass'
  | 'glass-tinted'
  | 'acrylic'
  // Painted / neutral — hue is the whole point for the paints.
  | 'paint-matte'
  | 'paint-gloss'
  | 'default';

// Each entry is a plain PBRMaterial. Numbers come from the existing ROLE_PBR
// profiles, the authoring skill's presets, and standard PBR references
// (physicallybased.info). They are an implementation detail — authors name the
// finish and never see these unless they open the .material() escape hatch.
export const FINISHES: Record<FinishToken, PBRMaterial> = {
  // --- Metals ---
  'aluminium':         { baseColor: '#b8bcc0', metalness: 1.0, roughness: 0.35 },
  'aluminium-brushed': { baseColor: '#b0b4b8', metalness: 1.0, roughness: 0.30, anisotropy: 0.8 },
  'anodized-black':    { baseColor: '#1a1c1e', metalness: 0.9, roughness: 0.45 },
  'anodized':          { baseColor: '#5a6b8c', metalness: 0.9, roughness: 0.40 },
  'steel':             { baseColor: '#8a8d90', metalness: 1.0, roughness: 0.45 },
  'stainless':         { baseColor: '#c4c6c8', metalness: 1.0, roughness: 0.25 },
  'brass':             { baseColor: '#c8a24a', metalness: 1.0, roughness: 0.35 },
  'copper':            { baseColor: '#b87333', metalness: 1.0, roughness: 0.35 },
  'titanium':          { baseColor: '#9a9186', metalness: 1.0, roughness: 0.45 },

  // --- Plastics ---
  'abs':               { baseColor: '#2a2a2a', metalness: 0.0, roughness: 0.55 },
  'pla':               { baseColor: '#3a3a3a', metalness: 0.0, roughness: 0.45 },
  'nylon':             { baseColor: '#e8e6e0', metalness: 0.0, roughness: 0.60 },
  'delrin':            { baseColor: '#efefe9', metalness: 0.0, roughness: 0.35 },
  'polycarbonate':     { baseColor: '#dcdce0', metalness: 0.0, roughness: 0.20, clearcoat: 0.3 },
  'rubber':            { baseColor: '#1c1c1c', metalness: 0.0, roughness: 0.85 },
  'plastic-glossy':    { baseColor: '#101010', metalness: 0.0, roughness: 0.15, clearcoat: 0.8 },

  // --- Glass / transmissive ---
  'glass':             { baseColor: '#ffffff', metalness: 0.0, roughness: 0.0, transmission: 0.95, ior: 1.5 },
  'glass-tinted':      { baseColor: '#1a1a2a', metalness: 0.0, roughness: 0.0, transmission: 0.85, ior: 1.5, thickness: 3 },
  'acrylic':           { baseColor: '#ffffff', metalness: 0.0, roughness: 0.05, transmission: 0.9, ior: 1.49 },

  // --- Painted / neutral ---
  'paint-matte':       { baseColor: '#c0c0c0', metalness: 0.0, roughness: 0.70 },
  'paint-gloss':       { baseColor: '#c0c0c0', metalness: 0.0, roughness: 0.20, clearcoat: 0.7 },
  'default':           { baseColor: '#c8d2e0', metalness: 0.1, roughness: 0.60 },
};

/** Finish names in declaration order, for diagnostics and the docs drift gate. */
export const FINISH_TOKENS = Object.keys(FINISHES) as FinishToken[];

/** Type guard for a known finish token. */
export function isFinishToken(value: unknown): value is FinishToken {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FINISHES, value);
}

/** The diagnostic text for an unknown finish. One source so `expandFinish` and
 *  any caller print the identical name + valid-list — never a silent default. */
export function unknownFinishMessage(name: unknown): string {
  return (
    `Shape.finish: '${String(name)}' is not a known finish. ` +
    `Valid finishes: ${FINISH_TOKENS.join(', ')}.`
  );
}

/**
 * Expand a finish token to the PBRMaterial record `.material()` writes. An
 * `opts.color` overrides only the hue, keeping the finish's surface character
 * (metalness/roughness/clearcoat/…) — meaningful for the paints, ABS, and
 * anodising; accepted but discouraged for raw metals whose colour is intrinsic.
 *
 * An unknown name throws — it does NOT fall back to a default. A silent
 * fallback would render the wrong material and hide the typo.
 */
export function expandFinish(
  name: string,
  opts?: { color?: string },
  featureId?: string,
): PBRMaterial {
  if (!isFinishToken(name)) {
    throw new KernelError(
      'feature.finish.unknown-token',
      unknownFinishMessage(name),
      featureId,
      'Pass one of the named finishes, or use .material({...}) for raw PBR.',
    );
  }
  // Fresh copy so callers never mutate the shared table entry.
  const material: PBRMaterial = { ...FINISHES[name] };
  if (opts?.color !== undefined) {
    // Leave baseColor validation to .material() (throws invalid-base-color on
    // a non-string / empty). One validator, one error path.
    material.baseColor = opts.color;
  }
  return material;
}
