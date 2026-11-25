// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Real OCCT geometry tests for structuralMember, weldmentFrame, and gusset.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { countSolids, isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';
import type { ShapeBackend } from '../../../src/kernel/backends/backend';

function unwrapShape(shape: ShapeBackend): unknown {
  return (shape as unknown as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

async function evalShape(name: string, code: string): Promise<ShapeBackend> {
  const model = await buildModel({ fileName: `${name}.kcad.ts`, code });
  expect(
    model.diagnostics.filter((d) => d.severity === 'error'),
    JSON.stringify(model.diagnostics),
  ).toEqual([]);
  expect(model.rootShape).toBeDefined();
  return model.rootShape!;
}

function intersectionVolume(a: ShapeBackend, b: ShapeBackend): number {
  try {
    const common = a.intersect(b);
    const v = common.volume();
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

describe('structuralMember profiles', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  const L = 200;
  const profileCases: {
    label: string;
    profileExpr: string;
    expectedArea: number;
    expectedSpanY: number;
    expectedSpanZ: number;
  }[] = [
    {
      label: 'square-tube',
      profileExpr: "{ kind: 'square-tube', size: 40, wall: 3 }",
      expectedArea: 40 * 40 - 34 * 34,
      expectedSpanY: 40,
      expectedSpanZ: 40,
    },
    {
      label: 'rect-tube',
      profileExpr: "{ kind: 'rect-tube', width: 50, height: 30, wall: 2.5 }",
      expectedArea: 50 * 30 - 45 * 25,
      expectedSpanY: 50,
      expectedSpanZ: 30,
    },
    {
      label: 'round-tube',
      profileExpr: "{ kind: 'round-tube', outerDiameter: 42, wall: 3 }",
      expectedArea: Math.PI * (21 * 21 - 18 * 18),
      expectedSpanY: 42,
      expectedSpanZ: 42,
    },
    {
      label: 'angle',
      profileExpr: "{ kind: 'angle', legA: 40, legB: 30, thickness: 4 }",
      expectedArea: 4 * (40 + 30 - 4),
      expectedSpanY: 40,
      expectedSpanZ: 30,
    },
    {
      label: 'c-channel',
      profileExpr: "{ kind: 'c-channel', width: 35, height: 60, thickness: 4 }",
      expectedArea: 35 * 60 - (35 - 4) * (60 - 8),
      expectedSpanY: 35,
      expectedSpanZ: 60,
    },
    {
      label: 'flat-bar',
      profileExpr: "{ kind: 'flat-bar', width: 50, thickness: 6 }",
      expectedArea: 50 * 6,
      expectedSpanY: 50,
      expectedSpanZ: 6,
    },
  ];

  it.each(profileCases)(
    'builds valid single closed solid with analytic volume (<1%) and exact bbox for $label',
    async ({ label, profileExpr, expectedArea, expectedSpanY, expectedSpanZ }) => {
      const shape = await evalShape(
        `profile-${label}`,
        `return structuralMember([0, 0, 0], [${L}, 0, 0], { profile: ${profileExpr} });`,
      );
      const wrapped = unwrapShape(shape);
      expect(isTopologicallyValid(wrapped)).toBe(true);
      expect(countSolids(wrapped)).toBe(1);

      const expectedVol = expectedArea * L;
      const relErr = Math.abs(shape.volume() - expectedVol) / expectedVol;
      expect(relErr).toBeLessThan(0.01);

      const bb = shape.boundingBox();
      expect(bb.min[0]).toBeCloseTo(0, 3);
      expect(bb.max[0]).toBeCloseTo(L, 3);
      expect(bb.max[1] - bb.min[1]).toBeCloseTo(expectedSpanY, 2);
      expect(bb.max[2] - bb.min[2]).toBeCloseTo(expectedSpanZ, 2);
    },
    120_000,
  );

  it('handles vertical Z-axis members with stable auto-up, explicit up, extensions, and trim planes', async () => {
    const vertical = await evalShape(
      'vertical-auto-up',
      `return structuralMember([10, 20, 0], [10, 20, 150], {
        profile: { kind: 'rect-tube', width: 40, height: 20, wall: 2 },
      });`,
    );
    expect(isTopologicallyValid(unwrapShape(vertical))).toBe(true);
    expect(countSolids(unwrapShape(vertical))).toBe(1);
    const vbb = vertical.boundingBox();
    expect(vbb.min[2]).toBeCloseTo(0, 3);
    expect(vbb.max[2]).toBeCloseTo(150, 3);
    expect(vbb.max[0] - vbb.min[0]).toBeCloseTo(40, 2);
    expect(vbb.max[1] - vbb.min[1]).toBeCloseTo(20, 2);

    // 45-degree end miter cut with extendEnd on a 40 mm square tube along +X:
    // symmetric cut through x = 200 preserves exact volume (area * 200) and shifts x_max to 220.
    const mitered = await evalShape(
      'single-member-miter-trim',
      `return structuralMember([0, 0, 0], [200, 0, 0], {
        profile: { kind: 'square-tube', size: 40, wall: 3 },
        extendEnd: 25,
        endTrimPlane: { point: [200, 0, 0], normal: [1, 1, 0] },
      });`,
    );
    expect(isTopologicallyValid(unwrapShape(mitered))).toBe(true);
    expect(countSolids(unwrapShape(mitered))).toBe(1);
    const expectedVol = (40 * 40 - 34 * 34) * 200;
    expect(Math.abs(mitered.volume() - expectedVol) / expectedVol).toBeLessThan(0.005);
    expect(mitered.boundingBox().max[0]).toBeCloseTo(220, 2);
  }, 120_000);
});

describe('weldmentFrame corners and T-junctions', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('builds a 90-degree mitered L-corner with zero pairwise overlap and exact combined volume', async () => {
    const profile = "{ kind: 'square-tube', size: 40, wall: 3 }";
    const area = 40 * 40 - 34 * 34;

    const m0 = await evalShape(
      'miter90-m0',
      `const f = weldmentFrame([
        { from: [0, 0, 0], to: [200, 0, 0], profile: ${profile} },
        { from: [200, 0, 0], to: [200, 200, 0], profile: ${profile} },
      ], { cornerTrim: 'miter' });
      return f.members[0];`,
    );
    const m1 = await evalShape(
      'miter90-m1',
      `const f = weldmentFrame([
        { from: [0, 0, 0], to: [200, 0, 0], profile: ${profile} },
        { from: [200, 0, 0], to: [200, 200, 0], profile: ${profile} },
      ], { cornerTrim: 'miter' });
      return f.members[1];`,
    );
    const fused = await evalShape(
      'miter90-fused',
      `const f = weldmentFrame([
        { from: [0, 0, 0], to: [200, 0, 0], profile: ${profile} },
        { from: [200, 0, 0], to: [200, 200, 0], profile: ${profile} },
      ], { cornerTrim: 'miter', fuse: true });
      if (f.cutList.length !== 2) throw new Error('expected 2 cut list items');
      if (Math.abs(f.cutList[0].endCutAngleDeg - 45) > 0.01) throw new Error('bad end angle');
      if (Math.abs(f.cutList[1].startCutAngleDeg - 45) > 0.01) throw new Error('bad start angle');
      if (Math.abs(f.cutList[0].cutLength - 220) > 0.01) throw new Error('bad cut length');
      return f.combined;`,
    );

    expect(intersectionVolume(m0, m1)).toBeLessThan(1e-3);
    expect(isTopologicallyValid(unwrapShape(fused))).toBe(true);
    expect(countSolids(unwrapShape(fused))).toBe(1);

    const expectedCombined = 2 * area * 200;
    expect(Math.abs(m0.volume() - area * 200) / (area * 200)).toBeLessThan(0.005);
    expect(Math.abs(m1.volume() - area * 200) / (area * 200)).toBeLessThan(0.005);
    expect(Math.abs(fused.volume() - expectedCombined) / expectedCombined).toBeLessThan(0.005);

    const bb = fused.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 2);
    expect(bb.max[0]).toBeCloseTo(220, 2);
    expect(bb.min[1]).toBeCloseTo(-20, 2);
    expect(bb.max[1]).toBeCloseTo(200, 2);
  }, 120_000);

  it('builds a 45-degree acute mitered corner with zero pairwise overlap and exact combined volume', async () => {
    const profile = "{ kind: 'square-tube', size: 30, wall: 3 }";
    const area = 30 * 30 - 24 * 24;
    const L = 250;
    const dx = L * Math.SQRT1_2;
    const dy = L * Math.SQRT1_2;

    const frameSetup = `
      const f = weldmentFrame([
        { from: [0, 0, 0], to: [${L}, 0, 0], profile: ${profile} },
        { from: [0, 0, 0], to: [${dx}, ${dy}, 0], profile: ${profile} },
      ], { cornerTrim: 'miter' });
    `;

    const m0 = await evalShape('miter45-m0', `${frameSetup} return f.members[0];`);
    const m1 = await evalShape('miter45-m1', `${frameSetup} return f.members[1];`);
    const combined = await evalShape(
      'miter45-combined',
      `const f = weldmentFrame([
        { from: [0, 0, 0], to: [${L}, 0, 0], profile: ${profile} },
        { from: [0, 0, 0], to: [${dx}, ${dy}, 0], profile: ${profile} },
      ], { cornerTrim: 'miter', fuse: true });
      if (Math.abs(f.cutList[0].startCutAngleDeg - 67.5) > 0.05) {
        throw new Error('unexpected miter angle: ' + f.cutList[0].startCutAngleDeg);
      }
      return f.combined;`,
    );

    expect(intersectionVolume(m0, m1)).toBeLessThan(1e-3);
    expect(isTopologicallyValid(unwrapShape(combined))).toBe(true);
    expect(countSolids(unwrapShape(combined))).toBe(1);

    const expectedCombined = 2 * area * L;
    expect(Math.abs(combined.volume() - expectedCombined) / expectedCombined).toBeLessThan(0.01);
  }, 120_000);

  it('builds a butt T-joint with primary full length, secondary flush against primary face, and zero overlap', async () => {
    const profile = "{ kind: 'square-tube', size: 40, wall: 3 }";
    const area = 40 * 40 - 34 * 34;

    const frameSetup = `
      const f = weldmentFrame([
        { from: [0, 0, 0], to: [200, 0, 0], profile: ${profile}, label: 'rail' },
        { from: [100, 0, 0], to: [100, 150, 0], profile: ${profile}, label: 'post' },
      ], { cornerTrim: 'butt' });
    `;

    const primary = await evalShape('tjoint-primary', `${frameSetup} return f.members[0];`);
    const secondary = await evalShape('tjoint-secondary', `${frameSetup} return f.members[1];`);
    const compound = await evalShape(
      'tjoint-compound',
      `${frameSetup}
      if (Math.abs(f.cutList[0].cutLength - 200) > 0.01) throw new Error('primary cutLength wrong');
      if (Math.abs(f.cutList[1].cutLength - 130) > 0.01) throw new Error('secondary cutLength wrong');
      return f.combined;`,
    );

    expect(intersectionVolume(primary, secondary)).toBeLessThan(1e-3);

    const priBb = primary.boundingBox();
    const secBb = secondary.boundingBox();
    expect(priBb.min[0]).toBeCloseTo(0, 2);
    expect(priBb.max[0]).toBeCloseTo(200, 2);
    expect(priBb.max[1]).toBeCloseTo(20, 2);
    // Secondary butts flush against primary's y = +20 outer face.
    expect(secBb.min[1]).toBeCloseTo(20, 2);
    expect(secBb.max[1]).toBeCloseTo(150, 2);

    const expectedVol = area * (200 + 130);
    expect(Math.abs(compound.volume() - expectedVol) / expectedVol).toBeLessThan(0.005);
  }, 120_000);

  it('builds a closed 4-member rectangular mitered frame with zero overlap on all 4 corners', async () => {
    const profile = "{ kind: 'square-tube', size: 30, wall: 3 }";
    const area = 30 * 30 - 24 * 24;
    const W = 300;
    const H = 200;
    const setup = `
      const f = weldmentFrame([
        { from: [0, 0, 0], to: [${W}, 0, 0], profile: ${profile} },
        { from: [${W}, 0, 0], to: [${W}, ${H}, 0], profile: ${profile} },
        { from: [${W}, ${H}, 0], to: [0, ${H}, 0], profile: ${profile} },
        { from: [0, ${H}, 0], to: [0, 0, 0], profile: ${profile} },
      ], { cornerTrim: 'miter', fuse: true });
    `;
    const members: ShapeBackend[] = [];
    for (let i = 0; i < 4; i++) {
      members.push(await evalShape(`rect-frame-m${i}`, `${setup} return f.members[${i}];`));
    }
    const fused = await evalShape('rect-frame-fused', `${setup} return f.combined;`);

    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        expect(intersectionVolume(members[i]!, members[j]!)).toBeLessThan(1e-3);
      }
    }
    expect(isTopologicallyValid(unwrapShape(fused))).toBe(true);
    expect(countSolids(unwrapShape(fused))).toBe(1);

    const expectedVol = 2 * (W + H) * area;
    expect(Math.abs(fused.volume() - expectedVol) / expectedVol).toBeLessThan(0.005);
    const bb = fused.boundingBox();
    expect(bb.min[0]).toBeCloseTo(-15, 2);
    expect(bb.max[0]).toBeCloseTo(W + 15, 2);
    expect(bb.min[1]).toBeCloseTo(-15, 2);
    expect(bb.max[1]).toBeCloseTo(H + 15, 2);
    expect(bb.min[2]).toBeCloseTo(-15, 2);
    expect(bb.max[2]).toBeCloseTo(15, 2);
  }, 120_000);
});

