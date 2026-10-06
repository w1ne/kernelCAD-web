// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/composition/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../src/kernel/backends/occt/sceneToWorldFrame';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';

async function worldBox(code: string, part: string) {
  const model = await buildModel({ code, fileName: 'rotate.kcad.ts' });
  if (!isSceneBackend(model.rootShape)) throw new Error('expected a scene');
  const p = sceneToWorldFrameParts(model.rootShape).find((x) => x.name === part)!;
  return { bb: p.shape.boundingBox({ exact: true }), scene: model.rootShape };
}

describe('assembly.part rotate option', () => {
  beforeAll(async () => { await initOcct(); });

  it('rotates about the part local origin, then translates by at (axis-angle)', async () => {
    const { bb } = await worldBox(`
      const arm = assembly('r');
      arm.part('p', box(20, 10, 5), { at: [100, 0, 0], rotate: { axis: [0, 0, 1], degrees: 90 } });
      return arm.model();
    `, 'p');
    expect(bb.min[0]).toBeCloseTo(90, 6);
    expect(bb.max[0]).toBeCloseTo(100, 6);
    expect(bb.min[1]).toBeCloseTo(0, 6);
    expect(bb.max[1]).toBeCloseTo(20, 6);
    expect(bb.max[2]).toBeCloseTo(5, 6);
  }, 60_000);

  it('accepts XYZ Euler degrees and matches the axis-angle form for one axis', async () => {
    const { bb } = await worldBox(`
      const arm = assembly('r');
      arm.part('p', box(20, 10, 5), { at: [100, 0, 0], rotate: [0, 0, 90] });
      return arm.model();
    `, 'p');
    expect(bb.min[0]).toBeCloseTo(90, 6);
    expect(bb.max[1]).toBeCloseTo(20, 6);
  }, 60_000);

  it('rotated and unrotated copies share one geometry and one shape', async () => {
    const { scene } = await worldBox(`
      const arm = assembly('r');
      arm.part('a', box(20, 10, 5), { at: [0, 0, 0] });
      arm.part('b', box(20, 10, 5), { at: [50, 0, 0], rotate: [0, 0, 45] });
      return arm.model();
    `, 'a');
    expect(scene.parts[1].geometryKey).toBe(scene.parts[0].geometryKey);
    expect(scene.parts[1].shape).toBe(scene.parts[0].shape);
  }, 60_000);

  it('stores a normalized rotate on the assemblyPart record', () => {
    const session = new CaptureSession();
    const kc = createModelingApi({ session });
    const arm = kc.assembly('r');
    const a = arm.part('a', kc.box(1, 1, 1), { rotate: { axis: [0, 0, 2], degrees: 30 } });
    const b = arm.part('b', kc.box(1, 1, 1), { rotate: [10, 20, 30] });
    const meta = (id: string) => session.getRecordById(id)!.metadata as { rotate?: unknown };
    expect(meta(a.id).rotate).toEqual({ axis: [0, 0, 2], degrees: 30 });
    expect(meta(b.id).rotate).toEqual({ eulerDeg: [10, 20, 30] });
  });

  it.each([
    [{ axis: [0, 0, 0], degrees: 10 }],
    [{ axis: [0, 0, 1], degrees: Number.NaN }],
    [[0, 0]],
    [{ axis: [0, 0, 1] }],
  ])('rejects malformed rotate %j with feature.invalid-args', (rotate) => {
    const kc = createModelingApi({ session: new CaptureSession() });
    const arm = kc.assembly('r');
    expect(() => arm.part('p', kc.box(1, 1, 1), { rotate: rotate as never })).toThrow(/rotate must be/);
  });

  it('rejects rotate combined with connect placement', () => {
    const kc = createModelingApi({ session: new CaptureSession() });
    const arm = kc.assembly('r');
    const base = arm.part('base', kc.box(10, 10, 10), { connectors: { top: { origin: [5, 5, 10] } } });
    expect(() => arm.part('cap', kc.box(2, 2, 2), {
      rotate: [0, 0, 90],
      connectors: { bottom: { origin: [1, 1, 0] } },
      connect: { connector: 'bottom', to: base.connector('top') },
    })).toThrow(/rotate cannot be combined/);
  });

  it('rejects rotate on a part whose catalog-promoted connectors fill the merged map', () => {
    const session = new CaptureSession();
    const kc = createModelingApi({ session });
    const arm = kc.assembly('r');
    const shape = kc.box(1, 1, 1);
    session.attachCatalogConnectors(shape.id, [
      { name: 'mount', type: 'frame', origin: [0, 0, 0], normal: [0, 0, 1] },
    ]);
    expect(() => arm.part('p', shape, { rotate: [0, 0, 90] })).toThrow(/rotate cannot be combined/);
    expect(() => arm.part('q', shape)).not.toThrow();
  });

  it('rejects connecting a part onto a rotated part', () => {
    const session = new CaptureSession();
    const kc = createModelingApi({ session });
    const arm = kc.assembly('r');
    const base = arm.part('base', kc.box(10, 10, 10), { rotate: [0, 0, 90] });
    const forged = {
      connector: 'top',
      assemblyName: 'r',
      partId: base.id,
      partName: 'base',
      worldOrigin: { x: { expression: '5', unit: 'mm', evaluated: 5 }, y: { expression: '5', unit: 'mm', evaluated: 5 }, z: { expression: '10', unit: 'mm', evaluated: 10 } },
    };
    expect(() => arm.part('cap', kc.box(2, 2, 2), {
      connectors: { bottom: { origin: [1, 1, 0] } },
      connect: { connector: 'bottom', to: forged as never },
    })).toThrow(/rotated part/);
  });

  it('applies Euler degrees as Rz applied first, then Ry, then Rx (R = Rx·Ry·Rz)', async () => {
    // Rz(90) maps +X to +Y; Rx(90) then maps +Y to +Z. A box along X ends up along Z.
    const { bb } = await worldBox(`
      const arm = assembly('r');
      arm.part('p', box(20, 2, 2), { rotate: [90, 0, 90] });
      return arm.model();
    `, 'p');
    expect(bb.min[2]).toBeCloseTo(0, 6);
    expect(bb.max[2]).toBeCloseTo(20, 6);
    expect(bb.max[0] - bb.min[0]).toBeCloseTo(2, 6);
  }, 60_000);

  it('rotate alone triggers placement-ignored-by-mate-fk when the part is mated', async () => {
    const model = await buildModel({
      fileName: 'rot-ignored.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10))
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10), { rotate: [0, 0, 30] })
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.solvedModel({});
      `,
    });
    expect(model.diagnostics.some((d) => d.code === 'assembly.placement-ignored-by-mate-fk')).toBe(true);
  }, 60_000);
});
