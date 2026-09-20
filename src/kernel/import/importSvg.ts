// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importSvg.ts
//
// SVG (`.svg`) reader — 2D profiles only, pure TypeScript, no OCCT and no DOM.
//
// NO DOM ON PURPOSE
// -----------------
// The importer runs under the `node` vitest environment, in the CLI, and in
// the worker; none of those has a parser. So this module scans tags directly.
// It reads element names, attributes and nesting, which is all a profile
// import needs — it deliberately does NOT implement CSS, `<use>` expansion,
// `<style>`, markers or clipping, and it refuses documents that depend on
// them rather than rendering a subset and calling it the drawing.
//
// THE Y AXIS
// ----------
// SVG's Y axis points DOWN; kernelCAD's points UP. Every imported point is
// therefore reflected. The reflection is folded into the ROOT TRANSFORM
// matrix rather than applied as a late fixup, which is what makes it correct
// for arcs too: a reflection has a negative determinant, and the one place
// that matters — the sign of a circular arc's bulge — is handled by the same
// matrix-application code that handles points. Doing the flip afterwards
// would move every endpoint and silently leave every arc bowing the wrong
// way.
//
// The reflection is about the TOP of the viewBox, so a drawing that occupied
// y ∈ [vbMinY, vbMinY + vbHeight] lands on Y ∈ [0, vbHeight] in mm — upright
// and in positive Y, matching what the designer saw. With no viewBox and no
// height there is nothing to reflect about and the importer falls back to
// plain negation (Y ↦ −Y), which is documented and still correct in shape.
//
// UNITS
// -----
// One SVG user unit becomes millimetres by this ladder, and the result is
// always reported in `unitSource` — never assumed silently:
//   1. `opts.units` — user units are that unit, whatever the file says.
//   2. `viewBox` + a physically-dimensioned `width` (e.g. `width="120mm"`) —
//      scale = width_in_mm / viewBox_width. This is the case that actually
//      carries real-world size, and it is what Inkscape and Illustrator write.
//   3. Otherwise a user unit is one CSS pixel = 1/96 inch, which is what the
//      SVG spec says an undimensioned user unit resolves to.
//
// EXACT VS FLATTENED
// ------------------
// Straight lines and CIRCULAR arcs are exact — the latter ride as bulge
// factors in the sketch IR. Cubic/quadratic Béziers and true ellipses have no
// exact form in that IR, so they are subdivided into chords under an explicit
// `curveTolerance` (max deviation in mm, default 0.01). That is an
// approximation and is named as one; it is not a fallback, because there is
// no exact path being silently skipped.

import {
  assembleRegions,
  ContourError,
  type ImportSegment,
  type ImportedRegion,
} from './contourAssembly';
import { MM_PER_UNIT, isLengthUnit, LENGTH_UNIT_NAMES, type LengthUnit } from './lengthUnits';
import {
  SvgParseError,
  IDENTITY,
  apply,
  det,
  isSimilarity,
  lengthToMm,
  mul,
  parseTransform,
  parseViewBox,
  scaleOf,
  scanNumberAt,
  scanTags,
  type Matrix,
  type Tag,
  type ViewBox,
} from './importSvgParsing';

export type { SvgParseFailure } from './importSvgParsing';
export { SvgParseError } from './importSvgParsing';

export interface ImportSvgOptions {
  /** Interpret one SVG user unit as this unit, overriding `width`/`viewBox`. */
  units?: LengthUnit;
  /** Endpoint-matching / gap-closing distance in mm. Default 1e-3. */
  tolerance?: number;
  /**
   * Maximum chord deviation in mm when subdividing a Bézier or a true
   * ellipse. Default 0.01 mm — an order of magnitude below a typical FDM
   * layer and below any mill's positioning error, so the approximation
   * disappears into manufacturing tolerance while keeping segment counts
   * modest.
   */
  curveTolerance?: number;
}

export interface SvgImportResult {
  /** Closed profiles, largest area first. */
  regions: ImportedRegion[];
  /** Millimetres per SVG user unit that was applied. */
  unitScale: number;
  /** How that scale was decided. */
  unitSource: string;
  /** Non-rendering elements (`<defs>`, `<title>`, …) that were skipped. */
  ignoredElements: string[];
  /** True when the Y reflection used the viewBox/height; false when it was plain negation. */
  flippedAboutViewBox: boolean;
  duplicatesDropped: number;
  degeneratesDropped: number;
  gapsClosed: number;
}

export const DEFAULT_SVG_TOLERANCE = 1e-3;
export const DEFAULT_CURVE_TOLERANCE = 0.01;

function attrNum(tag: Tag, name: string, fallback: number | null): number {
  const raw = tag.attrs[name];
  if (raw === undefined || raw.trim() === '') {
    if (fallback === null) {
      throw new SvgParseError(
        'malformed-attribute',
        `<${tag.name}> at offset ${tag.offset}: required attribute '${name}' is missing.`,
      );
    }
    return fallback;
  }
  const v = Number(raw.trim());
  if (!Number.isFinite(v)) {
    throw new SvgParseError(
      'malformed-attribute',
      `<${tag.name}> at offset ${tag.offset}: attribute ${name}='${raw}' is not a number.`,
    );
  }
  return v;
}

