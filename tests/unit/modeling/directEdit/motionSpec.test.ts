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

  it('resolves the module param when a same-named declaration is out of scope', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\n{ const PX = 5; }\nconst slider = box(1,1,1).translate(PX, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'param', paramName: 'PX' });
  });

  it('fails closed when a param name is shadowed in scope', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\n{\n  const PX = 5;\n  const slider = box(1,1,1).translate(PX, 3, 0);\n  return slider;\n}\n`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'delta' });
  });

  it('fails closed when a function parameter shadows a param name', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\nfunction make(PX: number) {\n  const slider = box(1,1,1).translate(PX, 0, 0);\n  return slider;\n}\nreturn make(1);`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'delta' });
  });

  it('fails closed when a function declaration shadows a param name', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\nfunction make() {\n  function PX() {}\n  const slider = box(1,1,1).translate(PX, 0, 0);\n  return slider;\n}\nreturn make();`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'delta' });
  });

  it('fails closed when the name has multiple declarations', () => {
    const spec = specFor(
      `var PX = param('PX', 20);\nvar PX = param('PX', 30);\nconst slider = box(1,1,1).translate(PX, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'delta' });
  });

  it('fails closed for an undeclared identifier', () => {
    const spec = specFor(`const slider = box(1,1,1).translate(NOPE, 3, 0);\nreturn slider;`, 'slider');
    expect(spec.axes[0]).toMatchObject({ kind: 'delta' });
  });

  it('rejects a param whose name is not a string literal', () => {
    const spec = specFor(
      `const i = 1;\nconst PX = param(\`P\${i}\`, 20);\nconst slider = box(1,1,1).translate(PX, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'delta' });
  });

  it('unwraps a parenthesized param identifier', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\nconst slider = box(1,1,1).translate((PX), 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'param', paramName: 'PX' });
  });

  it('reads signed and parenthesized numeric literals', () => {
    const spec = specFor(
      `const slider = box(1,1,1).translate(-5, (10), +7);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'literal', value: -5 });
    expect(spec.axes[1]).toMatchObject({ kind: 'literal', value: 10 });
    expect(spec.axes[2]).toMatchObject({ kind: 'literal', value: 7 });
  });

  it('treats a one-argument translate as literal plus deltas', () => {
    const spec = specFor(`const slider = box(1,1,1).translate(5);\nreturn slider;`, 'slider');
    expect(spec.axes[0]).toMatchObject({ kind: 'literal', value: 5 });
    expect(spec.axes.map((a) => a.kind)).toEqual(['literal', 'delta', 'delta']);
  });

  it('downgrades every axis when a non-transparent call follows translate', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\nconst slider = box(1,1,1).translate(PX, 0, 0).rotateY(90);\nreturn slider;`,
      'slider',
    );
    expect(spec.hasTranslateCall).toBe(true);
    expect(spec.translateCall?.getText()).toBe('box(1,1,1).translate(PX, 0, 0)');
    expect(spec.axes.map((a) => a.kind)).toEqual(['delta', 'delta', 'delta']);
  });

  it('keeps in-place planning through transparent color/material calls', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\nconst slider = box(1,1,1).translate(PX, 3, 0).color(1).material(2);\nreturn slider;`,
      'slider',
    );
    expect(spec.axes[0]).toMatchObject({ kind: 'param', paramName: 'PX' });
  });

  it('ignores a translate nested in call arguments', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\nconst slider = union(box(1,1,1).translate(PX, 0, 0), box(2,2,2).translate(5, 0, 0));\nreturn slider;`,
      'slider',
    );
    expect(spec.translateCall).toBeNull();
    expect(spec.hasTranslateCall).toBe(false);
    expect(spec.axes.map((a) => a.kind)).toEqual(['delta', 'delta', 'delta']);
  });

  it('exposes the translate call and per-axis argument nodes', () => {
    const spec = specFor(
      `const PX = param('PX', 20);\nconst slider = box(1,1,1).translate(PX, 3, 0);\nreturn slider;`,
      'slider',
    );
    expect(spec.translateCall?.getText()).toBe('box(1,1,1).translate(PX, 3, 0)');
    const argTexts = spec.axes.map((axis) => ('argNode' in axis ? axis.argNode.getText() : null));
    expect(argTexts).toEqual(['PX', '3', '0']);
  });
});
