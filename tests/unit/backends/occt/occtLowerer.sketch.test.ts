// tests/unit/backends/occt/occtLowerer.sketch.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../../../src/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';
import type { Param } from '../../../../src/intent/types';
import type { SketchCommand } from '../../../../src/capture/sketch';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const str = (s: string): Param => ({ expression: `'${s}'`, unit: 'unitless', evaluated: 0 });

describe('OcctLowerer sketch + extrude-from-sketch', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a sketch record into an OcctBackend with kind=sketch', async () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 0, y: 0 },
      { kind: 'lineTo', x: 10, y: 0 },
      { kind: 'lineTo', x: 10, y: 10 },
      { kind: 'close' },
    ];
    const r: FeatureRecord = {
      id: 'sketch_1', kind: 'sketch',
      inputs: {}, params: {}, metadata: { commands },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: {} });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect((result.shape as OcctBackend).kind).toBe('sketch');
  });

  it('lowers an extrude with profile=sketch using the upstream sketch', async () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 0, y: 0 },
      { kind: 'lineTo', x: 10, y: 0 },
      { kind: 'lineTo', x: 10, y: 10 },
      { kind: 'lineTo', x: 0, y: 10 },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const extr: FeatureRecord = {
      id: 'extr_1', kind: 'extrude',
      inputs: { sketch: { kind: 'feature', id: 'sketch_1' } },
      params: { profileKind: str('sketch'), depth: mm(5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(extr, { byKey: { sketch } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.shape.volume()).toBeCloseTo(500, 1);
  });

  it('emits feature.extrude.bad-sketch when sketch input is missing', async () => {
    const extr: FeatureRecord = {
      id: 'extr_1', kind: 'extrude',
      inputs: {},  // missing sketch input
      params: { profileKind: str('sketch'), depth: mm(5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(extr, { byKey: {} });
    expect(result.diagnostics.filter(d => d.severity === 'error').length).toBeGreaterThan(0);
  });
});
