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
// import needs — it deliberately does NOT implement CSS, `<style>`, markers
// or clipping, and it refuses documents that depend on them rather than
// rendering a subset and calling it the drawing. Same-document `<use>`
// references ARE expanded (see `expandUse` in importSvgWalk.ts), because
// Inkscape clones and Illustrator symbols are how repeated holes and slots
// usually arrive.
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
//   2. `viewBox` + a declared `width` and `height` (e.g.
//      `width="120mm" height="60mm"`, or unitless `width="192"` = 192 CSS
//      pixels) — the viewport-scale rule followed by SVG
//      `preserveAspectRatio` (default `xMidYMid meet`), so a viewBox whose
//      aspect differs from the viewport is letterboxed, not stretched.
//      Width alone sets a uniform scale from the width.
//   3. Otherwise a user unit is one CSS pixel = 1/96 inch, which is what the
//      SVG spec says an undimensioned user unit resolves to.
//
// EXACT VS FLATTENED
// ------------------
// Straight lines and CIRCULAR arcs are exact — the latter ride as bulge
// factors in the sketch IR. Cubic and quadratic Béziers (C/S/Q/T) are exact
// too: a Bézier is the clamped NURBS of its poles, and an affine transform
// maps it to the Bézier of the mapped poles, so each one becomes a single
// `nurbsSegment` under any transform. True ellipses (non-circular arcs,
// `<ellipse>`, elliptical `<rect>` corners, a circle under a non-uniform
// transform) are exact as well: each quarter turn is one rational quadratic
// `nurbsSegment`, and the affine image of a rational Bézier is the rational
// Bézier of the mapped poles with the same weights. Nothing is flattened, so
// `curveTolerance` is validated but no longer changes the geometry.

import {
  assembleRegions,
  ContourError,
  type ImportSegment,
  type ImportedRegion,
} from './contourAssembly';
import { conicArcSegments } from './dxfEllipse';
import { MM_PER_UNIT, isLengthUnit, LENGTH_UNIT_NAMES, type LengthUnit } from './lengthUnits';
import {
  SvgParseError,
  apply,
  attrNum,
  det,
  isSimilarity,
  lengthToMm,
  parseViewBox,
  parsePreserveAspectRatio,
  scanNumberAt,
  scanTags,
  type Matrix,
  type Tag,
  type ViewBox,
} from './importSvgParsing';
import { emitSvgElements } from './importSvgWalk';

export type { SvgParseFailure } from './importSvgParsing';
export { SvgParseError } from './importSvgParsing';

export interface ImportSvgOptions {
  /** Interpret one SVG user unit as this unit, overriding `width`/`viewBox`. */
  units?: LengthUnit;
  /** Endpoint-matching / gap-closing distance in mm. Default 1e-3. */
  tolerance?: number;
  /**
   * Accepted for compatibility and must be > 0. Every supported SVG curve
   * now imports exactly, so no curve is subdivided and this value does not
   * change the geometry.
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
// Points
// ---------------------------------------------------------------------------

type Pt = [number, number];

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

  /**
   * Bézier through MILLIMETRE-space poles, after the pen: an exact clamped
   * NURBS of degree `poles.length`. A curve whose poles all sit on the pen
   * has no extent and is dropped.
   */
  bezierToMm(poles: readonly Pt[]): void {
    const end = poles[poles.length - 1];
    if (poles.every(p => p[0] === this.cur[0] && p[1] === this.cur[1])) return;
    const degree = poles.length;
    this.segments.push({
      x0: this.cur[0], y0: this.cur[1], x1: end[0], y1: end[1], source: this.source,
      nurbs: {
        degree,
        controlPoints: [this.cur, ...poles],
        knots: [...new Array<number>(degree + 1).fill(0), ...new Array<number>(degree + 1).fill(1)],
      },
    });
    this.cur = end;
  }

