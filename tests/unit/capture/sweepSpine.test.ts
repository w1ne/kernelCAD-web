// tests/unit/capture/sweepSpine.test.ts
//
// Capture → lowerer integration for the sweep spine option.
// Verifies (1) `spine: 'smooth'` flows from sketch.sweep(rail, { spine })
// through the lowerer to OcctBackend.sweepFromSketch — a dense helical rail
// must produce a watertight solid at the analytic tube volume (the default
// polyline spine emits per-segment tubes that do not sew on such rails),
// and (2) invalid spine values surface a feature.invalid-args diagnostic.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';

const springCode = (spineOpt: string) => `
  const rail = helix({ radius: 8, pitch: 4, turns: 4, pointsPerTurn: 24 });
  return path()
    .moveTo(-1, -1)
    .lineTo(1, -1)
    .lineTo(1, 1)
    .lineTo(-1, 1)
    .close()
    .sweep(rail, { spine: ${spineOpt} });
`;

describe("sketch.sweep({ spine })", () => {
  beforeAll(async () => { await initOcct(); });

  it("'smooth' sweeps a dense helical rail to a watertight solid at the analytic volume", async () => {
    const m = await buildModel({ fileName: 'sweep-spine-smooth.kcad.ts', code: springCode("'smooth'") });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(m.tailShape).toBeDefined();
    // Analytic tube volume: profile area 4 mm² × helix arc length
    // turns·√((2π·r)² + pitch²) ≈ 806.8 mm³.
    const analytic = 4 * 4 * Math.hypot(2 * Math.PI * 8, 4);
    const v = m.tailShape!.volume();
    expect(v).toBeGreaterThan(analytic * 0.95);
    expect(v).toBeLessThan(analytic * 1.05);
    const { report } = await (m.tailShape as OcctBackend).exportSTLWithReportAsync();
    expect(report.openEdgeCount).toBe(0);
    expect(report.ok).toBe(true);
  });

  it("'polyline' (explicit) matches the default behavior on a straight rail", async () => {
    const straight = (opt: string) => `
      return path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close()
        .sweep([[0, 0, 0], [0, 0, 50]]${opt});
    `;
    const def = await buildModel({ fileName: 'sweep-spine-def.kcad.ts', code: straight('') });
    const exp = await buildModel({ fileName: 'sweep-spine-poly.kcad.ts', code: straight(", { spine: 'polyline' }") });
    expect(exp.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(exp.tailShape!.volume()).toBeCloseTo(def.tailShape!.volume(), 6);
  });

  it('emits feature.invalid-args for an unknown spine string', async () => {
    const m = await buildModel({ fileName: 'sweep-spine-bad.kcad.ts', code: springCode("'wavy'") });
    const errs = m.diagnostics.filter((d) => d.severity === 'error');
    expect(errs.length).toBe(1);
    expect(errs[0].code).toBe('feature.invalid-args');
    expect(errs[0].message).toMatch(/spine/);
  });
});
