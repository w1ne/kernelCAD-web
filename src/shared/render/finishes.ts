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
// The table is a curated DEFAULT library (~33 entries: mechanical finishes
// plus a physically calibrated PCB / electronics set that keeps bare-board
// assemblies and populated boards readable in studio renders).

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
  // Electronics / PCB — solder mask, laminate, copper, gold finish, paste.
  | 'pcb-green'
  | 'pcb-black'
  | 'pcb-blue'
  | 'pcb-red'
  | 'pcb-white'
  | 'fr4'
  | 'pcb-copper'
  | 'gold-enig'
  | 'solder'
  | 'ic-epoxy'
  | 'silkscreen'
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
  // ABS / PLA default to mid greys, not near-black: a dark default hid every
  // edge and hole in a default render. Black housings pass { color }.
  'abs':               { baseColor: '#6b7078', metalness: 0.0, roughness: 0.55 },
  'pla':               { baseColor: '#7a7f86', metalness: 0.0, roughness: 0.45 },
  'nylon':             { baseColor: '#e8e6e0', metalness: 0.0, roughness: 0.60 },
  'delrin':            { baseColor: '#efefe9', metalness: 0.0, roughness: 0.35 },
  'polycarbonate':     { baseColor: '#dcdce0', metalness: 0.0, roughness: 0.20, clearcoat: 0.3 },
  'rubber':            { baseColor: '#1c1c1c', metalness: 0.0, roughness: 0.85 },
  'plastic-glossy':    { baseColor: '#101010', metalness: 0.0, roughness: 0.15, clearcoat: 0.8 },

  // --- Glass / transmissive ---
  // Clearcoat 1 + low roughness gives the crisp window reflection; the
  // transmission path carries the refraction through the volume.
  'glass':             { baseColor: '#ffffff', metalness: 0.0, roughness: 0.02, clearcoat: 1.0, clearcoatRoughness: 0.02, transmission: 0.94, ior: 1.5, thickness: 2 },
  'glass-tinted':      { baseColor: '#d4e2f2', metalness: 0.0, roughness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.04, transmission: 0.88, ior: 1.5, thickness: 3, attenuationColor: '#2d3f5e', attenuationDistance: 8 },
  'acrylic':           { baseColor: '#f8fbff', metalness: 0.0, roughness: 0.04, clearcoat: 0.9, clearcoatRoughness: 0.04, transmission: 0.92, ior: 1.49, thickness: 2.5 },

  // --- Electronics / PCB ---
  // Solder masks: pigmented epoxy with a thin glossy clearcoat over the weave.
  'pcb-green':         { baseColor: '#1b6b47', metalness: 0.0, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.18 },
  'pcb-black':         { baseColor: '#111417', metalness: 0.0, roughness: 0.40, clearcoat: 0.45, clearcoatRoughness: 0.16 },
  'pcb-blue':          { baseColor: '#174a8a', metalness: 0.0, roughness: 0.42, clearcoat: 0.42, clearcoatRoughness: 0.18 },
  'pcb-red':           { baseColor: '#8a1c1c', metalness: 0.0, roughness: 0.42, clearcoat: 0.42, clearcoatRoughness: 0.18 },
  'pcb-white':         { baseColor: '#e9ece9', metalness: 0.0, roughness: 0.44, clearcoat: 0.40, clearcoatRoughness: 0.20 },
  // Bare laminate edge — the yellowish FR-4 substrate, not the mask.
  'fr4':               { baseColor: '#b7a469', metalness: 0.0, roughness: 0.62 },
  // Exposed traces / pours under the mask and the ENIG pad finish.
  'pcb-copper':        { baseColor: '#b87333', metalness: 1.0, roughness: 0.22 },
  'gold-enig':         { baseColor: '#d4af37', metalness: 1.0, roughness: 0.18 },
  'solder':            { baseColor: '#c8ccd0', metalness: 1.0, roughness: 0.20 },
  // Moulded IC body: matte black epoxy.
  'ic-epoxy':          { baseColor: '#23272e', metalness: 0.0, roughness: 0.62 },
  // Printed legend on the mask.
  'silkscreen':        { baseColor: '#f4f5f2', metalness: 0.0, roughness: 0.58 },

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
  material.name ??= name;
  if (opts?.color !== undefined) {
    // Leave baseColor validation to .material() (throws invalid-base-color on
    // a non-string / empty). One validator, one error path.
    material.baseColor = opts.color;
  }
  return material;
}
