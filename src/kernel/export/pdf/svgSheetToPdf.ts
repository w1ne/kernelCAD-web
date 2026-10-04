// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/pdf/svgSheetToPdf.ts
//
// Drawing-sheet SVG -> vector PDF. The `pdf-drawing` export renders the
// sheet through the svg-drawing pipeline (views, hidden lines, dimensions,
// GD&T, sections, title block) and this module transcribes that SVG into PDF
// drawing operators, so the SVG stays the single source of truth for the
// geometry and layout and the PDF is a second rendering of the same page.
//
// Supported SVG: <svg> with a mm viewBox; <g> with inherited presentation
// attributes (fill, stroke, stroke-width, stroke-dasharray, stroke-linecap,
// stroke-linejoin, fill-rule, font-size, font-weight, text-anchor, and the
// same keys inside `style`); transform (matrix, translate, scale, rotate,
// skewX, skewY) on any element; <path> with the full path grammar (arcs
// become cubic Béziers); <line>, <rect>, <circle>, <ellipse>, <polygon>,
// <polyline>; <text> with plain content; fills of a line-hatch <pattern>
// (rendered as a clipped set of parallel strokes). Anything else is skipped.
//
// Page space: the content stream first maps sheet millimetres with y down
// (the SVG user space) onto PDF points with y up, so every coordinate below
// is written in sheet mm exactly as the SVG carries it.

import { PDF_FONTS, pdfNum as n, writePdf, type PdfInfo } from './pdfDocument';
import { runAdvanceEm, textRuns } from './helveticaMetrics';
import { SYMBOL_STROKE_EM, symbolGlyph } from './symbolGlyphs';

export const PT_PER_MM = 72 / 25.4;

type Attrs = Record<string, string>;

interface XmlNode {
  tag: string;
  attrs: Attrs;
  children: XmlNode[];
  text: string;
}

// ---------------------------------------------------------------------------
// XML (the subset an exporter writes: elements, attributes, text, entities)
// ---------------------------------------------------------------------------

const decodeEntities = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|amp);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos') return "'";
    if (k === 'amp') return '&';
    return String.fromCodePoint(k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });

function parseAttrs(src: string): Attrs {
  const out: Attrs = {};
  for (const m of src.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out[m[1]] = decodeEntities(m[2] ?? m[3] ?? '');
  }
  return out;
}

/** Parse XML into a tree rooted at a synthetic `#document` node. */
function parseXml(src: string): XmlNode {
  const doc: XmlNode = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [doc];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  for (const m of src.matchAll(re)) {
    const top = stack[stack.length - 1];
    const [, cdata, closing, tag, attrSrc, selfClosing, text] = m;
    if (text !== undefined) {
      top.text += decodeEntities(text);
    } else if (cdata !== undefined) {
      top.text += cdata;
    } else if (tag !== undefined) {
      if (closing) {
        if (stack.length > 1) stack.pop();
      } else {
        const node: XmlNode = { tag, attrs: parseAttrs(attrSrc ?? ''), children: [], text: '' };
        top.children.push(node);
        if (!selfClosing) stack.push(node);
      }
    }
  }
  return doc;
}

// ---------------------------------------------------------------------------
// Transforms and colours
// ---------------------------------------------------------------------------

type Mat = [number, number, number, number, number, number];

