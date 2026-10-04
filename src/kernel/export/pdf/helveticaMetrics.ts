// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/pdf/helveticaMetrics.ts
//
// Text metrics and encoding for the drawing PDF writer. The sheet uses the
// standard (non-embedded) Helvetica / Helvetica-Bold faces with
// WinAnsiEncoding, so every viewer renders it without a font file and the
// text layer stays searchable.
//
// Characters are split three ways:
//   - WinAnsi characters print as text;
//   - a few drafting characters print as their WinAnsi stand-in (⌀ -> Ø, the
//     substitute drafting practice itself uses on type without U+2300;
//     − -> -);
//   - GD&T and hole-callout symbols (⌖ ⏥ ⟂ ∥ ⌴ ⌵ ▾ …) have no glyph in the
//     standard fonts; the writer draws them as vector strokes one em wide
//     (see `symbolGlyphs.ts`). Anything else prints as `?`.
// The SVG title block uses `fitTextSize` so a value that fits here fits in
// the PDF, where these metrics are exact.
//
// Advance widths are the Adobe Core 14 AFM metrics (1/1000 em) for WinAnsi
// codes 32..255.

import { SYMBOL_GLYPH_ADVANCE, hasSymbolGlyph } from './symbolGlyphs';

const HELVETICA: readonly number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 350,
  556, 350, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 350, 611, 350,
  350, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 350, 500, 667,
  278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
];

const HELVETICA_BOLD: readonly number[] = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 350,
  556, 350, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 350, 611, 350,
  350, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 350, 500, 667,
  278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
  611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556,
];

/** Unicode -> WinAnsi code for the 0x80..0x9F block (the rest is Latin-1). */
const WIN_ANSI_HIGH: Readonly<Record<string, number>> = {
  '\u20ac': 0x80, '\u201a': 0x82, '\u0192': 0x83, '\u201e': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02c6': 0x88, '\u2030': 0x89, '\u0160': 0x8a,
  '\u2039': 0x8b, '\u0152': 0x8c, '\u017d': 0x8e, '\u2018': 0x91, '\u2019': 0x92,
  '\u201c': 0x93, '\u201d': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02dc': 0x98, '\u2122': 0x99, '\u0161': 0x9a, '\u203a': 0x9b, '\u0153': 0x9c,
  '\u017e': 0x9e, '\u0178': 0x9f,
};

/** Drafting characters printed as a WinAnsi stand-in. */
const STAND_INS: Readonly<Record<string, string>> = {
  '\u2300': '\u00d8', // ⌀ -> Ø
  '\u2205': '\u00d8', // ∅ -> Ø
  '\u2212': '-', // − minus sign
  '\u2009': ' ', // thin space
  '\u00a0': ' ',
};

/** WinAnsi code of `ch`, or undefined when the encoding has no such character. */
export function winAnsiCode(ch: string): number | undefined {
  const cp = ch.codePointAt(0)!;
  if (cp >= 0x20 && cp <= 0x7e) return cp;
  if (cp >= 0xa0 && cp <= 0xff) return cp;
  return WIN_ANSI_HIGH[ch];
}

/** One printable run: WinAnsi text, or a single vector-drawn symbol. */
export type TextRun =
  | { kind: 'text'; codes: number[] }
  | { kind: 'symbol'; ch: string };

/** Split `text` into WinAnsi text runs and vector symbol runs. */
export function textRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const raw of text) {
    const ch = STAND_INS[raw] ?? raw;
    if (hasSymbolGlyph(ch)) {
      runs.push({ kind: 'symbol', ch });
      continue;
    }
    const code = winAnsiCode(ch) ?? 0x3f;
    const last = runs[runs.length - 1];
    if (last?.kind === 'text') last.codes.push(code);
    else runs.push({ kind: 'text', codes: [code] });
  }
  return runs;
}

/** Advance width of one run in em. */
export function runAdvanceEm(run: TextRun, bold = false): number {
  if (run.kind === 'symbol') return SYMBOL_GLYPH_ADVANCE;
  const table = bold ? HELVETICA_BOLD : HELVETICA;
  let w = 0;
  for (const c of run.codes) w += table[c - 32] ?? 556;
  return w / 1000;
}

/** Advance width of `text` at font size `size` (same unit as `size`). */
export function textWidth(text: string, size: number, bold = false): number {
  let em = 0;
  for (const run of textRuns(text)) em += runAdvanceEm(run, bold);
  return em * size;
}

/**
 * Largest font size in [minSize, size] at which `text` fits `maxWidth`; when
 * even `minSize` overflows, the text is cut and ends in `...`.
 */
export function fitTextSize(
  text: string,
  size: number,
  maxWidth: number,
  minSize: number,
): { text: string; size: number } {
  const w = textWidth(text, size);
  if (w <= maxWidth) return { text, size };
  const shrunk = (size * maxWidth) / w;
  if (shrunk >= minSize) return { text, size: Math.floor(shrunk * 100) / 100 };
  const chars = [...text];
  while (chars.length > 0 && textWidth(`${chars.join('')}...`, minSize) > maxWidth) chars.pop();
  return { text: `${chars.join('').trimEnd()}...`, size: minSize };
}
