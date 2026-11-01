// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// spurGear / internalSpurGear rejected numeric param() ParamRefs: `module`,
// `teeth` and `faceWidth` failed with "requires a finite number > 0" showing
// the ParamRef, while box(60, 40, plate.add(2)) accepts one. The first gear
// an AI model writes is `module: od.divide(t.add(2))`, so that call failed.
// Gear slots now read a numeric ParamRef through the live param table before
// the gear maths runs, and build the same solid as the literal call.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { countFaces } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel, type BuiltModel } from '../../../src/modeling/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';

beforeAll(async () => {
  await initOcct();
}, 60_000);

interface Metrics {
  faces: number;
  size: [number, number, number];
  volume: number;
}

async function build(code: string): Promise<BuiltModel> {
  return buildModel({ fileName: 'gear.kcad.ts', code });
}

function errors(m: BuiltModel) {
  return m.diagnostics.filter((d) => d.severity === 'error');
}

async function metrics(code: string): Promise<Metrics> {
  const m = await build(code);
  expect(errors(m), JSON.stringify(m.diagnostics)).toEqual([]);
  const shape = m.rootShape!;
  const { min, max } = shape.boundingBox({ exact: true });
  const brep = (shape as unknown as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
  return {
    faces: countFaces(brep),
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
    volume: shape.volume(),
  };
}

function expectSameGeometry(a: Metrics, b: Metrics): void {
  expect(a.faces).toBeGreaterThan(0);
  expect(a.faces).toBe(b.faces);
  for (let i = 0; i < 3; i += 1) expect(a.size[i]).toBeCloseTo(b.size[i], 6);
  expect(a.volume).toBeCloseTo(b.volume, 6);
}

/** A rejected argument throws `feature.invalid-args` out of the script run. */
async function expectInvalid(code: string, pattern: RegExp): Promise<void> {
  const err = await build(code).then(
    () => undefined,
    (e: unknown) => e as { code?: string; message?: string },
  );
  expect(err, 'expected the gear call to be rejected').toBeDefined();
  expect(err!.code).toBe('feature.invalid-args');
  expect(err!.message).toMatch(pattern);
}

describe('spurGear accepts numeric ParamRefs', () => {
  it('module as ParamRef arithmetic (the reported call) builds the literal gear', async () => {
    const viaParams = await metrics(`
const t = param("teeth", 12);
const od = param("outsideDiameter", 40);
const m = od.divide(t.add(2));
return spurGear({ module: m, teeth: t, faceWidth: 8, bore: 6 });`);
    const literal = await metrics('return spurGear({ module: 40 / 14, teeth: 12, faceWidth: 8, bore: 6 });');
    expectSameGeometry(viaParams, literal);
    // 6 B-rep faces per tooth × 12, plus both end caps and the bore.
    expect(viaParams.faces).toBe(75);
    // Outside diameter = m (z + 2) = 40, face width 8.
    expect(viaParams.size[0]).toBeCloseTo(40, 1);
    expect(viaParams.size[1]).toBeCloseTo(40, 1);
    expect(viaParams.size[2]).toBeCloseTo(8, 6);
  }, 120_000);

  it('teeth as a ParamRef builds the literal gear', async () => {
    const viaParams = await metrics(`
const z = param("z", 20);
return spurGear({ module: 1, teeth: z, faceWidth: 5 });`);
    expectSameGeometry(viaParams, await metrics('return spurGear({ module: 1, teeth: 20, faceWidth: 5 });'));
  }, 120_000);

  it('faceWidth, bore, pressureAngle and backlash as ParamRefs build the literal gear', async () => {
    const viaParams = await metrics(`
const w = param("w", 3);
const b = param("b", 5);
return spurGear({ module: 1.5, teeth: 24, faceWidth: w.multiply(2), bore: b, pressureAngle: param("pa", 25), backlash: param("bl", 0.1) });`);
    const literal = await metrics(
      'return spurGear({ module: 1.5, teeth: 24, faceWidth: 6, bore: 5, pressureAngle: 25, backlash: 0.1 });',
    );
    expectSameGeometry(viaParams, literal);
    expect(viaParams.size[2]).toBeCloseTo(6, 6);
  }, 120_000);

  it('internalSpurGear takes ParamRefs for module, teeth, faceWidth and rimThickness', async () => {
    const viaParams = await metrics(`
const m = param("m", 1);
return internalSpurGear({ module: m, teeth: param("z", 54), faceWidth: param("w", 8), rimThickness: m.multiply(4) });`);
    const literal = await metrics('return internalSpurGear({ module: 1, teeth: 54, faceWidth: 8, rimThickness: 4 });');
    expectSameGeometry(viaParams, literal);
  }, 120_000);

  it('planetaryToothCompatibility takes ParamRef tooth counts', async () => {
    const ok = await build(`
const s = param("sun", 18);
const p = param("planet", 18);
planetaryToothCompatibility({ sunTeeth: s, planetTeeth: p, ringTeeth: s.add(p.multiply(2)) });
return box(1, 1, 1);`);
    expect(errors(ok), JSON.stringify(ok.diagnostics)).toEqual([]);
    await expectInvalid(`
const s = param("sun", 18);
planetaryToothCompatibility({ sunTeeth: s, planetTeeth: 18, ringTeeth: 55 });
return box(1, 1, 1);`, /ringTeeth must be 54/);
  }, 120_000);
});

describe('a param that shapes a gear is not edited in place', () => {
  // The involute outline is computed when the script runs, so an in-place
  // params.update would keep the old gear. The edit is refused instead, and
  // params the gear does not read still update in place.
  it('refuses a warm edit of a gear param and keeps the model; other params still update', async () => {
    const m = await build(`
const z = param("z", 20);
const h = param("h", 4);
const gear = spurGear({ module: 1, teeth: z, faceWidth: 5 });
return gear.union(box(4, 4, h).translate(-2, -2, 5));`);
    expect(errors(m), JSON.stringify(m.diagnostics)).toEqual([]);
    const before = m.rootShape!.volume();
    await expect(updateModelParams(m, [{ name: 'z', value: 30 }])).rejects.toThrow(
      /params\.update: param 'z' shapes a spurGear\/internalSpurGear profile/,
    );
    expect(m.session.paramTable.get('z').value).toBe(20);
    const up = await updateModelParams(m, [{ name: 'h', value: 8 }]);
    expect(up.result.shape.volume()).toBeCloseTo(before + 4 * 4 * 4, 3);
  }, 120_000);
});

describe('spurGear keeps its validation for ParamRef and literal inputs', () => {
  const cases: Array<[string, string, RegExp]> = [
    ['NaN module', 'spurGear({ module: NaN, teeth: 20, faceWidth: 5 })', /module/],
    ['negative module (ParamRef)', 'spurGear({ module: param("m", 1).negate(), teeth: 20, faceWidth: 5 })', /module.*finite number > 0/s],
    ['zero module (ParamRef)', 'spurGear({ module: param("m", 1).multiply(0), teeth: 20, faceWidth: 5 })', /module.*finite number > 0/s],
    ['module dividing by zero', 'spurGear({ module: param("m", 1).divide(0), teeth: 20, faceWidth: 5 })', /division by zero/],
    ['negative faceWidth (ParamRef)', 'spurGear({ module: 1, teeth: 20, faceWidth: param("w", -5) })', /faceWidth.*finite number > 0/s],
    ['non-integer teeth (ParamRef)', 'spurGear({ module: 1, teeth: param("z", 20).add(0.5), faceWidth: 5 })', /whole tooth count/],
    ['too few teeth (ParamRef)', 'spurGear({ module: 1, teeth: param("z", 5), faceWidth: 5 })', /whole tooth count in \[6, 400\]/],
    ['too many teeth (ParamRef)', 'spurGear({ module: 1, teeth: param("z", 401), faceWidth: 5 })', /whole tooth count in \[6, 400\]/],
    ['pressureAngle out of range (ParamRef)', 'spurGear({ module: 1, teeth: 20, faceWidth: 5, pressureAngle: param("pa", 40) })', /pressureAngle/],
    ['backlash >= module (ParamRef)', 'spurGear({ module: 1, teeth: 20, faceWidth: 5, backlash: param("bl", 1) })', /backlash/],
    ['bore too big (ParamRef)', 'spurGear({ module: 1, teeth: 20, faceWidth: 5, bore: param("b", 30) })', /bore </],
    ['unknown option key', 'spurGear({ module: 1, teeth: 20, faceWidth: 5, width: 5 })', /unknown option 'width'/],
    ['string module', 'spurGear({ module: "1", teeth: 20, faceWidth: 5 })', /module/],
    ['string teeth', 'spurGear({ module: 1, teeth: "20", faceWidth: 5 })', /whole tooth count/],
    ['boolean ParamRef module', 'spurGear({ module: param("on", true), teeth: 20, faceWidth: 5 })', /module.*finite number > 0/s],
    ['choice ParamRef teeth', 'spurGear({ module: 1, teeth: param("size", "M", { choices: ["S", "M"] }), faceWidth: 5 })', /whole tooth count/],
    ['ring gear non-zero profileShift (ParamRef)', 'internalSpurGear({ module: 1, teeth: 54, faceWidth: 8, profileShift: param("x", 0.2) })', /profileShift/],
  ];
  for (const [label, call, pattern] of cases) {
    it(`rejects ${label}`, async () => {
      await expectInvalid(`return ${call};`, pattern);
    }, 60_000);
  }
});