function mul(a: Mat, b: Mat): Mat {
  // `b` applied first, then `a` (SVG transform lists compose left to right).
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

const deg = (v: number | undefined): number => ((v ?? 0) * Math.PI) / 180;

function rotation(v: readonly number[]): Mat {
  const a = deg(v[0]);
  const [cx, cy] = [v[1] ?? 0, v[2] ?? 0];
  const c = Math.cos(a), s = Math.sin(a);
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
}

/** One SVG transform function -> its matrix. */
const TRANSFORM_STEPS: Readonly<Record<string, (v: readonly number[]) => Mat>> = {
  matrix: v => [v[0] ?? 1, v[1] ?? 0, v[2] ?? 0, v[3] ?? 1, v[4] ?? 0, v[5] ?? 0],
  translate: v => [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0],
  scale: v => [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0],
  rotate: rotation,
  skewX: v => [1, 0, Math.tan(deg(v[0])), 1, 0, 0],
  skewY: v => [1, Math.tan(deg(v[0])), 0, 1, 0, 0],
};

/** Parse an SVG transform list; undefined when the attribute is absent or empty. */
export function parseTransform(src: string | undefined): Mat | undefined {
  if (src === undefined || src.trim() === '') return undefined;
  let m: Mat = [1, 0, 0, 1, 0, 0];
  for (const t of src.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const v = t[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    m = mul(m, TRANSFORM_STEPS[t[1]](v));
  }
  return m;
}

const NAMED_COLORS: Readonly<Record<string, [number, number, number]>> = {
  black: [0, 0, 0], white: [1, 1, 1], red: [1, 0, 0], green: [0, 0.502, 0], blue: [0, 0, 1],
  gray: [0.502, 0.502, 0.502], grey: [0.502, 0.502, 0.502],
};

/** RGB in 0..1 for `#rgb`, `#rrggbb`, `rgb(r,g,b)` or a basic colour name. */
export function parseColor(v: string): [number, number, number] | undefined {
  const s = v.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
  }
  const rgb = /^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/.exec(s);
  if (rgb) return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
  return NAMED_COLORS[s];
}

const colorOp = (c: [number, number, number], stroke: boolean): string =>
  `${n(c[0])} ${n(c[1])} ${n(c[2])} ${stroke ? 'RG' : 'rg'}`;

// ---------------------------------------------------------------------------
// Path geometry
// ---------------------------------------------------------------------------

interface Geometry {
  /** Path construction operators (m / l / c / h / re), no painting operator. */
  ops: string[];
  /** Bounds in user space, for hatch fills. */
  x0: number; y0: number; x1: number; y1: number;
}

function newGeometry(): Geometry {
  return { ops: [], x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
}

function grow(g: Geometry, x: number, y: number): void {
  if (x < g.x0) g.x0 = x;
  if (y < g.y0) g.y0 = y;
  if (x > g.x1) g.x1 = x;
  if (y > g.y1) g.y1 = y;
}

/** Endpoint-parameterised SVG arc -> cubic Béziers (each ≤ 90°). */
function arcToCubics(
  x1: number, y1: number, rxIn: number, ryIn: number, phiDeg: number,
  largeArc: boolean, sweep: boolean, x2: number, y2: number,
): number[][] {
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxIn), ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const phi = (phiDeg * Math.PI) / 180;
  const cp = Math.cos(phi), sp = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy;
  const y1p = -sp * dx + cp * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let coef = Math.sqrt(Math.max(0, num / den));
  if (largeArc === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2;
  const cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number): number =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const segs = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
  const delta = dt / segs;
  const k = (4 / 3) * Math.tan(delta / 4);
  const pt = (t: number): [number, number] => {
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    return [cx + cp * ex - sp * ey, cy + sp * ex + cp * ey];
  };
  const deriv = (t: number): [number, number] => {
    const ex = -rx * Math.sin(t), ey = ry * Math.cos(t);
    return [cp * ex - sp * ey, sp * ex + cp * ey];
  };
  const out: number[][] = [];
  for (let i = 0; i < segs; i++) {
    const a = t1 + i * delta, b = a + delta;
    const [ax, ay] = pt(a), [bx, by] = pt(b);
    const [dax, day] = deriv(a), [dbx, dby] = deriv(b);
    out.push([ax + k * dax, ay + k * day, bx - k * dbx, by - k * dby, bx, by]);
  }
  // Land exactly on the requested endpoint.
  const last = out[out.length - 1];
  last[4] = x2;
  last[5] = y2;
  return out;
}

/** Cursor over path data plus the current point and the reflection sources. */
class PathState {
  readonly g = newGeometry();
  private i = 0;
  cx = 0; cy = 0; sx = 0; sy = 0;
  /** Second control point of the previous C/S (for S), or undefined. */
  lastCubic: [number, number] | undefined;
  /** Control point of the previous Q/T (for T), or undefined. */
  lastQuad: [number, number] | undefined;
  private readonly tokens: RegExpMatchArray[];
  constructor(tokens: RegExpMatchArray[]) { this.tokens = tokens; }

  done(): boolean { return this.i >= this.tokens.length; }
  /** The command letter at the cursor (consumed), or undefined for a number. */
  command(): string | undefined {
    const c = this.tokens[this.i][1];
    if (c !== undefined) this.i++;
    return c;
  }
  skip(): void { this.i++; }
  hasNum(): boolean { return this.i < this.tokens.length && this.tokens[this.i][2] !== undefined; }
  num(): number { return Number(this.tokens[this.i++][2]); }

  moveTo(x: number, y: number): void {
    this.g.ops.push(`${n(x)} ${n(y)} m`);
    grow(this.g, x, y);
    this.cx = this.sx = x;
    this.cy = this.sy = y;
    this.lastCubic = this.lastQuad = undefined;
  }
  lineTo(x: number, y: number): void {
    this.g.ops.push(`${n(x)} ${n(y)} l`);
    grow(this.g, x, y);
    this.cx = x; this.cy = y;
    this.lastCubic = this.lastQuad = undefined;
  }
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
    this.g.ops.push(`${n(x1)} ${n(y1)} ${n(x2)} ${n(y2)} ${n(x)} ${n(y)} c`);
    grow(this.g, x1, y1); grow(this.g, x2, y2); grow(this.g, x, y);
    this.cx = x; this.cy = y;
    this.lastCubic = [x2, y2];
    this.lastQuad = undefined;
  }
  close(): void {
    this.g.ops.push('h');
    this.cx = this.sx; this.cy = this.sy;
    this.lastCubic = this.lastQuad = undefined;
  }
}

