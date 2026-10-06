// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildModel } from '../../../../src/composition/buildModel';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { computeBom } from '../../../../src/agent/script-runtime/bom';
import { Shape } from '../../../../src/modeling/capture/proxy';
import type { Assembly } from '../../../../src/modeling/capture/assembly';

const ROW = `
  const arm = assembly('row');
  const shapes = [() => box(40, 20, 4), () => box(5, 5, 50), () => box(10, 10, 10)];
  for (let i = 0; i < 30; i++) arm.part('p' + i, shapes[i % 3](), { at: [i * 60, 0, 0], material: 'aluminum' });
  return arm.model();
`;

describe('BOM over shared geometry', () => {
  beforeAll(async () => { await initOcct(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('measures each geometry once and still reports quantity per row', async () => {
    const model = await buildModel({ code: ROW, fileName: 'row.kcad.ts' });
    const arm = (model.session.assemblies as Map<string, Assembly>).get('row')!;
    const lower = vi.spyOn(Shape.prototype, 'lower');
    const bom = await computeBom(arm, model.session);
    expect(lower).toHaveBeenCalledTimes(3);
    expect(bom.rows.map((r) => r.quantity)).toEqual([10, 10, 10]);
    expect(bom.totals.partCount).toBe(30);
  }, 120_000);
});
