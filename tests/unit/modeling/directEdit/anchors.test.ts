import { describe, expect, it } from 'vitest';
import {
  AnchorError,
  parseSource,
  resolveAnchorExpression,
} from '../../../../src/modeling/directEdit/anchors';

const SOURCE = `
const PX = param('PX', 20, { min: 0, max: 60 });
const slider = box(20, 20, 10).translate(PX, 0, 0);
const asm = assembly('demo');
const base = asm.part('base', box(60, 40, 6));
const moved = asm.part('slider', slider);
sdf.bind('goop', sdf.sphere(8).translate(1, 2, 3));
return asm.model();
`;

const SOURCE_LET = `
let ghost;
return ghost;
`;

const MISSING_ARGS_SOURCE = `
const asm = assembly('demo');
asm.part('base');
sdf.bind('goop');
`;

const DUP_SOURCE = `
const a = assembly('a');
const b = assembly('b');
a.part('wall', box(1, 1, 1));
b.part('wall', box(2, 2, 2));
return a.model();
`;

const DUP_VARIABLE_SOURCE = `
const thing = box(1, 1, 1);
function make() {
  const thing = box(2, 2, 2);
  return thing;
}
return make();
`;

const DUP_SDF_SOURCE = `
sdf.bind('goop', sdf.sphere(1));
sdf.bind('goop', sdf.sphere(2));
return 0;
`;

const REASSIGN_ROTATE = `
const PX = param('PX', 20);
let u = box(1, 1, 1).translate(PX, 0, 0);
u = u.rotateY(90);
return u;
`;

const REASSIGN_BOOLEAN = `
const PX = param('PX', 20);
let u = box(1, 1, 1).translate(PX, 0, 0);
u = u.subtract(cylinder(1, 1));
return u;
`;

const REASSIGN_UNRELATED = `
const PX = param('PX', 20);
let u = box(1, 1, 1).translate(PX, 0, 0);
u = box(2, 2, 2);
return u;
`;

const REASSIGN_UNRELATED_CALL = `
let u = box(1, 1, 1).translate(0, 0, 0);
u = makeShape();
return u;
`;

const REASSIGN_SELF_TRANSLATE = `
const PX = param('PX', 20);
let u = box(1, 1, 1).translate(PX, 0, 0);
u = u.translate(1, 0, 0);
return u;
`;

describe('resolveAnchorExpression', () => {
  it('resolves a variable initializer', () => {
    const sf = parseSource(SOURCE);
    const node = resolveAnchorExpression(sf, { kind: 'variable', name: 'slider' });
    expect(node.getText()).toBe('box(20, 20, 10).translate(PX, 0, 0)');
  });

  it('resolves an assembly part shape argument', () => {
    const sf = parseSource(SOURCE);
    const node = resolveAnchorExpression(sf, { kind: 'part', name: 'base' });
    expect(node.getText()).toBe('box(60, 40, 6)');
  });

  it('resolves an sdf.bind field argument', () => {
    const sf = parseSource(SOURCE);
    const node = resolveAnchorExpression(sf, { kind: 'sdfBinding', name: 'goop' });
    expect(node.getText()).toBe('sdf.sphere(8).translate(1, 2, 3)');
  });

  it('throws AnchorError for unknown names', () => {
    const sf = parseSource(SOURCE);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'nope' })).toThrow(AnchorError);
    expect(() => resolveAnchorExpression(sf, { kind: 'part', name: 'nope' })).toThrow(AnchorError);
    expect(() => resolveAnchorExpression(sf, { kind: 'sdfBinding', name: 'nope' })).toThrow(AnchorError);
  });

  it('throws AnchorError for a variable without an initializer', () => {
    const sf = parseSource(SOURCE_LET);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'ghost' })).toThrow(AnchorError);
  });

  it('throws AnchorError for a part without a shape argument', () => {
    const sf = parseSource(MISSING_ARGS_SOURCE);
    expect(() => resolveAnchorExpression(sf, { kind: 'part', name: 'base' })).toThrow(AnchorError);
  });

  it('throws AnchorError for an sdf binding without a field argument', () => {
    const sf = parseSource(MISSING_ARGS_SOURCE);
    expect(() => resolveAnchorExpression(sf, { kind: 'sdfBinding', name: 'goop' })).toThrow(AnchorError);
  });

  it('throws AnchorError for duplicate variable declarations', () => {
    const sf = parseSource(DUP_VARIABLE_SOURCE);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'thing' })).toThrow(AnchorError);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'thing' })).toThrow(/ambiguous/i);
  });

  it('throws AnchorError for duplicate part names across assemblies', () => {
    const sf = parseSource(DUP_SOURCE);
    expect(() => resolveAnchorExpression(sf, { kind: 'part', name: 'wall' })).toThrow(AnchorError);
    expect(() => resolveAnchorExpression(sf, { kind: 'part', name: 'wall' })).toThrow(/ambiguous/i);
  });

  it('throws AnchorError for duplicate sdf bindings', () => {
    const sf = parseSource(DUP_SDF_SOURCE);
    expect(() => resolveAnchorExpression(sf, { kind: 'sdfBinding', name: 'goop' })).toThrow(AnchorError);
    expect(() => resolveAnchorExpression(sf, { kind: 'sdfBinding', name: 'goop' })).toThrow(/ambiguous/i);
  });

  it('throws AnchorError when a variable is reassigned with a transform', () => {
    const sf = parseSource(REASSIGN_ROTATE);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'u' })).toThrow(AnchorError);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'u' })).toThrow(/reassigned/);
  });

  it('allows non-transform reassignment derived from the anchor itself', () => {
    const sf = parseSource(REASSIGN_BOOLEAN);
    const node = resolveAnchorExpression(sf, { kind: 'variable', name: 'u' });
    expect(node.getText()).toBe('box(1, 1, 1).translate(PX, 0, 0)');
  });

  it('throws AnchorError when a variable is reassigned to unrelated geometry', () => {
    const sf = parseSource(REASSIGN_UNRELATED);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'u' })).toThrow(AnchorError);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'u' })).toThrow(/reassigned/);
  });

  it('throws AnchorError when a variable is reassigned to an unrelated call', () => {
    const sf = parseSource(REASSIGN_UNRELATED_CALL);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'u' })).toThrow(AnchorError);
    expect(() => resolveAnchorExpression(sf, { kind: 'variable', name: 'u' })).toThrow(/reassigned/);
  });

  it('preserves the self-derived translate reassignment behavior', () => {
    const sf = parseSource(REASSIGN_SELF_TRANSLATE);
    const node = resolveAnchorExpression(sf, { kind: 'variable', name: 'u' });
    expect(node.getText()).toBe('box(1, 1, 1).translate(PX, 0, 0)');
  });
});
