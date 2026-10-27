// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { q } from '../../../src/kernel/naming/queryConstructors';
import { evaluate } from '../../../src/kernel/naming/queryEvaluator';
import type { QueryScene } from '../../../src/kernel/naming/query';
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';
import type { FeatureKind } from '../../../src/shared/intent/types';

const box = 'box(10, 10, 10)';

interface SolidReport {
  volume: number | undefined;
  faces: number | undefined;
  bbox: { min: number[]; max: number[] } | undefined;
  codes: string[];
}

async function solidOf(code: string, kernel?: 'occt' | 'smlib'): Promise<SolidReport> {
  const model = await buildModel({ code: `export default ${code};`, fileName: 'face-edit.kcad.ts', kernel });
  const shape = model.rootShape ?? [...model.shapes.values()].at(-1);
  const volume = shape?.volume();
  const faces = shape instanceof OcctBackend ? shape.faceHashes().length : undefined;
  const bbox = shape?.boundingBox();
  const codes = model.diagnostics.filter((d) => d.severity === 'error' || d.code === 'recompute.kernel.guard-fallback').map((d) => `${d.code} ${d.message}`);
  shape?.dispose?.();
  return { volume, faces, bbox, codes };
}

function expectBounds(report: SolidReport, max: [number, number, number], min: [number, number, number] = [0, 0, 0]): void {
  expect(report.bbox).toBeDefined();
  for (let axis = 0; axis < 3; axis++) {
    expect(report.bbox!.min[axis]).toBeCloseTo(min[axis], 3);
    expect(report.bbox!.max[axis]).toBeCloseTo(max[axis], 3);
  }
}

async function sceneOf(code: string): Promise<QueryScene & { ids: Record<string, string>; dispose: () => void }> {
  const model = await buildModel({ code, fileName: 'face-edit.kcad.ts' });
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const id = (kind: FeatureKind) => model.records.find((record) => record.kind === kind)?.id ?? '';
  const last = model.records[model.records.length - 1];
  const backend = model.shapes.get(last.id) as OcctBackend;
  return {
    backend,
    featureId: last.id,
    records: model.records,
    ids: { box: id('box'), offsetFaces: id('offsetFaces') },
    dispose: () => model.rootShape?.dispose?.(),
  };
}

function handles(scene: QueryScene, query: ReturnType<typeof q.face>): string[] {
  return evaluate(query, scene).map((entity) => entity.handle).sort();
}

