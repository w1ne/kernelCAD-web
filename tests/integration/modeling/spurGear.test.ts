// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// spurGear(...) proofs: every tooth count gives ONE manifold solid, a
// meshing pair at m(z1+z2)/2 has zero intersection volume, and the STL and
// STEP exports are both watertight / non-empty.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { stlStats } from '../../helpers/stlStats';
import { spurGearFlankSamples, spurGearOutline, spurGearRadii } from '../../../src/modeling/spurGear';

beforeAll(async () => {
  await initOcct();
}, 60_000);

function pairScript(z1: number, z2: number, backlash: number): string {
  return `
const m = 1;
const a = assembly('pair');
a.part('pinion', spurGear({ module: m, teeth: ${z1}, faceWidth: 5, backlash: ${backlash} }));
a.part('gear', spurGear({ module: m, teeth: ${z2}, faceWidth: 5, backlash: ${backlash} })
  .rotateZ(${z2} % 2 === 0 ? 180 / ${z2} : 0)
  .translate(m * (${z1} + ${z2}) / 2, 0, 0));
return a.model();
`;
}

describe('spurGear profile math', () => {
  it('matches the analytic involute above the base circle', () => {
    const z = 20;
    const alpha = (20 * Math.PI) / 180;
    const inv = (a: number) => Math.tan(a) - a;
    const { radii, rs, ts, involuteStart } = spurGearFlankSamples({ module: 1, teeth: z, pressureAngleDeg: 20, backlash: 0 });
    expect(rs[involuteStart]).toBeCloseTo(radii.base, 9);
    void involuteStart;
    let checked = 0;
    for (let i = 0; i < rs.length; i += 1) {
      if (rs[i] < radii.base) continue;
      const expected = Math.PI / (2 * z) + inv(alpha) - inv(Math.acos(radii.base / rs[i]));
      expect(ts[i]).toBeCloseTo(expected, 5);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(6);
  });

  it('undercuts low tooth counts: the trochoid removes the involute foot at the base circle', () => {
    const inv = (a: number) => Math.tan(a) - a;
    const involuteAtBase = (z: number) => Math.PI / (2 * z) + inv((20 * Math.PI) / 180);
    const at = (z: number) => {
      const s = spurGearFlankSamples({ module: 1, teeth: z, pressureAngleDeg: 20, backlash: 0 });
      return { s, base: s.ts[s.rs.findIndex((r) => Math.abs(r - s.radii.base) < 1e-12)] };
    };
    const z12 = at(12);
    expect(z12.base).toBeLessThan(involuteAtBase(12) - 1e-3);
    // The involute starts above the base circle, at an exactly sampled corner.
    expect(z12.s.rs[z12.s.involuteStart]).toBeGreaterThan(z12.s.radii.base + 0.01);
    const z20 = at(20);
    expect(z20.base).toBeCloseTo(involuteAtBase(20), 4);
  });

  it('backlash thins each tooth by backlash/4 per flank at the pitch circle', () => {
    const tight = spurGearFlankSamples({ module: 1, teeth: 30, pressureAngleDeg: 20, backlash: 0 });
    const loose = spurGearFlankSamples({ module: 1, teeth: 30, pressureAngleDeg: 20, backlash: 0.2 });
    const i = tight.rs.findIndex((r) => r > tight.radii.pitch);
    expect((tight.ts[i] - loose.ts[i]) * tight.radii.pitch).toBeCloseTo(0.05, 6);
  });

  it('outline is one closed loop of 6 segments per tooth', () => {
    const o = spurGearOutline({ module: 1, teeth: 20, pressureAngleDeg: 20, backlash: 0.05 });
    expect(o.segments.length).toBe(20 * 6);
    const last = o.segments[o.segments.length - 1];
    const end = last.kind === 'arc' ? last.to : last.points[last.points.length - 1];
    expect(Math.hypot(end[0] - o.start[0], end[1] - o.start[1])).toBeLessThan(1e-9);
  });

  it('rejects a pointed tooth with an actionable error', () => {
    expect(() =>
      spurGearFlankSamples({ module: 1, teeth: 6, pressureAngleDeg: 35, backlash: 0.5 }),
    ).toThrow(/pointed|vanishes/);
  });
});

describe('spurGear solids', () => {
  for (const teeth of [12, 20, 40, 60]) {
    it(`z=${teeth} is one connected, watertight solid`, async () => {
      const code = `return spurGear({ module: 1, teeth: ${teeth}, faceWidth: 5, bore: 3 });`;
      const stl = await runAndExport({ code, fileName: `gear-${teeth}.kcad.ts`, format: 'stl' });
      expect(stl.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(stl.diagnostics.map((d) => d.code)).not.toContain('export.mesh.not-watertight');
      const { components, volume } = stlStats(stl.bytes);
      // One body: a floating tooth or bore stub would be its own component.
      expect(components).toBe(1);
      const { root, tip } = spurGearRadii(1, teeth, 20);
      const bore = Math.PI * 1.5 ** 2 * 5;
      // Between the root-disc and tip-disc volumes (minus the bore): a hollow
      // ring (the old recipe's failure) falls far below the root disc.
      expect(volume).toBeGreaterThan(Math.PI * root * root * 5 - bore);
      expect(volume).toBeLessThan(Math.PI * tip * tip * 5 - bore);

      if (teeth === 20) {
        const step = await runAndExport({ code, fileName: `gear-${teeth}.kcad.ts`, format: 'step' });
        expect(step.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        expect(new TextDecoder().decode(step.bytes).match(/MANIFOLD_SOLID_BREP/g)?.length).toBe(1);
      }
    }, 180_000);
  }
});

describe('spurGear pair', () => {
  it('20/40 at m(z1+z2)/2 has zero intersection volume', async () => {
    const result = await checkInterference({
      code: pairScript(20, 40, 0.05),
      fileName: 'pair.kcad.ts',
      epsilonMm3: 1e-9,
    });
    expect(result.partCount).toBe(2);
    expect(result.pairs).toEqual([]);
  }, 180_000);

  it('12/60 (undercut pinion) meshes without interference', async () => {
    const result = await checkInterference({
      code: pairScript(12, 60, 0.05),
      fileName: 'pair.kcad.ts',
      epsilonMm3: 1e-9,
    });
    expect(result.pairs).toEqual([]);
  }, 180_000);

  it('a pair pulled 0.3 mm closer than m(z1+z2)/2 does interfere (the check is live)', async () => {
    const code = pairScript(20, 40, 0.05).replace('m * (20 + 40) / 2', 'm * (20 + 40) / 2 - 0.3');
    const result = await checkInterference({ code, fileName: 'pair.kcad.ts', epsilonMm3: 1e-9 });
    expect(result.pairs.length).toBe(1);
  }, 180_000);
});