  /**
   * Elliptical arc `c + u cos(t) + v sin(t)` given in USER space, after the
   * pen: exact rational quadratic segments in millimetre space. The first
   * segment starts on the pen and the last ends on `endUser`, so the arc
   * joins its neighbours without a float gap.
   */
  ellipseToUser(arc: ArcCenter, endUser: Pt): void {
    const cosP = Math.cos(arc.phi), sinP = Math.sin(arc.phi);
    const origin = apply(this.m, 0, 0);
    const linear = (x: number, y: number): Pt => {
      const p = apply(this.m, x, y);
      return [p[0] - origin[0], p[1] - origin[1]];
    };
    const end = apply(this.m, endUser[0], endUser[1]);
    this.segments.push(...conicArcSegments({
      center: apply(this.m, arc.cx, arc.cy),
      u: linear(arc.rx * cosP, arc.rx * sinP),
      v: linear(-arc.ry * sinP, arc.ry * cosP),
      startParameter: arc.theta0,
      endParameter: arc.theta0 + arc.sweep,
      startPoint: this.cur,
      endPoint: end,
      source: this.source,
    }));
    this.cur = end;
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

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

/** Elements that render nothing and can be skipped without losing profile geometry. */
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
    // Unequal radii, or a non-uniform transform: each corner is an exact
    // quarter ellipse, traversed with increasing angle like the arcs above.
    const corner = (cx: number, cy: number, theta0: number, end: Pt): void => {
      b.ellipseToUser({ cx, cy, rx, ry, phi: 0, theta0, sweep: Math.PI / 2 }, end);
    };
    b.lineToUser(x + w - rx, y);
    corner(x + w - rx, y + ry, -Math.PI / 2, [x + w, y + ry]);
    b.lineToUser(x + w, y + h - ry);
    corner(x + w - rx, y + h - ry, 0, [x + w - rx, y + h]);
    b.lineToUser(x + rx, y + h);
    corner(x + rx, y + h - ry, Math.PI / 2, [x, y + h - ry]);
    b.lineToUser(x, y + ry);
    corner(x + rx, y + ry, Math.PI, [x + rx, y]);
  }
  b.closeWithLine();
  sink.closed.push(b.segments);
}

function emitCircle(tag: Tag, m: Matrix, sink: ElementSink): void {
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
  emitEllipse(m, sink, cx, cy, r, r, where);
}

function emitEllipse(
  m: Matrix, sink: ElementSink,
  cx: number, cy: number, rx: number, ry: number, where: string,
): void {
  if (rx <= 0 || ry <= 0) {
    throw new SvgParseError('malformed-attribute', `${where}: rx and ry must be > 0, got ${rx} x ${ry}.`);
  }
  const b = new ContourBuilder([cx + rx, cy], m, where);
  b.ellipseToUser({ cx, cy, rx, ry, phi: 0, theta0: 0, sweep: 2 * Math.PI }, [cx + rx, cy]);
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
  b.bezierToMm([b.toMm(c1x, c1y), b.toMm(c2x, c2y), b.toMm(ex, ey)]);
  return { ux: ex, uy: ey, lastCubicCtrl: [c2x, c2y] };
}

/** Q / T: quadratic Bézier with optional smooth-control reflection. Returns
 *  the new pen position and the control point the next `T` reflects. */
function emitQuadraticPathCommand(
  up: string,
  scanner: PathScanner,
  rel: boolean,
  b: ContourBuilder,
  ux: number,
  uy: number,
  lastQuadCtrl: Pt | null,
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
  b.bezierToMm([b.toMm(qx, qy), b.toMm(ex, ey)]);
  return { ux: ex, uy: ey, lastQuadCtrl: [qx, qy] };
}

/** A: elliptical arc — exact bulge under a similarity for the circular case,
 *  exact rational quadratic segments otherwise. Returns the new user-space
 *  pen position. */
function emitArcPathCommand(
  scanner: PathScanner,
  rel: boolean,
  b: ContourBuilder,
  ux: number,
  uy: number,
  similarity: boolean,
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
    b.ellipseToUser(arc, [ex, ey]);
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
      const res = emitCubicPathCommand(up, scanner, rel, b, ux, uy, lastCubicCtrl);
      return { ux: res.ux, uy: res.uy, lastCubicCtrl: res.lastCubicCtrl, lastQuadCtrl: null };
    }
    case 'Q':
    case 'T': {
      const res = emitQuadraticPathCommand(up, scanner, rel, b, ux, uy, lastQuadCtrl);
      return { ux: res.ux, uy: res.uy, lastCubicCtrl: null, lastQuadCtrl: res.lastQuadCtrl };
    }
    case 'A': {
      const res = emitArcPathCommand(scanner, rel, b, ux, uy, similarity);
      return { ux: res.ux, uy: res.uy, lastCubicCtrl: null, lastQuadCtrl: null };
    }
    default:
      throw new SvgParseError(
        'unsupported-command',
        `${where}: path command '${cmd}' at offset ${scanner.offset} is not a valid SVG path command.`,
      );
  }
}

