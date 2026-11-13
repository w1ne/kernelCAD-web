// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { emitParamsJson } from '../../../../../src/shared/assets/emitParamsJson';
import { buildAssetPack, type AssetPackModel } from '../../../../../src/kernel/export/asset/assetPack';

const GLB = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 1, 2, 3, 4]);

function model(overrides: Partial<AssetPackModel> = {}): AssetPackModel {
  return {
    fileName: 'mount.kcad.ts',
    source: 'return box(20, 10, 4);\n',
    glb: GLB,
    params: [
      {
        name: 'width',
        type: 'number',
        defaultValue: 80,
        value: 80,
        min: 40,
        max: 140,
        description: 'Plate width',
      },
      {
        name: 'finish',
        type: 'choice',
        defaultValue: 'brass',
        value: 'brass',
        choices: ['brass', 'steel'],
        description: 'Surface finish',
      },
    ],
    presets: [{ name: 'Wide', params: { width: 120, finish: 'steel' } }],
    meta: {
      id: 'mounting-plate',
      name: 'Mounting plate',
      license: 'MIT',
      authors: ['Kernel Test'],
    },
    stats: {
      triangles: 12,
      sizeM: [0.08, 0.04, 0.006],
      minUpM: 0,
      materials: 1,
      drawCalls: 1,
      parts: 1,
      hasRig: false,
      hasIk: false,
    },
    ...overrides,
  };
}

function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(bytes);
}

function text(files: Record<string, Uint8Array>, name: string): string {
  return strFromU8(files[name]!);
}

describe('buildAssetPack', () => {
  it('packs the source, GLB, params, README, licence, viewer and manifest', () => {
    const files = unzip(buildAssetPack(model(), { generatorVersion: '0.17.4', year: 2026 }));
    expect(Object.keys(files).sort()).toEqual([
      'LICENSE.txt',
      'README.md',
      'index.html',
      'manifest.json',
      'mounting-plate.glb',
      'mounting-plate.kcad.ts',
      'mounting-plate.params.json',
    ]);
    expect(files['mounting-plate.glb']).toEqual(GLB);
    expect(text(files, 'mounting-plate.kcad.ts')).toBe('return box(20, 10, 4);\n');
    expect(text(files, 'mounting-plate.params.json')).toBe(emitParamsJson([
      { name: 'width', value: 80, defaultValue: 80 },
      { name: 'finish', value: 'brass', defaultValue: 'brass' },
    ]));
  });

  it('lists every knob, its range or choices, the presets and the mesh stats', () => {
    const readme = text(unzip(buildAssetPack(model(), { generatorVersion: '0.17.4', year: 2026 })), 'README.md');
    expect(readme).toContain('width');
    expect(readme).toContain('finish');
    expect(readme).toContain('number');
    expect(readme).toContain('choice');
    expect(readme).toContain('80');
    expect(readme).toContain('40');
    expect(readme).toContain('140');
    expect(readme).toContain('brass');
    expect(readme).toContain('steel');
    expect(readme).toContain('Plate width');
    expect(readme).toContain('Surface finish');
    expect(readme).toContain('Wide');
    expect(readme).toContain('12');
    expect(readme).toContain('kernelcad export asset-pack');
  });

  it('documents the bundled GLB metre scale in its handoff README', () => {
    const readme = text(unzip(buildAssetPack(model(), { generatorVersion: '0.17.4', year: 2026 })), 'README.md');
    expect(readme).toContain("The bundled GLB uses Y-up and glTF's metre units; kernelCAD's millimetre coordinates are scaled by 0.001 at the scene root.");
    expect(readme).not.toContain('millimetre layout for a PBR GLB');
  });

  it('writes the SPDX identifier from the asset metadata', () => {
    const license = text(unzip(buildAssetPack(model(), { generatorVersion: '0.17.4', year: 2026 })), 'LICENSE.txt');
    expect(license).toContain('SPDX-License-Identifier: MIT');
    expect(license).toContain('Kernel Test');
    expect(license).toContain('2026');
  });

  it('records a sha256 for every packed file except the manifest itself', () => {
    const packed = buildAssetPack(model(), { generatorVersion: '9.9.9', year: 2026 });
    const files = unzip(packed);
    const manifest = JSON.parse(text(files, 'manifest.json')) as {
      generator: string;
      generatorVersion: string;
      files: Record<string, string>;
    };
    expect(manifest.generator).toBe('kernelCAD');
    expect(manifest.generatorVersion).toBe('9.9.9');
    const names = Object.keys(files).filter((name) => name !== 'manifest.json').sort();
    expect(Object.keys(manifest.files)).toEqual(names);
    for (const name of names) {
      expect(manifest.files[name]).toBe(createHash('sha256').update(files[name]!).digest('hex'));
    }
  });

  it('builds the same bytes on a second run', () => {
    const opts = { generatorVersion: '0.17.4', year: 2026 };
    const first = buildAssetPack(model(), opts);
    const second = buildAssetPack(model(), opts);
    expect(second).toEqual(first);
  });

  it('omits the script and says so when the source is unavailable', () => {
    const files = unzip(buildAssetPack(model({ source: undefined }), { generatorVersion: '0.17.4', year: 2026 }));
    expect(files['mounting-plate.kcad.ts']).toBeUndefined();
    expect(text(files, 'README.md')).toMatch(/source was not available/i);
  });

  it('omits the script when the licence does not allow source distribution', () => {
    const files = unzip(buildAssetPack(
      model({ meta: { id: 'mounting-plate', license: 'Proprietary', authors: ['Kernel Test'] } }),
      { generatorVersion: '0.17.4', year: 2026 },
    ));
    expect(files['mounting-plate.kcad.ts']).toBeUndefined();
    expect(text(files, 'README.md')).toMatch(/does not permit redistributing the source/i);
    expect(text(files, 'LICENSE.txt')).toContain('SPDX-License-Identifier: Proprietary');
  });

  it('falls back to a slug of the asset name, then the file name, then asset', () => {
    const byName = unzip(buildAssetPack(
      model({ meta: { name: 'Parametric Mounting Plate', license: 'CC-BY-4.0' } }),
      { generatorVersion: '0.17.4', year: 2026 },
    ));
    expect(byName['parametric-mounting-plate.glb']).toBeDefined();

    const byFile = unzip(buildAssetPack(
      model({ meta: { license: 'CC-BY-4.0' }, fileName: 'Hinge Block.kcad.ts' }),
      { generatorVersion: '0.17.4', year: 2026 },
    ));
    expect(byFile['hinge-block.glb']).toBeDefined();

    const fallback = unzip(buildAssetPack(
      model({ meta: { license: 'CC-BY-4.0' }, fileName: '!!!.kcad.ts' }),
      { generatorVersion: '0.17.4', year: 2026 },
    ));
    expect(fallback['asset.glb']).toBeDefined();
  });
});
