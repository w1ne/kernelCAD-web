// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import {
  SPUR_GEAR_BACKLASH_SEARCH_STEPS,
  SPUR_GEAR_INTERFERENCE_VOLUME_MM3,
  aggregateSpurClearance,
  backlashSearchStepMm,
  driverInDrivenFrame,
  externalCenterDistanceMm,
  externalSpeedRatio,
  generatingScallopMm,
  meshAlignDeg,
  toothIndex,
} from '../../../src/modeling/spurGearPairMath';

/** Right-handed Z rotation, written here rather than taken from Transform. */
function rotateZ(deg: number, x: number, y: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * x - s * y, s * x + c * y];
}

describe('spur gear interference volume floor', () => {
  const floor = SPUR_GEAR_INTERFERENCE_VOLUME_MM3;

  it('closes clearance above the floor, withholds a sub-floor volume, and reports zero-volume contact as clearance 0', () => {
    expect(floor).toBe(1e-3);
    const above = aggregateSpurClearance([
      { clearanceMm: 0, interferenceVolumeMm3: floor + 1e-9 },
    ]);
    expect(above.anyInterference).toBe(true);
    expect(above.minClearanceMm).toBe(0);

    // Equal to the floor is not above it. A collapsed distance must not
    // publish a closed gap beside anyInterference: false.
    const atFloor = aggregateSpurClearance([
      { clearanceMm: 0, interferenceVolumeMm3: floor },
    ]);
    expect(atFloor.anyInterference).toBe(false);
    expect(atFloor.maxInterferenceVolumeMm3).toBe(floor);
    expect(atFloor.minClearanceMm).toBeNull();

    const below = aggregateSpurClearance([
      { clearanceMm: 0, interferenceVolumeMm3: floor - 1e-9 },
      { clearanceMm: 0.02, interferenceVolumeMm3: 0 },
    ]);
    expect(below.anyInterference).toBe(false);
    expect(below.minClearanceMm).toBeCloseTo(0.02, 12);

    const contact = aggregateSpurClearance([
      { clearanceMm: 0, interferenceVolumeMm3: 0 },
    ]);
    expect(contact.anyInterference).toBe(false);
    expect(contact.minClearanceMm).toBe(0);
  });
});

describe('spur gear pair placement math', () => {
  it('turns one driven-flank bisection into a pitch-circle arc', () => {
    const drivenTeeth = 40;
    const pitchRadius = (1 * drivenTeeth) / 2;
    const stepDeg = (180 / drivenTeeth) / 2 ** SPUR_GEAR_BACKLASH_SEARCH_STEPS;
    const arc = stepDeg * (Math.PI / 180) * pitchRadius;
    expect(backlashSearchStepMm(drivenTeeth, pitchRadius)).toBeCloseTo(arc, 12);
    expect(arc).toBeLessThan(0.002);
  });

  it('places a module-1 20/40 pair at 30 mm with ratio −1/2', () => {
    const centre = (1 * 20 + 1 * 40) / 2;
    expect(externalCenterDistanceMm(1, 20, 1, 40)).toBe(centre);
    expect(centre).toBe(30);
    expect(externalSpeedRatio(20, 40)).toBe(-20 / 40);
    expect(meshAlignDeg(40)).toBe(180 / 40);
    expect(meshAlignDeg(21)).toBe(0);
  });

  it('bounds one sample step by the tip sagitta about the tooth-count pitch point', () => {
    const teeth = 20;
    const drivenTeeth = 40;
    const samples = 8;
    const centre = 30;
    const d1 = (centre * teeth) / (teeth + drivenTeeth);
    const path = d1 + (1 * teeth) / 2 + 1;
    const theta = (2 * Math.PI * (teeth + drivenTeeth)) / (teeth * drivenTeeth * samples);
    const sagitta = path * (1 - Math.cos(theta / 2));
    expect(generatingScallopMm({
      moduleMm: 1,
      teeth,
      drivenTeeth,
      centerDistanceMm: centre,
      samples,
    })).toBeCloseTo(sagitta, 12);
    expect(sagitta).toBeGreaterThan(0.009);
    expect(sagitta).toBeLessThan(0.0092);
  });

  it('maps the driver pitch point back to itself after the mesh placement', () => {
    const centre = 30;
    const align = 180 / 40;
    const phase = 0;
    const ratio = -20 / 40;
    const pose = driverInDrivenFrame(0, align, phase, ratio, centre);
    const psi = align + phase;
    expect(pose.rotationDeg).toBeCloseTo(0 - psi, 12);
    expect(pose.xMm).toBeCloseTo(-centre * Math.cos((psi * Math.PI) / 180), 12);
    expect(pose.yMm).toBeCloseTo(centre * Math.sin((psi * Math.PI) / 180), 12);
    const turned = rotateZ(pose.rotationDeg, 10, 0);
    const inBlank: [number, number] = [turned[0] + pose.xMm, turned[1] + pose.yMm];
    const placed = rotateZ(align + phase, inBlank[0], inBlank[1]);
    const world: [number, number] = [placed[0] + centre, placed[1]];
    expect(world[0]).toBeCloseTo(10, 9);
    expect(world[1]).toBeCloseTo(0, 9);
  });

  it('rounds a heading exactly halfway between two teeth half away from −∞', () => {
    const teeth = 40;
    const placement = 180 / teeth;
    const pitch = 360 / teeth;
    const midway = placement + 19 * pitch + pitch / 2;
    expect(toothIndex(midway, placement, teeth)).toBe(Math.round(19.5) % teeth);
    expect(toothIndex(placement + 19 * pitch - 1, placement, teeth)).toBe(19);
  });
});

