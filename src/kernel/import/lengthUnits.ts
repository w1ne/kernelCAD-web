// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/lengthUnits.ts
//
// The length units a 2D vector file can declare, and their millimetre scale.
//
// kernelCAD's world is millimetres, so every importer's job is to land on one
// number: how many millimetres is one source coordinate worth. This table is
// that number and nothing else — unit DISCOVERY (DXF `$INSUNITS`, SVG
// `width` + `viewBox`) is format-specific and stays in the two parsers.

/** Length units accepted by `opts.units` on `lib.fromDXF` / `lib.fromSVG`. */
export type LengthUnit = 'mm' | 'cm' | 'm' | 'dm' | 'um' | 'nm' | 'in' | 'ft' | 'yd' | 'mi' | 'pt' | 'pc' | 'px';

/**
 * Millimetres per unit.
 *
 * `px` is the CSS pixel — 1/96 inch by definition (CSS Values 3 §5.2), which
 * is what an SVG user unit resolves to when the document declares no physical
 * size. `pt` and `pc` are the CSS typographic units (1/72 in, 1/6 in); they
 * appear on SVG `width`/`height` and never in DXF.
 */
export const MM_PER_UNIT: Readonly<Record<LengthUnit, number>> = {
  mm: 1,
  cm: 10,
  dm: 100,
  m: 1000,
  um: 1e-3,
  nm: 1e-6,
  in: 25.4,
  ft: 304.8,
  yd: 914.4,
  mi: 1_609_344,
  pt: 25.4 / 72,
  pc: 25.4 / 6,
  px: 25.4 / 96,
};

export function isLengthUnit(v: unknown): v is LengthUnit {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(MM_PER_UNIT, v);
}

/** Sorted list for error messages, so a bad `opts.units` names the alternatives. */
export const LENGTH_UNIT_NAMES: readonly LengthUnit[] = Object.keys(MM_PER_UNIT) as LengthUnit[];
