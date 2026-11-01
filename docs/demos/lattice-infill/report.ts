// Writes result.json: the lattice build report of the demo bracket, the
// same bracket with an ungraded lattice, and the 60 mm cube timing run.
// Run: npx tsx docs/demos/lattice-infill/report.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { buildModel } from '../../../src/composition/buildModel';
import { buildLatticeSolid } from '../../../src/kernel/lattice/buildLattice';
import { WORLD_FRAME } from '../../../src/kernel/lattice/latticeField';

const src = readFileSync(new URL('../../../examples/lattice/graded-gyroid-bracket.kcad.ts', import.meta.url), 'utf8');
const facts = async (code: string): Promise<unknown> => {
  const m = await buildModel({ code, fileName: 'bracket.kcad.ts' });
  return (m.rootShape as unknown as { facts: { lattice: unknown } }).facts.lattice;
};
const graded = await facts(src);
const uniform = await facts(src.replace(/,\n {2}grade: \{[^}]*\},/, ','));
const h = 30;
const cube = buildLatticeSolid(
  { vertices: [-h, -h, -h, h, -h, -h, h, h, -h, -h, h, -h, -h, -h, h, h, -h, h, h, h, h, -h, h, h],
    triangles: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7] },
  { type: 'gyroid', variant: 'sheet', cell: 6, value: 0.8, skin: 1.2, frame: WORLD_FRAME },
).report;
writeFileSync(new URL('./result.json', import.meta.url), JSON.stringify({ bracketGraded: graded, bracketUniform: uniform, cube60: cube }, null, 2) + '\n');
console.log('wrote result.json');
