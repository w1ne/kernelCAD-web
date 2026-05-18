// tests/unit/capture/variableSweep.test.ts
//
// NURBS Slice B Task 7 (capture side only). The variableSweep lowerer
// arrives in Task 8 — these tests verify only that the capture API creates
// the right FeatureRecord shape, emits the right diagnostics on bad input,
// and accepts each spine variant (Curve3D / Sketch / Vec3[]).

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';
import type { VariableSweepMetadata } from '../../../src/shared/intent/variableSweepRecord';
import { KernelError } from '../../../src/shared/intent/kernelError';

function diagsOf(session: CaptureSession): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  for (const r of session.getRecords()) {
    const meta = r.metadata as { diagnostics?: CompilerDiagnostic[] } | undefined;
    if (meta?.diagnostics) out.push(...meta.diagnostics);
  }
  return out;
}

function findSweepMeta(session: CaptureSession): VariableSweepMetadata | undefined {
  const rec = session.getRecords().find((r) => r.kind === 'variableSweep');
  if (!rec) return undefined;
  const meta = rec.metadata as { variableSweep?: VariableSweepMetadata } | undefined;
  return meta?.variableSweep;
}

describe('variableSweep()', () => {
  it('creates a variableSweep record with a Curve3D spine + 2 sections', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const spine = kcad.nurbsCurve([
      [0, 0, 0],
      [10, 0, 0],
      [20, 0, 0],
      [30, 0, 0],
    ]);
    const profileA = kcad
      .path()
      .moveTo(-2, -2)
      .lineTo(2, -2)
      .lineTo(2, 2)
      .lineTo(-2, 2)
      .close();
    const profileB = kcad
      .path()
      .moveTo(-1, -1)
      .lineTo(1, -1)
      .lineTo(1, 1)
      .lineTo(-1, 1)
      .close();

    kcad.variableSweep(spine, [
      { t: 0, profile: profileA },
      { t: 1, profile: profileB },
    ]);

    const meta = findSweepMeta(session);
    expect(meta).toBeDefined();
    expect(meta!.sections).toHaveLength(2);
    expect(meta!.sections[0].t).toBe(0);
    expect(meta!.sections[1].t).toBe(1);
    expect(meta!.spineRef.kind).toBe('feature');
    expect(diagsOf(session).filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('auto-converts a Vec3[] spine to a nurbsCurve', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const profile = kcad
      .path()
      .moveTo(-1, -1)
      .lineTo(1, -1)
      .lineTo(1, 1)
      .lineTo(-1, 1)
      .close();
    kcad.variableSweep(
      [
        [0, 0, 0],
        [10, 0, 0],
        [20, 0, 0],
      ],
      [
        { t: 0, profile },
        { t: 1, profile },
      ],
    );

    // Should have produced one curve3d record (auto-conversion) + one
    // variableSweep record.
    const records = session.getRecords();
    expect(records.some((r) => r.kind === 'curve3d')).toBe(true);
    expect(records.some((r) => r.kind === 'variableSweep')).toBe(true);
    expect(diagsOf(session).filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('emits feature.variable-sweep.sections-out-of-order when t is non-monotonic', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const spine = kcad.nurbsCurve([
      [0, 0, 0],
      [10, 0, 0],
    ]);
    const profile = kcad
      .path()
      .moveTo(-1, -1)
      .lineTo(1, -1)
      .lineTo(1, 1)
      .lineTo(-1, 1)
      .close();
    kcad.variableSweep(spine, [
      { t: 0, profile },
      { t: 0.5, profile },
      { t: 0.3, profile },
      { t: 1, profile },
    ]);

    const errs = diagsOf(session).filter((d) => d.severity === 'error');
    expect(errs.some((d) => d.code === 'feature.variable-sweep.sections-out-of-order')).toBe(true);
  });

  it('emits feature.variable-sweep.sections-not-spanning when t does not start at 0 or end at 1', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const spine = kcad.nurbsCurve([
      [0, 0, 0],
      [10, 0, 0],
    ]);
    const profile = kcad
      .path()
      .moveTo(-1, -1)
      .lineTo(1, -1)
      .lineTo(1, 1)
      .lineTo(-1, 1)
      .close();
    kcad.variableSweep(spine, [
      { t: 0.1, profile },
      { t: 0.9, profile },
    ]);

    const errs = diagsOf(session).filter((d) => d.severity === 'error');
    expect(errs.some((d) => d.code === 'feature.variable-sweep.sections-not-spanning')).toBe(true);
  });

  it('throws KernelError when fewer than 2 sections are passed', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const spine = kcad.nurbsCurve([
      [0, 0, 0],
      [10, 0, 0],
    ]);
    const profile = kcad
      .path()
      .moveTo(-1, -1)
      .lineTo(1, -1)
      .lineTo(1, 1)
      .lineTo(-1, 1)
      .close();
    expect(() => kcad.variableSweep(spine, [{ t: 0, profile }])).toThrow(KernelError);
  });

  it('throws KernelError for a Vec3[] spine with fewer than 2 points', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const profile = kcad
      .path()
      .moveTo(-1, -1)
      .lineTo(1, -1)
      .lineTo(1, 1)
      .lineTo(-1, 1)
      .close();
    expect(() =>
      kcad.variableSweep([[0, 0, 0]], [
        { t: 0, profile },
        { t: 1, profile },
      ]),
    ).toThrow(KernelError);
  });
});