// ---------------------------------------------------------------------------
// Path `d` scanning
// ---------------------------------------------------------------------------

/**
 * Character-level scanner for path data.
 *
 * A regex tokenizer is wrong here: arc flags are single characters that
 * exporters run together with the following number (`a1 1 0 011 1` is
 * large-arc=0, sweep=1, x=1, y=1). Only a positional scanner that knows a
 * flag is coming reads that correctly, and misreading it silently mirrors the
 * arc.
 */
class PathScanner {
  private i = 0;
  private readonly d: string;
  private readonly where: string;

  // Explicit fields, not constructor parameter properties: the CLI bundle
  // builds with `erasableSyntaxOnly`, which forbids that syntax.
  constructor(d: string, where: string) {
    this.d = d;
    this.where = where;
  }

  get offset(): number { return this.i; }
  get done(): boolean { this.skipSep(); return this.i >= this.d.length; }

  private skipSep(): void {
    while (this.i < this.d.length && /[\s,]/.test(this.d[this.i])) this.i++;
  }

  peekCommand(): string | null {
    this.skipSep();
    if (this.i >= this.d.length) return null;
    const c = this.d[this.i];
    return /[MmLlHhVvCcSsQqTtAaZz]/.test(c) ? c : null;
  }

  takeCommand(): string {
    const c = this.peekCommand();
    if (c === null) {
      throw new SvgParseError(
        'malformed-path',
        `${this.where}: expected a path command at offset ${this.i}, found '${this.d[this.i] ?? '<end>'}'.`,
      );
    }
    this.i++;
    return c;
  }

  /** True when the next token is a number, i.e. the previous command repeats. */
  hasNumber(): boolean {
    this.skipSep();
    return this.i < this.d.length && /[-+.0-9]/.test(this.d[this.i]);
  }

  number(): number {
    this.skipSep();
    const start = this.i;
    this.i = scanNumberAt(this.d, this.i);
    const text = this.d.slice(start, this.i);
    const v = Number(text);
    if (text === '' || !Number.isFinite(v)) {
      throw new SvgParseError(
        'malformed-path',
        `${this.where}: expected a number at offset ${start}, found '${this.d.slice(start, start + 12)}'.`,
      );
    }
    return v;
  }

  /** Arc flag: exactly one '0' or '1' character, which may abut the next number. */
  flag(): boolean {
    this.skipSep();
    const c = this.d[this.i];
    if (c !== '0' && c !== '1') {
      throw new SvgParseError(
        'malformed-path',
        `${this.where}: expected an arc flag (0 or 1) at offset ${this.i}, found '${c ?? '<end>'}'.`,
      );
    }
    this.i++;
    return c === '1';
  }
}

// ---------------------------------------------------------------------------
// Curve flattening
// ---------------------------------------------------------------------------

type Pt = [number, number];

/**
 * Adaptive cubic subdivision. Operates on ALREADY-TRANSFORMED control points
 * (Béziers are affine-invariant, so transforming the hull first lets the
 * tolerance be a real millimetre number instead of a user-unit guess).
 */
function flattenCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, tol: number, out: Pt[], depth = 0): void {
  // Flatness = how far the interior control points stray from the chord.
  const dx = p3[0] - p0[0];
  const dy = p3[1] - p0[1];
  const chord = Math.hypot(dx, dy);
  const dev = chord < 1e-12
    ? Math.max(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), Math.hypot(p2[0] - p0[0], p2[1] - p0[1]))
    : Math.max(
        Math.abs((p1[0] - p0[0]) * dy - (p1[1] - p0[1]) * dx) / chord,
        Math.abs((p2[0] - p0[0]) * dy - (p2[1] - p0[1]) * dx) / chord,
      );
  // Depth cap: a cusp can keep the deviation above tolerance forever. 20
  // levels is a million chords — far past any real profile — and stopping
  // there bounds the work without changing the answer for sane input.
  if (dev <= tol || depth >= 20) {
    out.push(p3);
    return;
  }
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const p01 = mid(p0, p1), p12 = mid(p1, p2), p23 = mid(p2, p3);
  const p012 = mid(p01, p12), p123 = mid(p12, p23);
  const m = mid(p012, p123);
  flattenCubic(p0, p01, p012, m, tol, out, depth + 1);
  flattenCubic(m, p123, p23, p3, tol, out, depth + 1);
}

// ---------------------------------------------------------------------------
// Sub-path accumulation
// ---------------------------------------------------------------------------

/**
 * Collects segments for one contour in MILLIMETRE space.
 *
 * The current transform is applied at push time, which is why an arc's bulge
 * sign is corrected here (a reflection — the Y flip — has negative
 * determinant and reverses arc handedness) rather than anywhere downstream.
 */
class ContourBuilder {
  readonly segments: ImportSegment[] = [];
  private cur: Pt;
  readonly start: Pt;

  private readonly m: Matrix;
  private readonly source: string;

  // Explicit fields, not constructor parameter properties (`erasableSyntaxOnly`).
  constructor(startUser: Pt, m: Matrix, source: string) {
    this.m = m;
    this.source = source;
    this.start = apply(m, startUser[0], startUser[1]);
    this.cur = this.start;
  }