function emitPath(tag: Tag, m: Matrix, sink: ElementSink): void {
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
      cmd, up, scanner, rel, b, ux, uy, lastCubicCtrl, lastQuadCtrl, similarity, where,
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
  const placement = resolveSvgPlacement(root, viewBox, opts);
  const rootMatrix = placement.matrix;

  // Validated for compatibility; every supported curve is exact, so the
  // value no longer reaches the geometry.
  const tolMm = opts.curveTolerance ?? DEFAULT_CURVE_TOLERANCE;
  if (!(tolMm > 0)) {
    throw new SvgParseError('bad-units', `opts.curveTolerance must be > 0, got ${tolMm}.`);
  }

  const sink: ElementSink = { closed: [], open: [] };
  const ignoredElements: string[] = [];
  emitSvgElements(tags, rootMatrix, (name, tag, m) => emitGeometryElement(name, tag, m, sink), ignoredElements);

  const assembled = assembleSvgRegions(sink, opts);

  return {
    regions: assembled.regions,
    unitScale: placement.scale,
    unitSource: placement.unitSource,
    ignoredElements,
    flippedAboutViewBox: placement.flippedAboutViewBox,
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

/** Root transform plus the unit decision it encodes. */
interface SvgPlacement {
  /** User-unit → millimetre matrix, including the Y reflection. */
  matrix: Matrix;
  /** Millimetres per user unit on the X axis (the uniform scale unless
   *  `preserveAspectRatio="none"`). */
  scale: number;
  unitSource: string;
  flippedAboutViewBox: boolean;
}

/** A `height` with a known length: an absolute unit or a unitless CSS pixel
 *  count. Percentage heights have no absolute size here, so they stay null. */
function physicalHeightMm(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const suffix = raw.trim().match(/[a-z%]+$/i)?.[0].toLowerCase();
  if (suffix === '%' || (suffix !== undefined && !isLengthUnit(suffix))) return null;
  const mm = lengthToMm(raw, '<svg> height');
  return mm !== null && mm > 0 ? mm : null;
}

/** Decide the root matrix: `opts.units` first, then the declared viewport
 *  (`width`/`height` over the viewBox with `preserveAspectRatio`), then the
 *  width-only uniform scale, then the CSS-pixel default. A unitless width or
 *  height is a CSS pixel count, so it takes part in the viewport scale exactly
 *  like `width="192px"` does. */
function resolveSvgPlacement(
  root: Tag,
  viewBox: ViewBox | null,
  opts: ImportSvgOptions,
): SvgPlacement {
  const flipAbout = resolveFlipAbout(root, viewBox);
  if (opts.units !== undefined) {
    return unitPlacement(opts.units, viewBox, flipAbout);
  }
  const widthAttr = root.attrs.width;
  const widthMm = widthAttr !== undefined ? lengthToMm(widthAttr, '<svg> width') : null;
  if (viewBox && widthMm !== null && widthMm > 0) {
    const heightMm = physicalHeightMm(root.attrs.height);
    if (heightMm !== null) return viewportPlacement(root, viewBox, widthMm, heightMm, flipAbout !== null);
    return widthPlacement(widthAttr!, widthMm, viewBox, flipAbout);
  }
  return pixelPlacement(viewBox, flipAbout);
}

function frame(sx: number, sy: number, tx: number, ty: number): Matrix {
  return [sx, 0, 0, -sy, tx, ty];
}

function unitPlacement(unit: NonNullable<ImportSvgOptions['units']>, viewBox: ViewBox | null, flipAbout: number | null): SvgPlacement {
  const s = MM_PER_UNIT[unit];
  return {
    matrix: frame(s, s, viewBox ? -s * viewBox.minX : 0, s * (flipAbout ?? 0)),
    scale: s,
    unitSource: `opts.units=${unit}`,
    flippedAboutViewBox: flipAbout !== null,
  };
}

function widthPlacement(widthAttr: string, widthMm: number, viewBox: ViewBox, flipAbout: number | null): SvgPlacement {
  const s = widthMm / viewBox.width;
  return {
    matrix: frame(s, s, -s * viewBox.minX, s * (flipAbout ?? 0)),
    scale: s,
    unitSource: `width='${widthAttr.trim()}' over viewBox width ${viewBox.width}`,
    flippedAboutViewBox: flipAbout !== null,
  };
}

function pixelPlacement(viewBox: ViewBox | null, flipAbout: number | null): SvgPlacement {
  const s = MM_PER_UNIT.px;
  return {
    matrix: frame(s, s, viewBox ? -s * viewBox.minX : 0, s * (flipAbout ?? 0)),
    scale: s,
    unitSource: 'assumed 1 user unit = 1 CSS px (1/96 in); no physically-dimensioned width',
    flippedAboutViewBox: flipAbout !== null,
  };
}

/** `width` + `height` + `viewBox`: scale and align the viewBox inside the
 *  physical viewport exactly as SVG `preserveAspectRatio` specifies. */
function viewportPlacement(
  root: Tag,
  viewBox: ViewBox,
  widthMm: number,
  heightMm: number,
  flippedAboutViewBox: boolean,
): SvgPlacement {
  const aspect = parsePreserveAspectRatio(root.attrs.preserveAspectRatio);
  const sx = widthMm / viewBox.width;
  const sy = heightMm / viewBox.height;
  const source = `width='${root.attrs.width!.trim()}' and height='${root.attrs.height!.trim()}' ` +
    `over viewBox ${viewBox.width} x ${viewBox.height}`;
  if (aspect.mode === 'none') {
    // Non-uniform: each axis fills the viewport, so there is no alignment.
    return {
      matrix: [sx, 0, 0, -sy, -sx * viewBox.minX, heightMm + sy * viewBox.minY],
      scale: sx,
      unitSource: `${source}, preserveAspectRatio='none' (non-uniform)`,
      flippedAboutViewBox,
    };
  }
  const s = aspect.mode === 'slice' ? Math.max(sx, sy) : Math.min(sx, sy);
  const offsetX = (widthMm - s * viewBox.width) * aspect.alignX;
  const offsetY = (heightMm - s * viewBox.height) * aspect.alignY;
  return {
    matrix: [s, 0, 0, -s, offsetX - s * viewBox.minX, heightMm - offsetY + s * viewBox.minY],
    scale: s,
    unitSource: `${source}, ${aspect.token} ${aspect.mode}`,
    flippedAboutViewBox,
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

/** Emit one geometry element into the sink; throws for elements kernelCAD
 *  cannot resolve. Group (`<g>`) handling stays in the caller. */
function emitGeometryElement(
  lower: string,
  tag: Tag,
  m: Matrix,
  sink: ElementSink,
): void {
  switch (lower) {
    case 'path': emitPath(tag, m, sink); break;
    case 'rect': emitRect(tag, m, sink); break;
    case 'circle': emitCircle(tag, m, sink); break;
    case 'ellipse':
      emitEllipse(
        m, sink,
        attrNum(tag, 'cx', 0), attrNum(tag, 'cy', 0),
        attrNum(tag, 'rx', null), attrNum(tag, 'ry', null),
        `<ellipse> at offset ${tag.offset}`,
      );
      break;
    case 'polygon': emitPolyish(tag, m, sink, true); break;
    case 'polyline': emitPolyish(tag, m, sink, false); break;
    case 'line': emitLine(tag, m, sink); break;
    case 'text':
    case 'tspan':
    case 'image':
    case 'foreignobject':
      throw new SvgParseError(
        'unsupported-element',
        `<${tag.name}> at offset ${tag.offset}: this element carries geometry kernelCAD cannot ` +
          'resolve here (glyph outlines or raster content), and skipping it would leave ' +
          'the profile silently incomplete. Convert it to paths in the source tool ' +
          '(Inkscape: Path > Object to Path; Illustrator: Create Outlines / Expand).',
      );
    default:
      throw new SvgParseError(
        'unsupported-element',
        `<${tag.name}> at offset ${tag.offset}: unrecognised SVG element. kernelCAD reads ` +
          'path, rect, circle, ellipse, polygon, polyline, line, g and use.',
      );
  }
}

export type { ImportedRegion };
