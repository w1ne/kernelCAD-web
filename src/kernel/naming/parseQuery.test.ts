// src/kernel/naming/parseQuery.test.ts
//
// Q7 — failing tests for the @kcq[...] string DSL parser. The parser is a
// hand-rolled recursive descent (spec §13 + R7.8) over the grammar from
// spec §3.5. Round-trip: parseQuery(formatQueryAsString(q)) is structurally
// equal to q for every shape the constructors can build.

import { describe, it, expect } from 'vitest';
import { parseQuery, formatQueryAsString } from './parseQuery';
import { q } from './queryConstructors';
import { KernelError } from '../../shared/intent/kernelError';

describe('parseQuery — @kcq[...] string DSL (Q7)', () => {
  it('parses face(createdBy("arm"))', () => {
    const v = parseQuery('@kcq[face(createdBy("arm"))]');
    expect(v.target).toBe('face');
    expect(v.ast.op).toBe('entityFilter');
  });

  it('parses union(face(createdBy("a")), face(createdBy("b")))', () => {
    const v = parseQuery('@kcq[union(face(createdBy("a")), face(createdBy("b")))]');
    expect(v.ast.op).toBe('union');
    if (v.ast.op !== 'union') throw new Error('unreachable');
    expect(v.ast.queries.length).toBe(2);
  });

  it('parses face(createdBy("arm"), closestTo([0,0,10]))', () => {
    const v = parseQuery('@kcq[face(createdBy("arm"), closestTo([0,0,10]))]');
    expect(v.target).toBe('face');
  });

  it('parses nothing()', () => {
    const v = parseQuery('@kcq[nothing()]');
    expect(v.ast.op).toBe('nothing');
  });

  it('parses everything(face)', () => {
    const v = parseQuery('@kcq[everything(face)]');
    expect(v.ast.op).toBe('everything');
    if (v.ast.op !== 'everything') throw new Error('unreachable');
    expect(v.ast.kind).toBe('face');
  });

  it('parses subtraction(a, b)', () => {
    const v = parseQuery('@kcq[subtraction(face(createdBy("a")), face(createdBy("b")))]');
    expect(v.ast.op).toBe('subtraction');
  });

  it('parses nested set algebra: union(intersection(a, b), c)', () => {
    const v = parseQuery(
      '@kcq[union(intersection(face(createdBy("a")), face(geometryType(PLANE))), face(withLabel("lid")))]',
    );
    expect(v.ast.op).toBe('union');
  });

  it('round-trips: parse → formatQueryAsString → parse again equals the original AST', () => {
    const a = parseQuery('@kcq[face(createdBy("arm"))]');
    const s = formatQueryAsString(a);
    const b = parseQuery(s);
    expect(b.ast).toEqual(a.ast);
  });

  it('rejects @kcq[ without closing ]', () => {
    expect.assertions(2);
    try {
      parseQuery('@kcq[face(createdBy("arm"))');
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('query.invalid-syntax');
    }
  });

  it('rejects @kcq[face(unknownOp())]', () => {
    expect.assertions(2);
    try {
      parseQuery('@kcq[face(unknownOp())]');
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('query.invalid-syntax');
    }
  });

  it('rejects input that does not start with @kcq[', () => {
    expect.assertions(2);
    try {
      parseQuery('face(createdBy("arm"))');
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('query.invalid-syntax');
    }
  });

  it('rejects bare @kc[...] (the dispatcher routes those, not parseQuery)', () => {
    // parseQuery handles ONLY @kcq[...]; @kc[...] without the trailing `q`
    // is rejected so the dispatcher level (parseAnyTopologyInput) can
    // route to parseTopoRef.
    expect.assertions(2);
    try {
      parseQuery('@kc[base/face/top]');
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('query.invalid-syntax');
    }
  });

  it('formatQueryAsString round-trips a constructor-built face filter', () => {
    const built = q.face(q.createdBy('arm'));
    const text = formatQueryAsString(built);
    const back = parseQuery(text);
    expect(back.ast).toEqual(built.ast);
  });

  it('formatQueryAsString round-trips a union of face filters', () => {
    const built = q.union(q.face(q.createdBy('a')), q.face(q.createdBy('b')));
    const text = formatQueryAsString(built);
    const back = parseQuery(text);
    expect(back.ast).toEqual(built.ast);
  });
});
