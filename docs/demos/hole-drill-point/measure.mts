// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Measure the demo solid through the same build pipeline the CLI uses.
// Run from the repository root:
//   npx tsx docs/demos/hole-drill-point/measure.mts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildModel } from '../../../src/modeling/buildModel.ts';

const file = join(import.meta.dirname, 'hole-drill-point.kcad.ts');
const result = await buildModel({
  fileName: 'hole-drill-point.kcad.ts',
  code: readFileSync(file, 'utf8'),
});
const shape = result.rootShape as {
  volume(): number;
  surfaceArea(): number;
  boundingBox(): { min: number[]; max: number[] };
};

console.log(JSON.stringify({
  ok: result.diagnostics.filter((d) => d.severity === 'error').length === 0,
  diagnostics: result.diagnostics,
  volumeMm3: shape.volume(),
  surfaceAreaMm2: shape.surfaceArea(),
  boundingBox: shape.boundingBox(),
}, null, 2));
