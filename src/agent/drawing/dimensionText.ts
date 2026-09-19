// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/dimensionText.ts
//
// Parse the lettering of a dimension or callout into numbers. Covers the
// forms a drawing actually carries:
//
//   80            linear value
//   (80)          reference dimension — informative, never drives geometry
//   80 ±0.1       symmetric tolerance     80 +0.2/-0.05  asymmetric
//   ⌀12  Ø12  ∅12  DIA 12                diameter
//   R5                                   radius
//   4× ⌀6.5 THRU   4X Ø6.5 THRU           patterned through hole
//   ⌀6.5 ▾ 10   ⌀6.5 ↧10   ⌀6.5 x 10 DP   ⌀6.5 10 DEEP   blind hole depth
//   ⌀6.5 THRU 4 PLCS                     count as a suffix
//   ⌀20 h7                               fit class
//
// Anything after the recognised head (counterbore ⌴, countersink ⌵ and
// the like) is kept verbatim in `extras` so it can be reported, not dropped.

export interface ParsedDimText {
  raw: string;
  kind: 'linear' | 'diameter' | 'radius';
  value: number;
  /** Pattern count (`4×`, `4 PLCS`); 1 when absent. */
  count: number;
  through: boolean;
  /** Blind depth, when lettered. */
  depth?: number;
  /** Parenthesised reference dimension. */
  reference: boolean;
  /** Tolerance or fit-class text, verbatim. */
  tolerance?: string;
  /** Unit suffix lettered on the value, if any. */
  unit?: 'mm' | 'in';
  /** Unrecognised trailing callout text (counterbore, countersink, notes). */
  extras: string;
}

const NUM = String.raw`(\d+(?:[.,]\d+)?|[.,]\d+)`;
const toNum = (s: string): number => Number(s.replace(',', '.'));