/** Consume one argument group of an (upper-cased) path command; `o` is the
 *  relative origin ([0, 0] for absolute commands). */
const PATH_COMMANDS: Readonly<Record<string, (st: PathState, o: [number, number]) => void>> = {
  M: (st, [ox, oy]) => st.moveTo(ox + st.num(), oy + st.num()),
  L: (st, [ox, oy]) => st.lineTo(ox + st.num(), oy + st.num()),
  H: (st, [ox]) => st.lineTo(ox + st.num(), st.cy),
  V: (st, [, oy]) => st.lineTo(st.cx, oy + st.num()),
  C: (st, [ox, oy]) => st.curveTo(ox + st.num(), oy + st.num(), ox + st.num(), oy + st.num(), ox + st.num(), oy + st.num()),
  S: (st, [ox, oy]) => {
    const r = st.lastCubic;
    const [x1, y1] = r ? [2 * st.cx - r[0], 2 * st.cy - r[1]] : [st.cx, st.cy];
    st.curveTo(x1, y1, ox + st.num(), oy + st.num(), ox + st.num(), oy + st.num());
  },
  Q: (st, [ox, oy]) => quadTo(st, ox + st.num(), oy + st.num(), ox + st.num(), oy + st.num()),
  T: (st, [ox, oy]) => {
    const r = st.lastQuad;
    const [qx, qy] = r ? [2 * st.cx - r[0], 2 * st.cy - r[1]] : [st.cx, st.cy];
    quadTo(st, qx, qy, ox + st.num(), oy + st.num());
  },
  A: (st, [ox, oy]) => {
    const rx = st.num(), ry = st.num(), rot = st.num();
    const large = st.num() !== 0, sweep = st.num() !== 0;
    const x = ox + st.num(), y = oy + st.num();
    for (const c of arcToCubics(st.cx, st.cy, rx, ry, rot, large, sweep, x, y)) {
      st.curveTo(c[0], c[1], c[2], c[3], c[4], c[5]);
    }
    st.lastCubic = undefined;
  },
};

/** Quadratic Bézier as the equivalent cubic. */
function quadTo(st: PathState, qx: number, qy: number, x: number, y: number): void {
  const { cx, cy } = st;
  st.curveTo(cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y);
  st.lastQuad = [qx, qy];
  st.lastCubic = undefined;
}

/** Parse SVG path data into PDF path construction operators. */
export function pathDataToGeometry(d: string): Geometry {
  const st = new PathState([...d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g)]);
  let cmd = '';
  while (!st.done()) {
    const next = st.command();
    if (next !== undefined) cmd = next;
    const upper = cmd.toUpperCase();
    if (upper === 'Z') {
      st.close();
      continue;
    }
    const handler = PATH_COMMANDS[upper];
    if (handler === undefined || !st.hasNum()) {
      if (next === undefined) st.skip(); // a stray number with no command
      continue;
    }
    const rel = cmd !== upper;
    // A command repeats while numbers follow; pairs after a moveto are linetos.
    while (st.hasNum()) {
      handler(st, rel ? [st.cx, st.cy] : [0, 0]);
      if (upper === 'M') {
        cmd = rel ? 'l' : 'L';
        break;
      }
    }
  }
  return st.g;
}

