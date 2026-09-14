// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/profileParams.ts
//
// Named dimension params for rectilinear profiles.
//
// A profile made of axis-aligned lines — joined directly or through tangent
// quarter-round corners — is re-expressed as corner coordinates drawn from
// params: the base block's extents become `length` (X) and `width` (Y); a
// later block reuses any coordinate it shares with earlier blocks (a step
// flush with the base end stays flush when `length` changes) and adds its own
// extent / offset params for the rest; corner rounds share one radius param
// per distinct radius. Anything else keeps literal coordinates.

import type { V2 } from './geom';
import type { ProfilePrim } from './profileFit';

export interface Corner {
  x: number;
  y: number;
  /** Corner round radius; 0 for a sharp corner. */
  r: number;
  /** Unit direction of the incoming and outgoing edge. */
  inDir: V2;
  outDir: V2;
}

export interface CornerExpr {
  x: string;
  y: string;
  /** Radius param of a rounded corner. */
  r?: string;
  inDir: V2;
  outDir: V2;
}

export interface ParamProfile {
  kind: 'rectangle' | 'rectilinear';
  corners: CornerExpr[];
}

/**
 * Corners of a closed chain of lines within `angleTol` (rad) of the X or Y
 * axis, meeting at right angles either directly or through one tangent arc.
 * Returns undefined for any other outline.
 */
export function rectilinearCorners(prims: ProfilePrim[], angleTol: number, posTol: number): Corner[] | undefined {
  const firstLine = prims.findIndex((p) => p.kind === 'line');
  if (firstLine < 0) return undefined;
  const seq = [...prims.slice(firstLine), ...prims.slice(0, firstLine)];
  const lines: Array<{ a: V2; b: V2; dir: V2; arcBefore?: Extract<ProfilePrim, { kind: 'arc' }> }> = [];
  let pendingArc: Extract<ProfilePrim, { kind: 'arc' }> | undefined;
  for (const p of seq) {
    if (p.kind === 'arc') {
      if (pendingArc) return undefined;
      pendingArc = p;
      continue;
    }
    const dx = p.b[0] - p.a[0];
    const dy = p.b[1] - p.a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return undefined;
    const ang = Math.atan2(dy, dx);
    const q = Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(ang - q) > angleTol) return undefined;
    lines.push({ a: p.a, b: p.b, dir: [Math.round(Math.cos(q)), Math.round(Math.sin(q))], arcBefore: pendingArc });
    pendingArc = undefined;
  }
  if (lines.length < 4) return undefined;
  if (pendingArc) lines[0].arcBefore = pendingArc;
  const corners: Corner[] = [];
  for (let i = 0; i < lines.length; i++) {
    const prev = lines[(i - 1 + lines.length) % lines.length];
    const cur = lines[i];
    // Consecutive edges must turn by a right angle.
    if (Math.abs(prev.dir[0] * cur.dir[0] + prev.dir[1] * cur.dir[1]) > 1e-9) return undefined;
    // The vertical edge fixes x, the horizontal one fixes y.
    const vertical = prev.dir[0] === 0 ? prev : cur;
    const horizontal = prev.dir[0] === 0 ? cur : prev;
    const x = (vertical.a[0] + vertical.b[0]) / 2;
    const y = (horizontal.a[1] + horizontal.b[1]) / 2;
    let r = 0;
    if (cur.arcBefore) {
      r = cur.arcBefore.r;
      // Centre one radius in from both edges, on the inside of the turn.
      const cx = x + r * (cur.dir[0] - prev.dir[0]);
      const cy = y + r * (cur.dir[1] - prev.dir[1]);
      if (Math.hypot(cur.arcBefore.c[0] - cx, cur.arcBefore.c[1] - cy) > posTol) return undefined;
      // A tangent round starts r before the corner and ends r after it.
      const startOk = Math.hypot(cur.arcBefore.a[0] - (x - prev.dir[0] * r), cur.arcBefore.a[1] - (y - prev.dir[1] * r)) <= posTol;
      const endOk = Math.hypot(cur.arcBefore.b[0] - (x + cur.dir[0] * r), cur.arcBefore.b[1] - (y + cur.dir[1] * r)) <= posTol;
      if (!startOk || !endOk) return undefined;
    }
    corners.push({ x, y, r, inDir: prev.dir, outDir: cur.dir });
  }
  return corners;
}

export type AddParam = (name: string, value: number, measured: number, description: string) => string;

