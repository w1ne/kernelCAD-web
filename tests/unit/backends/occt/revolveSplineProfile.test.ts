// tests/unit/backends/occt/revolveSplineProfile.test.ts
//
// README gap log #6 — revolve rejected spline-only closed profiles. The
// revolve lowerer counted only `lineTo`/`tangentArc` segments and checked the
// axis-cross condition against only `moveTo`/`lineTo`/`tangentArc` x values.
// A closed `moveTo + spline(loop) + close` profile is a legitimate revolve
// profile, and every segment kind's carried positions (line/arc endpoints,
// arc midpoints, spline waypoints, NURBS control points, hermite endpoints)
// must participate in the x >= 0 axis-cross guard.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import type { ShapeBackend } from '../../../../src/kernel/backends/backend';

beforeAll(async () => {
  await initOcct();
});

async function lowerScript(code: string): Promise<{
  diagnostics: Awaited<ReturnType<RecomputeEngine['run']>>['diagnostics'];
  shape: ShapeBackend | undefined;
}> {
  const run = await runScript({ code, fileName: 'revolve-spline-profile.kcad.ts' });
  const recompute = await new RecomputeEngine(new OcctLowerer()).run(run.records);
  const revolveRecord = run.records[run.records.length - 1];
  return { diagnostics: recompute.diagnostics, shape: recompute.shapes.get(revolveRecord.id) };
}

type MeasuredShape = ShapeBackend & {
  boundingBox(): { min: number[]; max: number[] };
};

describe('revolve spline-only / mixed closed profiles', () => {
  it('revolves a moveTo + spline(closed loop) + close profile with positive volume and expected bbox', async () => {
    const code = `
      const profile = path().moveTo(140, -20)
        .spline([[140, -20], [150, 10], [140, 30], [120, 30], [120, -20], [140, -20]])
        .close();
      return profile.revolve();
    `;
    const { diagnostics, shape } = await lowerScript(code);
    expect(diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(shape).toBeDefined();

    const s = shape as MeasuredShape;
    // A real solid, not the zero-volume degenerate the pre-fix lowerer
    // reported as "no line/arc segments — area is zero".
    expect(s.volume()).toBeGreaterThan(1_000_000);
    const bb = s.boundingBox();
    // The spline interpolant bulges past its waypoints, so the radial extent
    // slightly exceeds 150 and the axial span slightly exceeds [-20, 30].
    expect(bb.max[0]).toBeGreaterThan(145);
    expect(bb.min[0]).toBeLessThan(-145);
    expect(bb.max[2]).toBeGreaterThan(30);
    expect(bb.min[2]).toBeLessThan(-20);
  });

  it('revolves a mixed spline + line profile (the pen-matched issue repro)', async () => {
    const code = `
      const profile = path().moveTo(140, -20)
        .spline([[140, -20], [150, 10], [140, 30], [120, 30]])
        .lineTo(120, -20).close();
      return profile.revolve();
    `;
    const { diagnostics, shape } = await lowerScript(code);
    expect(diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(shape).toBeDefined();

    const s = shape as MeasuredShape;
    expect(s.volume()).toBeGreaterThan(1_000_000);
    const bb = s.boundingBox();
    expect(bb.max[0]).toBeGreaterThan(145);
    expect(bb.min[0]).toBeLessThan(-145);
    // The explicit lineTo pins the bottom at the profile's -20 start.
    expect(bb.min[2]).toBeCloseTo(-20, 3);
    expect(bb.max[2]).toBeGreaterThan(30);
  });

  it('rejects a spline profile whose waypoints dip to x < 0 with feature.revolve.crosses-axis', async () => {
    const code = `
      const profile = path().moveTo(140, -20)
        .spline([[140, -20], [150, 10], [-5, 30], [120, 30], [140, -20]])
        .close();
      return profile.revolve();
    `;
    const { diagnostics, shape } = await lowerScript(code);
    const crossing = diagnostics.find(d => d.code === 'feature.revolve.crosses-axis');
    expect(crossing).toBeDefined();
    expect(crossing!.severity).toBe('error');
    expect(crossing!.message).toContain('x=-5');
    expect(shape).toBeUndefined();
  });

  it('rejects a NURBS control point with x < 0 even though the command endpoint is positive', async () => {
    const code = `
      const profile = path().moveTo(140, -20)
        .nurbsSegment([[140, -20], [150, 10], [-5, 30], [140, -20]], { degree: 3 })
        .close();
      return profile.revolve();
    `;
    const { diagnostics } = await lowerScript(code);
    const crossing = diagnostics.find(d => d.code === 'feature.revolve.crosses-axis');
    expect(crossing).toBeDefined();
    expect(crossing!.message).toContain('x=-5');
  });

  it('rejects a hermiteG2_2d endpoint with x < 0', async () => {
    const code = `
      const profile = path().moveTo(140, -20)
        .hermiteG2({ point: [140, -20], tangent: [0, 1] }, { point: [-5, 30], tangent: [1, 0] })
        .lineTo(140, -20).close();
      return profile.revolve();
    `;
    const { diagnostics } = await lowerScript(code);
    const crossing = diagnostics.find(d => d.code === 'feature.revolve.crosses-axis');
    expect(crossing).toBeDefined();
    expect(crossing!.message).toContain('x=-5');
  });

  it('rejects a threePointsArc midpoint with x < 0', async () => {
    const code = `
      const profile = path().moveTo(140, -20)
        .threePointsArc(140, 30, -5, 5)
        .lineTo(140, -20).close();
      return profile.revolve();
    `;
    const { diagnostics } = await lowerScript(code);
    const crossing = diagnostics.find(d => d.code === 'feature.revolve.crosses-axis');
    expect(crossing).toBeDefined();
    expect(crossing!.message).toContain('x=-5');
  });

  it('still rejects a moveTo + close-only profile with the empty-profile diagnostic and updated hint', async () => {
    const code = `return path().moveTo(140, -20).close().revolve();`;
    const { diagnostics, shape } = await lowerScript(code);
    const empty = diagnostics.find(d =>
      d.code === 'feature.invalid-args' && d.message.includes('no line/arc segments')
    );
    expect(empty).toBeDefined();
    expect(empty!.severity).toBe('error');
    expect(empty!.hint).toBe('Add at least one segment (line, arc, or spline) to the path before close.');
    expect(shape).toBeUndefined();
  });
});