function ellipseGeometry(cx: number, cy: number, rx: number, ry: number): Geometry {
  const k = 0.5522847498;
  const g = newGeometry();
  g.ops.push(
    `${n(cx + rx)} ${n(cy)} m`,
    `${n(cx + rx)} ${n(cy + k * ry)} ${n(cx + k * rx)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)} c`,
    `${n(cx - k * rx)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + k * ry)} ${n(cx - rx)} ${n(cy)} c`,
    `${n(cx - rx)} ${n(cy - k * ry)} ${n(cx - k * rx)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)} c`,
    `${n(cx + k * rx)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - k * ry)} ${n(cx + rx)} ${n(cy)} c`,
    'h',
  );
  grow(g, cx - rx, cy - ry);
  grow(g, cx + rx, cy + ry);
  return g;
}

function polyGeometry(points: string, closed: boolean): Geometry {
  const v = points.trim().split(/[\s,]+/).filter(Boolean).map(Number);
  const g = newGeometry();
  for (let i = 0; i + 1 < v.length; i += 2) {
    g.ops.push(`${n(v[i])} ${n(v[i + 1])} ${i === 0 ? 'm' : 'l'}`);
    grow(g, v[i], v[i + 1]);
  }
  if (closed && g.ops.length > 0) g.ops.push('h');
  return g;
}

// ---------------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------------

/** Presentation attributes that inherit from a <g> to its children. */
const INHERITED = [
  'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap',
  'stroke-linejoin', 'fill-rule', 'font-size', 'font-weight', 'text-anchor',
] as const;

/** A line-hatch pattern: parallel strokes `spacing` apart at `angleDeg`. */
interface Hatch {
  spacing: number;
  angleDeg: number;
  lineWidth: number;
  color: [number, number, number];
}

interface RenderContext {
  out: string[];
  hatches: Map<string, Hatch>;
  /** href of the enclosing <a>, if any. */
  href?: string;
  /** Link areas in sheet mm (y down): [x0, y0, x1, y1]. */
  links: Array<{ rect: [number, number, number, number]; uri: string }>;
}

function num(v: string | undefined, fallback = 0): number {
  const x = v === undefined ? NaN : parseFloat(v);
  return Number.isFinite(x) ? x : fallback;
}

/** Resolve the element's effective style: inherited keys, then its own
 *  attributes, then its `style` declarations. */
function effectiveStyle(inherited: Attrs, attrs: Attrs): Attrs {
  const style: Attrs = { ...inherited };
  for (const k of INHERITED) if (attrs[k] !== undefined) style[k] = attrs[k];
  if (attrs.style !== undefined) {
    for (const decl of attrs.style.split(';')) {
      const [k, v] = decl.split(':').map(s => s?.trim());
      if (k && v && (INHERITED as readonly string[]).includes(k)) style[k] = v;
    }
  }
  return style;
}

function strokeState(style: Attrs): string {
  const ops: string[] = [];
  const c = parseColor(style.stroke ?? '') ?? [0, 0, 0];
  ops.push(colorOp(c, true));
  ops.push(`${n(num(style['stroke-width'], 1))} w`);
  const dash = style['stroke-dasharray'];
  const dashes = dash === undefined || dash === 'none'
    ? []
    : dash.trim().split(/[\s,]+/).map(Number).filter(v => Number.isFinite(v) && v >= 0);
  ops.push(dashes.length > 0 && dashes.some(v => v > 0)
    ? `[${dashes.map(n).join(' ')}] ${n(num(style['stroke-dashoffset']))} d`
    : '[] 0 d');
  const cap = style['stroke-linecap'];
  ops.push(`${cap === 'round' ? 1 : cap === 'square' ? 2 : 0} J`);
  const join = style['stroke-linejoin'];
  ops.push(`${join === 'round' ? 1 : join === 'bevel' ? 2 : 0} j`);
  return ops.join(' ');
}

