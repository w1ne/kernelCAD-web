// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render/palette.ts
//
// Role-based color tokens for kernelCAD assemblies. Tokens carry semantic
// authoring intent ('servo', 'gear', etc.); the renderer resolves them to
// hex via ROLE_PALETTE at render time.
//
// Custom hex colors are an escape hatch — Shape.color() accepts either a
// token from this enum OR a literal `#rrggbb` string. The palette intentionally
// stays small + curated to keep visual style coherent across assemblies.

export type ColorToken =
  | 'servo'    // dark housing, stepper/servo-like
  | 'gear'     // bright silver, rotating output
  | 'beam'     // muted blue, structural member
  | 'shaft'    // bright silver, axle pin
  | 'plate'    // tan/gray, mounting plate
  | 'pin'      // dark gray, fastener
  | 'frame'    // light gray, structural frame
  | 'tool';    // contrast color (red/orange), end-effector

export const ROLE_PALETTE: Record<ColorToken, string> = {
  servo:  '#2b3137',
  gear:   '#d8dde3',
  beam:   '#5f87c6',
  shaft:  '#c6ccd2',
  plate:  '#a89a7c',
  pin:    '#3e454b',
  frame:  '#8e9bab',
  tool:   '#d4683a',
};

const TOKEN_SET = new Set<string>(Object.keys(ROLE_PALETTE));

/** Type guard for ColorToken. */
export function isColorToken(value: unknown): value is ColorToken {
  return typeof value === 'string' && TOKEN_SET.has(value);
}

/**
 * Resolve a color attribute (token or hex) to a hex color string.
 * Returns undefined if the input is undefined or doesn't match either form.
 */
export function resolveColor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value.startsWith('#')) return value;
  if (isColorToken(value)) return ROLE_PALETTE[value];
  return undefined;
}

/** Default fallback color when none is set. */
export const DEFAULT_COLOR = '#bfc4c8';
