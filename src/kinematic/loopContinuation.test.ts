// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Mate-graph slider-crank (crank 30, rod 100, slider offset 10): continuation
// along a crank sweep reports the over-center point of a pinned elbow at the
// closed-form angle asin(e / (r + l)), and loopMode validates its inputs.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../modeling/capture/captureSession';
import { createModelingApi } from '../modeling/api';
import { solveMates } from '../modeling/mates/solver';
import { LoopContinuation } from './loopContinuation';

const [r, l, e] = [30, 100, 10];
const rad = (v: number) => (v * Math.PI) / 180;
const deg = (v: number) => (v * 180) / Math.PI;
const sliderX = (t: number) => r * Math.cos(rad(t)) + Math.sqrt(l * l - (r * Math.sin(rad(t)) - e) ** 2);
const Y: [number, number, number] = [0, -1, 0];
const pin = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: Y });

function sliderCrank(crank0: number) {
  const k = createModelingApi({ session: new CaptureSession() });
  const arm = k.assembly('slider-crank');
  const ground = arm.part('ground', k.box(10, 10, 10));
  const crank = arm.part('crank', k.box(10, 2, 2));
  const rod = arm.part('rod', k.box(10, 2, 2));
  const slider = arm.part('slider', k.box(4, 4, 4));
  ground.connector('pivot', pin(0));
  ground.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, e] }, axis: [1, 0, 0] });
  crank.connector('pivot', pin(0));
  crank.connector('tip', pin(r));
  rod.connector('base', pin(0));
  rod.connector('tip', pin(l));
  slider.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
  slider.connector('pin', pin(0));
  const B = [r * Math.cos(rad(crank0)), r * Math.sin(rad(crank0))];
  const rodAbs = deg(Math.atan2(e - B[1], sliderX(crank0) - B[0]));
  arm.mate('crank', 'ground.pivot', 'crank.pivot', 'revolute', { pose: crank0 });
  arm.mate('slide', 'ground.track', 'slider.track', 'prismatic', { pose: sliderX(crank0) });
  arm.mate('wrist', 'crank.tip', 'rod.base', 'revolute', { pose: rodAbs - crank0 });
  arm.mate('gudgeon', 'rod.tip', 'slider.pin', 'revolute');
  return arm;
}

describe('LoopContinuation on a mate slider-crank', () => {
  it('poses the slider at the closed-form position and names the loop after its cut mate', async () => {
    const arm = sliderCrank(-20);
    const res = await solveMates(arm, { crank: 50 });
    expect(res.status).toBe('solved');
    expect(res.loop?.loops[0].name).toBe('gudgeon');
    expect(res.loop?.coordinates.slide as number).toBeCloseTo(sliderX(50), 6);
    expect(res.loop?.mobility[0]).toMatchObject({ mobility: 1, drivenDof: 1, independent: ['crank'] });
  });

  it('stops with kinematic.loop.branch-flip where a pinned elbow goes over center', async () => {
    const arm = sliderCrank(-20);
    arm.loopMode('gudgeon', { joint: 'wrist', sign: '+' });
    const c = new LoopContinuation(arm);
    let stop;
    for (let t = -20; t <= 60 && stop === undefined; t += 1) stop = (await c.step({ crank: t })).stop;
    expect(stop?.code).toBe('kinematic.loop.branch-flip');
    expect(stop?.element).toBe('wrist');
    const overCenter = deg(Math.asin(e / (r + l)));
    const at = stop!.poseContext!.crank;
    expect(at).toBeGreaterThan(overCenter);
    expect(at - 1).toBeLessThanOrEqual(overCenter);
  });

  it('rejects a pin on an unknown mate or a non-revolute joint, and an unknown loop at solve time', async () => {
    const arm = sliderCrank(-20);
    expect(() => arm.loopMode('gudgeon', { joint: 'nope', sign: '+' })).toThrow(/opts\.joint/);
    expect(() => arm.loopMode('gudgeon', { joint: 'slide', sign: '+' })).toThrow(/revolute-like/);
    arm.loopMode('not-a-loop', { joint: 'wrist', sign: '+' });
    await expect(solveMates(arm, { crank: 0 })).rejects.toThrow(/no loop named 'not-a-loop'/);
  });
});
