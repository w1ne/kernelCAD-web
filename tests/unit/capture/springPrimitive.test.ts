import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { createApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { GLOBALS } from '../../../src/agent/mcp/tools/listApi';

function makeApi() {
  const session = new CaptureSession();
  return createApi({ session });
}

describe('spring({ length, coilRadius, wireRadius, turns })', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds a positive-volume helical wire along the requested axis', async () => {
    const m = await buildModel({
      fileName: 'spring-basic.kcad.ts',
      code: `return spring({ axis: 'X', length: 82, coilRadius: 4.6, wireRadius: 0.9, turns: 7 });`,
    });

    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(m.tailShape).toBeDefined();
    expect(m.tailShape!.volume()).toBeGreaterThan(450);
    const bb = m.tailShape!.boundingBox();
    expect(bb.max[0] - bb.min[0]).toBeGreaterThan(80);
    expect(bb.max[1] - bb.min[1]).toBeGreaterThan(8);
    expect(bb.max[2] - bb.min[2]).toBeGreaterThan(8);
  });

  it('uses a swept helix instead of many straight cylinder segments', async () => {
    const m = await buildModel({
      fileName: 'spring-sweep.kcad.ts',
      code: `return spring({ axis: 'X', length: 82, coilRadius: 4.6, wireRadius: 0.9, turns: 7, pointsPerTurn: 16 });`,
    });

    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const kinds = m.records.map((record) => record.kind);
    expect(kinds).toContain('sweep');
    expect(kinds.filter((kind) => kind === 'cylinder')).toHaveLength(0);
  });

  it('supports closed end bars without caller-authored stray hardware', async () => {
    const m = await buildModel({
      fileName: 'spring-closed-ends.kcad.ts',
      code: `return spring({ axis: 'Z', length: 40, coilRadius: 5, wireRadius: 1, turns: 4, endStyle: 'closed' });`,
    });

    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bb = m.tailShape!.boundingBox();
    expect(bb.max[2] - bb.min[2]).toBeGreaterThan(39);
    expect(bb.max[0] - bb.min[0]).toBeLessThan(22);
    expect(bb.max[1] - bb.min[1]).toBeLessThan(22);
  });

  it('exports watertight at the analytic swept-tube volume', async () => {
    const length = 16;
    const coilRadius = 8;
    const wireRadius = 1;
    const turns = 4;
    const segments = 16;
    const m = await buildModel({
      fileName: 'spring-watertight.kcad.ts',
      code: `return spring({ length: ${length}, coilRadius: ${coilRadius}, wireRadius: ${wireRadius}, turns: ${turns} });`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // Analytic tube volume = wire cross-section area × helix arc length.
    // The wire profile is an inscribed regular N-gon (path().circle with the
    // default 16 segments): area = ½·n·sin(2π/n)·r² ≈ 0.9745·π·r².
    const wireArea = 0.5 * segments * Math.sin((2 * Math.PI) / segments) * wireRadius ** 2;
    const helixLen = turns * Math.hypot(2 * Math.PI * coilRadius, length / turns);
    const analytic = wireArea * helixLen;
    const v = m.tailShape!.volume();
    expect(v).toBeGreaterThan(analytic * 0.96);
    expect(v).toBeLessThan(analytic * 1.04);
    const { report } = await (m.tailShape as OcctBackend).exportSTLWithReportAsync();
    expect(report.openEdgeCount).toBe(0);
    expect(report.ok).toBe(true);
  });

  it('rejects invalid spring dimensions at capture time', () => {
    const api = makeApi();
    expect(() => api.spring({ length: 0, coilRadius: 5, wireRadius: 1, turns: 4 }))
      .toThrow(/spring: length/);
    expect(() => api.spring({ length: 40, coilRadius: 1, wireRadius: 1, turns: 4 }))
      .toThrow(/coilRadius.*greater than wireRadius/);
    expect(() => api.spring({ length: 40, coilRadius: 5, wireRadius: 1, turns: 0 }))
      .toThrow(/turns/);
  });

  it('is advertised to agents as a top-level modeling primitive', () => {
    const entry = GLOBALS.find((g) => g.name === 'spring');
    expect(entry?.signature).toContain('length');
    expect(entry?.description).toContain('helical');
  });
});
