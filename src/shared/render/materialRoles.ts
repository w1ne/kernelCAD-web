// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render/materialRoles.ts
//
// Role → physically-based-rendering profile. Drives MeshStandardMaterial's
// metalness/roughness so the same role tokens that pick a color via
// ROLE_PALETTE also pick a surface character: matte plastic for servo/frame
// housings, polished metal for shafts and gears, painted aluminium for
// plates and beams. Renderer-only — kernel/captured records are unaffected.

import { isColorToken, type ColorToken } from './palette';

export interface PbrProfile {
  metalness: number;
  roughness: number;
}

const ROLE_PBR: Record<ColorToken, PbrProfile> = {
  servo:  { metalness: 0.05, roughness: 0.7 },  // matte plastic housing
  frame:  { metalness: 0.05, roughness: 0.7 },  // matte plastic / printed structure
  gear:   { metalness: 0.85, roughness: 0.3 },  // polished metal output
  shaft:  { metalness: 0.85, roughness: 0.3 },  // bright metal axle
  pin:    { metalness: 0.7,  roughness: 0.45 }, // brushed steel fastener
  plate:  { metalness: 0.4,  roughness: 0.5 },  // painted aluminium
  beam:   { metalness: 0.4,  roughness: 0.5 },  // painted aluminium
  tool:   { metalness: 0.1,  roughness: 0.6 },  // colored plastic / matte rubber
};

const DEFAULT_PBR: PbrProfile = { metalness: 0.1, roughness: 0.6 };

/** Pick a PBR profile from a role token; hex colors and unknowns fall back
 *  to a neutral "machined plastic" preset. */
export function pbrFromColor(value: string | undefined): PbrProfile {
  if (value === undefined) return DEFAULT_PBR;
  if (isColorToken(value)) return ROLE_PBR[value];
  return DEFAULT_PBR;
}
