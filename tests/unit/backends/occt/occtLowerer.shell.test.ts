// tests/unit/backends/occt/occtLowerer.shell.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { Param } from '../../../../src/shared/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });

describe('OcctLowerer shell', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a top-face shell on a box (volume < 2000)', async () => {
    const base = OcctBackend.box(20, 20, 20);
    const r: FeatureRecord = {
      id: 'shell_1', kind: 'shell',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'top' } },
      },
      params: { thickness: mm(0.5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.shape.volume()).toBeLessThan(2000);
  });

  it('emits feature.face-feature.face-required when face input is missing', async () => {
    const base = OcctBackend.box(20, 20, 20);
    const r: FeatureRecord = {
      id: 'shell_2', kind: 'shell',
      inputs: { base: { kind: 'feature', id: 'box_1' } },
      params: { thickness: mm(0.5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('feature.invalid-args');
  });

  it('emits feature.face-feature.face-ref-not-resolvable for transformed primitive', async () => {
    const base = OcctBackend.box(20, 20, 20).translate(5, 0, 0);
    const r: FeatureRecord = {
      id: 'shell_3', kind: 'shell',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'top' } },
      },
      params: { thickness: mm(0.5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('feature.face-ref.not-resolvable');
  });

  it('emits feature.shell.failed when thickness is too large', async () => {
    const base = OcctBackend.box(10, 10, 10);
    const r: FeatureRecord = {
      id: 'shell_4', kind: 'shell',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'top' } },
      },
      params: { thickness: mm(100) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('feature.kernel-failed');
  });
});
