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

/** Parse an SVG transform list; undefined when absent or identity-free. */
export function parseTransform(src: string | undefined): Mat | undefined {
  if (src === undefined || src.trim() === '') return undefined;
  let m: Mat = [1, 0, 0, 1, 0, 0];
  for (const t of src.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const v = t[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    let step: Mat;
    switch (t[1]) {
      case 'matrix':
        step = [v[0] ?? 1, v[1] ?? 0, v[2] ?? 0, v[3] ?? 1, v[4] ?? 0, v[5] ?? 0];
        break;
      case 'translate':
        step = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0];
        break;
      case 'scale':
        step = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
        break;
      case 'rotate': {
        const a = ((v[0] ?? 0) * Math.PI) / 180;
        const [cx, cy] = [v[1] ?? 0, v[2] ?? 0];
        const c = Math.cos(a), s = Math.sin(a);
        step = [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
        break;
      }
      case 'skewX':
        step = [1, 0, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
        break;
      default:
        step = [1, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
    }
    m = mul(m, step);
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

/** Parse SVG path data into PDF path construction operators. */
export function pathDataToGeometry(d: string): Geometry {
  const g = newGeometry();
  const tokens = [...d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g)];
  let i = 0;
  let cmd = '';
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let lastCubic: [number, number] | undefined; // reflected control point source
  let lastQuad: [number, number] | undefined;
  const num = (): number => Number(tokens[i++][2]);
  const hasNum = (): boolean => i < tokens.length && tokens[i][2] !== undefined;
  const flag = (): boolean => num() !== 0;
  const move = (x: number, y: number) => { g.ops.push(`${n(x)} ${n(y)} m`); grow(g, x, y); };
  const line = (x: number, y: number) => { g.ops.push(`${n(x)} ${n(y)} l`); grow(g, x, y); };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    g.ops.push(`${n(x1)} ${n(y1)} ${n(x2)} ${n(y2)} ${n(x)} ${n(y)} c`);
    grow(g, x1, y1); grow(g, x2, y2); grow(g, x, y);
  };

  while (i < tokens.length) {
    if (tokens[i][1] !== undefined) {
      cmd = tokens[i][1]!;
      i++;
    } else if (cmd === '') {
      i++;
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') {
      g.ops.push('h');
      cx = sx; cy = sy;
      lastCubic = lastQuad = undefined;
      continue;
    }
    // Every other command repeats while numbers follow.
    do {
      if (!hasNum()) break;
      const ox = rel ? cx : 0, oy = rel ? cy : 0;
      switch (C) {
        case 'M': {
          cx = ox + num(); cy = oy + num();
          sx = cx; sy = cy;
          move(cx, cy);
          cmd = rel ? 'l' : 'L'; // subsequent pairs are implicit lineto
          lastCubic = lastQuad = undefined;
          break;
        }
        case 'L':
          cx = ox + num(); cy = oy + num();
          line(cx, cy);
          lastCubic = lastQuad = undefined;
          break;
        case 'H':
          cx = (rel ? cx : 0) + num();
          line(cx, cy);
          lastCubic = lastQuad = undefined;
          break;
        case 'V':
          cy = (rel ? cy : 0) + num();
          line(cx, cy);
          lastCubic = lastQuad = undefined;
          break;
        case 'C': {
          const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num();
          cx = ox + num(); cy = oy + num();
          cubic(x1, y1, x2, y2, cx, cy);
          lastCubic = [x2, y2]; lastQuad = undefined;
          break;
        }
        case 'S': {
          const [rx1, ry1] = lastCubic ? [2 * cx - lastCubic[0], 2 * cy - lastCubic[1]] : [cx, cy];
          const x2 = ox + num(), y2 = oy + num();
          cx = ox + num(); cy = oy + num();
          cubic(rx1, ry1, x2, y2, cx, cy);
          lastCubic = [x2, y2]; lastQuad = undefined;
          break;
        }
        case 'Q':
        case 'T': {
          const [qx, qy] = C === 'Q'
            ? [ox + num(), oy + num()]
            : lastQuad ? [2 * cx - lastQuad[0], 2 * cy - lastQuad[1]] : [cx, cy];
          const x = ox + num(), y = oy + num();
          cubic(cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y);
          cx = x; cy = y;
          lastQuad = [qx, qy]; lastCubic = undefined;
          break;
        }
        case 'A': {
          const rx = num(), ry = num(), rot = num();
          const large = flag(), sweep = flag();
          const x = ox + num(), y = oy + num();
          for (const c of arcToCubics(cx, cy, rx, ry, rot, large, sweep, x, y)) {
            cubic(c[0], c[1], c[2], c[3], c[4], c[5]);
          }
          cx = x; cy = y;
          lastCubic = lastQuad = undefined;
          break;
        }
        default:
          i++;
      }
    } while (hasNum());
  }
  return g;
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

function paintGeometry(ctx: RenderContext, g: Geometry, style: Attrs, canFill: boolean): void {
  if (g.ops.length === 0) return;
  const fillValue = canFill ? (style.fill ?? '#000').trim() : 'none';
  const strokeValue = (style.stroke ?? 'none').trim();
  const evenOdd = style['fill-rule'] === 'evenodd';
  const path = g.ops.join(' ');
  const urlRef = /^url\(\s*#([^)\s]+)\s*\)$/.exec(fillValue);
  const hatch = urlRef ? ctx.hatches.get(urlRef[1]) : undefined;
  const fillColor = urlRef ? undefined : fillValue === 'none' ? undefined : parseColor(fillValue);
  const doStroke = strokeValue !== 'none' && parseColor(strokeValue) !== undefined;

  if (hatch !== undefined && Number.isFinite(g.x0)) {
    ctx.out.push(
      `q ${path} ${evenOdd ? 'W*' : 'W'} n ${colorOp(hatch.color, true)} ${n(hatch.lineWidth)} w [] 0 d 0 J ` +
      `${hatchLines(g, hatch)} S Q`,
    );
  }
  if (fillColor === undefined && !doStroke) return;
  const state: string[] = [];
  if (fillColor !== undefined) state.push(colorOp(fillColor, false));
  if (doStroke) state.push(strokeState(style));
  const op = fillColor !== undefined && doStroke ? (evenOdd ? 'B*' : 'B') : fillColor !== undefined ? (evenOdd ? 'f*' : 'f') : 'S';
  ctx.out.push(`q ${state.join(' ')} ${path} ${op} Q`);
}

const hexCodes = (codes: readonly number[]): string =>
  `<${codes.map(c => c.toString(16).padStart(2, '0')).join('')}>`;

function paintText(ctx: RenderContext, node: XmlNode, style: Attrs): void {
  const content = node.text.replace(/\s+/g, ' ').trim();
  if (content === '') return;
  const fill = (style.fill ?? '#000').trim();
  const color = fill === 'none' ? undefined : parseColor(fill);
  if (color === undefined) return;
  const size = num(style['font-size'], 16);
  const weight = style['font-weight'] ?? 'normal';
  const bold = weight === 'bold' || weight === 'bolder' || num(weight, 400) >= 600;
  const font = bold ? PDF_FONTS.bold : PDF_FONTS.regular;
  const runs = textRuns(content);
  const width = runs.reduce((w, r) => w + runAdvanceEm(r, bold), 0) * size;
  const anchor = style['text-anchor'] ?? 'start';
  let x = num(node.attrs.x) + num(node.attrs.dx) - (anchor === 'middle' ? width / 2 : anchor === 'end' ? width : 0);
  const y = num(node.attrs.y) + num(node.attrs.dy);
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

function renderNode(ctx: RenderContext, node: XmlNode, inherited: Attrs): void {
  const style = effectiveStyle(inherited, node.attrs);
  const m = node.tag === 'svg' ? undefined : parseTransform(node.attrs.transform);
  if (m !== undefined) ctx.out.push(`q ${m.map(n).join(' ')} cm`);
  const a = node.attrs;
  switch (node.tag) {
    case 'svg':
    case 'g':
      for (const c of node.children) renderNode(ctx, c, style);
      break;
    case 'path':
      paintGeometry(ctx, pathDataToGeometry(a.d ?? ''), style, true);
      break;
    case 'line': {
      const g = newGeometry();
      g.ops.push(`${n(num(a.x1))} ${n(num(a.y1))} m ${n(num(a.x2))} ${n(num(a.y2))} l`);
      grow(g, num(a.x1), num(a.y1));
      grow(g, num(a.x2), num(a.y2));
      paintGeometry(ctx, g, style, false);
      break;
    }
    case 'rect': {
      const w = num(a.width), h = num(a.height);
      if (w > 0 && h > 0) {
        const g = newGeometry();
        g.ops.push(`${n(num(a.x))} ${n(num(a.y))} ${n(w)} ${n(h)} re`);
        grow(g, num(a.x), num(a.y));
        grow(g, num(a.x) + w, num(a.y) + h);
        paintGeometry(ctx, g, style, true);
      }
      break;
    }
    case 'circle':
      if (num(a.r) > 0) paintGeometry(ctx, ellipseGeometry(num(a.cx), num(a.cy), num(a.r), num(a.r)), style, true);
      break;
    case 'ellipse':
      if (num(a.rx) > 0 && num(a.ry) > 0) {
        paintGeometry(ctx, ellipseGeometry(num(a.cx), num(a.cy), num(a.rx), num(a.ry)), style, true);
      }
      break;
    case 'polygon':
    case 'polyline':
      paintGeometry(ctx, polyGeometry(a.points ?? '', node.tag === 'polygon'), style, true);
      break;
    case 'text':
      paintText(ctx, node, style);
      break;
    default:
      // defs, pattern, title, metadata, unknown elements: not painted.
      break;
  }
  if (m !== undefined) ctx.out.push('Q');
}

export interface SvgSheetPage {
  widthMm: number;
  heightMm: number;
  /** PDF content stream drawing the sheet. */
  content: string;
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
  };
  renderNode(ctx, root, { fill: '#000' });
  return { widthMm: vw, heightMm: vh, content: ctx.out.join('\n') };
}

/** Transcribe SVG sheets into a PDF file, one page per sheet. */
export function svgSheetsToPdf(svgs: readonly string[], info: PdfInfo = {}, compress = true): Uint8Array {
  const pages = svgs.map(svgSheetToPdfPage).map(p => ({
    widthPt: p.widthMm * PT_PER_MM,
    heightPt: p.heightMm * PT_PER_MM,
    content: p.content,
  }));
  return writePdf(pages, info, compress);
}