describe('spurGearPair capture', () => {
  function pair(opts: Parameters<ReturnType<typeof createModelingApi>['spurGearPair']>[0]) {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    return api.spurGearPair(opts);
  }

  it('records the mesh mates and the gear-pair transmission from the tooth counts', () => {
    const mesh = pair({ module: 1, teeth: 20, ratio: -0.5, faceWidth: 4, backlash: 0.05 });
    expect(mesh.drivenTeeth).toBe(40);
    expect(mesh.centerDistanceMm).toBe(30);
    expect(mesh.ratio).toBe(-0.5);
    expect(mesh.alignDeg).toBe(4.5);
    expect(mesh.pitchCenterDistanceMm).toBe(30);
    const mates = mesh.assembly.__mates();
    const driver = mates.find((mate) => mate.name === 'driver-turn');
    const driven = mates.find((mate) => mate.name === 'driven-turn');
    expect(driver).toMatchObject({
      a: 'frame.driver-axis',
      b: 'driver.axis',
      type: 'revolute',
      exposure: 'concealed',
      limitsDeg: [-180, 180],
    });
    expect(driven).toMatchObject({
      a: 'frame.driven-axis',
      b: 'driven.axis',
      type: 'revolute',
      exposure: 'concealed',
    });
    expect(mesh.assembly.__mateCouplings()).toEqual([
      { driven: 'driven-turn', source: 'driver-turn', ratio: -0.5, offset: 0 },
    ]);
    expect(mesh.assembly.__transmissionIntents()[0]).toMatchObject({
      name: 'spur-mesh',
      kind: 'gear-pair',
      sourceMate: 'driver-turn',
      drivenMates: ['driven-turn'],
      input: 'driver',
      output: 'driven',
      path: ['driver', 'driven'],
      ratio: -0.5,
    });
  });

  it('rejects a positive ratio, a missing mate, and a ratio that is not the tooth count', () => {
    expect(() => pair({ module: 1, teeth: 20, ratio: 0.5, faceWidth: 4 })).toThrow(/ratio/);
    expect(() => pair({ module: 1, teeth: 20, faceWidth: 4 })).toThrow(/drivenTeeth/);
    // 20 / 0.3 is not a whole tooth count. −1/3 is valid: it is 20 driving 60.
    expect(() => pair({ module: 1, teeth: 20, ratio: -0.3, faceWidth: 4 })).toThrow(/ratio/);
    expect(() => pair({
      module: 1, teeth: 20, drivenTeeth: 40, ratio: -0.4, faceWidth: 4,
    })).toThrow(/ratio/);
    expect(() => pair({
      module: 1, teeth: 20, drivenTeeth: 40, faceWidth: 4, hob: 1,
    } as Parameters<ReturnType<typeof createModelingApi>['spurGearPair']>[0])).toThrow(/hob/);
  });
});
