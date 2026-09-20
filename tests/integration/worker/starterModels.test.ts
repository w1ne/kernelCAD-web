// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { createV01ApiGlobals, unwrapV01Shape } from '../../../src/shared/worker/v01ApiShim';
import { STARTERS, starterCode } from '../../../src/studio/start/starterModels';

beforeAll(async () => { await initOcct(); });

describe('free examples are real solids at the advertised sizes', () => {
  for (const model of STARTERS) {
    for (const sizes of [model.sizes, { width: 40, depth: 40, height: 25 }, { width: 120, depth: 120, height: 80 }, { width: 40, depth: 40, height: 80 }]) {
      it(`${model.name} ${sizes.width} × ${sizes.depth} × ${sizes.height}`, () => {
        const api = createV01ApiGlobals(replicad);
        const evaluate = new Function(...Object.keys(api), starterCode({ ...model, sizes }));
        const shape = unwrapV01Shape(evaluate(...Object.values(api))) as replicad.Solid;
        expect(new OcctBackend(shape).solidComponents().length).toBe(1);
        const [min, max] = shape.boundingBox.bounds;
        expect(max[0] - min[0]).toBeCloseTo(sizes.width, 4);
        expect(max[1] - min[1]).toBeCloseTo(sizes.depth, 4);
        expect(max[2] - min[2]).toBeCloseTo(sizes.height, 4);
        expect(shape.faces.length).toBeGreaterThanOrEqual(6);
        expect(replicad.measureVolume(shape)).toBeGreaterThan(0);
        shape.delete();
      });
    }
  }
});
