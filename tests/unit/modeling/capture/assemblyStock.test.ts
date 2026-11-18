// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Stock is manufacturing intent on the part: capture keeps it, the feature
// record serializes it, and the BOM row / CSV export show it.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';
import { bomToCsv, computeBom } from '../../../../src/agent/script-runtime/bom';

describe('assembly.part stock', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60000);

  function makeArm() {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('arm');
    return { kcad, arm, session };
  }

  it('stores a CNC bar on the part and the capture record', () => {
    const { kcad, arm, session } = makeArm();
    const stock = { kind: 'bar' as const, lengthMm: 80, diameterMm: 20 };
    arm.part('shaft', kcad.cylinder(10, 80), {
      material: 'aluminum-6061',
      process: 'cnc',
      stock,
    });
    expect(arm.__parts()[0].stock).toEqual(stock);
    const rec = session.getRecords().find((r) => r.kind === 'assemblyPart');
    expect(rec?.metadata?.stock).toEqual(stock);
  });

  it('refuses a plate with a non-positive thickness', () => {
    const { kcad, arm } = makeArm();
    expect(() => arm.part('sheet', kcad.box(200, 120, 3), {
      stock: { kind: 'plate', lengthMm: 200, widthMm: 120, thicknessMm: -1 },
    })).toThrow(/opts\.stock\.thicknessMm/);
  });

  it('puts declared stock on the BOM row and the CSV export', async () => {
    const { kcad, arm, session } = makeArm();
    arm.part('sheet', kcad.box(200, 120, 3), {
      material: 'aluminum',
      process: 'sheet-cut',
      stock: { kind: 'plate', lengthMm: 200, widthMm: 120, thicknessMm: 3 },
    });
    const bom = await computeBom(arm, session);
    expect(bom.rows).toHaveLength(1);
    expect(bom.rows[0].stock).toEqual({
      kind: 'plate',
      lengthMm: 200,
      widthMm: 120,
      thicknessMm: 3,
    });
    expect(bomToCsv(bom.rows)).toContain('plate 200x120x3 mm');
  }, 60000);
});
