// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { buildModel } from './buildModel';
import { KernelError } from '../shared/intent/kernelError';

beforeAll(async () => { await initOcct(); }, 60_000);

const RAIL = 'radius: 5, pitch: 2, turns: 2';

describe('helix(opts) option checks', () => {
  // `lefthand: true` was dropped and the rail stayed right-hand; `axis: 'x'`
  // fell through to the Y-axis branch.
  it.each([
    [`{ ${RAIL}, lefthand: true }`, /unknown keys: lefthand/],
    [`{ ${RAIL}, pointsPerTrn: 64 }`, /unknown keys: pointsPerTrn/],
    [`{ ${RAIL}, axis: 'x' }`, /opts\.axis/],
    ['5', /opts/],
  ])('rejects helix(%s)', async (opts, message) => {
    const error = await buildModel({
      fileName: 'helix-bad-opts.kcad.ts',
      code: `return pipe(helix(${opts}), 0.5);`,
    }).then(() => undefined, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(KernelError);
    expect((error as KernelError).code).toBe('feature.invalid-args');
    expect((error as KernelError).message).toMatch(message);
  });

  it('still builds a rail along an upper-case axis', async () => {
    const model = await buildModel({
      fileName: 'helix-ok.kcad.ts',
      code: `const rail = helix({ ${RAIL}, axis: 'X', pointsPerTurn: 16, startAngle: 0 });
        if (rail.length !== 33 || rail[32][0] !== 4) throw new Error('bad rail ' + rail.length + ' ' + rail[32]);
        return box(1, 1, 1);`,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});
