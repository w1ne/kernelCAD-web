// tests/unit/backends/occt/labelDiagnostics.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/backends/occt/occtBackend';

describe('Label diagnostic codes (I4 split)', () => {
  beforeAll(async () => { await initOcct(); });

  it('feature.label.unknown-name when label name not present in sketch', async () => {
    const code = `
      return path().moveTo(0,0)
        .lineTo(10,0).label('exists')
        .lineTo(10,5)
        .lineTo(0,5)
        .close()
        .extrude(3)
        .fillet(1, { face: 'doesnotexist' });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.label.unknown-name' && d.severity === 'error'
    )).toBe(true);
  });

  it('feature.label.no-upstream-sketch when fillet by label is applied to a non-sketch primitive', async () => {
    // Box doesn't have a sketch upstream. The label cannot resolve.
    const code = `return box(10, 10, 5).fillet(1, { face: 'phantomLabel' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.label.no-upstream-sketch' && d.severity === 'error'
    )).toBe(true);
  });

  it('feature.label.unsupported-base when label is used on a revolve (revolve labels not yet supported)', async () => {
    const code = `
      return path().moveTo(10,0)
        .lineTo(20,0).label('innerEdge')
        .lineTo(20,5)
        .lineTo(10,5)
        .close()
        .revolve()
        .fillet(1, { face: 'innerEdge' });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.label.unsupported-base' && d.severity === 'error'
    )).toBe(true);
  });

  it('feature.label.mixed-convexity when label sits at a reflex (concave) corner', async () => {
    // L-shape with an inside corner. Labeling the segment that runs through
    // the reflex region should surface mixed-convexity rather than fail
    // generically.
    const code = `
      return path().moveTo(0,0)
        .lineTo(20,0)
        .lineTo(20,5)
        .lineTo(5,5).label('reflexEdge')
        .lineTo(5,15)
        .lineTo(0,15)
        .close()
        .extrude(3)
        .fillet(1, { face: 'reflexEdge' });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.label.mixed-convexity' && d.severity === 'error'
    )).toBe(true);
  });

  it('Convex-only labeled segment resolves normally (regression check for I6)', async () => {
    const code = `
      return path().moveTo(0,0)
        .lineTo(10,0).label('rim')
        .lineTo(10,5)
        .lineTo(0,5)
        .close()
        .extrude(3)
        .fillet(1, { face: 'rim' });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });
});