/** Hatch strokes covering the geometry's bounds (the caller clips). */
function hatchLines(g: Geometry, h: Hatch): string {
  const a = (h.angleDeg * Math.PI) / 180;
  // Pattern lines run along the pattern's y axis; offsets step along its x axis.
  const nx = Math.cos(a), ny = Math.sin(a);
  const dx = -ny, dy = nx;
  const corners: Array<[number, number]> = [[g.x0, g.y0], [g.x1, g.y0], [g.x0, g.y1], [g.x1, g.y1]];
  const along = corners.map(([x, y]) => x * nx + y * ny);
  const across = corners.map(([x, y]) => x * dx + y * dy);
  const k0 = Math.floor(Math.min(...along) / h.spacing);
  const k1 = Math.ceil(Math.max(...along) / h.spacing);
  const t0 = Math.min(...across), t1 = Math.max(...across);
  const ops: string[] = [];
  for (let k = k0; k <= k1; k++) {
    const o = k * h.spacing;
    ops.push(`${n(o * nx + t0 * dx)} ${n(o * ny + t0 * dy)} m ${n(o * nx + t1 * dx)} ${n(o * ny + t1 * dy)} l`);
  }
  return ops.join(' ');
}

/** Resolved paint of one shape: hatch pattern, solid fill colour, stroke. */
interface Paint {
  hatch: Hatch | undefined;
  fill: [number, number, number] | undefined;
  stroke: boolean;
  evenOdd: boolean;
}