/** Normalise the symbol zoo onto one spelling per meaning. */
export function normaliseDimText(raw: string): string {
  return raw
    .replace(/[Øø∅⌀]/g, '⌀')
    .replace(/\bDIA\.?\s*/gi, '⌀')
    .replace(/(\d)\s*[xX×*]\s*(?=[⌀R\d.])/g, '$1× ')
    .replace(/−/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip the reference parens and pattern-count prefix off the lettering. */
function stripDimensionPrefix(raw: string): { s: string; reference: boolean; count: number } {
  let s = normaliseDimText(raw);
  let reference = false;
  const paren = /^\((.*)\)$/.exec(s);
  if (paren) {
    reference = true;
    s = paren[1].trim();
  }

  let count = 1;
  const countPrefix = /^(\d+)\s*×\s*/.exec(s);
  if (countPrefix) {
    count = Number(countPrefix[1]);
    s = s.slice(countPrefix[0].length);
  }
  return { s, reference, count };
}

/** Parse the symbol/value/unit head; `null` when there is no number head. */
function parseDimensionHead(s: string): { kind: ParsedDimText['kind']; value: number; unit: ParsedDimText['unit']; rest: string } | null {
  const head = new RegExp(String.raw`^(⌀|R)?\s*${NUM}\s*(mm|in|")?`).exec(s);
  if (!head) return null;
  const kind: ParsedDimText['kind'] = head[1] === '⌀' ? 'diameter' : head[1] === 'R' ? 'radius' : 'linear';
  const value = toNum(head[2]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = head[3] === 'mm' ? 'mm' : head[3] === 'in' || head[3] === '"' ? 'in' : undefined;
  const rest = s.slice(head[0].length).trim();
  return { kind, value, unit, rest };
}

/** Parse tolerance, through/depth and trailing pattern count off the rest. */
function parseDimensionTail(restIn: string, countIn: number): { tolerance: string | undefined; through: boolean; depth: number | undefined; count: number; rest: string } {
  let rest = restIn;

  let tolerance: string | undefined;
  const tol = new RegExp(String.raw`^(±\s*${NUM}|\+\s*${NUM}\s*/?\s*-\s*${NUM}|[A-Za-z]{1,2}\d{1,2}\b)`).exec(rest);
  if (tol) {
    tolerance = tol[0].replace(/\s+/g, '');
    rest = rest.slice(tol[0].length).trim();
  }

  let through = false;
  let depth: number | undefined;
  const thru = /^(THRU|THROUGH)\b/i.exec(rest);
  if (thru) {
    through = true;
    rest = rest.slice(thru[0].length).trim();
  } else {
    const deep =
      new RegExp(String.raw`^[▾↧]\s*${NUM}`).exec(rest) ??
      new RegExp(String.raw`^×\s*${NUM}\s*(?:DP|DEEP)\b`, 'i').exec(rest) ??
      new RegExp(String.raw`^${NUM}\s*(?:DP|DEEP)\b`, 'i').exec(rest);
    if (deep) {
      depth = toNum(deep[1]);
      rest = rest.slice(deep[0].length).trim();
    }
  }

  let count = countIn;
  const plcs = /(?:^|\s)(\d+)\s*(?:PLCS?|PL|HOLES)\.?$/i.exec(rest);
  if (plcs && count === 1) {
    count = Number(plcs[1]);
    rest = rest.slice(0, plcs.index).trim();
  }

  return { tolerance, through, depth, count, rest };
}

/**
 * Angles, ratios and prose after a number are not length dimensions; a plain
 * linear value may only carry a thickness note ("8 THK").
 */
function isDimensionRestValid(
  kind: ParsedDimText['kind'],
  count: number,
  through: boolean,
  depth: number | undefined,
  rest: string,
): boolean {
  if (/^[°:/]/.test(rest)) return false;
  if (kind === 'linear' && count === 1 && !through && depth === undefined && rest.length > 0 && !/^THK\.?$/i.test(rest)) {
    return false;
  }
  return true;
}

/** Parse dimension lettering; `null` when the text is not a dimension (a label, a note). */
export function parseDimensionText(raw: string): ParsedDimText | null {
  const { s, reference, count: prefixCount } = stripDimensionPrefix(raw);

  const head = parseDimensionHead(s);
  if (head === null) return null;

  const tail = parseDimensionTail(head.rest, prefixCount);
  if (!isDimensionRestValid(head.kind, tail.count, tail.through, tail.depth, tail.rest)) return null;

  return {
    raw,
    kind: head.kind,
    value: head.value,
    count: tail.count,
    through: tail.through,
    ...(tail.depth !== undefined ? { depth: tail.depth } : {}),
    reference,
    ...(tail.tolerance !== undefined ? { tolerance: tail.tolerance } : {}),
    ...(head.unit !== undefined ? { unit: head.unit } : {}),
    extras: tail.rest,
  };
}

/** `1:2`, `SCALE 2:1`, `1 : 5` → sheet mm per model mm; `null` otherwise. */
export function parseScaleText(raw: string): number | null {
  const m = new RegExp(String.raw`^(?:SCALE\s*:?\s*)?${NUM}\s*:\s*${NUM}$`, 'i').exec(raw.trim());
  if (!m) return null;
  const sheet = toNum(m[1]);
  const model = toNum(m[2]);
  return sheet > 0 && model > 0 ? sheet / model : null;
}

/** Recognise a units statement: `mm`, `UNITS: MM`, `ALL DIMENSIONS IN INCHES`. */
export function parseUnitsText(raw: string): 'mm' | 'in' | null {
  const t = raw.trim();
  if (/^(?:UNITS\s*:?\s*)?(mm|millimet(?:er|re)s?)$/i.test(t) || /DIMENSIONS\s+(?:ARE\s+)?IN\s+(MM|MILLIMET)/i.test(t)) return 'mm';
  if (/^(?:UNITS\s*:?\s*)?(in|inch|inches)$/i.test(t) || /DIMENSIONS\s+(?:ARE\s+)?IN\s+INCH/i.test(t)) return 'in';
  return null;
}
