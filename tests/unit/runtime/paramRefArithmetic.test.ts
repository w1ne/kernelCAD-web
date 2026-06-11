// tests/unit/runtime/paramRefArithmetic.test.ts
//
// Regression tests for the ParamRef arithmetic methods (.add, .subtract,
// .multiply, .divide, .negate). Verifies AST construction, AST-walk
// resolution against a ParamTable, table-update reactivity, cross-type
// rejection, and dependency-collection over composed expressions.

import { describe, it, expect } from 'vitest';
import { makeParamRef, isParamRef, type ParamRefExpr } from '../../../src/shared/runtime/paramRef';
import { ParamTable } from '../../../src/shared/runtime/paramTable';
import { resolveExpr, resolveParams, collectParamRefs } from '../../../src/shared/runtime/resolveParams';
import { toParam } from '../../../src/shared/runtime/editableHelpers';

function declared(table: ParamTable, name: string, value: number): void {
  table.declare(name, 'number', value);
}

describe('ParamRef arithmetic methods', () => {
  it('.add(number) builds a binop AST and resolves correctly', () => {
    const t = new ParamTable();
    declared(t, 'x', 10);
    const x = makeParamRef<number>('x', 'number');
    const expr = x.add(5);
    expect(isParamRef(expr)).toBe(true);
    expect(expr._expr.kind).toBe('binop');
    expect(resolveExpr(expr._expr, t)).toBe(15);
  });

  it('.subtract(number) resolves correctly', () => {
    const t = new ParamTable();
    declared(t, 'x', 10);
    const x = makeParamRef<number>('x', 'number');
    expect(resolveExpr(x.subtract(3)._expr, t)).toBe(7);
  });

  it('.multiply(number) resolves correctly', () => {
    const t = new ParamTable();
    declared(t, 'r', 5);
    const r = makeParamRef<number>('r', 'number');
    expect(resolveExpr(r.multiply(2)._expr, t)).toBe(10);
  });

  it('.divide(number) resolves correctly', () => {
    const t = new ParamTable();
    declared(t, 'r', 10);
    const r = makeParamRef<number>('r', 'number');
    expect(resolveExpr(r.divide(2)._expr, t)).toBe(5);
  });

  it('.negate() resolves correctly', () => {
    const t = new ParamTable();
    declared(t, 'x', 7);
    const x = makeParamRef<number>('x', 'number');
    expect(resolveExpr(x.negate()._expr, t)).toBe(-7);
  });

  it('chained .add(5).divide(2) builds nested AST and resolves correctly', () => {
    const t = new ParamTable();
    declared(t, 'x', 10);
    const x = makeParamRef<number>('x', 'number');
    const y = x.add(5).divide(2);
    expect(resolveExpr(y._expr, t)).toBe(7.5);
    // Outer node should be the divide.
    expect(y._expr.kind).toBe('binop');
    if (y._expr.kind === 'binop') {
      expect(y._expr.op).toBe('/');
      expect(y._expr.left.kind).toBe('binop');
    }
  });

  it('mixed operands (paramRef + paramRef) resolve against the table', () => {
    const t = new ParamTable();
    declared(t, 'a', 4);
    declared(t, 'b', 3);
    const a = makeParamRef<number>('a', 'number');
    const b = makeParamRef<number>('b', 'number');
    expect(resolveExpr(a.add(b)._expr, t)).toBe(7);
    expect(resolveExpr(a.multiply(b)._expr, t)).toBe(12);
    expect(resolveExpr(a.subtract(b)._expr, t)).toBe(1);
    expect(resolveExpr(a.divide(b)._expr, t)).toBeCloseTo(4 / 3, 10);
  });

  it('debug $param string reflects the composed expression', () => {
    const x = makeParamRef<number>('x', 'number');
    expect(x.$param).toBe('x');
    expect(x.divide(2).$param).toBe('(x / 2)');
    expect(x.add(5).divide(2).$param).toBe('((x + 5) / 2)');
    expect(x.negate().$param).toBe('(-x)');
  });

  it('arithmetic on a boolean ParamRef throws feature.invalid-args', () => {
    const flag = makeParamRef<boolean>('flag', 'boolean');
    // Cast: TypeScript narrows .add to the numeric overload via `this`-typing,
    // but we want to verify the runtime guard for callers that bypass the
    // type system (e.g. .kcad.ts authored without strict types).
    const bogus = flag as unknown as ReturnType<typeof makeParamRef<number>>;
    expect(() => bogus.add(1)).toThrow(/numeric ParamRef/);
    expect(() => bogus.divide(2)).toThrow(/numeric ParamRef/);
    expect(() => bogus.negate()).toThrow(/numeric ParamRef/);
  });

  it('numeric receiver rejects boolean ParamRef as operand', () => {
    const x = makeParamRef<number>('x', 'number');
    const flag = makeParamRef<boolean>('flag', 'boolean');
    const bogus = flag as unknown as ReturnType<typeof makeParamRef<number>>;
    expect(() => x.add(bogus)).toThrow(/numeric ParamRef/);
    expect(() => x.multiply(bogus)).toThrow(/numeric ParamRef/);
  });

  it('numeric literal operand must be finite', () => {
    const x = makeParamRef<number>('x', 'number');
    expect(() => x.add(Number.NaN)).toThrow(/finite number/);
    expect(() => x.multiply(Number.POSITIVE_INFINITY)).toThrow(/finite number/);
  });

  it('division by literal 0 builds valid AST but throws at evaluation', () => {
    const t = new ParamTable();
    declared(t, 'x', 10);
    const x = makeParamRef<number>('x', 'number');
    const y = x.divide(0);
    // AST construction succeeds — no eager arithmetic in capture.
    expect(y._expr.kind).toBe('binop');
    expect(() => resolveExpr(y._expr, t)).toThrow(/division by zero/);
  });

  it('division by zero through table-resolved param throws at evaluation', () => {
    const t = new ParamTable();
    declared(t, 'x', 10);
    declared(t, 'd', 0);
    const x = makeParamRef<number>('x', 'number');
    const d = makeParamRef<number>('d', 'number');
    const y = x.divide(d);
    expect(() => resolveExpr(y._expr, t)).toThrow(/division by zero/);
  });

  it('table updates reflow through composed expressions', () => {
    const t = new ParamTable();
    declared(t, 'x', 10);
    const x = makeParamRef<number>('x', 'number');
    const half = x.divide(2);
    expect(resolveExpr(half._expr, t)).toBe(5);
    t.set('x', 20);
    expect(resolveExpr(half._expr, t)).toBe(10);
  });

  it('toParam stores AST for composed ParamRefs and resolveParams refreshes evaluated', () => {
    const t = new ParamTable();
    declared(t, 'r', 10);
    const r = makeParamRef<number>('r', 'number');
    const half = r.divide(2);
    const param = toParam(half, 'mm');
    // AST is stored, not a string.
    expect(typeof param.paramRef).toBe('object');
    const expr = param.paramRef as ParamRefExpr;
    expect(expr.kind).toBe('binop');

    const resolved = resolveParams({ radius: param }, t) as { radius: { evaluated: number } };
    expect(resolved.radius.evaluated).toBe(5);

    // Update the table; resolveParams reflects the change.
    t.set('r', 30);
    const resolved2 = resolveParams({ radius: param }, t) as { radius: { evaluated: number } };
    expect(resolved2.radius.evaluated).toBe(15);
  });

  it('toParam keeps leaf ParamRef as bare-name string (back-compat)', () => {
    const r = makeParamRef<number>('r', 'number');
    const param = toParam(r, 'mm');
    expect(typeof param.paramRef).toBe('string');
    expect(param.paramRef).toBe('r');
  });

  it('collectParamRefs walks the AST and returns all leaf names', () => {
    const t = new ParamTable();
    declared(t, 'a', 1);
    declared(t, 'b', 2);
    declared(t, 'c', 3);
    const a = makeParamRef<number>('a', 'number');
    const b = makeParamRef<number>('b', 'number');
    const c = makeParamRef<number>('c', 'number');
    // Expression: ((a + b) * c) - a    →  leaves {a, b, c} (a appears twice).
    const expr = a.add(b).multiply(c).subtract(a);
    const blob = { x: toParam(expr, 'mm') };
    const refs = collectParamRefs(blob);
    expect(refs.size).toBe(3);
    expect(refs.has('a')).toBe(true);
    expect(refs.has('b')).toBe(true);
    expect(refs.has('c')).toBe(true);
  });

  it('collectParamRefs unions string-shorthand and AST-shaped paramRefs', () => {
    const x = makeParamRef<number>('x', 'number');
    const y = makeParamRef<number>('y', 'number');
    const blob = {
      a: toParam(x, 'mm'),                 // leaf: paramRef is 'x' string
      b: toParam(y.add(1), 'mm'),          // composed: paramRef is AST
    };
    const refs = collectParamRefs(blob);
    expect(refs.size).toBe(2);
    expect(refs.has('x')).toBe(true);
    expect(refs.has('y')).toBe(true);
  });
});

