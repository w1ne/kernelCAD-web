// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { buildModel } from './buildModel';
import { KernelError } from '../shared/intent/kernelError';

beforeAll(async () => { await initOcct(); }, 60_000);

const SQUARE = 'path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close()';
const RAIL = '[[0, 0, 0], [0, 0, 10], [10, 0, 10]]';

describe('Sketch.sweep(rail, opts) option checks', () => {
  // `{ transition: 'round' }` was dropped and the sweep kept the default
  // 'right' corner with no diagnostic.
  it.each([
    [`{ transition: 'round' }`, /unknown option 'transition'/],
    [`{ spine: 'polyline', frenét: true }`, /unknown option 'frenét'/],
    ['null', /opts — got .*requires an options object/],
    ['[]', /opts — got .*requires an options object/],
  ])('rejects sweep(rail, %s)', async (opts, message) => {
    const error = await buildModel({
      fileName: 'sweep-bad-opts.kcad.ts',
      code: `return ${SQUARE}.sweep(${RAIL}, ${opts});`,
    }).then(() => undefined, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(KernelError);
    expect((error as KernelError).code).toBe('feature.invalid-args');
    expect((error as KernelError).message).toMatch(message);
  });

  it('still builds with every accepted key', async () => {
    const model = await buildModel({
      fileName: 'sweep-ok.kcad.ts',
      code: `return ${SQUARE}.sweep(${RAIL}, { frenet: false, transitionMode: 'round', spine: 'polyline', faceLabels: { wall: 'front' } });`,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});