describe('gusset geometry', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it.each([
    { label: 'XY plane', dirA: [1, 0, 0], dirB: [0, 1, 0], corner: [0, 0, 0] },
    { label: 'XZ plane', dirA: [1, 0, 0], dirB: [0, 0, 1], corner: [10, 20, 30] },
    { label: 'YZ plane', dirA: [0, 1, 0], dirB: [0, 0, 1], corner: [5, -10, 0] },
    { label: 'tilted 3D plane (60 deg)', dirA: [1, 1, 0], dirB: [0, 1, 1], corner: [15, 25, -5] },
  ])('builds valid single solid with exact analytic volume in $label', async ({ label, dirA, dirB, corner }) => {
    const legA = 60;
    const legB = 40;
    const thickness = 8;
    const lenA = Math.hypot(dirA[0]!, dirA[1]!, dirA[2]!);
    const lenB = Math.hypot(dirB[0]!, dirB[1]!, dirB[2]!);
    const cosT = (dirA[0]! * dirB[0]! + dirA[1]! * dirB[1]! + dirA[2]! * dirB[2]!) / (lenA * lenB);
    const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));

    const plain = await evalShape(
      `gusset-plain-${label.replace(/[^a-z0-9]/gi, '-')}`,
      `return gusset(${JSON.stringify(corner)}, ${JSON.stringify(dirA)}, ${JSON.stringify(dirB)}, {
        legA: ${legA}, legB: ${legB}, thickness: ${thickness},
      });`,
    );
    expect(isTopologicallyValid(unwrapShape(plain))).toBe(true);
    expect(countSolids(unwrapShape(plain))).toBe(1);
    const expectedPlainVol = 0.5 * legA * legB * sinT * thickness;
    expect(Math.abs(plain.volume() - expectedPlainVol) / expectedPlainVol).toBeLessThan(0.005);

    const r = 6;
    const c = 5;
    const relieved = await evalShape(
      `gusset-relief-tip-${label.replace(/[^a-z0-9]/gi, '-')}`,
      `return gusset(${JSON.stringify(corner)}, ${JSON.stringify(dirA)}, ${JSON.stringify(dirB)}, {
        legA: ${legA}, legB: ${legB}, thickness: ${thickness},
        cornerRelief: ${r}, tipChamfer: ${c},
      });`,
    );
    expect(isTopologicallyValid(unwrapShape(relieved))).toBe(true);
    expect(countSolids(unwrapShape(relieved))).toBe(1);
    const expectedRelievedVol =
      0.5 * sinT * (legA * legB - r * r - c * c * (legB / legA + legA / legB)) * thickness;
    expect(Math.abs(relieved.volume() - expectedRelievedVol) / expectedRelievedVol).toBeLessThan(0.005);
  }, 120_000);

  it('honors offset along plane normal', async () => {
    const shifted = await evalShape(
      'gusset-offset',
      `return gusset([0, 0, 0], [1, 0, 0], [0, 1, 0], {
        legA: 50, legB: 50, thickness: 10, offset: 5,
      });`,
    );
    const bb = shifted.boundingBox();
    expect(bb.min[2]).toBeCloseTo(0, 3);
    expect(bb.max[2]).toBeCloseTo(10, 3);
  }, 120_000);
});

