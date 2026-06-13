// tests/unit/capture/splineRevolveProfile.test.ts
//
// Issue #447 regression — path().spline() segments silently dropped when the
// path is used as a revolve() profile.
//
// Trigger: a spline whose points[0] does NOT match the current pen position.
// The lowered edge chain is disconnected; OCCT's BRepBuilderAPI_MakeWire
// silently skips edges it cannot reach (its Error() flag reflects only the
// most recent Add, so a later connectable edge resets it to WireDone). The
// spline — and every segment after it — vanished from the profile, the
// revolve ran on the degenerate remainder (a flat disc), and evaluation
// reported ok with zero diagnostics.
//
// The fix is two-layered:
//  1. capture-time — PathBuilder.spline() now enforces the documented
//     "points[0] MUST match the current pen position" contract (within
//     1e-6 mm, same as nurbsSegment / hermiteG2);
//  2. lowering-time (defense-in-depth) — buildNurbsSketchOnPlane rejects
//     any NURBS segment that does not chain head-to-tail, and verifies the
//     assembled wire kept every edge.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { PathBuilder } from '../../../src/modeling/capture/sketch';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { KernelError } from '../../../src/shared/intent/kernelError';
import { buildNurbsSketchOnPlane } from '../../../src/kernel/backends/occt/pathNurbsLowerer';
import type { SketchCommand } from '../../../src/shared/capture/sketchCommand';

beforeAll(async () => {
  await initOcct();
});

function freshPath(): PathBuilder {
  return new PathBuilder(new CaptureSession());
}

// Vase-like teardrop profile (radial-X, axial-Y), waypoints shared by the
// spline and line-equivalent variants so the volumes are comparable.
const WAYPOINTS: Array<[number, number]> = [
  [26, 0],
  [48, 75],
  [44, 150],
  [12, 220],
];

const SPLINE_VASE = `
  const profile = path()
    .moveTo(0, 0).lineTo(26, 0)
    .spline([[26, 0], [48, 75], [44, 150], [12, 220]])
    .lineTo(0, 220).close();
  return profile.revolve();
`;

const LINE_VASE = `
  const profile = path()
    .moveTo(0, 0).lineTo(26, 0)
    .lineTo(48, 75).lineTo(44, 150).lineTo(12, 220)
    .lineTo(0, 220).close();
  return profile.revolve();
`;

// Same spline profile but with a gap: points[0] = (30, 20) while the pen is
// at (26, 0). Pre-fix this lowered to a flat disc (volume 0, z-extent 0)
// with zero diagnostics.
const GAP_VASE = `
  const profile = path()
    .moveTo(0, 0).lineTo(26, 0)
    .spline([[30, 20], [48, 75], [44, 150], [12, 220]])
    .lineTo(0, 220).close();
  return profile.revolve();
`;

describe('issue #447 — spline profile revolve', () => {
  it('revolve of a connected spline profile produces real volume, comparable to the line-equivalent profile', async () => {
    const splineModel = await buildModel({ code: SPLINE_VASE, fileName: 'spline-vase.kcad.ts' });
    const lineModel = await buildModel({ code: LINE_VASE, fileName: 'line-vase.kcad.ts' });
    expect(splineModel.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(lineModel.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);

    const splineVol = (splineModel.rootShape as unknown as { volume(): number }).volume();
    const lineVol = (lineModel.rootShape as unknown as { volume(): number }).volume();
    // The spline interpolant bulges slightly outside the polyline chords, so
    // its solid is a bit larger; both must agree within 25% — light-years
    // away from the flat-disc failure mode (volume 0).
    expect(lineVol).toBeGreaterThan(100_000);
    expect(splineVol).toBeGreaterThan(0.9 * lineVol);
    expect(splineVol).toBeLessThan(1.25 * lineVol);

    // The solid must span the full profile height — the flat-disc defect
    // collapsed the z-extent to 0.
    const bb = (splineModel.rootShape as unknown as {
      boundingBox(): { min: number[]; max: number[] };
    }).boundingBox();
    expect(bb.max[2] - bb.min[2]).toBeCloseTo(220, 0);
  });

  it('extrude of the same connected spline profile also produces real volume (same seam)', async () => {
    const code = `
      const profile = path()
        .moveTo(0, 0).lineTo(26, 0)
        .spline([[26, 0], [48, 75], [44, 150], [12, 220]])
        .lineTo(0, 220).close();
      return profile.extrude(10);
    `;
    const model = await buildModel({ code, fileName: 'spline-extrude.kcad.ts' });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const vol = (model.rootShape as unknown as { volume(): number }).volume();
    expect(vol).toBeGreaterThan(10_000);
  });

  it('spline with a gap before points[0] throws at capture time (was: silent flat disc)', () => {
    let caught: KernelError | undefined;
    try {
      freshPath()
        .moveTo(0, 0)
        .lineTo(26, 0)
        .spline([[30, 20], [48, 75], [44, 150], [12, 220]]);
    } catch (e) {
      caught = e as KernelError;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect(caught!.code).toBe('feature.path.spline.degenerate-points');
    expect(caught!.message).toContain('does not match current pen position');
  });

  it('spline whose points are listed in reverse (last point at the pen) throws the same contract error', () => {
    // Pre-fix this happened to assemble via edge reversal; the documented
    // contract (points[0] at the pen) is now enforced uniformly.
    let caught: KernelError | undefined;
    try {
      freshPath()
        .moveTo(0, 0)
        .lineTo(26, 0)
        .spline([[12, 220], [44, 150], [48, 75], [26, 0]]);
    } catch (e) {
      caught = e as KernelError;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect(caught!.code).toBe('feature.path.spline.degenerate-points');
  });

  it('spline without a prior moveTo throws at capture time', () => {
    let caught: KernelError | undefined;
    try {
      freshPath().spline([[0, 0], [10, 5], [20, 0]]);
    } catch (e) {
      caught = e as KernelError;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect(caught!.code).toBe('feature.path.spline.degenerate-points');
    expect(caught!.message).toContain('no current pen position');
  });

  it('evaluate of the gap profile reports a blocking diagnostic, not ok', async () => {
    const r = await evaluateAndBuildScript({ code: GAP_VASE });
    expect(r.evaluation.exitCode).toBe(1);
    const errors = r.evaluation.diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(d => d.code === 'feature.path.spline.degenerate-points')).toBe(true);
  });

  it('lowering-level guard rejects a disconnected NURBS segment even when capture validation is bypassed', () => {
    // Build a VALID command list via PathBuilder, then mutate the spline's
    // first waypoint to open a gap — modeling any producer that writes
    // SketchCommands without going through PathBuilder.spline().
    const pb = freshPath()
      .moveTo(0, 0)
      .lineTo(26, 0)
      .spline(WAYPOINTS);
    const commands = (pb as unknown as { commands: SketchCommand[] }).commands;
    const spline = commands.find(c => c.kind === 'spline');
    if (spline?.kind !== 'spline') throw new Error('spline command missing');
    (spline.points[0].x as { evaluated: number }).evaluated = 30;
    (spline.points[0].y as { evaluated: number }).evaluated = 20;
    const withClose: SketchCommand[] = [...commands, { kind: 'close' }];
    expect(() => buildNurbsSketchOnPlane(withClose, 'XZ')).toThrow(/gap|chain head-to-tail/);
  });
});
