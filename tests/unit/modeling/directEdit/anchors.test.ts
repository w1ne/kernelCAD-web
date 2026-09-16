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
});