describe('ParamRef JS-coercion guard (Symbol.toPrimitive)', () => {
  it('JS + on a ParamRef throws loudly with the .add hint (no [object Object] concat)', () => {
    const w = makeParamRef<number>('fingerWidth', 'number');
    let caught: unknown;
    try {
      // Deliberate misuse — the #439 trap.
      void ((w as unknown as number) + 4);
    } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect(String(caught)).toMatch(/JS arithmetic on a ParamRef/);
    expect((caught as { hint?: string }).hint).toMatch(/\.add\(n\)/);
    expect((caught as { code?: string }).code).toBe('feature.invalid-args');
  });

  it('JS * and / on a ParamRef throw the same loud error', () => {
    const r = makeParamRef<number>('r', 'number');
    expect(() => (r as unknown as number) * 2).toThrow(/JS arithmetic on a ParamRef/);
    expect(() => (r as unknown as number) / 2).toThrow(/JS arithmetic on a ParamRef/);
  });

  it('Math.* numeric coercion of a ParamRef throws instead of producing NaN', () => {
    const r = makeParamRef<number>('r', 'number');
    expect(() => Math.max(r as unknown as number, 0)).toThrow(/JS arithmetic on a ParamRef/);
  });

  it('string contexts render the symbolic expression, not [object Object]', () => {
    const r = makeParamRef<number>('r', 'number');
    expect(`${r}`).toBe('r');
    expect(String(r)).toBe('r');
    expect(r.divide(2).toString()).toBe('(r / 2)');
  });

  it('coercion guard does NOT freeze parametric semantics — derived refs still reflow', () => {
    const t = new ParamTable();
    declared(t, 'w', 18);
    const w = makeParamRef<number>('w', 'number');
    const derived = w.add(4);
    expect(resolveExpr(derived._expr, t)).toBe(22);
    t.set('w', 30);
    expect(resolveExpr(derived._expr, t)).toBe(34);
  });
});
