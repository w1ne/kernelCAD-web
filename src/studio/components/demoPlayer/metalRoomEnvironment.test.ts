// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Default renders of `{ material: 'abs' }` and `{ material: 'steel' }` parts
// were near-black: ABS's default base colour was #2a2a2a, and a metal with no
// environment map reflects nothing. ABS is now a readable mid grey and the
// demo player installs the procedural room when a metal is on screen and the
// script declared no environment.

import { describe, expect, it } from 'vitest';
import { FINISHES } from '../../../shared/render/finishes';
import { hasMetallicMaterial } from './metalRoomEnvironment';

/** Relative luminance of an sRGB hex colour (0 black .. 1 white). */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

describe('default render materials stay readable', () => {
  it('the abs / pla finishes (what { material: "abs" | "pla" } renders with) are not near-black', () => {
    expect(luminance(FINISHES.abs.baseColor as string)).toBeGreaterThan(0.1);
    expect(luminance(FINISHES.pla.baseColor as string)).toBeGreaterThan(0.1);
  });

  it('steel and other metals trigger the default room environment', () => {
    expect(hasMetallicMaterial([{ material: FINISHES.steel }])).toBe(true);
    expect(hasMetallicMaterial([{ material: FINISHES.abs }, { materialByFaceId: { f1: FINISHES.brass } }])).toBe(true);
  });

  it('plastics alone do not change the render environment', () => {
    expect(hasMetallicMaterial([{ material: FINISHES.abs }, { material: FINISHES.nylon }, {}])).toBe(false);
  });
});
