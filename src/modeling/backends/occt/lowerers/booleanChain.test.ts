// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `p = p.union(rod)` in a loop is a chain of single-tool booleans growing one
// body. Each link used to check its whole result (BRepCheck topology pass and
// a lost-material volume integration), so the checks cost grew with the square
// of the chain length: a 56-rod lattice pylon spent half its build in them.
// A link read only by the next link now leaves the checks to the chain's last
// link, which checks the end body against every operand of the chain.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, type OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { booleanBuildStats } from '../../../../kernel/backends/occt/historyAwareBooleans';
import { buildModel } from '../../../../composition/buildModel';

beforeAll(async () => { await initOcct(); }, 60_000);

const RODS = 12;
const chain = (probe = '') => `
let p = box(40, 40, 3);
const probes: Shape[] = [];
for (let i = 0; i < ${RODS}; i++) {
  p = p.union(cylinder(30, 1.2).rotate([1, 0, 0], 15 + i * 5).translate(3 + i * 3, 20, 2));
  ${probe}
}
return p.subtract(box(4, 4, 10).translate(30, 4, -1));`;

async function build(code: string) {
  const checks = booleanBuildStats.resultChecks;
  const builds = booleanBuildStats.builds;
  const model = await buildModel({ code, fileName: 'chain.kcad.ts' });
  return { model, checks: booleanBuildStats.resultChecks - checks, builds: booleanBuildStats.builds - builds };
}

describe('single-consumer boolean chains', () => {
  it('checks the whole result once per chain, not once per link', async () => {
    const { model, checks, builds } = await build(chain());
    expect([...model.health.values()].every((h) => h === 'healthy')).toBe(true);
    expect(builds).toBe(RODS + 1);
    // The union chain's last link and the closing cut.
    expect(checks).toBeLessThanOrEqual(2);
  }, 120_000);

  it('gives the same bodies and lineage as checking every link', async () => {
    // Reading every intermediate elsewhere keeps every link checked.
    const deferred = await build(chain());
    const checked = await build(chain('probes.push(p.intersect(box(2, 2, 2)));'));
    expect(checked.checks).toBeGreaterThanOrEqual(RODS);
    const tail = (m: typeof deferred.model) => m.shapes.get(m.tailId!) as OcctBackend;
    expect(tail(deferred.model).volume()).toBeCloseTo(tail(checked.model).volume(), 6);
    expect(tail(deferred.model).faceHashes().length).toBe(tail(checked.model).faceHashes().length);
    // Every intermediate body is still lowered (inspectable per feature).
    for (const r of deferred.model.records) expect(deferred.model.shapes.has(r.id)).toBe(true);
    // The probes add records (and shift ids), so compare roots by kind.
    const roots = (m: typeof deferred.model) => {
      const kind = new Map(m.records.map((r) => [r.id as string, r.kind]));
      return [...(tail(m).historyMap?.values() ?? [])].map((l) => kind.get(l.rootFeatureId)).sort();
    };
    expect(roots(deferred.model)).toEqual(roots(checked.model));
  }, 120_000);
});
