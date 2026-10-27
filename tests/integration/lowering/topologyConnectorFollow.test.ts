// A topology-bound mate connector must be resolved against the shape after a
// param edit, not against the solid captured on the first lower. A numeric
// vec3 origin stays where it was authored.

import { describe, expect, it } from 'vitest';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';
import { solveMates } from '../../../src/modeling/mates/solver';

function capPoint(shape: unknown): number[] {
  if (!isSceneBackend(shape)) throw new Error('expected an assembly scene');
  const cap = shape.parts.find((part) => part.name === 'cap');
  if (!cap) throw new Error('missing cap');
  return [...cap.worldTransform.point([0, 0, 0])];
}

function capZ(shape: unknown): number {
  return capPoint(shape)[2];
}

async function solvedCapZ(assemblyName: string, model: Awaited<ReturnType<typeof buildModel>>): Promise<number> {
  const arm = model.session.assemblies.get(assemblyName);
  if (!arm) throw new Error(`missing assembly ${assemblyName}`);
  const solved = await solveMates(arm, {});
  const cap = solved.poses.get('cap');
  if (!cap) throw new Error('solveMates did not place cap');
  return cap.point([0, 0, 0])[2];
}

describe('topology connector origins follow a rebuilt face', () => {
  it('moves a face-center mate with the top face when the box height param changes', async () => {
    const model = await buildModel({
      fileName: 'face-center-follow.kcad.ts',
      code: `
        const h = param('h', 10, { min: 1, max: 80 });
        const arm = assembly('stack');
        arm.part('base', box(20, 20, h))
          .connector('top', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
        arm.part('cap', box(4, 4, 4))
          .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('stack', 'base.top', 'cap.bot', 'fastened');
        return arm.solvedModel({}, { validate: 'off' });
      `,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(capZ(model.rootShape)).toBeCloseTo(10, 3);

    const updated = await updateModelParams(model, [{ name: 'h', value: 40 }]);
    expect(capZ(updated.result.shape)).toBeCloseTo(40, 3);
    expect(await solvedCapZ('stack', updated.model)).toBeCloseTo(40, 3);
  });

  it('leaves a vec3 connector where it was authored when the face moves', async () => {
    const model = await buildModel({
      fileName: 'vec3-stays.kcad.ts',
      code: `
        const h = param('h', 10, { min: 1, max: 80 });
        const arm = assembly('stack');
        arm.part('base', box(20, 20, h))
          .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 10] } });
        arm.part('cap', box(4, 4, 4))
          .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('stack', 'base.top', 'cap.bot', 'fastened');
        return arm.solvedModel({}, { validate: 'off' });
      `,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const updated = await updateModelParams(model, [{ name: 'h', value: 40 }]);
    expect(capZ(updated.result.shape)).toBeCloseTo(10, 3);
    expect(await solvedCapZ('stack', updated.model)).toBeCloseTo(10, 3);
  });

  it('moves an edge-axis mate with the edge when the box width param changes', async () => {
    const model = await buildModel({
      fileName: 'edge-axis-follow.kcad.ts',
      code: `
        const w = param('w', 20, { min: 1, max: 80 });
        const arm = assembly('hinge');
        arm.part('base', box(w, 20, 10))
          .connector('edge', { type: 'axis', origin: { kind: 'topology', query: { kind: 'edge-axis', name: 'edge-top-right' } }, axis: [0, 1, 0] });
        arm.part('cap', box(4, 4, 4))
          .connector('bot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
        arm.mate('hinge', 'base.edge', 'cap.bot', 'revolute', { pose: 0 });
        return arm.solvedModel({}, { validate: 'off' });
      `,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(capPoint(model.rootShape)[0]).toBeCloseTo(20, 3);

    const updated = await updateModelParams(model, [{ name: 'w', value: 50 }]);
    expect(capPoint(updated.result.shape)[0]).toBeCloseTo(50, 3);
    const arm = updated.model.session.assemblies.get('hinge');
    if (!arm) throw new Error('missing assembly hinge');
    const solved = await solveMates(arm, {});
    const cap = solved.poses.get('cap');
    if (!cap) throw new Error('solveMates did not place cap');
    expect(cap.point([0, 0, 0])[0]).toBeCloseTo(50, 3);
  });
});
