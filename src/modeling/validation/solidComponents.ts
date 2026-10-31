// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared solid-component helpers for the boolean integrity guards.
//
// OCCT often returns a compound whose extra solids are zero-volume slivers
// left by near-tangent fuses; those are kernel noise, not floating parts.
// Every guard that counts "how many bodies does this result have" must use
// the same filter, otherwise one seam calls a result one body and another
// calls it two.

import type { ShapeBackend } from '../../kernel/backends/backend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';

/** Solids below this volume (mm³) are fuse slivers, not parts. */
export const SLIVER_MM3 = 1e-3;

/** Solid components with real volume. A fuse of near-tangent operands can
 *  leave zero-volume sliver solids next to the real body; those are kernel
 *  noise, not floating parts. Single-solid shapes cost one explorer pass. */
export function realSolids(s: ShapeBackend): OcctBackend[] {
  let solids: readonly ShapeBackend[];
  try {
    solids = s.solidComponents();
  } catch {
    return [];
  }
  if (solids.length <= 1) return solids as OcctBackend[];
  return (solids as OcctBackend[]).filter(c => safeVolume(c) > SLIVER_MM3);
}

export function safeVolume(s: ShapeBackend): number {
  try { return s.volume(); } catch { return 0; }
}
