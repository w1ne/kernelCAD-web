// Measures fixture.svg with the SVG reader at a given module path, so the old
// and new placement can be compared on identical bytes.
//
//   npx tsx measure.mjs ../../../src/kernel/import/importSvg.ts
//
// The default path is this worktree's reader. Point it at another checkout's
// src/kernel/import/importSvg.ts to measure that revision.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(here, process.argv[2] ?? '../../../src/kernel/import/importSvg.ts');
const { importSvgText } = await import(modulePath);
const svg = readFileSync(resolve(here, 'fixture.svg'), 'utf8');

const result = importSvgText(svg);

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (const region of result.regions) {
  for (const command of region.commands) {
    if (command.x === undefined || command.y === undefined) continue;
    const x = command.x.evaluated;
    const y = command.y.evaluated;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
}

console.log(JSON.stringify({
  module: modulePath,
  fixtureSha256: createHash('sha256').update(svg).digest('hex'),
  unitScale: result.unitScale,
  unitSource: result.unitSource,
  regions: result.regions.length,
  bboxMm: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
  areaMm2: result.regions.map((region) => region.areaMm2),
}, null, 2));
