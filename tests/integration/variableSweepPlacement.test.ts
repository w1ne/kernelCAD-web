// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/variableSweepPlacement.test.ts
//
// variableSweep places each sketch profile with its ORIGIN on the spine.
// It used to hand the profiles to OCCT with `WithContact=true`, which only
// translates a profile until its boundary touches the spine: a profile
// centred on the origin came out shifted sideways by its own half-width (a
// 90-110 mm hex vase spanned x ∈ [-111, 16] instead of ±63), and the
// off-axis body then broke every downstream offset.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildModel } from '../../src/modeling/buildModel';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';

const square = (s: number) =>
  `path().moveTo(${-s}, ${-s}).lineTo(${s}, ${-s}).lineTo(${s}, ${s}).lineTo(${-s}, ${s}).close()`;

async function build(code: string) {
  const m = await buildModel({ fileName: 'vs.kcad.ts', code });
  expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
  return m.tailShape!;
}

describe('variableSweep profile placement', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('keeps centred profiles centred on a straight spine (2 and 3 stations)', async () => {
    for (const sections of [
      `[{ t: 0, profile: ${square(10)} }, { t: 1, profile: ${square(20)} }]`,
      `[{ t: 0, profile: ${square(10)} }, { t: 0.5, profile: ${square(15)} }, { t: 1, profile: ${square(20)} }]`,
    ]) {
      const s = await build(`return variableSweep([[0, 0, 0], [0, 0, 100]], ${sections});`);
      const bb = s.boundingBox();
      expect(bb.min[0]).toBeCloseTo(-20, 3);
      expect(bb.max[0]).toBeCloseTo(20, 3);
      expect(bb.min[1]).toBeCloseTo(-20, 3);
      expect(bb.max[1]).toBeCloseTo(20, 3);
      expect(s.volume()).toBeCloseTo((100 / 3) * (400 + 1600 + Math.sqrt(400 * 1600)), -1);
    }
  });

  it('keeps an off-centre profile where the sketch put it', async () => {
    const s = await build(
      `const p = path().moveTo(0, -10).lineTo(20, -10).lineTo(20, 10).lineTo(0, 10).close();
       return variableSweep([[0, 0, 0], [0, 0, 100]], [{ t: 0, profile: p }, { t: 1, profile: path().moveTo(0, -10).lineTo(20, -10).lineTo(20, 10).lineTo(0, 10).close() }]);`,
    );
    const bb = s.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 3);
    expect(bb.max[0]).toBeCloseTo(20, 3);
  });

  it('centres the twisted 6-station hex vase on its axis', async () => {
    const s = await build(`
      function hex(af, rot) {
        const R = af / Math.sqrt(3); let p = path();
        for (let i = 0; i < 6; i++) {
          const a = (rot + 60 * i) * Math.PI / 180;
          p = i ? p.lineTo(R * Math.cos(a), R * Math.sin(a)) : p.moveTo(R * Math.cos(a), R * Math.sin(a));
        }
        return p.close();
      }
      const secs = [];
      for (let i = 0; i < 6; i++) { const t = i / 5; secs.push({ t, profile: hex(90 + 20 * t, 25 * t) }); }
      return variableSweep([[0, 0, 0], [0, 0, 180]], secs);`);
    const bb = s.boundingBox();
    // Symmetric about the Z axis (the hex vertex radius tops out at 110/√3 = 63.5).
    expect(bb.min[0] + bb.max[0]).toBeCloseTo(0, 3);
    expect(bb.min[1] + bb.max[1]).toBeCloseTo(0, 3);
    expect(bb.max[0]).toBeLessThan(64);
  });

  it('turns the profile normal onto a curved spine and keeps it centred', async () => {
    // Quarter arc in XZ from (0,0,0) heading +Z to (50,0,50) heading +X.
    // A 4 mm square centred on the spine stays within 2√2 mm of it.
    const s = await build(`
      const spine = nurbsCurve([[0, 0, 0], [0, 0, 50], [50, 0, 50]], { degree: 2 });
      return variableSweep(spine, [{ t: 0, profile: ${square(2)} }, { t: 1, profile: ${square(2)} }]);`);
    const bb = s.boundingBox({ exact: true });
    expect(bb.min[1]).toBeCloseTo(-2, 1);
    expect(bb.max[1]).toBeCloseTo(2, 1);
    expect(bb.min[0]).toBeGreaterThan(-2.5);
    expect(bb.max[2]).toBeLessThan(52.5);
  });
});