  /** Current pen position in millimetre space. */
  get position(): Pt { return this.cur; }

  lineToUser(x: number, y: number): void {
    this.lineToMm(apply(this.m, x, y));
  }

  lineToMm(p: Pt): void {
    this.segments.push({ x0: this.cur[0], y0: this.cur[1], x1: p[0], y1: p[1], source: this.source });
    this.cur = p;
  }

  /**
   * Circular arc given in USER space with a user-space bulge (positive =
   * counter-clockwise when the raw SVG numbers are read as a plain math
   * plane). Only valid when `m` is a similarity; callers check.
   */
  bulgeToUser(x: number, y: number, bulgeUser: number): void {
    const p = apply(this.m, x, y);
    const bulge = det(this.m) < 0 ? -bulgeUser : bulgeUser;
    this.segments.push({
      x0: this.cur[0], y0: this.cur[1], x1: p[0], y1: p[1], bulge, source: this.source,
    });
    this.cur = p;
  }

  /** Close back onto the sub-path's first point with a straight line. */
  closeWithLine(): void {
    if (this.cur[0] !== this.start[0] || this.cur[1] !== this.start[1]) {
      this.lineToMm(this.start);
    }
  }

  toMm(x: number, y: number): Pt { return apply(this.m, x, y); }
  get matrix(): Matrix { return this.m; }
}

// ---------------------------------------------------------------------------
// Elliptical arc (SVG `A`)
// ---------------------------------------------------------------------------

interface ArcCenter { cx: number; cy: number; rx: number; ry: number; phi: number; theta0: number; sweep: number }

/** SVG endpoint parameterisation -> centre parameterisation (spec F.6.5). */
function arcToCenter(
  x0: number, y0: number, rx: number, ry: number, phiDeg: number,
  largeArc: boolean, sweepFlag: boolean, x1: number, y1: number,
): ArcCenter | null {
  if (rx === 0 || ry === 0) return null; // spec: treat as a straight line
  const phi = (phiDeg * Math.PI) / 180;
  const cosP = Math.cos(phi), sinP = Math.sin(phi);
  const dx2 = (x0 - x1) / 2, dy2 = (y0 - y1) / 2;
  const x1p = cosP * dx2 + sinP * dy2;
  const y1p = -sinP * dx2 + cosP * dy2;
  let ax = Math.abs(rx), ay = Math.abs(ry);
  // Spec F.6.6: grow radii that are too small to span the endpoints.
  const lambda = (x1p * x1p) / (ax * ax) + (y1p * y1p) / (ay * ay);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    ax *= s;
    ay *= s;
  }
  const numer = ax * ax * ay * ay - ax * ax * y1p * y1p - ay * ay * x1p * x1p;
  const denom = ax * ax * y1p * y1p + ay * ay * x1p * x1p;
  const coef = (largeArc === sweepFlag ? -1 : 1) * Math.sqrt(Math.max(0, numer / denom));
  const cxp = (coef * ax * y1p) / ay;
  const cyp = (-coef * ay * x1p) / ax;
  const cx = cosP * cxp - sinP * cyp + (x0 + x1) / 2;
  const cy = sinP * cxp + cosP * cyp + (y0 + y1) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    return ux * vy - uy * vx < 0 ? -a : a;
  };
  const theta0 = ang(1, 0, (x1p - cxp) / ax, (y1p - cyp) / ay);
  let delta = ang((x1p - cxp) / ax, (y1p - cyp) / ay, (-x1p - cxp) / ax, (-y1p - cyp) / ay);
  if (!sweepFlag && delta > 0) delta -= 2 * Math.PI;
  if (sweepFlag && delta < 0) delta += 2 * Math.PI;
  return { cx, cy, rx: ax, ry: ay, phi, theta0, sweep: delta };
}

