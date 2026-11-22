// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { createModelingApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import type { VirtualJointRecord } from '../capture/assemblyTypes';
import { solveMates } from './solver';
import { reviewJointTopology } from './jointTopology';
import { initOcct, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { OcctLowerer } from '../backends/occt/occtLowerer';

function fixture(baseFirst = false, slideAt: [number, number, number] = [0, 0, 4]) {
  const session = new CaptureSession(), kcad = createModelingApi({ session });
  const arm = kcad.assembly('grounded slide');
  for (const name of baseFirst ? ['base', 'slide'] : ['slide', 'base']) {
    const base = name === 'base';
    arm.part(name, kcad.box(base ? 30 : 8, base ? 12 : 8, 4), { at: base ? [20, 0, 0] : slideAt })
      .connector('rail', { type: 'axis', origin: { kind: 'vec3', value: base ? [0, 0, 4] : [0, 0, 0] }, axis: [1, 0, 0] });
  }
  arm.mate('travel', 'base.rail', 'slide.rail', 'prismatic', { limitsMm: [0, 15], pose: 5 });
  return { session, arm };
}
const fixed = { type: 'fixed', parentFrame: 'world', childLink: 'base' } as const;
const position = (transform: { point: (point: [number, number, number]) => readonly number[] }) =>
  transform.point([0, 0, 0]);

describe('existing fixed world joint grounds the declared base', () => {
  beforeAll(async () => { await initOcct(); });

  it.each([false, true])('uses explicit root independently of declaration order (baseFirst=%s)', async baseFirst => {
    const { arm } = fixture(baseFirst);
    arm.virtualJoint('world-base', fixed);
    expect(reviewJointTopology(arm).diagnostics).toEqual([]);
    const solved = await solveMates(arm, { travel: 5 });
    expect(solved.status).toBe('solved');
    expect(position(solved.poses.get('base')!)).toEqual([20, 0, 0]);
    expect(position(solved.poses.get('slide')!)).toEqual([25, 0, 4]);
    expect(arm.__physicalUseCases()).toHaveLength(0);
  });

  it.each([
    { ...fixed, type: 'floating' }, { ...fixed, type: 'planar' },
    { ...fixed, parentFrame: 'slide' }, { ...fixed, childLink: 'missing' },
  ] as Array<Omit<VirtualJointRecord, 'name'>> )('does not claim a grounded base for %j', async joint => {
    const { arm } = fixture(); arm.virtualJoint('relative-or-mobile', joint);
    expect(reviewJointTopology(arm).diagnostics.map(d => d.code)).toContain('assembly.connectivity.assumed-root');
    const solved = await solveMates(arm, { travel: 5 });
    expect(position(solved.poses.get('slide')!)).toEqual([0, 0, 4]);
    expect(position(solved.poses.get('base')!)).not.toEqual([20, 0, 0]);
  });

  it('keeps the existing first-part fallback explicit when there is no root declaration', async () => {
    const { arm } = fixture();
    expect(reviewJointTopology(arm).diagnostics).toContainEqual(expect.objectContaining({
      code: 'assembly.connectivity.assumed-root', partName: 'slide', stableParts: ['slide'],
    }));
    const solved = await solveMates(arm);
    expect(position(solved.poses.get('slide')!)).toEqual([0, 0, 4]);
  });

  it.each(['model', 'solvedModel'] as const)('keeps capture and lowered %s geometry on the same fixed base', async method => {
    const { session, arm } = fixture(); arm.virtualJoint('world-base', fixed);
    const captured = method === 'model' ? arm.model() : await arm.solvedModel({ travel: 5 }, { validate: 'off' });
    expect(position(captured.parts.find(part => part.name === 'base')!.worldTransform)).toEqual([0, 0, 0]);
    const records = session.getRecords(), last = records.at(-1)!;
    expect(last.metadata).toMatchObject({ virtualJoints: [{ name: 'world-base', ...fixed }] });
    const result = await new RecomputeEngine(new OcctLowerer()).run(records, { paramTable: session.paramTable });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const scene = result.shapes.get(last.id);
    if (!isSceneBackend(scene)) throw new Error('Expected lowered assembly');
    const boxes = Object.fromEntries(scene.parts.map(part => [part.name,
      (part.shape as OcctBackend).clone().applyTransform(part.worldTransform).boundingBox()]));
    for (const [actual, expected] of [
      [boxes.base!.min, [20, 0, 0]], [boxes.base!.max, [50, 12, 4]],
      [boxes.slide!.min, [25, 0, 4]], [boxes.slide!.max, [33, 8, 8]],
    ]) expected!.forEach((value, axis) => expect(actual![axis]).toBeCloseTo(value, 9));
  });

  it('keeps every world-fixed base in disconnected components grounded', async () => {
    const { arm } = fixture(); arm.virtualJoint('world-base', fixed);
    arm.part('second-slide', createModelingApi({ session: arm.__session() }).box(4, 4, 4))
      .connector('rail', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
    arm.part('second-base', createModelingApi({ session: arm.__session() }).box(10, 10, 4), { at: [70, 0, 0] })
      .connector('rail', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 4] }, axis: [1, 0, 0] });
    arm.mate('second-travel', 'second-base.rail', 'second-slide.rail', 'prismatic', { limitsMm: [0, 15], pose: 5 });
    arm.virtualJoint('world-second-base', { ...fixed, childLink: 'second-base' });
    const solved = await solveMates(arm);
    expect(position(solved.poses.get('base')!)).toEqual([20, 0, 0]);
    expect(position(solved.poses.get('second-base')!)).toEqual([70, 0, 0]);
    expect(position(solved.poses.get('second-slide')!)).toEqual([75, 0, 4]);
    expect(reviewJointTopology(arm).diagnostics).toEqual([]);
  });

  it('accepts a compatible mate between fixed parts without moving either base', async () => {
    const { arm } = fixture(false, [25, 0, 4]);
    arm.virtualJoint('world-base', fixed);
    arm.virtualJoint('world-slide', { ...fixed, childLink: 'slide' });
    const solved = await solveMates(arm);
    expect(solved.status).toBe('solved');
    expect(position(solved.poses.get('base')!)).toEqual([20, 0, 0]);
    expect(position(solved.poses.get('slide')!)).toEqual([25, 0, 4]);
  });

  it('does not move a fixed root to satisfy an incompatible mate between fixed parts', async () => {
    const { arm } = fixture();
    arm.virtualJoint('world-base', fixed);
    arm.virtualJoint('world-slide', { ...fixed, childLink: 'slide' });
    const solved = await solveMates(arm, { travel: 5 });
    expect(['over-constrained', 'did-not-converge']).toContain(solved.status);
    expect(position(solved.poses.get('base')!)).toEqual([20, 0, 0]);
    expect(position(solved.poses.get('slide')!)).toEqual([0, 0, 4]);
  });
});
