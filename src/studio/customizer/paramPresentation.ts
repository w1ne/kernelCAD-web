// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Presentation fallbacks for a `param()` that declares no label, unit, range
// or step: a readable label from the identifier, a unit guessed from the
// words in it, and a slider range and step derived from the default value.
// Declared metadata always wins over these guesses.

/** Short forms agents use in parameter names, spelled out. */
const WORDS: Record<string, string> = {
  w: 'width', wd: 'width', h: 'height', ht: 'height', d: 'depth', t: 'thickness', thk: 'thickness',
  thick: 'thickness', l: 'length', len: 'length', r: 'radius', rad: 'radius', dia: 'diameter',
  diam: 'diameter', qty: 'quantity', cnt: 'count', num: 'number', ang: 'angle', clr: 'clearance',
  tol: 'tolerance', dist: 'distance', pos: 'position', rot: 'rotation', deg: 'degrees',
  min: 'minimum', max: 'maximum', clear: 'clearance',
};

/** Tokens kept as written: axis letters and short all-caps acronyms. */
const AXES = new Set(['x', 'y', 'z']);

function tokens(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .flatMap((part) => (/^[a-zA-Z]\d+$/.test(part) ? [part] : part.split(/(?<=[a-zA-Z])(?=\d)|(?<=\d)(?=[a-zA-Z])/)))
    .filter((part) => part.length > 0);
}

function word(token: string): string {
  const lower = token.toLowerCase();
  // M3, M4, R2: a thread or size designation.
  if (/^[a-zA-Z]\d+$/.test(token)) return token.toUpperCase();
  if (AXES.has(lower)) return lower.toUpperCase();
  if (token.length >= 2 && token === token.toUpperCase() && /[A-Z]/.test(token)) return token;
  return WORDS[lower] ?? lower;
}

/** `plateW` → "Plate width", `m4HeadDia` → "M4 head diameter", `wall_t` → "Wall thickness". */
export function humanizeParamName(name: string): string {
  const words = tokens(name).map(word);
  if (words.length === 0) return name;
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const ANGLE_WORDS = new Set(['angle', 'rotation', 'degrees', 'tilt', 'twist', 'draft', 'yaw', 'roll']);
const COUNT_WORDS = new Set(['count', 'number', 'quantity', 'teeth', 'segments', 'sides', 'steps', 'n', 'turns', 'ratio', 'scale', 'factor']);
const LENGTH_WORDS = new Set([
  'width', 'height', 'depth', 'thickness', 'length', 'radius', 'diameter', 'clearance', 'tolerance',
  'distance', 'offset', 'gap', 'spacing', 'size', 'wall', 'fillet', 'chamfer', 'overlap', 'margin',
  'inset', 'lip', 'bore', 'hole', 'span', 'x', 'y', 'z', 'position', 'pitch', 'pad', 'rim',
]);

/** Guess a unit from the words in a numeric parameter's name. kernelCAD
 *  models are in millimetres; angles are in degrees. */
export function guessUnit(name: string): string | undefined {
  const words = tokens(name).map((t) => word(t).toLowerCase());
  if (words.some((w) => ANGLE_WORDS.has(w))) return '°';
  if (words.some((w) => COUNT_WORDS.has(w))) return undefined;
  if (words.some((w) => LENGTH_WORDS.has(w))) return 'mm';
  return undefined;
}

/** True for names that count things (holes, teeth), which step by whole numbers. */
export function looksLikeCount(name: string): boolean {
  const words = tokens(name).map((t) => word(t).toLowerCase());
  return words.some((w) => COUNT_WORDS.has(w) && w !== 'ratio' && w !== 'scale' && w !== 'factor');
}

/** The smallest of 1, 2, 5 × 10^k that is ≥ `value` (value > 0). */
export function niceCeil(value: number): number {
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  for (const m of [1, 2, 5, 10]) {
    if (m * base >= value - 1e-9) return Number((m * base).toPrecision(12));
  }
  return 10 * base;
}

function decimals(value: number): number {
  const text = String(value);
  if (text.includes('e-')) return Number(text.split('e-')[1]);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

export interface SliderRange {
  min: number;
  max: number;
}

/** Declared bounds win. A missing side comes from the default: 0 up to a
 *  round number about twice the default (40 → 0–100), symmetric for a
 *  negative default, and 0–360 for an angle that starts at 0. */
export function sliderRange(
  defaultValue: number,
  declared: { min?: number; max?: number },
  unit?: string,
): SliderRange {
  const { min, max } = declared;
  if (min !== undefined && max !== undefined) return { min, max };
  if (min !== undefined) return { min, max: Math.max(min + 1, niceCeil(Math.max(Math.abs(defaultValue), Math.abs(min), 1) * 2)) };
  if (unit === '°' && defaultValue >= 0 && defaultValue <= 360) return { min: 0, max: max ?? 360 };
  const reach = niceCeil(Math.max(Math.abs(defaultValue) * 2, 1));
  const low = defaultValue < 0 ? -reach : 0;
  const high = max ?? reach;
  return { min: Math.min(low, high - 1), max: high };
}

/** A step that lands on the default: 1 for counts and whole defaults over a
 *  wide range, otherwise about a hundredth of the range, never coarser than
 *  the default's own decimals (30.2 → 0.1). */
export function sliderStep(defaultValue: number, range: SliderRange, isCount: boolean): number {
  if (isCount) return 1;
  const span = range.max - range.min;
  let step = span > 0 ? 10 ** Math.floor(Math.log10(span / 100)) : 1;
  if (Number.isInteger(defaultValue) && span >= 20) step = Math.max(step, 1);
  const own = 10 ** -decimals(defaultValue);
  if (own < step) step = own;
  return Number(step.toPrecision(6));
}