function sampleEllipse(arc: ArcCenter, tolMm: number, mmScale: number): Array<Pt> {
  const rMax = Math.max(arc.rx, arc.ry) * mmScale;
  // Sagitta of a chord subtending dθ on radius r is r(1 − cos(dθ/2)).
  const dTheta = rMax <= tolMm ? Math.PI / 2 : 2 * Math.acos(Math.max(-1, 1 - tolMm / rMax));
  const steps = Math.max(2, Math.ceil(Math.abs(arc.sweep) / dTheta));
  const cosP = Math.cos(arc.phi), sinP = Math.sin(arc.phi);
  const out: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = arc.theta0 + (arc.sweep * i) / steps;
    const ex = arc.rx * Math.cos(t);
    const ey = arc.ry * Math.sin(t);
    out.push([arc.cx + cosP * ex - sinP * ey, arc.cy + sinP * ex + cosP * ey]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

/** Elements that render nothing and can be skipped without losing profile geometry. */
const NON_RENDERING = new Set(['defs', 'title', 'desc', 'metadata', 'style', 'script', 'clippath', 'mask', 'marker', 'symbol', 'lineargradient', 'radialgradient', 'pattern', 'filter', 'namedview', 'sodipodi', 'switch', 'animate', 'animatetransform', 'set']);

/** Bulge of a quarter turn: tan(90° / 4). */
const QUARTER_BULGE = Math.tan(Math.PI / 8);

function pointsAttr(tag: Tag): Pt[] {
  const raw = tag.attrs.points ?? '';
  const nums = raw.trim().split(/[\s,]+/).filter(s => s !== '').map(Number);
  if (nums.length < 4 || nums.length % 2 !== 0 || nums.some(v => !Number.isFinite(v))) {
    throw new SvgParseError(
      'malformed-attribute',
      `<${tag.name}> at offset ${tag.offset}: points='${raw.slice(0, 60)}' must be an even list of ` +
        `at least 2 finite coordinate pairs (got ${nums.length} numbers).`,
    );
  }
  const out: Pt[] = [];
  for (let i = 0; i < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

interface ElementSink {
  closed: ImportSegment[][];
  open: ImportSegment[];
}

function emitRect(tag: Tag, m: Matrix, sink: ElementSink): void {
  const where = `<rect> at offset ${tag.offset}`;
  const x = attrNum(tag, 'x', 0);
  const y = attrNum(tag, 'y', 0);
  const w = attrNum(tag, 'width', null);
  const h = attrNum(tag, 'height', null);
  if (w <= 0 || h <= 0) {
    throw new SvgParseError('malformed-attribute', `${where}: width and height must be > 0, got ${w} x ${h}.`);
  }
  const hasRx = tag.attrs.rx !== undefined;
  const hasRy = tag.attrs.ry !== undefined;
  let rx = hasRx ? attrNum(tag, 'rx', 0) : (hasRy ? attrNum(tag, 'ry', 0) : 0);
  let ry = hasRy ? attrNum(tag, 'ry', 0) : rx;
  rx = Math.min(Math.max(rx, 0), w / 2);
  ry = Math.min(Math.max(ry, 0), h / 2);

  const b = new ContourBuilder([x + rx, y], m, where);
  if (rx === 0 || ry === 0) {
    b.lineToUser(x + w, y);
    b.lineToUser(x + w, y + h);
    b.lineToUser(x, y + h);
    b.lineToUser(x, y);
  } else if (Math.abs(rx - ry) < 1e-12 && isSimilarity(m)) {
    // Equal radii under a similarity: the corners stay circular quarter arcs.
    // Traversal is CCW in the raw (y-up-read) plane, so each corner turns
    // through +90° and takes a positive bulge.
    b.lineToUser(x + w - rx, y);
    b.bulgeToUser(x + w, y + ry, QUARTER_BULGE);
    b.lineToUser(x + w, y + h - ry);
    b.bulgeToUser(x + w - rx, y + h, QUARTER_BULGE);
    b.lineToUser(x + rx, y + h);
    b.bulgeToUser(x, y + h - ry, QUARTER_BULGE);
    b.lineToUser(x, y + ry);
    b.bulgeToUser(x + rx, y, QUARTER_BULGE);
  } else {
    throw new SvgParseError(
      'unsupported-element',
      `${where}: rx=${rx} and ry=${ry} differ (or the element carries a non-uniform transform), so the ` +
        'corners are elliptical. Elliptical corners have no exact sketch-command form; ' +
        'give the rect equal rx/ry, or convert it to a <path> in the source tool.',
    );
  }
  b.closeWithLine();
  sink.closed.push(b.segments);
}

function emitCircle(tag: Tag, m: Matrix, sink: ElementSink, tolMm: number): void {
  const where = `<circle> at offset ${tag.offset}`;
  const cx = attrNum(tag, 'cx', 0);
  const cy = attrNum(tag, 'cy', 0);
  const r = attrNum(tag, 'r', null);
  if (r <= 0) {
    throw new SvgParseError('malformed-attribute', `${where}: r must be > 0, got ${r}.`);
  }
  if (isSimilarity(m)) {
    const b = new ContourBuilder([cx + r, cy], m, where);
    b.bulgeToUser(cx - r, cy, 1);
    b.bulgeToUser(cx + r, cy, 1);
    sink.closed.push(b.segments);
    return;
  }
  emitEllipse(m, sink, tolMm, cx, cy, r, r, where);
}

function emitEllipse(
  m: Matrix, sink: ElementSink, tolMm: number,
  cx: number, cy: number, rx: number, ry: number, where: string,
): void {
  if (rx <= 0 || ry <= 0) {
    throw new SvgParseError('malformed-attribute', `${where}: rx and ry must be > 0, got ${rx} x ${ry}.`);
  }
  const arc: ArcCenter = { cx, cy, rx, ry, phi: 0, theta0: 0, sweep: 2 * Math.PI };
  const pts = sampleEllipse(arc, tolMm, scaleOf(m));
  const b = new ContourBuilder([cx + rx, cy], m, where);
  for (const p of pts) b.lineToUser(p[0], p[1]);
  b.closeWithLine();
  sink.closed.push(b.segments);
}

function emitPolyish(tag: Tag, m: Matrix, sink: ElementSink, closed: boolean): void {
  const where = `<${tag.name}> at offset ${tag.offset}`;
  const pts = pointsAttr(tag);
  const b = new ContourBuilder(pts[0], m, where);
  for (let i = 1; i < pts.length; i++) b.lineToUser(pts[i][0], pts[i][1]);
  if (closed) {
    b.closeWithLine();
    sink.closed.push(b.segments);
  } else {
    // An open <polyline> may still be one arm of a contour assembled from
    // several elements, so it goes into the chaining pool rather than being
    // closed on its behalf.
    sink.open.push(...b.segments);
  }
}

function emitLine(tag: Tag, m: Matrix, sink: ElementSink): void {
  const where = `<line> at offset ${tag.offset}`;
  const b = new ContourBuilder([attrNum(tag, 'x1', null), attrNum(tag, 'y1', null)], m, where);
  b.lineToUser(attrNum(tag, 'x2', null), attrNum(tag, 'y2', null));
  sink.open.push(...b.segments);
}

/** Resolve the next path command: an explicit command letter, or the SVG
 *  implicit-repeat rule (after `M` a bare pair means `L`, otherwise the
 *  previous command repeats). */
function takePathCommand(scanner: PathScanner, prevCmd: string, d: string, where: string): string {
  if (scanner.peekCommand() !== null) {
    return scanner.takeCommand();
  }
  if (prevCmd !== '') {
    // Implicit repeat: after `M x y` further pairs are `L`, otherwise the
    // previous command repeats.
    return prevCmd === 'M' ? 'L' : prevCmd === 'm' ? 'l' : prevCmd;
  }
  throw new SvgParseError(
    'malformed-path',
    `${where}: path data must begin with a moveto command, found '${d.trim()[0]}'.`,
  );
}

/** L / H / V: a single absolute-or-relative coordinate (pair), ending in a
 *  line-to. Returns the new user-space pen position. */
function emitLineLikeCommand(
  up: string,
  scanner: PathScanner,
  rel: boolean,
  b: ContourBuilder,
  ux: number,
  uy: number,
): { ux: number; uy: number } {
  if (up === 'L') {
    const nx = scanner.number(), ny = scanner.number();
    ux = rel ? ux + nx : nx;
    uy = rel ? uy + ny : ny;
  } else if (up === 'H') {
    const nx = scanner.number();
    ux = rel ? ux + nx : nx;
  } else {
    const ny = scanner.number();
    uy = rel ? uy + ny : ny;
  }
  b.lineToUser(ux, uy);
  return { ux, uy };
}

/** C / S: cubic Bézier with optional smooth-control reflection. Returns the
 *  new user-space pen position and the control point the next `S` reflects. */
function emitCubicPathCommand(
  up: string,
  scanner: PathScanner,
  rel: boolean,
  b: ContourBuilder,
  ux: number,
  uy: number,
  lastCubicCtrl: Pt | null,
  tolMm: number,
): { ux: number; uy: number; lastCubicCtrl: Pt } {
  let c1x: number, c1y: number;
  if (up === 'C') {
    const a = scanner.number(), bb = scanner.number();
    c1x = rel ? ux + a : a;
    c1y = rel ? uy + bb : bb;
  } else {
    // S reflects the previous cubic control point through the pen.
    const r = lastCubicCtrl ?? [ux, uy];
    c1x = 2 * ux - r[0];
    c1y = 2 * uy - r[1];
  }
  const a2 = scanner.number(), b2 = scanner.number();
  const c2x = rel ? ux + a2 : a2;
  const c2y = rel ? uy + b2 : b2;
  const a3 = scanner.number(), b3 = scanner.number();
  const ex = rel ? ux + a3 : a3;
  const ey = rel ? uy + b3 : b3;
  const pts: Pt[] = [];
  flattenCubic(b.position, b.toMm(c1x, c1y), b.toMm(c2x, c2y), b.toMm(ex, ey), tolMm, pts);
  for (const p of pts) b.lineToMm(p);
  return { ux: ex, uy: ey, lastCubicCtrl: [c2x, c2y] };
}

/** Q / T: quadratic Bézier, exactly elevated to cubic before the same
 *  subdivision. Returns the new pen position and the next `T` reflection. */
function emitQuadraticPathCommand(
  up: string,
  scanner: PathScanner,
  rel: boolean,
  b: ContourBuilder,
  ux: number,
  uy: number,
  lastQuadCtrl: Pt | null,
  tolMm: number,
): { ux: number; uy: number; lastQuadCtrl: Pt } {
  let qx: number, qy: number;
  if (up === 'Q') {
    const a = scanner.number(), bb = scanner.number();
    qx = rel ? ux + a : a;
    qy = rel ? uy + bb : bb;
  } else {
    const r = lastQuadCtrl ?? [ux, uy];
    qx = 2 * ux - r[0];
    qy = 2 * uy - r[1];
  }
  const a2 = scanner.number(), b2 = scanner.number();
  const ex = rel ? ux + a2 : a2;
  const ey = rel ? uy + b2 : b2;
  // Exact quadratic -> cubic elevation, then the same subdivision.
  const c1x = ux + (2 / 3) * (qx - ux);
  const c1y = uy + (2 / 3) * (qy - uy);
  const c2x = ex + (2 / 3) * (qx - ex);
  const c2y = ey + (2 / 3) * (qy - ey);
  const pts: Pt[] = [];
  flattenCubic(b.position, b.toMm(c1x, c1y), b.toMm(c2x, c2y), b.toMm(ex, ey), tolMm, pts);
  for (const p of pts) b.lineToMm(p);
  return { ux: ex, uy: ey, lastQuadCtrl: [qx, qy] };
}

/** A: elliptical arc — exact bulge under a similarity for the circular case,
 *  chord-flattened otherwise. Returns the new user-space pen position. */
function emitArcPathCommand(
  scanner: PathScanner,
  rel: boolean,
  b: ContourBuilder,
  ux: number,
  uy: number,
  similarity: boolean,
  tolMm: number,
  mmScale: number,
): { ux: number; uy: number } {
  const rx = Math.abs(scanner.number());
  const ry = Math.abs(scanner.number());
  const rot = scanner.number();
  const largeArc = scanner.flag();
  const sweepFlag = scanner.flag();
  const a2 = scanner.number(), b2 = scanner.number();
  const ex = rel ? ux + a2 : a2;
  const ey = rel ? uy + b2 : b2;
  const arc = arcToCenter(ux, uy, rx, ry, rot, largeArc, sweepFlag, ex, ey);
  if (arc === null) {
    // Spec: a zero radius degenerates to a straight line.
    b.lineToUser(ex, ey);
  } else if (Math.abs(arc.rx - arc.ry) < 1e-9 * Math.max(arc.rx, arc.ry) && similarity) {
    // Circular under a similarity: exact. `sweep` is signed in the raw
    // plane read as y-up, which is exactly the bulge convention; the
    // builder applies the reflection's sign flip.
    const halves = Math.abs(arc.sweep) > Math.PI ? 2 : 1;
    for (let i = 0; i < halves; i++) {
      const t = arc.theta0 + (arc.sweep * (i + 1)) / halves;
      b.bulgeToUser(
        arc.cx + arc.rx * Math.cos(t),
        arc.cy + arc.ry * Math.sin(t),
        Math.tan(arc.sweep / halves / 4),
      );
    }
    // Land on the exact endpoint the file asked for.
    if (b.position[0] !== b.toMm(ex, ey)[0] || b.position[1] !== b.toMm(ex, ey)[1]) {
      const last = b.segments[b.segments.length - 1];
      const target = b.toMm(ex, ey);
      last.x1 = target[0];
      last.y1 = target[1];
    }
  } else {
    for (const p of sampleEllipse(arc, tolMm, mmScale)) b.lineToUser(p[0], p[1]);
  }
  return { ux: ex, uy: ey };
}

/** Dispatch one drawing command (everything but `M`/`Z`) to its emitter and
 *  report the pen position and smooth-curve reflection it leaves behind. */
function emitPathCommand(
  cmd: string,
  up: string,
  scanner: PathScanner,
  rel: boolean,
  b: ContourBuilder,
  ux: number,
  uy: number,
  lastCubicCtrl: Pt | null,
  lastQuadCtrl: Pt | null,
  similarity: boolean,
  tolMm: number,
  mmScale: number,
  where: string,
): { ux: number; uy: number; lastCubicCtrl: Pt | null; lastQuadCtrl: Pt | null } {
  switch (up) {
    case 'L':
    case 'H':
    case 'V': {
      const res = emitLineLikeCommand(up, scanner, rel, b, ux, uy);
      return { ux: res.ux, uy: res.uy, lastCubicCtrl: null, lastQuadCtrl: null };
    }
    case 'C':
    case 'S': {
      const res = emitCubicPathCommand(up, scanner, rel, b, ux, uy, lastCubicCtrl, tolMm);
      return { ux: res.ux, uy: res.uy, lastCubicCtrl: res.lastCubicCtrl, lastQuadCtrl: null };
    }
    case 'Q':
    case 'T': {
      const res = emitQuadraticPathCommand(up, scanner, rel, b, ux, uy, lastQuadCtrl, tolMm);
      return { ux: res.ux, uy: res.uy, lastCubicCtrl: null, lastQuadCtrl: res.lastQuadCtrl };
    }
    case 'A': {
      const res = emitArcPathCommand(scanner, rel, b, ux, uy, similarity, tolMm, mmScale);
      return { ux: res.ux, uy: res.uy, lastCubicCtrl: null, lastQuadCtrl: null };
    }
    default:
      throw new SvgParseError(
        'unsupported-command',
        `${where}: path command '${cmd}' at offset ${scanner.offset} is not a valid SVG path command.`,
      );
  }
}

function emitPath(tag: Tag, m: Matrix, sink: ElementSink, tolMm: number): void {
  const d = tag.attrs.d;
  if (d === undefined || d.trim() === '') {
    throw new SvgParseError(
      'malformed-path',
      `<path> at offset ${tag.offset}: the 'd' attribute is missing or empty.`,
    );
  }
  const where = `<path> at offset ${tag.offset}`;
  const scanner = new PathScanner(d, where);
  const similarity = isSimilarity(m);
  const mmScale = scaleOf(m);

  let builder: ContourBuilder | null = null;
  let subpathIndex = 0;
  // User-space pen, kept alongside the mm-space builder because relative
  // commands and smooth-curve reflection are defined in user space.
  let ux = 0, uy = 0;
  let startX = 0, startY = 0;
  let lastCubicCtrl: Pt | null = null;
  let lastQuadCtrl: Pt | null = null;
  let prevCmd = '';

  const flushOpen = (): void => {
    if (builder && builder.segments.length > 0) sink.open.push(...builder.segments);
    builder = null;
  };

  const need = (): ContourBuilder => {
    if (!builder) {
      throw new SvgParseError(
        'malformed-path',
        `${where}: a drawing command appears before any 'M' (offset ${scanner.offset}).`,
      );
    }
    return builder;
  };

  while (!scanner.done) {
    const cmd = takePathCommand(scanner, prevCmd, d, where);
    const rel = cmd === cmd.toLowerCase() && cmd !== 'Z' && cmd !== 'z';
    const up = cmd.toUpperCase();

    if (up === 'Z') {
      const b = need();
      b.closeWithLine();
      if (b.segments.length > 0) sink.closed.push(b.segments);
      builder = null;
      ux = startX;
      uy = startY;
      prevCmd = cmd;
      continue;
    }

    if (up === 'M') {
      flushOpen();
      const nx = scanner.number();
      const ny = scanner.number();
      ux = rel ? ux + nx : nx;
      uy = rel ? uy + ny : ny;
      startX = ux;
      startY = uy;
      subpathIndex++;
      builder = new ContourBuilder([ux, uy], m, `${where} subpath ${subpathIndex}`);
      lastCubicCtrl = null;
      lastQuadCtrl = null;
      prevCmd = cmd;
      continue;
    }

    const b = need();
    const res = emitPathCommand(
      cmd, up, scanner, rel, b, ux, uy, lastCubicCtrl, lastQuadCtrl, similarity, tolMm, mmScale, where,
    );
    ux = res.ux; uy = res.uy;
    lastCubicCtrl = res.lastCubicCtrl; lastQuadCtrl = res.lastQuadCtrl;
    prevCmd = cmd;
  }
  flushOpen();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Parse SVG text into closed regions in millimetres, Y up.
 *
 * @throws {SvgParseError} on empty/non-SVG input, an element or path command
 *   that cannot be represented, a malformed attribute or path, an
 *   unresolvable unit, or geometry that does not close. Never returns an
 *   empty or placeholder region list.
 */
export function importSvgText(text: string, opts: ImportSvgOptions = {}): SvgImportResult {
  validateImportRequest(text, opts);

  const tags = scanTags(text);
  const root = tags.find(t => t.name === 'svg' && !t.closing);
  if (!root) {
    throw new SvgParseError('not-svg', 'no <svg> root element found in the payload.');
  }

  const viewBox = parseViewBox(root.attrs.viewBox);
  const { scale, unitSource } = resolveSvgScale(root, viewBox, opts);

  const flipAbout = resolveFlipAbout(root, viewBox);
  const rootMatrix = buildRootMatrix(scale, viewBox, flipAbout);

  const tolMm = opts.curveTolerance ?? DEFAULT_CURVE_TOLERANCE;
  if (!(tolMm > 0)) {
    throw new SvgParseError('bad-units', `opts.curveTolerance must be > 0, got ${tolMm}.`);
  }

  const sink: ElementSink = { closed: [], open: [] };
  const ignoredElements: string[] = [];
  emitSvgElements(tags, rootMatrix, tolMm, sink, ignoredElements);

  const assembled = assembleSvgRegions(sink, opts);

  return {
    regions: assembled.regions,
    unitScale: scale,
    unitSource,
    ignoredElements,
    flippedAboutViewBox: flipAbout !== null,
    duplicatesDropped: assembled.duplicatesDropped,
    degeneratesDropped: assembled.degeneratesDropped,
    gapsClosed: assembled.gapsClosed,
  };
}

/** Empty payloads and unknown `opts.units` are rejected before any parsing,
 *  so the failure names the request rather than the document. */
function validateImportRequest(text: string, opts: ImportSvgOptions): void {
  if (text.trim().length === 0) {
    throw new SvgParseError('empty', 'SVG payload is empty.');
  }
  if (opts.units !== undefined && !isLengthUnit(opts.units)) {
    throw new SvgParseError(
      'bad-units',
      `opts.units '${String(opts.units)}' is not a known length unit (${LENGTH_UNIT_NAMES.join(', ')}).`,
    );
  }
}

/** Walk the element stream once, maintaining the transform stack and the
 *  non-rendering skip depth, and hand each geometry element to the emitter. */
function emitSvgElements(
  tags: Tag[],
  rootMatrix: Matrix,
  tolMm: number,
  sink: ElementSink,
  ignoredElements: string[],
): void {
  const stack: Matrix[] = [rootMatrix];
  let skipDepth = 0;

  for (const tag of tags) {
    if (tag.name === 'svg') continue;

    const lower = tag.name.toLowerCase();

    if (skipDepth > 0) {
      skipDepth = advanceSkipDepth(tag, skipDepth);
      continue;
    }

    if (tag.closing) {
      closeOpenGroup(lower, stack);
      continue;
    }

    if (NON_RENDERING.has(lower)) {
      ignoredElements.push(`<${tag.name}> at offset ${tag.offset}`);
      if (!tag.selfClosing) skipDepth = 1;
      continue;
    }

    const parent = stack[stack.length - 1];
    const local = localTransform(tag);
    const m = mul(parent, local);

    if (lower === 'g') {
      // A self-closing <g> holds nothing; only push for a real subtree.
      if (!tag.selfClosing) stack.push(m);
    } else {
      emitGeometryElement(lower, tag, m, sink, tolMm);
    }
  }
}

/** Run the contour assembler, translating contour failures into the
 *  importer's own error type so callers only have to know `SvgParseError`. */
function assembleSvgRegions(sink: ElementSink, opts: ImportSvgOptions): ReturnType<typeof assembleRegions> {
  try {
    return assembleRegions(sink, { tolerance: opts.tolerance ?? DEFAULT_SVG_TOLERANCE });
  } catch (e) {
    if (e instanceof ContourError) throw new SvgParseError('contour', e.message);
    throw e;
  }
}

/** Resolve the millimetres-per-user-unit scale and the human-readable source
 *  that decided it (opts.units, a dimensioned width over the viewBox, or the
 *  CSS-pixel default). */
function resolveSvgScale(
  root: Tag,
  viewBox: ViewBox | null,
  opts: ImportSvgOptions,
): { scale: number; unitSource: string } {
  if (opts.units !== undefined) {
    return {
      scale: MM_PER_UNIT[opts.units],
      unitSource: `opts.units=${opts.units}`,
    };
  }
  const widthMm = root.attrs.width !== undefined
    ? lengthToMm(root.attrs.width, '<svg> width')
    : null;
  if (viewBox && widthMm !== null && root.attrs.width !== undefined && /[a-z]/i.test(root.attrs.width)) {
    return {
      scale: widthMm / viewBox.width,
      unitSource: `width='${root.attrs.width.trim()}' over viewBox width ${viewBox.width}`,
    };
  }
  return {
    scale: MM_PER_UNIT.px,
    unitSource: 'assumed 1 user unit = 1 CSS px (1/96 in); no physically-dimensioned width',
  };
}

/** Reflection height: prefer the viewBox, fall back to an undimensioned
 *  `height`, and finally to plain negation. */
function resolveFlipAbout(root: Tag, viewBox: ViewBox | null): number | null {
  if (viewBox) {
    return viewBox.minY + viewBox.height;
  }
  if (root.attrs.height !== undefined) {
    const h = Number(String(root.attrs.height).replace(/[a-z%]+$/i, '').trim());
    if (Number.isFinite(h) && h > 0) return h;
  }
  return null;
}

/** The root matrix IS the Y flip: scale by `scale`, negate Y, and translate
 *  so the drawing sits in positive Y starting at the origin. */
function buildRootMatrix(scale: number, viewBox: ViewBox | null, flipAbout: number | null): Matrix {
  const vbMinX = viewBox ? viewBox.minX : 0;
  return [
    scale, 0,
    0, -scale,
    -scale * vbMinX,
    scale * (flipAbout ?? 0),
  ];
}

function localTransform(tag: Tag): Matrix {
  return tag.attrs.transform !== undefined
    ? parseTransform(tag.attrs.transform, `<${tag.name}> at offset ${tag.offset}`)
    : IDENTITY;
}

/** Inside a non-rendering subtree: track nesting so `</defs>` ends it. */
function advanceSkipDepth(tag: Tag, skipDepth: number): number {
  if (!tag.closing && !tag.selfClosing) return skipDepth + 1;
  if (tag.closing) return skipDepth - 1;
  return skipDepth;
}

function closeOpenGroup(lower: string, stack: Matrix[]): void {
  if (lower === 'g' && stack.length > 1) stack.pop();
}

/** Emit one geometry element into the sink; throws for elements kernelCAD
 *  cannot resolve. Group (`<g>`) handling stays in the caller. */
function emitGeometryElement(
  lower: string,
  tag: Tag,
  m: Matrix,
  sink: ElementSink,
  tolMm: number,
): void {
  switch (lower) {
    case 'path': emitPath(tag, m, sink, tolMm); break;
    case 'rect': emitRect(tag, m, sink); break;
    case 'circle': emitCircle(tag, m, sink, tolMm); break;
    case 'ellipse':
      emitEllipse(
        m, sink, tolMm,
        attrNum(tag, 'cx', 0), attrNum(tag, 'cy', 0),
        attrNum(tag, 'rx', null), attrNum(tag, 'ry', null),
        `<ellipse> at offset ${tag.offset}`,
      );
      break;
    case 'polygon': emitPolyish(tag, m, sink, true); break;
    case 'polyline': emitPolyish(tag, m, sink, false); break;
    case 'line': emitLine(tag, m, sink); break;
    case 'use':
    case 'text':
    case 'tspan':
    case 'image':
    case 'foreignobject':
      throw new SvgParseError(
        'unsupported-element',
        `<${tag.name}> at offset ${tag.offset}: this element carries geometry kernelCAD cannot ` +
          'resolve here (references, glyph outlines or raster content), and skipping it would leave ' +
          'the profile silently incomplete. Convert it to paths in the source tool ' +
          '(Inkscape: Path > Object to Path; Illustrator: Create Outlines / Expand).',
      );
    default:
      throw new SvgParseError(
        'unsupported-element',
        `<${tag.name}> at offset ${tag.offset}: unrecognised SVG element. kernelCAD reads ` +
          'path, rect, circle, ellipse, polygon, polyline, line and g.',
      );
  }
}

export type { ImportedRegion };
