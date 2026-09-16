import { describe, expect, it } from 'vitest';
import { parseSource, resolveAnchorExpression } from '../../../../src/modeling/directEdit/anchors';
import { resolveMotionSpec } from '../../../../src/modeling/directEdit/motionSpec';

function specFor(source: string, name: string) {
  const sf = parseSource(source);
  const expr = resolveAnchorExpression(sf, { kind: 'variable', name });
  return resolveMotionSpec(expr);
}

describe('resolveMotionSpec', () => {
  it('detects a param-bound axis with bounds', () => {
    const spec = specFor(
      `const PX = param('PX', 20, { min: 0, max: 60 });\nconst slider = box(1,1,1).translate(PX, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.hasTranslateCall).toBe(true);
    expect(spec.axes[0]).toMatchObject({ kind: 'param', paramName: 'PX', min: 0, max: 60 });
    expect(spec.axes[1]).toMatchObject({ kind: 'literal' });
    expect(spec.axes[2]).toMatchObject({ kind: 'literal' });
  });

  it('treats a param without metadata as unbounded', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\nconst slider = box(1,1,1).translate(PX, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'param', paramName: 'PX' });
    expect((spec.axes[0] as { min?: number }).min).toBeUndefined();
  });

  it('marks computed axes as delta', () => {
    const spec = specFor(
      `const h = 10;\nconst slider = box(1,1,1).translate(h / 2, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'delta' });
    expect(spec.axes[1]).toMatchObject({ kind: 'literal' });
  });

  it('reports no translate call', () => {
    const spec = specFor(`const slider = box(1,1,1);\nreturn slider;`, 'slider');
    expect(spec.hasTranslateCall).toBe(false);
    expect(spec.axes.map((a) => a.kind)).toEqual(['delta', 'delta', 'delta']);
  });

  it('reads a literal axis value with numeric separators', () => {
    const spec = specFor(`const slider = box(1,1,1).translate(1_000, 3, 0);\nreturn slider;`, 'slider');
    expect(spec.axes[0]).toMatchObject({ kind: 'literal', value: 1000 });
  });

  it('reads a param default value with numeric separators', () => {
    const spec = specFor(
      `const PX = param('PX', 1_000);\nconst slider = box(1,1,1).translate(PX, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'param', declaredValue: 1000 });
  });

  it('fails closed when a param name is shadowed', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\n{ const PX = 5; }\nconst slider = box(1,1,1).translate(PX, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'delta' });
  });

  it('reads signed and parenthesized numeric literals', () => {
    const spec = specFor(
      `const slider = box(1,1,1).translate(-5, (10), 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'literal', value: -5 });
    expect(spec.axes[1]).toMatchObject({ kind: 'literal', value: 10 });
  });
});
