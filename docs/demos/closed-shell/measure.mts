// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Measure the demo solid through the same build pipeline the CLI uses.
// Run from the repository root:
//   npx tsx docs/demos/closed-shell/measure.mts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildModel } from '../../../src/modeling/buildModel.ts';

const file = join(import.meta.dirname, 'closed-shell.kcad.ts');
const source = readFileSync(file, 'utf8');
const result = await buildModel({ fileName: 'closed-shell.kcad.ts', code: source });
const sealed = await buildModel({
  fileName: 'closed-shell-sealed.kcad.ts',
  code: 'return box(60, 40, 30).shell(3, { closed: true });',
});
const shape = result.rootShape as {
  volume(): number;
  surfaceArea(): number;
  boundingBox(): { min: number[]; max: number[] };
  faceHashes(): string[];
};
const sealedShape = sealed.rootShape as {
  volume(): number;
  surfaceArea(): number;
  faceHashes(): string[];
};

console.log(JSON.stringify({
  ok: result.diagnostics.filter((d) => d.severity === 'error').length === 0,
  diagnostics: result.diagnostics,
  volumeMm3: shape.volume(),
  surfaceAreaMm2: shape.surfaceArea(),
  boundingBox: shape.boundingBox(),
  faceCount: shape.faceHashes().length,
  sealedShell: {
    volumeMm3: sealedShape.volume(),
    surfaceAreaMm2: sealedShape.surfaceArea(),
    faceCount: sealedShape.faceHashes().length,
  },
  expected: {
    sealedVolumeMm3: 60 * 40 * 30 - 54 * 34 * 24,
    wallThicknessMm: 3,
  },
}, null, 2));

