// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/expr.ts
//
// Tiny expression tree for emitted coordinates. Every coordinate of the
// rebuilt profile is either a literal, a declared param, or sums/differences/
// halves of those, so the emitted `.kcad.ts` keeps the dimension structure of
// the drawing (move `width` and everything measured from the right edge
// follows). Numbers fold eagerly; rendering uses the ParamRef method API
// (`add` / `subtract` / `negate` / `divide`) because JS operators do not
// work on params.

export type Expr =
  | { k: 'num'; v: number }
  | { k: 'param'; name: string; v: number }
  | { k: 'add'; a: Expr; b: Expr; v: number }
  | { k: 'sub'; a: Expr; b: Expr; v: number }
  | { k: 'half'; a: Expr; v: number };

export const num = (v: number): Expr => ({ k: 'num', v });
export const ref = (name: string, v: number): Expr => ({ k: 'param', name, v });

export function add(a: Expr, b: Expr): Expr {
  if (a.k === 'num' && b.k === 'num') return num(a.v + b.v);
  if (a.k === 'num' && a.v === 0) return b;
  if (b.k === 'num' && b.v === 0) return a;
  return { k: 'add', a, b, v: a.v + b.v };
}

export function sub(a: Expr, b: Expr): Expr {
  if (a.k === 'num' && b.k === 'num') return num(a.v - b.v);
  if (b.k === 'num' && b.v === 0) return a;
  // a − (a − c) = c: a mirror of a position measured from the far end.
  if (b.k === 'sub' && renderExpr(b.a) === renderExpr(a)) return b.b;
  return { k: 'sub', a, b, v: a.v - b.v };
}

export function half(a: Expr): Expr {
  if (a.k === 'num') return num(a.v / 2);
  return { k: 'half', a, v: a.v / 2 };
}

/** Round for source text: 4 decimals, no trailing zeros, no `-0`. */
export function fmtNum(v: number): string {
  const r = Math.round(v * 10000) / 10000;
  return Object.is(r, -0) ? '0' : String(r);
}

const isNum = (e: Expr): e is { k: 'num'; v: number } => e.k === 'num';

/** Render as `.kcad.ts` source. */
export function renderExpr(e: Expr): string {
  switch (e.k) {
    case 'num':
      return fmtNum(e.v);
    case 'param':
      return e.name;
    case 'add':
      if (isNum(e.a)) return `${renderExpr(e.b)}.add(${fmtNum(e.a.v)})`;
      return `${renderExpr(e.a)}.add(${renderExpr(e.b)})`;
    case 'sub':
      if (isNum(e.a)) {
        return e.a.v === 0 ? `${renderExpr(e.b)}.negate()` : `${renderExpr(e.b)}.negate().add(${fmtNum(e.a.v)})`;
      }
      return `${renderExpr(e.a)}.subtract(${renderExpr(e.b)})`;
    case 'half':
      return `${renderExpr(e.a)}.divide(2)`;
  }
}

/** Param names an expression reads. */
export function paramsOf(e: Expr, out = new Set<string>()): Set<string> {
  if (e.k === 'param') out.add(e.name);
  else if (e.k === 'add' || e.k === 'sub') { paramsOf(e.a, out); paramsOf(e.b, out); }
  else if (e.k === 'half') paramsOf(e.a, out);
  return out;
}
