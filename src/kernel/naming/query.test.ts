import { describe, it, expect } from 'vitest';
import { q } from './queryConstructors';
import type { Query } from './query';

describe('Query value type — Q2', () => {
  it('kc.q.face() returns a Query with target "face" and ast.op "everything"', () => {
    const v: Query<unknown> = q.face();
    expect(v._kind).toBe('kc.query');
    expect(v.target).toBe('face');
    expect(v.ast.op).toBe('everything');
  });

  it('kc.q.face(kc.q.createdBy("arm")) wraps the createdBy filter under entityFilter', () => {
    const v = q.face(q.createdBy('arm'));
    expect(v.target).toBe('face');
    expect(v.ast.op).toBe('entityFilter');
    if (v.ast.op !== 'entityFilter') throw new Error('unreachable');
    expect(v.ast.kind).toBe('face');
    expect(v.ast.query.op).toBe('createdBy');
  });

  it('kc.q.union(...) returns a union AST carrying its sub-queries', () => {
    const a = q.face(q.createdBy('opA'));
    const b = q.face(q.createdBy('opB'));
    const v = q.union(a, b);
    expect(v.ast.op).toBe('union');
    if (v.ast.op !== 'union') throw new Error('unreachable');
    expect(v.ast.queries.length).toBe(2);
  });

  it('kc.q.subtraction(a, b) carries its two operands distinctly', () => {
    const a = q.edge(q.createdBy('arm'));
    const b = q.edge(q.closestTo([0, 0, 0]));
    const v = q.subtraction(a, b);
    expect(v.ast.op).toBe('subtraction');
    if (v.ast.op !== 'subtraction') throw new Error('unreachable');
    expect(v.ast.a.op).toBe('entityFilter');
    expect(v.ast.b.op).toBe('entityFilter');
  });

  it('Query values are structurally serializable (no functions on the surface)', () => {
    const v = q.face(q.createdBy('post'));
    const json = JSON.stringify(v);
    const round = JSON.parse(json) as { target: string; ast: { op: string } };
    expect(round.target).toBe('face');
    expect(round.ast.op).toBe('entityFilter');
  });

  it('kc.q.face().asLenient() flips the lenient data flag', () => {
    // The chainable method is named `asLenient` rather than `lenient` because
    // a JS object cannot expose a boolean property AND a same-named method on
    // the same key — the spec/plan named both `lenient`, so the runtime form
    // disambiguates with `asLenient()` for the mutation and `lenient` for the
    // resulting boolean field on the new Query value.
    const v = q.face(q.createdBy('arm')).asLenient();
    expect(v.lenient).toBe(true);
  });

  it('kc.q.face().nth(0) yields a nthElement-wrapped query', () => {
    const v = q.face(q.createdBy('arm')).nth(0);
    expect(v.ast.op).toBe('nthElement');
    if (v.ast.op !== 'nthElement') throw new Error('unreachable');
    expect(v.ast.index).toBe(0);
  });

  it('.evaluate(scene) on a Q2-stage Query throws "Not implemented" until Q3', () => {
    const v = q.face(q.createdBy('arm'));
    expect(() => v.evaluate({} as never)).toThrow(/Not implemented/);
  });
});
