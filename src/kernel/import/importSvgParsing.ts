// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importSvgParsing.ts
//
// Low-level parsing primitives for the SVG reader: the parse error type,
// affine-transform algebra, tag scanning, transform-list parsing, length
// units, path number scanning and viewBox parsing. Split out of importSvg.ts
// purely to keep that file under the file-length ratchet; behaviour is
// unchanged.

import { MM_PER_UNIT, isLengthUnit, LENGTH_UNIT_NAMES } from './lengthUnits';

export type SvgParseFailure =
  | 'empty'
  | 'not-svg'
  | 'unsupported-element'
  | 'unsupported-command'
  | 'malformed-attribute'
  | 'malformed-path'
  | 'bad-units'
  | 'contour';

export class SvgParseError extends Error {
  readonly reason: SvgParseFailure;
  constructor(reason: SvgParseFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'SvgParseError';
  }
}

// ---------------------------------------------------------------------------
// Affine transforms
// ---------------------------------------------------------------------------

/** `[a, b, c, d, e, f]`, mapping (x, y) to (ax + cy + e, bx + dy + f). */
export type Matrix = readonly [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** `m1 ∘ m2` — m2 applied first. */
export function mul(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function det(m: Matrix): number {
  return m[0] * m[3] - m[1] * m[2];
}

/**
 * A similarity maps circles to circles — equal column norms and orthogonal
 * columns. Only under a similarity can a circular arc stay a circular arc,
 * which is what decides between the exact bulge path and flattening.
 */
export function isSimilarity(m: Matrix): boolean {
  const cx = Math.hypot(m[0], m[1]);
  const cy = Math.hypot(m[2], m[3]);
  if (cx === 0 || cy === 0) return false;
  const scaleRel = Math.abs(cx - cy) / Math.max(cx, cy);
  const ortho = Math.abs(m[0] * m[2] + m[1] * m[3]) / (cx * cy);
  return scaleRel < 1e-9 && ortho < 1e-9;
}

/** Uniform scale factor of a similarity; the RMS scale otherwise (used only for tolerances). */
export function scaleOf(m: Matrix): number {
  return Math.sqrt(Math.abs(det(m))) || Math.hypot(m[0], m[1]);
}

const TRANSFORM_FN = /([a-zA-Z]+)\s*\(([^)]*)\)/g;

export function parseTransform(spec: string, where: string): Matrix {
  let out: Matrix = IDENTITY;
  TRANSFORM_FN.lastIndex = 0;
  let m: RegExpExecArray | null;
  let matched = 0;
  while ((m = TRANSFORM_FN.exec(spec)) !== null) {
    matched++;
    const name = m[1];
    const args = m[2].trim().split(/[\s,]+/).filter(s => s !== '').map(Number);
    if (args.some(v => !Number.isFinite(v))) {
      throw new SvgParseError(
        'malformed-attribute',
        `${where}: transform '${name}(${m[2].trim()})' has a non-numeric argument.`,
      );
    }
    let step: Matrix;
    switch (name) {
      case 'translate':
        step = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
        break;
      case 'scale':
        step = [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0];
        break;
      case 'rotate': {
        const a = ((args[0] ?? 0) * Math.PI) / 180;
        const rot: Matrix = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        if (args.length >= 3) {
          step = mul(mul([1, 0, 0, 1, args[1], args[2]], rot), [1, 0, 0, 1, -args[1], -args[2]]);
        } else {
          step = rot;
        }
        break;
      }
      case 'matrix':
        if (args.length !== 6) {
          throw new SvgParseError(
            'malformed-attribute',
            `${where}: transform 'matrix' needs 6 numbers, got ${args.length}.`,
          );
        }
        step = [args[0], args[1], args[2], args[3], args[4], args[5]];
        break;
      default:
        // skewX/skewY are representable as a matrix, but they are rare enough
        // in exported CAD profiles that supporting them untested would be a
        // worse trade than naming them.
        throw new SvgParseError(
          'unsupported-element',
          `${where}: transform function '${name}(...)' is not supported. ` +
            'Supported: translate, scale, rotate, matrix. Flatten the transform in the source tool.',
        );
    }
    out = mul(out, step);
  }
  if (matched === 0 && spec.trim() !== '') {
    throw new SvgParseError(
      'malformed-attribute',
      `${where}: transform='${spec.trim()}' is not a sequence of transform functions.`,
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tag scanning
// ---------------------------------------------------------------------------

export interface Tag {
  name: string;
  attrs: Record<string, string>;
  closing: boolean;
  selfClosing: boolean;
  /** Character offset of the `<`, quoted in diagnostics. */
  offset: number;
}

const ATTR = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

export function scanTags(text: string): Tag[] {
  const tags: Tag[] = [];
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt === -1) break;
    if (text.startsWith('<!--', lt)) {
      const end = text.indexOf('-->', lt);
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', lt)) {
      const end = text.indexOf(']]>', lt);
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith('<!', lt) || text.startsWith('<?', lt)) {
      const end = text.indexOf('>', lt);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    const gt = text.indexOf('>', lt);
    if (gt === -1) break;
    const body = text.slice(lt + 1, gt);
    const closing = body.startsWith('/');
    const selfClosing = body.endsWith('/');
    const nameMatch = /^\/?\s*([A-Za-z_:][-A-Za-z0-9_:.]*)/.exec(body);
    if (nameMatch) {
      const attrs: Record<string, string> = {};
      ATTR.lastIndex = 0;
      let a: RegExpExecArray | null;
      const attrText = body.slice(nameMatch[0].length);
      while ((a = ATTR.exec(attrText)) !== null) {
        // Namespace prefixes carry no geometry meaning here; `sodipodi:cx`
        // and `cx` must not collide, so keep the raw name and read locals.
        attrs[a[1]] = a[3] ?? a[4] ?? '';
      }
      tags.push({
        name: nameMatch[1].replace(/^.*:/, ''),
        attrs,
        closing,
        selfClosing,
        offset: lt,
      });
    }
    i = gt + 1;
  }
  return tags;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

const LENGTH_WITH_UNIT = /^\s*(-?[0-9.eE+-]+)\s*([a-z%]*)\s*$/;

/** Parse an SVG length like `120mm`, `4.5in`, `800` (px) into millimetres. */
export function lengthToMm(raw: string, where: string): number | null {
  const m = LENGTH_WITH_UNIT.exec(raw);
  if (!m) return null;
  const v = Number(m[1]);
  if (!Number.isFinite(v)) return null;
  const suffix = m[2];
  if (suffix === '' || suffix === 'px') return v * MM_PER_UNIT.px;
  if (suffix === '%') {
    // A percentage width is relative to a viewport this importer does not
    // have, so it cannot be turned into millimetres. Say so.
    throw new SvgParseError(
      'bad-units',
      `${where}: a percentage length ('${raw.trim()}') has no absolute size outside a viewport. ` +
        'Give the <svg> an absolute width (e.g. width="120mm") or pass opts.units.',
    );
  }
  if (!isLengthUnit(suffix)) {
    throw new SvgParseError(
      'bad-units',
      `${where}: unknown length unit '${suffix}' in '${raw.trim()}' ` +
        `(known: ${LENGTH_UNIT_NAMES.join(', ')}).`,
    );
  }
  return v * MM_PER_UNIT[suffix];
}

// ---------------------------------------------------------------------------
// Path number scanning
// ---------------------------------------------------------------------------

function skipDigitsAt(d: string, start: number): number {
  let i = start;
  while (i < d.length && /[0-9]/.test(d[i])) i++;
  return i;
}

function skipExponentAt(d: string, start: number): number {
  if (d[start] !== 'e' && d[start] !== 'E') return start;
  let i = start + 1;
  if (d[i] === '+' || d[i] === '-') i++;
  if (/[0-9]/.test(d[i] ?? '')) return skipDigitsAt(d, i);
  return start;
}

/**
 * Advance past one SVG number token starting at `start`, returning the new
 * index. Character positions are the contract: arc flags can run together
 * with the following number, so the caller validates the scanned slice.
 */
export function scanNumberAt(d: string, start: number): number {
  let i = start;
  if (d[i] === '+' || d[i] === '-') i++;
  i = skipDigitsAt(d, i);
  if (d[i] === '.') {
    i = skipDigitsAt(d, i + 1);
  }
  return skipExponentAt(d, i);
}

export interface ViewBox { minX: number; minY: number; width: number; height: number }

export function parseViewBox(raw: string | undefined): ViewBox | null {
  if (raw === undefined) return null;
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some(v => !Number.isFinite(v))) {
    throw new SvgParseError(
      'malformed-attribute',
      `<svg>: viewBox='${raw}' must be four numbers (min-x min-y width height).`,
    );
  }
  if (parts[2] <= 0 || parts[3] <= 0) {
    throw new SvgParseError(
      'malformed-attribute',
      `<svg>: viewBox width and height must be positive, got ${parts[2]} x ${parts[3]}.`,
    );
  }
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}
