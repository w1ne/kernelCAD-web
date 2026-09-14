// Runs the drawings-gdt-plate example end to end: lowers
// drawings-gdt-plate.kcad.ts and exports a `svg-drawing` sheet carrying
// hole/fillet/chamfer/datum/fcf annotations — the new feature-aware
// annotation kinds from the kernelcad-drawings skill.
//
// Run with:
//   npx tsx examples/drawings-gdt-plate.run.ts
//
// Expected output: a summary line naming every callout rendered, and
// examples/drawings-gdt-plate.svg written to disk.

import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAndExport } from '../src/agent/script-runtime/export';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';

async function main() {
  await initOcct();
  const here = dirname(fileURLToPath(import.meta.url));
  const file = resolve(here, 'drawings-gdt-plate.kcad.ts');
  const code = readFileSync(file, 'utf8');

  const result = await runAndExport({
    code,
    fileName: file,
    format: 'svg-drawing',
    scriptDir: here,
    options: {
      format: 'svg-drawing',
      modelName: 'mounting-plate',
      annotations: [
        {
          kind: 'hole', view: 'top', edge: { ofCurveType: 'CIRCLE', near: [10, 10, -2] },
          through: true, counterbore: { diameter: 12, depth: 4 },
        },
        {
          kind: 'hole', view: 'top', edge: { ofCurveType: 'CIRCLE', near: [70, 10, -2] },
          through: true, count: 4,
        },
        { kind: 'fillet', view: 'top', edge: { ofCurveType: 'CIRCLE', near: [65, 25, 18] } },
        { kind: 'chamfer', view: 'top', edge: { ofCurveType: 'LINE', near: [0, 0, 10] }, size: 2 },
        { kind: 'datum', view: 'top', face: { atZ: 0 }, label: 'A' },
        {
          kind: 'fcf', view: 'top', edge: { ofCurveType: 'CIRCLE', near: [70, 40, -2] },
          type: 'position', value: 0.1, datums: ['A'], modifier: '⌀', offset: 12,
        },
        { kind: 'linear', from: [0, 0, 0], to: [80, 0, 0], tol: 0.1 },
      ],
      sections: [{ plane: 'xy', label: 'A' }],
    },
  });

  if (result.bytes.length === 0) {
    console.error('export failed:', JSON.stringify(result.diagnostics, null, 2));
    process.exitCode = 1;
    return;
  }
  const out = resolve(here, 'drawings-gdt-plate.svg');
  await writeFile(out, result.bytes);
  const svg = new TextDecoder().decode(result.bytes);
  const labels = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)]
    .map(m => m[1])
    .filter(t => !['NAME', 'SCALE', 'UNITS', 'DATE', 'FRONT', 'TOP', 'LEFT', 'ISOMETRIC', 'mm', '—'].includes(t) && !/^mounting-plate$/.test(t));
  console.log(`wrote ${out} (${result.bytes.length} bytes)`);
  console.log('callouts rendered:', labels.join(' | '));
  console.log('diagnostics:', result.diagnostics.length === 0 ? 'none' : JSON.stringify(result.diagnostics));
}

main();