describe('offsetFaces and moveFaces', () => {
  it('offsets a planar face on OCCT by area times distance', async () => {
    const grown = await solidOf(`${box}.offsetFaces('top', 2)`);
    const shrunk = await solidOf(`${box}.offsetFaces('top', -2)`);
    expect(grown.codes).toEqual([]);
    expect(shrunk.codes).toEqual([]);
    expect(grown.volume).toBeCloseTo(1200, 3);
    expect(shrunk.volume).toBeCloseTo(800, 3);
    expect(grown.faces).toBe(6);
    expect(shrunk.faces).toBe(6);
    expectBounds(grown, [10, 10, 12]);
    expectBounds(shrunk, [10, 10, 8]);
  });

  it('moves a planar face along its normal and rejects a sideways move', async () => {
    const moved = await solidOf(`${box}.moveFaces('top', [0, 0, 2])`);
    expect(moved.codes).toEqual([]);
    expect(moved.volume).toBeCloseTo(1200, 3);
    expect(moved.faces).toBe(6);
    expectBounds(moved, [10, 10, 12]);
    const sideways = await solidOf(`${box}.moveFaces('top', [3, 0, 0])`);
    expect(sideways.codes.join('\n')).toMatch(/MOVE_FACES_NOT_ALONG_NORMAL/);
    expect(sideways.volume).toBeCloseTo(1000, 3);
    expect(sideways.faces).toBe(6);
  });

  it('offsets two adjacent box faces into a 12×10×12 solid', async () => {
    const edited = await solidOf(`${box}.offsetFaces(['top', 'right'], 2)`);
    expect(edited.codes).toEqual([]);
    expect(edited.volume).toBeCloseTo(1440, 3);
    expect(edited.faces).toBe(6);
    expectBounds(edited, [12, 10, 12]);
  });

  it('offsets the free end of an unsewn union into a 22×10×10 bar', async () => {
    const edited = await solidOf(`${box}.union(${box}.translate(10, 0, 0)).offsetFaces('right', 2)`);
    expect(edited.codes).toEqual([]);
    expect(edited.volume).toBeCloseTo(2200, 3);
    expect(edited.faces).toBe(6);
    expectBounds(edited, [22, 10, 10]);
  });

  it('rejects a hypotenuse offset that would glue a slab', async () => {
    const edited = await solidOf(`extrudePolygon([[0, 0], [30, 0], [0, 40]], 10).offsetFaces({ near: [15, 20, 5] }, 2)`);
    expect(edited.codes.join('\n')).toMatch(/FACE_EDIT_INCONSISTENT/);
    expect(edited.codes.join('\n')).toMatch(/face count changed/);
    expect(edited.codes.join('\n')).toMatch(/gained face/);
    expect(edited.codes.join('\n')).toMatch(/glued prism/);
    expect(edited.volume).toBeCloseTo(6000, 2);
    expect(edited.faces).toBe(5);
    expectBounds(edited, [30, 40, 10]);
  });

  it('rejects a step on one half of an unsewn top without calling it a glued prism', async () => {
    const edited = await solidOf(`box(10, 10, 10).union(box(10, 10, 10).translate(10, 0, 0)).offsetFaces({ near: [5, 5, 10] }, 2)`);
    expect(edited.codes.join('\n')).toMatch(/FACE_EDIT_INCONSISTENT/);
    expect(edited.codes.join('\n')).toMatch(/face count changed against the sewn solid/);
    expect(edited.codes.join('\n')).not.toMatch(/glued prism|gained face/);
    expect(edited.volume).toBeCloseTo(2000, 2);
    expectBounds(edited, [20, 10, 10]);
  });

  it('rejects a pull that consumes the solid and keeps the box', async () => {
    const pulled = await solidOf(`${box}.offsetFaces('top', -10)`);
    expect(pulled.codes.join('\n')).toMatch(/FACE_EDIT_FAILED/);
    expect(pulled.codes.join('\n')).not.toMatch(/FACE_EDIT_INCONSISTENT/);
    expect(pulled.volume).toBeCloseTo(1000, 3);
    expect(pulled.faces).toBe(6);
    expectBounds(pulled, [10, 10, 10]);
  });

  it('keeps the canonical top so a later offset, a fillet, and derivedFrom still find it', async () => {
    const again = await solidOf(`${box}.offsetFaces('top', 2).offsetFaces('top', 1)`);
    expect(again.codes).toEqual([]);
    expect(again.volume).toBeCloseTo(1300, 3);
    expect(again.faces).toBe(6);
    expectBounds(again, [10, 10, 13]);

    const filleted = await solidOf(`${box}.offsetFaces('top', 2).fillet(1, { face: 'top' })`);
    expect(filleted.codes).toEqual([]);
    expect(filleted.volume).toBeGreaterThan(1000);
    expect(filleted.volume).toBeLessThan(1200);

    const scene = await sceneOf(`export default ${box}.offsetFaces('top', 2);`);
    try {
      const top = handles(scene, q.face(q.withLabel('top')));
      const fromBox = handles(scene, q.face(q.derivedFrom(scene.ids.box)));
      const sinceBox = handles(scene, q.face(q.newSince(scene.ids.box)));
      const bornBox = handles(scene, q.face(q.createdBy(scene.ids.box)));
      expect(top).toHaveLength(1);
      expect(fromBox).toEqual(expect.arrayContaining(top));
      expect(sinceBox.filter((hash) => top.includes(hash))).toEqual([]);
      expect(bornBox).toEqual(expect.arrayContaining(top));
      expect(fromBox).toHaveLength(6);
      expect(sinceBox).toEqual([]);
      expect(scene.backend.historyMap?.size).toBe(6);
      expect(scene.backend.faceHashes()).toHaveLength(6);
    } finally {
      scene.dispose();
    }
  });

  it('rejects a cylindrical face instead of returning a wrong solid', async () => {
    const rejected = await solidOf(`cylinder(10, 4).offsetFaces({ ofSurfaceType: 'CYLINDER' }, 1)`);
    expect(rejected.codes.join('\n')).toMatch(/FACE_EDIT_NOT_PLANAR/);
    expect(rejected.volume).toBeCloseTo(Math.PI * 16 * 10, 2);
  });

  it('keeps the OCCT solid when SMLib agrees but STEP cannot carry the face lineage', async () => {
    const edited = await solidOf(`${box}.offsetFaces('top', 2)`, 'smlib');
    expect(edited.codes.join('\n')).toMatch(/NAMING_HISTORY/);
    expect(edited.codes.join('\n')).not.toMatch(/VOLUME_MISMATCH|AREA_MISMATCH|DEPRECATION/);
    expect(edited.volume).toBeCloseTo(1200, 2);
    expect(edited.faces).toBe(6);
    expectBounds(edited, [10, 10, 12]);
  });

  it('names the OCCT refusal when SMLib is asked for a move OCCT will not do', async () => {
    const edited = await solidOf(`${box}.moveFaces('top', [3, 0, 0])`, 'smlib');
    expect(edited.codes.join('\n')).toMatch(/MOVE_FACES_NOT_ALONG_NORMAL/);
    expect(edited.codes.join('\n')).toMatch(/OCCT_REFERENCE_FAILED/);
    if (edited.volume !== undefined) expect(edited.volume).toBeCloseTo(1000, 3);
  });

  it('a warm distance edit matches a cold rebuild and skips the unchanged box', async () => {
    const code = `
      const d = param('d', 2, { min: -4, max: 6 });
      return box(10, 10, 10).offsetFaces('top', d);
    `;
    const warm = await buildModel({ code, fileName: 'face-edit-warm.kcad.ts' });
    const boxId = warm.records.find((record) => record.kind === 'box')!.id;
    const { OcctLowerer } = await import('../../../src/modeling/backends/occt/occtLowerer');
    const lowered: string[] = [];
    const orig = OcctLowerer.prototype.lower;
    OcctLowerer.prototype.lower = async function (record, inputs) {
      lowered.push(record.id);
      return orig.call(this, record, inputs);
    };
    try {
      const edited = await updateModelParams(warm, [{ name: 'd', value: 4 }]);
      expect(lowered).not.toContain(boxId);
      expect(lowered.some((id) => id.startsWith('offsetFaces'))).toBe(true);
      const cold = await buildModel({
        code: code.replace("param('d', 2,", "param('d', 4,"),
        fileName: 'face-edit-warm.kcad.ts',
      });
      expect(edited.model.rootShape!.volume()).toBeCloseTo(1400, 3);
      expect(edited.model.rootShape!.volume()).toBeCloseTo(cold.rootShape!.volume(), 3);
      expect((edited.model.rootShape as OcctBackend).faceHashes()).toHaveLength(6);
      expect(edited.model.rootShape!.boundingBox().max[2]).toBeCloseTo(14, 3);
      expect((cold.rootShape as OcctBackend).faceHashes()).toHaveLength(6);
      cold.rootShape?.dispose?.();
    } finally {
      OcctLowerer.prototype.lower = orig;
      warm.rootShape?.dispose?.();
    }
  });
});
