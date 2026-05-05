// tests/unit/runtime/resolveParams.test.ts
//
// Phase-1 unit tests for the dispatcher pre-resolve walker. Verifies that
// (a) Params with `paramRef` are substituted with current table values,
// (b) Params without `paramRef` pass through untouched,
// (c) nested objects/arrays/non-Param scalars are walked correctly,
// (d) `collectParamRefs` returns the same set of names that resolveParams
//     would substitute.

import { describe, it, expect } from 'vitest';
import { resolveParams, collectParamRefs } from '../../../src/runtime/resolveParams';
import { ParamTable } from '../../../src/runtime/paramTable';
import type { Param } from '../../../src/intent/types';

const literal = (n: number, unit: 'mm' | 'deg' | 'unitless' = 'mm'): Param => ({
  expression: String(n),
  unit,
  evaluated: n,
});

const sym = (name: string, currentEvaluated: number, unit: 'mm' | 'deg' | 'unitless' = 'mm'): Param => ({
  expression: `{$param:${name}}`,
  unit,
  evaluated: currentEvaluated,
  paramRef: name,
});

describe('resolveParams', () => {
  it('substitutes Params with paramRef from the table', () => {
    const t = new ParamTable();
    t.declare('boltDia', 'number', 5);
    t.set('boltDia', 8);

    const blob = { diameter: sym('boltDia', 5) };
    const out = resolveParams(blob, t) as { diameter: Param };
    expect(out.diameter.evaluated).toBe(8);
    expect(out.diameter.paramRef).toBe('boltDia');
    // Original blob untouched (immutability check)
    expect(blob.diameter.evaluated).toBe(5);
  });

  it('passes literal Params through untouched (same reference when nothing changes)', () => {
    const t = new ParamTable();
    const blob = { diameter: literal(5) };
    const out = resolveParams(blob, t) as { diameter: Param };
    expect(out).toBe(blob);
    expect(out.diameter).toBe(blob.diameter);
  });

  it('walks nested objects (counterbore.diameter)', () => {
    const t = new ParamTable();
    t.declare('cbDia', 'number', 11);
    t.set('cbDia', 12);
    const blob = {
      diameter: literal(6),
      counterbore: { diameter: sym('cbDia', 11), depth: literal(4) },
    };
    const out = resolveParams(blob, t) as typeof blob;
    expect(out.counterbore.diameter.evaluated).toBe(12);
    expect(out.diameter.evaluated).toBe(6);
    expect(out.counterbore.depth.evaluated).toBe(4);
  });

  it('walks arrays (positions[i].u and positions[i].v)', () => {
    const t = new ParamTable();
    t.declare('uOffset', 'number', 50);
    t.set('uOffset', 60);
    const blob = {
      positions: [
        { u: sym('uOffset', 50), v: literal(-30) },
        { u: literal(-50), v: literal(-30) },
      ],
    };
    const out = resolveParams(blob, t) as typeof blob;
    expect(out.positions[0].u.evaluated).toBe(60);
    expect(out.positions[0].v.evaluated).toBe(-30);
    expect(out.positions[1].u.evaluated).toBe(-50);
  });

  it('preserves non-Param scalars (strings, numbers, booleans, null) untouched', () => {
    const t = new ParamTable();
    const blob = {
      face: 'top',
      depth: 'through',
      enabled: true,
      raw: 5,
      maybe: null,
      gone: undefined,
    };
    const out = resolveParams(blob, t) as typeof blob;
    expect(out).toBe(blob);
  });

  it('throws on unknown paramRef (unknown-name hint)', () => {
    const t = new ParamTable();
    const blob = { diameter: sym('mystery', 5) };
    let err: unknown;
    try { resolveParams(blob, t); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect((err as { code?: string }).code).toBe('feature.invalid-args');
    expect((err as { hint?: string }).hint).toContain('invalid-args.param.unknown-name');
  });

  it('boolean params resolve to 0/1 in evaluated (numeric placeholder)', () => {
    const t = new ParamTable();
    t.declare('toggle', 'boolean', true);
    const blob = { flag: sym('toggle', 1) };
    const out = resolveParams(blob, t) as { flag: Param };
    expect(out.flag.evaluated).toBe(1);
    t.set('toggle', false);
    const out2 = resolveParams(blob, t) as { flag: Param };
    expect(out2.flag.evaluated).toBe(0);
  });
});

describe('collectParamRefs', () => {
  it('collects refs from nested structures', () => {
    const blob = {
      diameter: sym('boltDia', 5),
      counterbore: { diameter: sym('cbDia', 11), depth: literal(4) },
      positions: [
        { u: sym('uOffset', 50), v: literal(-30) },
        { u: literal(50), v: sym('vOffset', 30) },
      ],
    };
    const refs = collectParamRefs(blob);
    expect(refs.size).toBe(4);
    expect(refs.has('boltDia')).toBe(true);
    expect(refs.has('cbDia')).toBe(true);
    expect(refs.has('uOffset')).toBe(true);
    expect(refs.has('vOffset')).toBe(true);
  });

  it('returns empty set for fully-literal blob', () => {
    const blob = { diameter: literal(5), counterbore: { diameter: literal(11) } };
    const refs = collectParamRefs(blob);
    expect(refs.size).toBe(0);
  });

  it('deduplicates the same ref appearing multiple places', () => {
    const blob = {
      a: sym('shared', 1),
      b: sym('shared', 1),
      nested: { c: sym('shared', 1) },
    };
    const refs = collectParamRefs(blob);
    expect(refs.size).toBe(1);
    expect(refs.has('shared')).toBe(true);
  });
});
