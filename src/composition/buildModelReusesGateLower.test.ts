// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { buildModel } from './buildModel';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';

beforeAll(async () => { await initOcct(); }, 60_000);
afterEach(() => { vi.restoreAllMocks(); });

const axis = `({ type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })`;
const mated = (extra = '') => `
const a = assembly('pair');
a.part('base', box(40, 40, 4, true).translate(0, 0, -2)).connector('ax', ${axis});
a.part('disc', cylinder(4, 10).translate(0, 0, 1)${extra}).connector('ax', ${axis});
a.mate('turn', 'base.ax', 'disc.ax', 'revolute', { limitsDeg: [-90, 90] });
return a.solvedModel({});
`;

describe('buildModel reuses the solvedModel gate lower', () => {
  it('seeds its full lower from the clean gate run and drops it afterwards', async () => {
    const run = vi.spyOn(RecomputeEngine.prototype, 'run');
    const model = await buildModel({ code: mated(), fileName: 'pair.kcad.ts' });
    const seedSizes = run.mock.calls.map(([, opts]) => opts?.seedShapes?.size ?? 0);
    // gate (no seed), then buildModel seeded with every record the gate lowered
    expect(seedSizes.length).toBeGreaterThanOrEqual(2);
    expect(seedSizes[0]).toBe(0);
    expect(seedSizes[seedSizes.length - 1]).toBeGreaterThan(0);
    expect(model.session.cleanScriptLower).toBeUndefined();
    expect(model.records.length).toBeGreaterThan(0);
  }, 120_000);

  it('gives the same parts as an unseeded build', async () => {
    const seeded = await buildModel({ code: mated(), fileName: 'pair.kcad.ts' });
    // A fresh session with no gate snapshot: lower everything from scratch.
    const snapshotFree = vi.spyOn(
      (await import('../modeling/capture/captureSession')).CaptureSession.prototype,
      'reusableLoweredPrefix',
    ).mockReturnValue(new Map());
    const plain = await buildModel({ code: mated(), fileName: 'pair.kcad.ts' });
    expect(snapshotFree).toHaveBeenCalled();
    expect([...seeded.health.entries()]).toEqual([...plain.health.entries()]);
    expect(seeded.diagnostics).toEqual(plain.diagnostics);
    expect(seeded.warnings).toEqual(plain.warnings);
    expect([...seeded.shapes.keys()].sort()).toEqual([...plain.shapes.keys()].sort());
  }, 120_000);
});
