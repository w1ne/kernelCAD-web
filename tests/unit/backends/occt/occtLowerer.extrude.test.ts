import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { Param } from '../../../../src/shared/intent/types';
import type { SketchCommand } from '../../../../src/modeling/capture/sketch';

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

  it('sketch extrude with twistAngle twists the solid (bbox grows vs straight)', async () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'lineTo', x: mm(30), y: mm(0) },
      { kind: 'lineTo', x: mm(30), y: mm(6) },
      { kind: 'close' },
    ];
    const record = (twistDeg: number): FeatureRecord => ({
      id: 'extrude_twist', kind: 'extrude',
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        depth: mm(80),
        twistAngle: { expression: String(twistDeg), unit: 'deg', evaluated: twistDeg },
      },
      inputs: { sketch: { kind: 'feature', id: 'sketch_1' } },
      transforms: [], suppressed: false,
    });
    const lowerer = new OcctLowerer();
    const straight = await lowerer.lower(record(0), {
      byKey: { sketch: OcctBackend.fromSketchCommands(commands) },
    });
    const twisted = await lowerer.lower(record(60), {
      byKey: { sketch: OcctBackend.fromSketchCommands(commands) },
    });
    expect(twisted.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(
      twisted.shape.boundingBox().max[1] - straight.shape.boundingBox().max[1],
    ).toBeGreaterThan(1);
  });

  // Revolve from a rect profileKind has been demoted; revolve now requires a
  // path()...close() sketch input. End-to-end revolve coverage lives in
  // tests/unit/backends/occt/occtBackend.revolveSketch.test.ts and
  // tests/unit/capture/sketch.test.ts.
});
