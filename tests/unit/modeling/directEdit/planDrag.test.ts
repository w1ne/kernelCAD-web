import { describe, expect, it } from 'vitest';
import { planDrag } from '../../../../src/modeling/directEdit/planDrag';
import { DIAGNOSTIC_REGISTRY } from '../../../../src/shared/diagnostics/registry';

const PARAM_SOURCE = [
  "const PX = param('PX', 40, { min: 10, max: 100 });",
  'const bracket = box(30, 20, 5).translate(PX, 12, 0);',
  'return bracket;',
  '',
].join('\n');

const BRACKET = { kind: 'variable', name: 'bracket' } as const;

describe('planDrag', () => {
  it('edits a param-bound axis in place without diagnostics', () => {
    const plan = planDrag({ source: PARAM_SOURCE, anchor: BRACKET, delta: [5, 0, 0] });
    expect(plan.toCode).toContain("param('PX', 45, { min: 10, max: 100 })");
    expect(plan.toCode).toContain('.translate(PX, 12, 0)');
    expect(plan.toCode?.split('\n').length).toBe(PARAM_SOURCE.split('\n').length);
    expect(plan.diagnostics).toEqual([]);
    expect(plan.toCode).not.toContain('@direct-edit');
    expect(plan.intent).toBe("Translate variable 'bracket' by (5, 0, 0) mm");
  });

  it('clamps a param edit at its max bound and reports it', () => {
    const plan = planDrag({ source: PARAM_SOURCE, anchor: BRACKET, delta: [200, 0, 0] });
    expect(plan.toCode).toContain("param('PX', 100,");
    const clamped = plan.diagnostics.filter((d) => d.code === 'feature.direct-edit.clamped');
    expect(clamped).toHaveLength(1);
    expect(clamped[0].severity).toBe('info');
    expect(clamped[0].message).toContain("'PX'");
    expect(clamped[0].message).toContain('max 100');
    expect(clamped[0].hint).toBe(DIAGNOSTIC_REGISTRY['feature.direct-edit.clamped'].hintTemplate);
    expect(clamped[0].nextAction).toEqual(DIAGNOSTIC_REGISTRY['feature.direct-edit.clamped'].nextAction);
  });

  it('emits one clamp diagnostic per clamped axis, naming min and max bounds', () => {
    const source = [
      "const PX = param('PX', 40, { min: 10, max: 100 });",
      "const PY = param('PY', 40, { min: 10, max: 100 });",
      'const bracket = box(30, 20, 5).translate(PX, PY, 0);',
      'return bracket;',
      '',
    ].join('\n');
    const plan = planDrag({ source, anchor: BRACKET, delta: [200, -200, 0] });
    const clamped = plan.diagnostics.filter((d) => d.code === 'feature.direct-edit.clamped');
    expect(clamped).toHaveLength(2);
    expect(clamped[0].message).toContain("'PX'");
    expect(clamped[0].message).toContain('max 100');
    expect(clamped[1].message).toContain("'PY'");
    expect(clamped[1].message).toContain('min 10');
    expect(plan.toCode).toContain("param('PX', 100,");
    expect(plan.toCode).toContain("param('PY', 10,");
  });

  it('edits a literal axis in place', () => {
    const source = ['const bracket = box(30, 20, 5).translate(10, 12, 0);', 'return bracket;', ''].join('\n');
    const plan = planDrag({ source, anchor: BRACKET, delta: [2.5, 0, 0] });
    expect(plan.toCode).toContain('.translate(12.5, 12, 0)');
    expect(plan.diagnostics).toEqual([]);
  });

  it('appends a translate when the anchor has no transform call', () => {
    const source = ['const bracket = box(30, 20, 5);', 'return bracket;', ''].join('\n');
    const plan = planDrag({ source, anchor: BRACKET, delta: [2, 0, 0] });
    expect(plan.toCode).toContain('box(30, 20, 5).translate(2, 0, 0)');
    expect(plan.diagnostics.map((d) => d.code)).not.toContain('feature.direct-edit.delta-wrapper');
  });

  it('marks the appended delta when an existing call has a computed axis', () => {
    const source = [
      "const PX = param('PX', 40);",
      'const bracket = box(30, 20, 5).translate(PX.divide(2), 12, 0);',
      'return bracket;',
      '',
    ].join('\n');
    const plan = planDrag({ source, anchor: BRACKET, delta: [5, 0, 0] });
    expect(plan.toCode).toContain('.translate(5, 0, 0) /* @direct-edit */');
    expect(plan.toCode).toContain('PX.divide(2)');
    const wrapper = plan.diagnostics.filter((d) => d.code === 'feature.direct-edit.delta-wrapper');
    expect(wrapper).toHaveLength(1);
    expect(wrapper[0].severity).toBe('warning');
    expect(wrapper[0].hint).toBe(DIAGNOSTIC_REGISTRY['feature.direct-edit.delta-wrapper'].hintTemplate);
    expect(wrapper[0].nextAction).toEqual(DIAGNOSTIC_REGISTRY['feature.direct-edit.delta-wrapper'].nextAction);
  });

  it('applies param and literal edits in one atomic pass', () => {
    const plan = planDrag({ source: PARAM_SOURCE, anchor: BRACKET, delta: [5, -2, 0] });
    expect(plan.toCode).toContain("param('PX', 45,");
    expect(plan.toCode).toContain('.translate(PX, 10, 0)');
    expect(plan.diagnostics).toEqual([]);
  });

  it('refuses mate-driven entities', () => {
    const plan = planDrag({ source: PARAM_SOURCE, anchor: BRACKET, delta: [5, 0, 0], mated: true });
    expect(plan.toCode).toBeNull();
    expect(plan.spec).toBeNull();
    expect(plan.diagnostics.map((d) => d.code)).toContain('feature.direct-edit.unresolved');
    expect(plan.diagnostics.every((d) => d.severity === 'error')).toBe(true);
    expect(plan.diagnostics[0].message).toContain("'bracket'");
    expect(plan.diagnostics[0].message).toContain('mate');
    expect(plan.diagnostics[0].hint).toBe(DIAGNOSTIC_REGISTRY['feature.direct-edit.unresolved'].hintTemplate);
  });

  it('reports an unknown anchor as unresolved', () => {
    const plan = planDrag({
      source: PARAM_SOURCE,
      anchor: { kind: 'variable', name: 'nope' },
      delta: [1, 0, 0],
    });
    expect(plan.toCode).toBeNull();
    expect(plan.spec).toBeNull();
    expect(plan.diagnostics.map((d) => d.code)).toContain('feature.direct-edit.unresolved');
    expect(plan.diagnostics[0].message).toContain("'nope'");
  });

  it('converts a reassigned variable anchor to unresolved instead of throwing', () => {
    const source = [
      "const PX = param('PX', 20);",
      'let u = box(1, 1, 1).translate(PX, 0, 0);',
      'u = u.rotateY(90);',
      'return u;',
      '',
    ].join('\n');
    const input = { source, anchor: { kind: 'variable', name: 'u' } as const, delta: [5, 0, 0] as const };
    expect(() => planDrag(input)).not.toThrow();
    const plan = planDrag(input);
    expect(plan.toCode).toBeNull();
    expect(plan.diagnostics.map((d) => d.code)).toContain('feature.direct-edit.unresolved');
    expect(plan.diagnostics[0].message).toContain('reassigned');
  });

  it('formats intent numbers with three decimals and no negative zero', () => {
    const plan = planDrag({ source: PARAM_SOURCE, anchor: BRACKET, delta: [-0, 0.0004, 1.23456] });
    expect(plan.intent).toBe("Translate variable 'bracket' by (0, 0, 1.235) mm");
  });
});