describe('weldment invalidArgs validation', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it.each([
    ['zero-length structuralMember', `return structuralMember([0, 0, 0], [0, 0, 0], { profile: { kind: 'flat-bar', width: 20, thickness: 4 } });`],
    ['square-tube wall >= size/2', `return structuralMember([0, 0, 0], [100, 0, 0], { profile: { kind: 'square-tube', size: 20, wall: 10 } });`],
    ['round-tube wall >= outerDiameter/2', `return structuralMember([0, 0, 0], [100, 0, 0], { profile: { kind: 'round-tube', outerDiameter: 30, wall: 15 } });`],
    ['c-channel thickness >= height/2', `return structuralMember([0, 0, 0], [100, 0, 0], { profile: { kind: 'c-channel', width: 30, height: 20, thickness: 10 } });`],
    ['unknown profile kind', `return structuralMember([0, 0, 0], [100, 0, 0], { profile: { kind: 'i-beam', width: 30, height: 50, thickness: 5 } });`],
    ['parallel up vector', `return structuralMember([0, 0, 0], [100, 0, 0], { profile: { kind: 'flat-bar', width: 20, thickness: 4 }, up: [5, 0, 0] });`],
    ['negative extendStart', `return structuralMember([0, 0, 0], [100, 0, 0], { profile: { kind: 'flat-bar', width: 20, thickness: 4 }, extendStart: -5 });`],
    ['zero trim plane normal', `return structuralMember([0, 0, 0], [100, 0, 0], { profile: { kind: 'flat-bar', width: 20, thickness: 4 }, endTrimPlane: { point: [100, 0, 0], normal: [0, 0, 0] } });`],
    ['unknown structuralMember option', `return structuralMember([0, 0, 0], [100, 0, 0], { profile: { kind: 'flat-bar', width: 20, thickness: 4 }, length: 100 });`],
    ['empty weldmentFrame members', `return weldmentFrame([]).combined;`],
    ['invalid weldmentFrame cornerTrim', `return weldmentFrame([{ from: [0,0,0], to: [100,0,0], profile: { kind: 'flat-bar', width: 20, thickness: 4 } }], { cornerTrim: 'cope' }).combined;`],
    ['collinear gusset directions', `return gusset([0, 0, 0], [1, 0, 0], [-2, 0, 0], { legA: 50, legB: 50, thickness: 6 });`],
    ['gusset cornerRelief + tipChamfer >= legA', `return gusset([0, 0, 0], [1, 0, 0], [0, 1, 0], { legA: 40, legB: 40, thickness: 6, cornerRelief: 25, tipChamfer: 15 });`],
    ['gusset tipChamfer collapses hypotenuse', `return gusset([0, 0, 0], [1, 0, 0], [0, 1, 0], { legA: 40, legB: 40, thickness: 6, tipChamfer: 20 });`],
    ['gusset non-positive thickness', `return gusset([0, 0, 0], [1, 0, 0], [0, 1, 0], { legA: 40, legB: 40, thickness: 0 });`],
    ['gusset unknown option key', `return gusset([0, 0, 0], [1, 0, 0], [0, 1, 0], { legA: 40, legB: 40, thickness: 6, relief: 4 });`],
  ])('throws feature.invalid-args for %s', async (_label, code) => {
    await expect(
      buildModel({ fileName: 'weldment-invalid.kcad.ts', code }),
    ).rejects.toMatchObject({ code: 'feature.invalid-args' });
  }, 120_000);
});
