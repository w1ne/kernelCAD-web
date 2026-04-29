import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/backends/occt/occtBackend';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';
import type { Param } from '../../../../src/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });

describe('OcctLowerer — extrude/revolve', () => {
  beforeAll(async () => { await initOcct(); });

  it('extrudes a rect profile to a box', async () => {
    const r: FeatureRecord = {
      id: 'extrude_1', kind: 'extrude',
      params: {
        profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
        w: mm(10), h: mm(20),
        height: mm(30),
      },
      inputs: {}, transforms: [], suppressed: false,
    };
    const res = await new OcctLowerer().lower(r, { byKey: {} });
    expect(res.shape.volume()).toBeCloseTo(6000, 0);
  });

  it('revolves a rect profile around Y axis', async () => {
    const r: FeatureRecord = {
      id: 'revolve_1', kind: 'revolve',
      params: {
        profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
        w: mm(5), h: mm(10),
        offsetX: mm(5),
        angleDeg: { expression: '360', unit: 'deg', evaluated: 360 },
      },
      inputs: {}, transforms: [], suppressed: false,
    };
    const res = await new OcctLowerer().lower(r, { byKey: {} });
    // washer: outer cylinder (r=10, h=10) - inner cylinder (r=5, h=10)
    const expected = Math.PI * (100 - 25) * 10;
    expect(res.shape.volume()).toBeCloseTo(expected, 0);
  });
});
