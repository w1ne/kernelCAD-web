import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { Param } from '../../../../src/shared/intent/types';

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

  // Revolve from a rect profileKind has been demoted; revolve now requires a
  // path()...close() sketch input. End-to-end revolve coverage lives in
  // tests/unit/backends/occt/occtBackend.revolveSketch.test.ts and
  // tests/unit/capture/sketch.test.ts.
});
