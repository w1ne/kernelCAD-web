// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// When the end body of a deferred-check boolean chain fails the chain check,
// the chain is built again link by link with every check. Force that path by
// making the chain check report lost material.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct, type OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { booleanBuildStats } from '../../../../kernel/backends/occt/historyAwareBooleans';
import { buildModel } from '../../../../composition/buildModel';

vi.mock('../../../../kernel/backends/occt/historyAwareBooleans', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../kernel/backends/occt/historyAwareBooleans')>();
  // Only the lowerer's chain check imports it from here; the kernel's own
  // per-build checks call the real function.
  return { ...actual, fuseLostMaterial: vi.fn(() => ({ resultVolume: 0, largestSolid: 1 })) };
});

beforeAll(async () => { await initOcct(); }, 60_000);

const RODS = 6;
const code = `
let p = box(40, 40, 3);
for (let i = 0; i < ${RODS}; i++) p = p.union(cylinder(30, 1.2).rotate([1, 0, 0], 15 + i * 5).translate(3 + i * 6, 20, 2));
return p;`;

describe('boolean chain fallback', () => {
  it('rebuilds a chain that fails the end check link by link, with every check', async () => {
    const builds = booleanBuildStats.builds;
    const checks = booleanBuildStats.resultChecks;
    const model = await buildModel({ code, fileName: 'chain.kcad.ts' });
    // The deferred pass, then the checked rebuild of every link.
    expect(booleanBuildStats.builds - builds).toBe(2 * RODS);
    expect(booleanBuildStats.resultChecks - checks).toBeGreaterThanOrEqual(RODS + 1);
    expect([...model.health.values()].every((h) => h === 'healthy')).toBe(true);
    const tail = model.shapes.get(model.tailId!) as OcctBackend;
    expect(tail.volume()).toBeGreaterThan(40 * 40 * 3);
    const kind = new Map(model.records.map((r) => [r.id as string, r.kind]));
    const roots = new Set([...(tail.historyMap?.values() ?? [])].map((l) => kind.get(l.rootFeatureId)));
    expect(roots).toEqual(new Set(['box', 'cylinder']));
  }, 120_000);
});
