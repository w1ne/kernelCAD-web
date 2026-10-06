// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Spec "Testing and proof" #3: 1,000 parts from 20 recipes -> exactly 20
// assembly-part lowerings and 20 tessellations. Counting only, no timing.
// Negative cases: a per-part translated shape and a keyless part never share.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let meshCalls = 0;
vi.mock('../../../src/kernel/backends/occt/meshing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/kernel/backends/occt/meshing')>();
  return {
    ...actual,
    meshShape: (...args: Parameters<typeof actual.meshShape>) => {
      meshCalls += 1;
      return actual.meshShape(...args);
    },
  };
});

import { buildModel } from '../../../src/composition/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';

const PLANT = `
  const arm = assembly('plant');
  const makers = [];
  for (let k = 0; k < 20; k++) makers.push(() => box(10 + k, 10, 10).subtract(cylinder(20, 2).translate(5, 5, -5)));
  for (let i = 0; i < 1000; i++) {
    arm.part('p' + i, makers[i % 20](), { at: [(i % 50) * 40, Math.floor(i / 50) * 40, 0] });
  }
  return arm.model();
`;

const TRANSLATED = `
  const arm = assembly('t');
  for (let i = 0; i < 6; i++) arm.part('p' + i, box(10, 10, 10).translate(i * 5, 0, 0), { at: [i * 40, 0, 0] });
  return arm.model();
`;

const KEYLESS = `
  const arm = assembly('k');
  for (let i = 0; i < 6; i++) arm.part('p' + i, sdf.materialize(sdf.sphere(5), { resolution: 12 }), { at: [i * 40, 0, 0] });
  return arm.model();
`;

function partLowerings(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter((c) => (c[0] as { kind: string }).kind === 'assemblyPart').length;
}

describe('plant-scale assembly: one lowering and one tessellation per unique shape', () => {
  beforeAll(async () => { await initOcct(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('1,000 parts / 20 unique -> 20 assemblyPart lowerings and 20 meshShape calls', async () => {
    const lower = vi.spyOn(OcctLowerer.prototype, 'lower');
    const model = await buildModel({ code: PLANT, fileName: 'plant.kcad.ts' });
    expect(partLowerings(lower)).toBe(20);
    lower.mockRestore();

    meshCalls = 0;
    const meshed = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(meshCalls).toBe(20);
    expect(meshed.features.filter((f) => f.assemblyPartName !== undefined)).toHaveLength(1000);
    expect(new Set(meshed.features.map((f) => f.geometryId).filter(Boolean)).size).toBe(20);
  }, 300_000);

  it('per-part translated geometry differs, so it lowers once per part', async () => {
    const lower = vi.spyOn(OcctLowerer.prototype, 'lower');
    await buildModel({ code: TRANSLATED, fileName: 't.kcad.ts' });
    expect(partLowerings(lower)).toBe(6);
  }, 120_000);

  it('keyless parts still lower once per part', async () => {
    const lower = vi.spyOn(OcctLowerer.prototype, 'lower');
    const model = await buildModel({ code: KEYLESS, fileName: 'k.kcad.ts' });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(partLowerings(lower)).toBe(6);
  }, 120_000);
});
