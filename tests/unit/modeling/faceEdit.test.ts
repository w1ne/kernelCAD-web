// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';

const box = 'box(10, 10, 10)';

async function volumeOf(code: string, kernel?: 'occt' | 'smlib'): Promise<{ volume: number | undefined; codes: string[] }> {
  const model = await buildModel({ code: `export default ${code};`, fileName: 'face-edit.kcad.ts', kernel });
  const shape = model.rootShape ?? [...model.shapes.values()].at(-1);
  const volume = shape?.volume();
  const codes = model.diagnostics.filter((d) => d.severity === 'error' || d.code === 'recompute.kernel.guard-fallback').map((d) => `${d.code} ${d.message}`);
  shape?.dispose?.();
  return { volume, codes };
}

describe('offsetFaces and moveFaces', () => {
  it('offsets a planar face on OCCT by area times distance', async () => {
    const grown = await volumeOf(`${box}.offsetFaces('top', 2)`);
    const shrunk = await volumeOf(`${box}.offsetFaces('top', -2)`);
    expect(grown.codes).toEqual([]);
    expect(shrunk.codes).toEqual([]);
    expect(grown.volume).toBeCloseTo(1200, 3);
    expect(shrunk.volume).toBeCloseTo(800, 3);
  });

  it('moves a planar face along its normal and rejects a sideways move', async () => {
    const moved = await volumeOf(`${box}.moveFaces('top', [0, 0, 2])`);
    expect(moved.codes).toEqual([]);
    expect(moved.volume).toBeCloseTo(1200, 3);
    const sideways = await volumeOf(`${box}.moveFaces('top', [3, 0, 0])`);
    expect(sideways.codes.join('\n')).toMatch(/MOVE_FACES_NOT_ALONG_NORMAL/);
    expect(sideways.volume).toBeCloseTo(1000, 3);
  });

  it('rejects a cylindrical face instead of returning a wrong solid', async () => {
    const rejected = await volumeOf(`cylinder(10, 4).offsetFaces({ ofSurfaceType: 'CYLINDER' }, 1)`);
    expect(rejected.codes.join('\n')).toMatch(/FACE_EDIT_NOT_PLANAR/);
    expect(rejected.volume).toBeCloseTo(Math.PI * 16 * 10, 2);
  });

  it('keeps the OCCT solid when SMLib agrees but STEP cannot carry the face lineage', async () => {
    const edited = await volumeOf(`${box}.offsetFaces('top', 2)`, 'smlib');
    expect(edited.codes.join('\n')).toMatch(/NAMING_HISTORY/);
    expect(edited.codes.join('\n')).not.toMatch(/VOLUME_MISMATCH|AREA_MISMATCH|DEPRECATION/);
    expect(edited.volume).toBeCloseTo(1200, 2);
  });

  it('names the OCCT refusal when SMLib is asked for a move OCCT will not do', async () => {
    const edited = await volumeOf(`${box}.moveFaces('top', [3, 0, 0])`, 'smlib');
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
      cold.rootShape?.dispose?.();
    } finally {
      OcctLowerer.prototype.lower = orig;
      warm.rootShape?.dispose?.();
    }
  });
});
