// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The failing branch of the G1/G2 check (#1071 follow-up): when the skin does
// not reach the requested grade, the loft must fail with
// feature.loft.continuity-unresolved instead of reporting the grade unchecked.
// No real section set makes OCCT ThruSections drop below C2, so the checker is
// stubbed to report a shortfall; the lowering path around it is real.
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/kernel/backends/occt/segmentedLoft', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../src/kernel/backends/occt/segmentedLoft')>()),
  loftSkinContinuityShortfalls: () => [{ faceIndex: 3, got: 'C0' }],
}));

import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

function square(kcad: ReturnType<typeof createModelingApi>, r: number) {
  return kcad.path().moveTo(-r, -r).lineTo(r, -r).lineTo(r, r).lineTo(-r, r).close();
}

function loftWith(continuity: 'G0' | 'G1' | 'G2') {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const planes = [0, 20, 40].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] }));
  square(kcad, 5).loft([square(kcad, 7), square(kcad, 5)], { planes, continuity } as never);
  return new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
}

describe('loft G1/G2 check failing branch', () => {
  beforeAll(async () => { await initOcct(); });

  it.each(['G1', 'G2'] as const)('%s shortfall fails the feature with continuity-unresolved', async (continuity) => {
    const result = await loftWith(continuity);
    const diag = result.diagnostics.find((d) => d.code === 'feature.loft.continuity-unresolved');
    expect(diag?.severity).toBe('error');
    expect(diag?.message).toMatch(/face 3: C0/);
  });

  it('G0 does not run the check', async () => {
    const result = await loftWith('G0');
    expect(result.diagnostics.some((d) => d.code === 'feature.loft.continuity-unresolved')).toBe(false);
  });
});
