// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it } from 'vitest';
import {
  MAX_ASSET_GENERATIONS,
  clearGenerationAssets,
  generationIdsForSource,
  importedAssetPaths,
  rememberGenerationAssets,
} from './generationAssets';

afterEach(() => clearGenerationAssets());

describe('importedAssetPaths', () => {
  it('lists the source-relative files lib.from* imports, once each', () => {
    const source = [
      "const a = await lib.fromSTL('./inputs/0123456789ab.stl');",
      'const b = await lib.fromSTEP("./parts/motor.step");',
      "const c = await lib.fromSTL('./inputs/0123456789ab.stl');",
      "const d = await lib.fromSTL('/abs/path.stl');",
    ].join('\n');
    expect(importedAssetPaths(source)).toEqual(['inputs/0123456789ab.stl', 'parts/motor.step']);
  });
});

describe('generationIdsForSource', () => {
  const stl = "return await lib.fromSTL('./inputs/0123456789ab.stl');";

  it('is empty for code that imports no generation file', () => {
    rememberGenerationAssets('gen-1', ['inputs/0123456789ab.stl']);
    expect(generationIdsForSource('return box(1,1,1);')).toEqual([]);
  });

  it('names the generation that first returned the file (a follow-up edit run holds none)', () => {
    rememberGenerationAssets('gen-1', ['inputs/0123456789ab.stl']);
    rememberGenerationAssets('gen-2', ['./inputs/0123456789ab.stl']);
    expect(generationIdsForSource(stl)).toEqual(['gen-1']);
  });

  it('names every generation whose file the code imports, up to the server limit', () => {
    const paths = Array.from({ length: MAX_ASSET_GENERATIONS + 2 }, (_, i) => `inputs/${String(i).padStart(12, '0')}.stl`);
    paths.forEach((path, i) => rememberGenerationAssets(`gen-${i}`, [path]));
    const source = paths.map((path) => `await lib.fromSTL('./${path}');`).join('\n');
    expect(generationIdsForSource(source)).toHaveLength(MAX_ASSET_GENERATIONS);
  });
});
