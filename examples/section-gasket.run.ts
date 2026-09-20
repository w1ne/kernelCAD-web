// Runs the section-gasket example end to end and prints REAL numbers:
//   1. the cross-section area and derived gasket volume (via the lowered
//      gasket's actual volume), and
//   2. a dense section stack scan that finds the thinnest cross-section,
//      using the same probe an agent gets from `inspect({ of: 'section' })`.
//
// Run with:
//   npx tsx examples/section-gasket.run.ts

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct, OcctBackend } from '../src/kernel/backends/occt/occtBackend';
import { runScript } from '../src/composition/runScript';
import { RecomputeEngine } from '../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../src/modeling/backends/occt/occtLowerer';
import { inspectSectionTool } from '../src/agent/mcp/tools/inspectSection';

async function main() {
  await initOcct();
  const here = dirname(fileURLToPath(import.meta.url));
  const file = resolve(here, 'section-gasket.kcad.ts');
  const code = readFileSync(file, 'utf8');

  const { records, session, returnValue } = await runScript({ code, fileName: file, scriptDir: here });
  const engine = new RecomputeEngine(createOcctLowerer(session));
  const lowered = await engine.run(records);
  const gasketId = typeof returnValue === 'object' && returnValue !== null && 'id' in returnValue
    ? (returnValue as { id: string }).id
    : records[records.length - 1].id;
  const gasket = lowered.shapes.get(gasketId) as OcctBackend;

  const sectionRecord = records.find(
    r => (r.metadata as { derivedFrom?: string } | undefined)?.derivedFrom === 'section',
  );
  const md = sectionRecord?.metadata as { sectionAreaMm2?: number; loopCount?: number; holeCount?: number } | undefined;

  console.log(`section area   = ${md?.sectionAreaMm2?.toFixed(2)} mm^2`);
  console.log(`section loops  = ${md?.loopCount} (holes: ${md?.holeCount})`);
  console.log(`gasket volume  = ${gasket.volume().toFixed(2)} mm^3`);

  // Dense scan along X of a stepped shaft (two fat ends joined by a thin
  // neck). This is the exact probe `inspect({ of: 'section', stack })` exposes:
  // it reports `minAreaPosition`, which locates the neck.
  const dumbbell = `
    const bodyL = box(15, 20, 10);
    const bodyR = box(15, 20, 10).translate(35, 0, 0);
    const neck = box(20, 4, 10).translate(15, 8, 0);
    return bodyL.union(neck, bodyR);
  `;
  const scan = await inspectSectionTool({
    code: dumbbell,
    stack: { from: 5, to: 45, count: 41, axis: 'x' },
  });
  if (!scan.ok) {
    console.error('section scan failed:', scan.error);
    process.exitCode = 1;
    return;
  }
  const min = scan.slices![scan.minAreaIndex!];
  console.log(`stack slices   = ${scan.slices!.length}; thinnest neck at x=${min.position} (area ${min.area.toFixed(2)} mm^2)`);
}

main();