/** Maps coordinate values to param expressions, shared across blocks. */
export class CoordinateBook {
  private readonly values: Record<'x' | 'y', Array<{ v: number; expr: string }>> = {
    x: [{ v: 0, expr: '0' }],
    y: [{ v: 0, expr: '0' }],
  };
  private readonly tol: number;

  constructor(tol: number) {
    this.tol = tol;
  }

  lookup(axis: 'x' | 'y', v: number): string | undefined {
    return this.values[axis].find((e) => Math.abs(e.v - v) <= this.tol)?.expr;
  }

  bind(axis: 'x' | 'y', v: number, expr: string): void {
    if (!this.lookup(axis, v)) this.values[axis].push({ v, expr });
  }
}

/** `base ± delta` where `delta` is a param expression and `base` a param expression or a number literal. */
function offsetExpr(base: string, delta: string, sign: 1 | -1): string {
  if (base === '0') return sign > 0 ? delta : `${delta}.negate()`;
  if (/^-?\d/.test(base)) return sign > 0 ? `${delta}.add(${base})` : `${delta}.negate().add(${base})`;
  return `${base}.${sign > 0 ? 'add' : 'subtract'}(${delta})`;
}

/**
 * Param-driven corners for one block's rectilinear outline. `measuredOf`
 * returns the unsnapped value of a snapped coordinate (for the ledger).
 */
export function paramProfile(
  block: number,
  corners: Corner[],
  book: CoordinateBook,
  addParam: AddParam,
  measuredOf: (axis: 'x' | 'y', v: number) => number,
  radiusExpr: (r: number) => string | undefined,
): ParamProfile {
  const rectangle = corners.length === 4;
  const axes: Array<{ axis: 'x' | 'y'; extent: string; offset: string; extra: string; label: string }> = [
    { axis: 'x', extent: block === 1 ? 'length' : `block${block}Length`, offset: `block${block}X`, extra: block === 1 ? 'profileX' : `block${block}X`, label: 'X' },
    { axis: 'y', extent: block === 1 ? 'width' : `block${block}Width`, offset: `block${block}Y`, extra: block === 1 ? 'profileY' : `block${block}Y`, label: 'Y' },
  ];
  for (const { axis, extent, offset, extra, label } of axes) {
    const vals = [...new Set(corners.map((c) => (axis === 'x' ? c.x : c.y)))].sort((p, q) => p - q);
    const lo = vals[0];
    const hi = vals[vals.length - 1];
    const span = (a: number, b: number) => measuredOf(axis, b) - measuredOf(axis, a);
    // Outer extent first: it is the dimension a reader looks for.
    const eLo = book.lookup(axis, lo);
    const eHi = book.lookup(axis, hi);
    if (eLo && !eHi) {
      const p = addParam(extent, hi - lo, span(lo, hi), `Profile size along ${label}${block === 1 ? '' : ` of block ${block}`}.`);
      book.bind(axis, hi, offsetExpr(eLo, p, 1));
    } else if (!eLo && eHi) {
      const p = addParam(extent, hi - lo, span(lo, hi), `Profile size along ${label}${block === 1 ? '' : ` of block ${block}`}.`);
      book.bind(axis, lo, offsetExpr(eHi, p, -1));
    } else if (!eLo && !eHi) {
      const o = addParam(offset, lo, measuredOf(axis, lo), `Profile offset along ${label} of block ${block}.`);
      book.bind(axis, lo, o);
      const p = addParam(extent, hi - lo, span(lo, hi), `Profile size along ${label} of block ${block}.`);
      book.bind(axis, hi, offsetExpr(o, p, 1));
    }
    if (!rectangle) {
      let n = 0;
      for (const v of vals) {
        if (book.lookup(axis, v)) continue;
        n++;
        const p = addParam(`${extra}${n}`, v, measuredOf(axis, v), `Profile corner coordinate along ${label}${block === 1 ? '' : ` of block ${block}`}.`);
        book.bind(axis, v, p);
      }
    }
  }
  return {
    kind: rectangle ? 'rectangle' : 'rectilinear',
    corners: corners.map((c) => ({
      x: book.lookup('x', c.x)!,
      y: book.lookup('y', c.y)!,
      ...(c.r > 0 ? { r: radiusExpr(c.r) } : {}),
      inDir: c.inDir,
      outDir: c.outDir,
    })),
  };
}

/** `coord ± r` along an axis direction component, as a param expression. */
export function shift(coord: string, r: string, component: number): string {
  if (component === 0) return coord;
  return offsetExpr(coord, r, component > 0 ? 1 : -1);
}
