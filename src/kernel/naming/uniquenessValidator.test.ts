import { describe, it, expect } from 'vitest';
import { assertTopoRefSafeName, TOPO_REF_NAME_REGEX, RESERVED_TOPO_REF_CHARS } from './uniquenessValidator';
import { KernelError } from '../../shared/intent/kernelError';

describe('assertTopoRefSafeName', () => {
  it('accepts an alpha-leading name with alnum + dash + underscore', () => {
    expect(() => assertTopoRefSafeName('top', 'face-label')).not.toThrow();
    expect(() => assertTopoRefSafeName('shoulder-servo', 'part-name')).not.toThrow();
    expect(() => assertTopoRefSafeName('mountingBolt_2', 'feature-name')).not.toThrow();
    expect(() => assertTopoRefSafeName('A', 'connector-name')).not.toThrow();
  });

  it('rejects names containing the reserved separator dot', () => {
    expect(() => assertTopoRefSafeName('top.bottom', 'face-label')).toThrow(KernelError);
  });

  it('rejects names containing the reserved separator slash', () => {
    expect(() => assertTopoRefSafeName('top/bottom', 'face-label')).toThrow(KernelError);
  });

  it('rejects names containing bracket characters', () => {
    expect(() => assertTopoRefSafeName('top[0]', 'face-label')).toThrow(KernelError);
    expect(() => assertTopoRefSafeName('top]', 'face-label')).toThrow(KernelError);
  });

  it('rejects names containing the @ prefix marker', () => {
    expect(() => assertTopoRefSafeName('@top', 'face-label')).toThrow(KernelError);
  });

  it('rejects names containing the # modifier separator', () => {
    expect(() => assertTopoRefSafeName('top#normal', 'face-label')).toThrow(KernelError);
  });

  it('rejects names containing whitespace', () => {
    expect(() => assertTopoRefSafeName('top face', 'face-label')).toThrow(KernelError);
  });

  it('rejects digit-leading names (the grammar requires alpha-start)', () => {
    expect(() => assertTopoRefSafeName('1top', 'face-label')).toThrow(KernelError);
  });

  it('rejects the empty string', () => {
    expect(() => assertTopoRefSafeName('', 'face-label')).toThrow(KernelError);
  });

  it('error carries feature.invalid-args code', () => {
    try {
      assertTopoRefSafeName('top.bottom', 'face-label');
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('feature.invalid-args');
    }
  });

  it('exports the regex and the reserved-char list for downstream reuse', () => {
    expect(TOPO_REF_NAME_REGEX.test('top')).toBe(true);
    expect(TOPO_REF_NAME_REGEX.test('top.bottom')).toBe(false);
    expect(RESERVED_TOPO_REF_CHARS).toContain('.');
    expect(RESERVED_TOPO_REF_CHARS).toContain('/');
    expect(RESERVED_TOPO_REF_CHARS).toContain('[');
    expect(RESERVED_TOPO_REF_CHARS).toContain(']');
    expect(RESERVED_TOPO_REF_CHARS).toContain('@');
    expect(RESERVED_TOPO_REF_CHARS).toContain('#');
  });
});