function resolvePaint(ctx: RenderContext, style: Attrs, canFill: boolean): Paint {
  const fillValue = canFill ? (style.fill ?? '#000').trim() : 'none';
  const strokeValue = (style.stroke ?? 'none').trim();
  const urlRef = /^url\(\s*#([^)\s]+)\s*\)$/.exec(fillValue);
  return {
    hatch: urlRef ? ctx.hatches.get(urlRef[1]) : undefined,
    fill: urlRef || fillValue === 'none' ? undefined : parseColor(fillValue),
    stroke: strokeValue !== 'none' && parseColor(strokeValue) !== undefined,
    evenOdd: style['fill-rule'] === 'evenodd',
  };
}

/** PDF painting operator for a fill and/or stroke. */
function paintOperator(fill: boolean, stroke: boolean, evenOdd: boolean): string {
  const star = evenOdd ? '*' : '';
  if (fill && stroke) return `B${star}`;
  return fill ? `f${star}` : 'S';
}

function paintGeometry(ctx: RenderContext, g: Geometry, style: Attrs, canFill: boolean): void {
  if (g.ops.length === 0) return;
  const paint = resolvePaint(ctx, style, canFill);
  const path = g.ops.join(' ');
  if (paint.hatch !== undefined && Number.isFinite(g.x0)) {
    const h = paint.hatch;
    ctx.out.push(
      `q ${path} ${paint.evenOdd ? 'W*' : 'W'} n ${colorOp(h.color, true)} ${n(h.lineWidth)} w [] 0 d 0 J ` +
      `${hatchLines(g, h)} S Q`,
    );
  }
  if (paint.fill === undefined && !paint.stroke) return;
  const state: string[] = [];
  if (paint.fill !== undefined) state.push(colorOp(paint.fill, false));
  if (paint.stroke) state.push(strokeState(style));
  ctx.out.push(`q ${state.join(' ')} ${path} ${paintOperator(paint.fill !== undefined, paint.stroke, paint.evenOdd)} Q`);
}

const hexCodes = (codes: readonly number[]): string =>
  `<${codes.map(c => c.toString(16).padStart(2, '0')).join('')}>`;

function isBold(weight: string | undefined): boolean {
  return weight === 'bold' || weight === 'bolder' || num(weight, 400) >= 600;
}

/** How far text-anchor moves the start of a run of `width`. */
function anchorShift(anchor: string | undefined, width: number): number {
  if (anchor === 'middle') return width / 2;
  return anchor === 'end' ? width : 0;
}

function paintText(ctx: RenderContext, node: XmlNode, style: Attrs): void {
  const content = node.text.replace(/\s+/g, ' ').trim();
  if (content === '') return;
  const fill = (style.fill ?? '#000').trim();
  const color = fill === 'none' ? undefined : parseColor(fill);
  if (color === undefined) return;
  const size = num(style['font-size'], 16);
  const bold = isBold(style['font-weight']);
  const font = bold ? PDF_FONTS.bold : PDF_FONTS.regular;
  const runs = textRuns(content);
  const width = runs.reduce((w, r) => w + runAdvanceEm(r, bold), 0) * size;
  let x = num(node.attrs.x) + num(node.attrs.dx) - anchorShift(style['text-anchor'], width);
  const y = num(node.attrs.y) + num(node.attrs.dy);
  if (ctx.href !== undefined && node.attrs.transform === undefined) {
    // Link area: the text's advance box, ascender to descender.
    ctx.links.push({ rect: [x, y - 0.8 * size, x + width, y + 0.25 * size], uri: ctx.href });
  }
  const ops: string[] = [colorOp(color, false), colorOp(color, true)];
  for (const run of runs) {
    if (run.kind === 'text') {
      ops.push(`BT /${font} ${n(size)} Tf 1 0 0 -1 ${n(x)} ${n(y)} Tm ${hexCodes(run.codes)} Tj ET`);
    } else {
      ops.push(symbolOps(run.ch, x, y, size));
    }
    x += runAdvanceEm(run, bold) * size;
  }
  ctx.out.push(`q ${ops.join(' ')} Q`);
}

/** A vector symbol glyph at baseline-left (x, y), `size` mm per em. */
function symbolOps(ch: string, x: number, y: number, size: number): string {
  const glyph = symbolGlyph(ch) ?? [];
  const ops: string[] = [`q ${n(size)} 0 0 ${n(-size)} ${n(x)} ${n(y)} cm ${n(SYMBOL_STROKE_EM)} w [] 0 d 1 J 1 j`];
  for (const p of glyph) {
    if (p.kind === 'poly') {
      const pts = p.pts.map(([px, py], i) => `${n(px)} ${n(py)} ${i === 0 ? 'm' : 'l'}`).join(' ');
      ops.push(`${pts}${p.closed ? ' h' : ''} S`);
    } else if (p.kind === 'circle') {
      ops.push(`${ellipseGeometry(p.c[0], p.c[1], p.r, p.r).ops.join(' ')} S`);
    } else {
      const [code] = textRuns(p.ch).flatMap(r => (r.kind === 'text' ? r.codes : []));
      ops.push(`BT /${PDF_FONTS.regular} ${n(p.size)} Tf 1 0 0 1 ${n(p.at[0])} ${n(p.at[1])} Tm ${hexCodes([code ?? 0x3f])} Tj ET`);
    }
  }
  ops.push('Q');
  return ops.join(' ');
}

/** Collect line-hatch <pattern>s (one <line> child) by id. */
function collectHatches(node: XmlNode, into: Map<string, Hatch>): void {
  if (node.tag === 'pattern' && node.attrs.id !== undefined) {
    const line = node.children.find(c => c.tag === 'line');
    const rot = /rotate\(\s*([-+\d.eE]+)/.exec(node.attrs.patternTransform ?? '');
    if (line !== undefined) {
      const vertical = num(line.attrs.x1) === num(line.attrs.x2);
      into.set(node.attrs.id, {
        spacing: num(vertical ? node.attrs.width : node.attrs.height, 2),
        angleDeg: (rot ? Number(rot[1]) : 0) + (vertical ? 0 : 90),
        lineWidth: num(line.attrs['stroke-width'], 0.2),
        color: parseColor(line.attrs.stroke ?? '#000') ?? [0, 0, 0],
      });
    }
  }
  for (const c of node.children) collectHatches(c, into);
}

function lineGeometry(a: Attrs): Geometry {
  const g = newGeometry();
  const [x1, y1, x2, y2] = [num(a.x1), num(a.y1), num(a.x2), num(a.y2)];
  g.ops.push(`${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l`);
  grow(g, x1, y1);
  grow(g, x2, y2);
  return g;
}

function rectGeometry(a: Attrs): Geometry | undefined {
  const [x, y, w, h] = [num(a.x), num(a.y), num(a.width), num(a.height)];
  if (!(w > 0 && h > 0)) return undefined;
  const g = newGeometry();
  g.ops.push(`${n(x)} ${n(y)} ${n(w)} ${n(h)} re`);
  grow(g, x, y);
  grow(g, x + w, y + h);
  return g;
}

/** Geometry builders for the basic shapes; undefined means nothing to draw. */
const SHAPES: Readonly<Record<string, (a: Attrs) => Geometry | undefined>> = {
  path: a => pathDataToGeometry(a.d ?? ''),
  line: lineGeometry,
  rect: rectGeometry,
  circle: a => (num(a.r) > 0 ? ellipseGeometry(num(a.cx), num(a.cy), num(a.r), num(a.r)) : undefined),
  ellipse: a => (num(a.rx) > 0 && num(a.ry) > 0 ? ellipseGeometry(num(a.cx), num(a.cy), num(a.rx), num(a.ry)) : undefined),
  polygon: a => polyGeometry(a.points ?? '', true),
  polyline: a => polyGeometry(a.points ?? '', false),
};

function renderNode(ctx: RenderContext, node: XmlNode, inherited: Attrs): void {
  const style = effectiveStyle(inherited, node.attrs);
  const m = node.tag === 'svg' ? undefined : parseTransform(node.attrs.transform);
  if (m !== undefined) ctx.out.push(`q ${m.map(n).join(' ')} cm`);
  const shape = SHAPES[node.tag];
  if (node.tag === 'svg' || node.tag === 'g') {
    for (const c of node.children) renderNode(ctx, c, style);
  } else if (node.tag === 'a') {
    const outer = ctx.href;
    ctx.href = node.attrs.href ?? node.attrs['xlink:href'] ?? outer;
    for (const c of node.children) renderNode(ctx, c, style);
    ctx.href = outer;
  } else if (node.tag === 'text') {
    paintText(ctx, node, style);
  } else if (shape !== undefined) {
    const g = shape(node.attrs);
    // A <line> has no interior: SVG never fills it.
    if (g !== undefined) paintGeometry(ctx, g, style, node.tag !== 'line');
  }
  // defs, pattern, title, metadata and unknown elements are not painted.
  if (m !== undefined) ctx.out.push('Q');
}

export interface SvgSheetPage {
  widthMm: number;
  heightMm: number;
  /** PDF content stream drawing the sheet. */
  content: string;
  /** <a href> link areas in sheet mm (y down): [x0, y0, x1, y1]. */
  links: Array<{ rect: [number, number, number, number]; uri: string }>;
}

/** Transcribe one SVG sheet into a PDF page content stream. */
export function svgSheetToPdfPage(svg: string): SvgSheetPage {
  const doc = parseXml(svg);
  const root = doc.children.find(c => c.tag === 'svg');
  if (root === undefined) throw new Error('svgSheetToPdf: no <svg> root element');
  const vb = (root.attrs.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  const [vx, vy, vw, vh] = vb.length === 4 && vb.every(Number.isFinite)
    ? vb
    : [0, 0, num(root.attrs.width), num(root.attrs.height)];
  if (!(vw > 0 && vh > 0)) throw new Error('svgSheetToPdf: the <svg> root needs a positive viewBox');
  const hatches = new Map<string, Hatch>();
  collectHatches(root, hatches);
  const ctx: RenderContext = {
    // Sheet mm, y down -> PDF points, y up.
    out: [`${n(PT_PER_MM)} 0 0 ${n(-PT_PER_MM)} ${n(-vx * PT_PER_MM)} ${n((vh + vy) * PT_PER_MM)} cm`],
    hatches,
    links: [],
  };
  renderNode(ctx, root, { fill: '#000' });
  return { widthMm: vw, heightMm: vh, content: ctx.out.join('\n'), links: ctx.links };
}

/** Transcribe SVG sheets into a PDF file, one page per sheet. */
export function svgSheetsToPdf(svgs: readonly string[], info: PdfInfo = {}, compress = true): Uint8Array {
  const pages = svgs.map(svgSheetToPdfPage).map(p => ({
    widthPt: p.widthMm * PT_PER_MM,
    heightPt: p.heightMm * PT_PER_MM,
    content: p.content,
    // Sheet mm, y down -> points, y up (a viewBox origin other than 0 0 is not used by sheets).
    links: p.links.map(l => ({
      rect: [l.rect[0] * PT_PER_MM, (p.heightMm - l.rect[3]) * PT_PER_MM, l.rect[2] * PT_PER_MM, (p.heightMm - l.rect[1]) * PT_PER_MM] as const,
      uri: l.uri,
    })),
  }));
  return writePdf(pages, info, compress);
}
