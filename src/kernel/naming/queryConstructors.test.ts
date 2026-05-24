import { describe, it, expect } from 'vitest';
import { q } from './queryConstructors';

describe('q.* constructors — value-level behaviour', () => {
  it('q.nothing() returns target "any" + op "nothing"', () => {
    const v = q.nothing();
    expect(v.target).toBe('any');
    expect(v.ast.op).toBe('nothing');
  });

  it('q.everything("face") returns target "face" + op "everything"', () => {
    const v = q.everything('face');
    expect(v.target).toBe('face');
    expect(v.ast.op).toBe('everything');
    if (v.ast.op !== 'everything') throw new Error('unreachable');
    expect(v.ast.kind).toBe('face');
  });

  it('q.createdBy("post") wraps the feature id', () => {
    const v = q.createdBy('post');
    expect(v.ast.op).toBe('createdBy');
    if (v.ast.op !== 'createdBy') throw new Error('unreachable');
    expect(v.ast.id).toBe('post');
  });

  it('q.createdBy("post", "edge") keeps the kind filter', () => {
    const v = q.createdBy('post', 'edge');
    if (v.ast.op !== 'createdBy') throw new Error('unreachable');
    expect(v.ast.kind).toBe('edge');
  });

  it('q.face(filter) folds the single filter directly under entityFilter (no extra intersection wrapper)', () => {
    const filter = q.createdBy('arm');
    const v = q.face(filter);
    expect(v.ast.op).toBe('entityFilter');
    if (v.ast.op !== 'entityFilter') throw new Error('unreachable');
    expect(v.ast.query.op).toBe('createdBy');
  });

  it('q.face(filterA, filterB) wraps the two filters in an intersection', () => {
    const v = q.face(q.createdBy('arm'), q.geometryType('PLANE'));
    expect(v.ast.op).toBe('entityFilter');
    if (v.ast.op !== 'entityFilter') throw new Error('unreachable');
    expect(v.ast.query.op).toBe('intersection');
  });

  it('q.edge() / q.vertex() / q.connector() / q.part() / q.solid() carry their respective targets', () => {
    expect(q.edge().target).toBe('edge');
    expect(q.vertex().target).toBe('vertex');
    expect(q.connector().target).toBe('connector');
    expect(q.part().target).toBe('part');
    expect(q.solid().target).toBe('solid');
  });

  it('q.union() throws on empty input', () => {
    expect(() => q.union()).toThrow(/at least one/);
  });

  it('q.intersection() throws on empty input', () => {
    expect(() => q.intersection()).toThrow(/at least one/);
  });

  it('q.subtraction(a, b) carries both operands as AST nodes', () => {
    const a = q.face(q.createdBy('opA'));
    const b = q.face(q.createdBy('opB'));
    const v = q.subtraction(a, b);
    expect(v.ast.op).toBe('subtraction');
    if (v.ast.op !== 'subtraction') throw new Error('unreachable');
    expect(v.ast.a.op).toBe('entityFilter');
    expect(v.ast.b.op).toBe('entityFilter');
  });

  it('q.containsPoint([1,2,3]) carries the point coordinates', () => {
    const v = q.containsPoint([1, 2, 3]);
    expect(v.ast.op).toBe('containsPoint');
    if (v.ast.op !== 'containsPoint') throw new Error('unreachable');
    expect(v.ast.point).toEqual([1, 2, 3]);
  });

  it('q.closestTo([0,0,0], 4) carries the k argument', () => {
    const v = q.closestTo([0, 0, 0], 4);
    expect(v.ast.op).toBe('closestTo');
    if (v.ast.op !== 'closestTo') throw new Error('unreachable');
    expect(v.ast.point).toEqual([0, 0, 0]);
    expect(v.ast.k).toBe(4);
  });

  it('q.closestTo([0,0,0]) without k leaves k undefined', () => {
    const v = q.closestTo([0, 0, 0]);
    if (v.ast.op !== 'closestTo') throw new Error('unreachable');
    expect(v.ast.k).toBeUndefined();
  });

  it('q.geometryType("CYLINDER") carries the geometry tag', () => {
    const v = q.geometryType('CYLINDER');
    if (v.ast.op !== 'geometryType') throw new Error('unreachable');
    expect(v.ast.geomType).toBe('CYLINDER');
  });

  it('q.withLabel("top") carries the label string', () => {
    const v = q.withLabel('top');
    if (v.ast.op !== 'withLabel') throw new Error('unreachable');
    expect(v.ast.label).toBe('top');
  });

  it('q.withFeatureName("arm") carries the feature name', () => {
    const v = q.withFeatureName('arm');
    if (v.ast.op !== 'withFeatureName') throw new Error('unreachable');
    expect(v.ast.name).toBe('arm');
  });

  it('q.nthElement wraps the sub-query in an nthElement AST node', () => {
    const v = q.nthElement(q.face(q.createdBy('arm')), 2);
    expect(v.ast.op).toBe('nthElement');
    if (v.ast.op !== 'nthElement') throw new Error('unreachable');
    expect(v.ast.index).toBe(2);
  });

  it('q.ownedByPart(q.part()) wraps the part query in an ownedByPart AST node', () => {
    const partQuery = q.part(q.createdBy('arm'));
    const v = q.ownedByPart(partQuery);
    if (v.ast.op !== 'ownedByPart') throw new Error('unreachable');
    expect(v.ast.query.op).toBe('entityFilter');
  });

  it('q.ownerPart wraps the sub-query in an ownerPart AST node and targets "part"', () => {
    const inner = q.face(q.createdBy('arm'));
    const v = q.ownerPart(inner);
    expect(v.target).toBe('part');
    expect(v.ast.op).toBe('ownerPart');
  });

  it('q.fromString("@kc[...]") carries the ref unparsed (string-DSL bridge)', () => {
    const v = q.fromString('@kc[base/face/top]');
    expect(v.ast.op).toBe('fromString');
    if (v.ast.op !== 'fromString') throw new Error('unreachable');
    expect(v.ast.ref).toBe('@kc[base/face/top]');
  });

  it('chainable .and(filter) wraps both sides in an intersection AST', () => {
    const v = q.face(q.createdBy('arm')).and(q.geometryType('PLANE'));
    expect(v.ast.op).toBe('intersection');
    if (v.ast.op !== 'intersection') throw new Error('unreachable');
    expect(v.ast.queries.length).toBe(2);
  });

  it('chainable .or(other) wraps both sides in a union AST', () => {
    const v = q.face(q.createdBy('opA')).or(q.face(q.createdBy('opB')));
    expect(v.ast.op).toBe('union');
  });

  it('chainable .minus(other) wraps both sides in a subtraction AST', () => {
    const v = q.face(q.createdBy('opA')).minus(q.face(q.createdBy('opB')));
    expect(v.ast.op).toBe('subtraction');
  });

  it('.asLenient() on an already-lenient query stays lenient', () => {
    const v = q.face(q.createdBy('arm')).asLenient().asLenient();
    expect(v.lenient).toBe(true);
  });

  it('.toString() returns the placeholder @kcq[...] form', () => {
    const v = q.face(q.createdBy('arm'));
    const s = v.toString();
    expect(s.startsWith('@kcq[face(')).toBe(true);
    expect(s.endsWith(')]')).toBe(true);
  });

  it('.toJSON() returns the full data record (used by JSON.stringify)', () => {
    const v = q.face(q.createdBy('arm')).asLenient();
    const j = v.toJSON();
    expect(j._kind).toBe('kc.query');
    expect(j.target).toBe('face');
    expect(j.ast.op).toBe('entityFilter');
    expect(j.lenient).toBe(true);
  });

  it('.evaluateUnique throws "Not implemented" until the evaluator slice', () => {
    const v = q.face(q.createdBy('arm'));
    expect(() => v.evaluateUnique({} as never)).toThrow(/Not implemented/);
  });
});
