// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { runScript } from '../../runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { createOcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import type { Assembly } from '../../capture/assembly';
import { usdIsaacSerialize } from './usdIsaacSerializer';
import { isInertia6PositiveDefinite } from '../../runtime/mjcfExport';

const TWO_LINK_ARM = `
const arm = assembly('two-link-usd-arm');
const base = arm.part('base', box(40, 40, 20, true).translate(0, 0, 10), { density: 7850 });
const link1 = arm.part('link1', box(20, 20, 100, true).translate(0, 0, 50), { density: 2700 });

base.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 20] },
  axis: [0, 0, 1],
});
link1.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', {
  limitsDeg: [-90, 90],
});

return arm.model();
`;

async function buildArm(code: string): Promise<Assembly> {
  const run = await runScript({ code, fileName: 'two-link.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const fatal = r.diagnostics.filter(d => d.severity === 'error');
  expect(fatal).toEqual([]);
  const assemblies = run.session.assemblies as Map<string, Assembly>;
  const first = assemblies.values().next();
  expect(first.done).toBe(false);
  return first.value as Assembly;
}

describe('usdIsaacSerialize', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('emits an articulation root, two rigid bodies and a revolute joint', async () => {
    const arm = await buildArm(TWO_LINK_ARM);
    const out = await usdIsaacSerialize(arm, {});

    expect(out.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(out.usda).toContain('PhysicsArticulationRootAPI');
    expect(out.usda).toMatch(/def Xform "base"/);
    expect(out.usda).toMatch(/def Xform "link1"/);
    expect(out.usda).toContain('PhysicsRevoluteJoint');
    expect(out.usda).toContain('physics:axis = (0.000000, 0.000000, 1.000000)');
    expect(out.usda).toContain('physics:lowerLimit = -90.000000');
    expect(out.usda).toContain('physics:upperLimit = 90.000000');
    expect(out.meshPaths.map(m => m.partName).sort()).toEqual(['base', 'link1']);
  });

  it('reports positive-definite mass properties for every body', async () => {
    const arm = await buildArm(TWO_LINK_ARM);
    for (const part of arm.__parts()) {
      const lowered = await part.originalShape.lower();
      const mp = lowered.massProperties(part.density ?? 1000);
      expect(mp.mass).toBeGreaterThan(0);
      const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
      expect(isInertia6PositiveDefinite([ixx, ixy, ixz, iyy, iyz, izz])).toBe(true);
    }
  });

  it('refuses a mate kind with no UsdPhysics joint equivalent', async () => {
    const code = TWO_LINK_ARM
      .replace(/type: 'axis',/g, "type: 'ball',")
      .replace(
        "arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', {\n  limitsDeg: [-90, 90],\n});",
        "arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'ball', {});",
      );
    const arm = await buildArm(code);
    const out = await usdIsaacSerialize(arm, {});
    expect(out.usda).toBe('');
    expect(out.diagnostics.some(d => d.code === 'export.usd.joint-unsupported' && d.severity === 'error')).toBe(true);
  });
});
