// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/pdf/symbolGlyphs.ts
//
// Vector outlines for the drafting symbols the drawing sheet prints but the
// standard PDF fonts do not carry: the GD&T characteristic symbols
// (ISO 1101 / ASME Y14.5), material-condition modifiers and the hole-callout
// symbols (counterbore, countersink, depth). Each glyph lives in a one-em
// box, origin on the baseline at the left edge, y UP, and is stroked at
// `SYMBOL_STROKE_EM`; the PDF writer scales it by the font size.

export type GlyphPt = readonly [number, number];

export type GlyphPrimitive =
  | { kind: 'poly'; pts: readonly GlyphPt[]; closed?: boolean }
  | { kind: 'circle'; c: GlyphPt; r: number }
  /** A Helvetica letter inside the glyph (Ⓜ, Ⓢ), baseline-left at `at`. */
  | { kind: 'letter'; ch: string; at: GlyphPt; size: number };

/** Advance width of every symbol glyph, in em. */
export const SYMBOL_GLYPH_ADVANCE = 1;

/** Stroke width of symbol outlines, in em. */
export const SYMBOL_STROKE_EM = 0.07;

const MID = 0.36; // vertical centre of the symbols: half the cap height

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 16): GlyphPt[] {
  const pts: GlyphPt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

const depth: GlyphPrimitive[] = [
  { kind: 'poly', pts: [[0.5, 0.72], [0.5, 0.06]] },
  { kind: 'poly', pts: [[0.3, 0.26], [0.5, 0.06], [0.7, 0.26]] },
  { kind: 'poly', pts: [[0.2, 0.06], [0.8, 0.06]] },
];
const perpendicular: GlyphPrimitive[] = [
  { kind: 'poly', pts: [[0.12, 0.04], [0.88, 0.04]] },
  { kind: 'poly', pts: [[0.5, 0.04], [0.5, 0.72]] },
];
const concentric: GlyphPrimitive[] = [
  { kind: 'circle', c: [0.5, MID], r: 0.32 },
  { kind: 'circle', c: [0.5, MID], r: 0.16 },
];
const modifier = (ch: string): GlyphPrimitive[] => [
  { kind: 'circle', c: [0.5, MID], r: 0.36 },
  { kind: 'letter', ch, at: [ch === 'M' ? 0.31 : 0.35, MID - 0.16], size: 0.45 },
];

const GLYPHS: Readonly<Record<string, readonly GlyphPrimitive[]>> = {
  // Position: circle with a centre cross.
  '⌖': [
    { kind: 'circle', c: [0.5, MID], r: 0.26 },
    { kind: 'poly', pts: [[0.12, MID], [0.88, MID]] },
    { kind: 'poly', pts: [[0.5, MID - 0.38], [0.5, MID + 0.38]] },
  ],
  // Flatness: parallelogram.
  '⏥': [{ kind: 'poly', pts: [[0.08, 0.18], [0.7, 0.18], [0.92, 0.54], [0.3, 0.54]], closed: true }],
  // Perpendicularity (two code points in use).
  '⟂': perpendicular,
  '⊥': perpendicular,
  // Parallelism: two slanted strokes.
  '∥': [
    { kind: 'poly', pts: [[0.22, 0.02], [0.48, 0.72]] },
    { kind: 'poly', pts: [[0.52, 0.02], [0.78, 0.72]] },
  ],
  // Concentricity / coaxiality: concentric circles.
  '⌾': concentric,
  '◎': concentric,
  // Circularity.
  '○': [{ kind: 'circle', c: [0.5, MID], r: 0.32 }],
  // Cylindricity: circle between two slanted tangents.
  '⌭': [
    { kind: 'circle', c: [0.5, MID], r: 0.24 },
    { kind: 'poly', pts: [[0.1, 0.0], [0.4, 0.72]] },
    { kind: 'poly', pts: [[0.6, 0.0], [0.9, 0.72]] },
  ],
  // Angularity.
  '∠': [{ kind: 'poly', pts: [[0.88, 0.04], [0.1, 0.04], [0.78, 0.6]] }],
  // Profile of a line / of a surface.
  '⌒': [{ kind: 'poly', pts: arc(0.5, 0.12, 0.38, 0, Math.PI) }],
  '⌓': [{ kind: 'poly', pts: arc(0.5, 0.12, 0.38, 0, Math.PI), closed: true }],
  // Material-condition modifiers.
  'Ⓜ': modifier('M'),
  'Ⓢ': modifier('S'),
  // Counterbore / spotface and countersink.
  '⌴': [{ kind: 'poly', pts: [[0.14, 0.7], [0.14, 0.08], [0.86, 0.08], [0.86, 0.7]] }],
  '⌵': [{ kind: 'poly', pts: [[0.12, 0.7], [0.5, 0.04], [0.88, 0.7]] }],
  // Depth: the sheet writes ▾; ↧ is the standard code point.
  '▾': depth,
  '↧': depth,
};

export function hasSymbolGlyph(ch: string): boolean {
  return Object.prototype.hasOwnProperty.call(GLYPHS, ch);
}

/** The glyph's primitives, or undefined for a character without one. */
export function symbolGlyph(ch: string): readonly GlyphPrimitive[] | undefined {
  return hasSymbolGlyph(ch) ? GLYPHS[ch] : undefined;
}
