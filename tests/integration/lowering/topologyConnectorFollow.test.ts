// A topology-bound mate connector must be resolved against the shape after a
// param edit, not against the solid captured on the first lower. A numeric
// vec3 origin stays where it was authored.

import { describe, expect, it } from 'vitest';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';
import { resolveConnectorFrame } from '../../../src/modeling/mates/connector';
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

  it('moves a bolt-hole mate with the hole when the hole position param changes', async () => {
    // Corner-anchored box(40, 20, 10). The front face (y = 0) is centred at
    // (20, 0, 5); hole u is +X from that centre. hole-axis origin is the
    // entry-face mouth, and its axis points into the body (+Y), not the
    // capture-time [0, 0, -1] baked on the auto-connector record.
    const model = await buildModel({
      fileName: 'hole-axis-follow.kcad.ts',
      code: `
        const u = param('u', 0, { min: -15, max: 15 });
        const plate = box(40, 20, 10).hole('front', { u, v: 0, diameter: 4, depth: 'through' });
        const arm = assembly('stack');
        arm.part('plate', plate);
        arm.part('cap', box(4, 4, 4))
          .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('pin', 'plate.bolt-holes-1', 'cap.bot', 'fastened');
        return arm.solvedModel({}, { validate: 'off' });
      `,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const mouth = capPoint(model.rootShape);
    expect(mouth[0]).toBeCloseTo(20, 3);
    expect(mouth[1]).toBeCloseTo(0, 3);
    expect(mouth[2]).toBeCloseTo(5, 3);

    const updated = await updateModelParams(model, [{ name: 'u', value: 8 }]);
    const moved = capPoint(updated.result.shape);
    expect(moved[0]).toBeCloseTo(28, 3);
    expect(moved[1]).toBeCloseTo(0, 3);
    expect(moved[2]).toBeCloseTo(5, 3);

    const arm = updated.model.session.assemblies.get('stack');
    if (!arm) throw new Error('missing assembly stack');
    const plate = arm.__parts().find((part) => part.name === 'plate');
    const bolt = plate?.mateConnectors.find((connector) => connector.name === 'bolt-holes-1');
    if (!bolt) throw new Error('missing plate.bolt-holes-1');
    expect(bolt.origin).toMatchObject({
      kind: 'topology',
      query: { kind: 'hole-axis', name: 'hole1' },
    });
    const frame = await resolveConnectorFrame(plate.originalShape, bolt.origin);
    expect(frame.origin[0]).toBeCloseTo(28, 3);
    expect(frame.origin[1]).toBeCloseTo(0, 3);
    expect(frame.origin[2]).toBeCloseTo(5, 3);
    expect(frame.axis?.[0]).toBeCloseTo(0, 3);
    expect(frame.axis?.[1]).toBeCloseTo(1, 3);
    expect(frame.axis?.[2]).toBeCloseTo(0, 3);

    const solved = await solveMates(arm, {});
    const cap = solved.poses.get('cap');
    if (!cap) throw new Error('solveMates did not place cap');
    expect(cap.point([0, 0, 0])[0]).toBeCloseTo(28, 3);
    expect(cap.point([0, 0, 0])[1]).toBeCloseTo(0, 3);
  });

  it('keeps an earlier holes feature when a later hole is chained', async () => {
    // Corner box. Top centre (20, 20, 10); the holes feature's first bore
    // is u=-10. The chained front hole must not steal bolt-holes-1.
    const model = await buildModel({
      fileName: 'chained-holes-follow.kcad.ts',
      code: `
        const u = param('u', -10, { min: -15, max: 15 });
        const plate = box(40, 40, 10)
          .holes('top', {
            positions: [{ u, v: 0 }, { u: 10, v: 0 }],
            diameter: 4,
            depth: 'through',
          })
          .hole('front', { u: 0, v: 0, diameter: 4, depth: 'through' });
        const arm = assembly('stack');
        arm.part('plate', plate);
        arm.part('cap', box(4, 4, 4))
          .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('pin', 'plate.bolt-holes-1', 'cap.bot', 'fastened');
        return arm.solvedModel({}, { validate: 'off' });
      `,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const mouth = capPoint(model.rootShape);
    expect(mouth[0]).toBeCloseTo(10, 3);
    expect(mouth[1]).toBeCloseTo(20, 3);
    expect(mouth[2]).toBeCloseTo(10, 3);

    const updated = await updateModelParams(model, [{ name: 'u', value: 0 }]);
    const moved = capPoint(updated.result.shape);
    expect(moved[0]).toBeCloseTo(20, 3);
    expect(moved[1]).toBeCloseTo(20, 3);
    expect(moved[2]).toBeCloseTo(10, 3);

    const arm = updated.model.session.assemblies.get('stack');
    if (!arm) throw new Error('missing assembly stack');
    const plate = arm.__parts().find((part) => part.name === 'plate');
    const bolt = plate?.mateConnectors.find((connector) => connector.name === 'bolt-holes-1');
    expect(bolt?.origin).toMatchObject({
      kind: 'topology',
      query: { kind: 'hole-axis', name: 'holes1[0]' },
    });
  });

  it('follows a top-face hole through an in-plane rotate', async () => {
    // Corner box, top centre (20, 10, 10), hole at u=10 → (30, 10, 10).
    // rotateZ(90) about the origin is right-handed: (x, y) → (-y, x).
    const model = await buildModel({
      fileName: 'rotated-hole-follow.kcad.ts',
      code: `
        const u = param('u', 10, { min: -15, max: 15 });
        const plate = box(40, 20, 10)
          .hole('top', { u, v: 0, diameter: 4, depth: 'through' })
          .rotateZ(90);
        const arm = assembly('stack');
        arm.part('plate', plate);
        arm.part('cap', box(4, 4, 4))
          .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('pin', 'plate.bolt-holes-1', 'cap.bot', 'fastened');
        return arm.solvedModel({}, { validate: 'off' });
      `,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const mouth = capPoint(model.rootShape);
    expect(mouth[0]).toBeCloseTo(-10, 3);
    expect(mouth[1]).toBeCloseTo(30, 3);
    expect(mouth[2]).toBeCloseTo(10, 3);

    const updated = await updateModelParams(model, [{ name: 'u', value: 0 }]);
    const moved = capPoint(updated.result.shape);
    expect(moved[0]).toBeCloseTo(-10, 3);
    expect(moved[1]).toBeCloseTo(20, 3);
    expect(moved[2]).toBeCloseTo(10, 3);

    const arm = updated.model.session.assemblies.get('stack');
    if (!arm) throw new Error('missing assembly stack');
    const solved = await solveMates(arm, {});
    const cap = solved.poses.get('cap');
    if (!cap) throw new Error('solveMates did not place cap');
    expect(cap.point([0, 0, 0])[0]).toBeCloseTo(-10, 3);
    expect(cap.point([0, 0, 0])[1]).toBeCloseTo(20, 3);
    expect(cap.point([0, 0, 0])[2]).toBeCloseTo(10, 3);
  });

  it('places a point-authored hole with the part at on both solvers', async () => {
    // Top face of the corner box passes through z=10. The point is the
    // mouth in the shape frame; part at [50, 0, 0] shifts the placed solid.
    const model = await buildModel({
      fileName: 'at-hole-follow.kcad.ts',
      code: `
        const plate = box(40, 20, 10).hole('top', {
          at: [30, 10, 10], diameter: 4, depth: 'through',
        });
        const arm = assembly('stack');
        arm.part('plate', plate, { at: [50, 0, 0] });
        arm.part('cap', box(4, 4, 4))
          .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('pin', 'plate.bolt-holes-1', 'cap.bot', 'fastened');
        return arm.solvedModel({}, { validate: 'off' });
      `,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const mouth = capPoint(model.rootShape);
    expect(mouth[0]).toBeCloseTo(80, 3);
    expect(mouth[1]).toBeCloseTo(10, 3);
    expect(mouth[2]).toBeCloseTo(10, 3);
    expect(await solvedCapPoint('stack', model)).toEqual([
      expect.closeTo(80, 3),
      expect.closeTo(10, 3),
      expect.closeTo(10, 3),
    ]);
  });
});

async function solvedCapPoint(
  assemblyName: string,
  model: Awaited<ReturnType<typeof buildModel>>,
): Promise<number[]> {
  const arm = model.session.assemblies.get(assemblyName);
  if (!arm) throw new Error(`missing assembly ${assemblyName}`);
  const solved = await solveMates(arm, {});
  const cap = solved.poses.get('cap');
  if (!cap) throw new Error('solveMates did not place cap');
  return [...cap.point([0, 0, 0])];
}
