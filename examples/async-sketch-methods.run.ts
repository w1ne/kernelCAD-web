// Proves both halves of the async-sketch-methods fix:
//   1. the AWAITED form of sectionSketch / faceSketch / silhouette evaluates
//      and produces the expected real volume;
//   2. the UN-AWAITED chain — `shape.sectionSketch(...).extrude(...)` etc —
//      fails at capture time with the actionable
//      `feature.async-result.missing-await` diagnostic, not a TypeError.
//
// Run with:
//   npx tsx examples/async-sketch-methods.run.ts

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct, OcctBackend } from '../src/kernel/backends/occt/occtBackend';
import { runScript } from '../src/composition/runScript';
import { RecomputeEngine } from '../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../src/modeling/backends/occt/occtLowerer';
import { isKernelError } from '../src/shared/intent/kernelError';

async function volumeOf(code: string, fileName: string, scriptDir: string): Promise<number> {
  const { records, session, returnValue } = await runScript({ code, fileName, scriptDir });
  const engine = new RecomputeEngine(createOcctLowerer(session));
  const lowered = await engine.run(records);
  const id = typeof returnValue === 'object' && returnValue !== null && 'id' in returnValue
    ? (returnValue as { id: string }).id
    : records[records.length - 1].id;
  const shape = lowered.shapes.get(id) as OcctBackend;
  return shape.volume();
}

async function expectMissingAwait(code: string, fileName: string, scriptDir: string, methodName: string): Promise<void> {
  try {
    await runScript({ code, fileName, scriptDir });
    console.error(`FAIL: un-awaited ${methodName} chain did not throw`);
    process.exitCode = 1;
    return;
  } catch (e) {
    if (isKernelError(e) && e.code === 'feature.async-result.missing-await') {
      console.log(`un-awaited ${methodName}: OK — ${e.message}`);
    } else {
      console.error(`FAIL: un-awaited ${methodName} threw the wrong error:`, e);
      process.exitCode = 1;
    }
  }
}

async function main() {
  await initOcct();
  const here = dirname(fileURLToPath(import.meta.url));

  const file = resolve(here, 'async-sketch-methods.kcad.ts');
  const code = readFileSync(file, 'utf8');
  const sectionVolume = await volumeOf(code, file, here);
  console.log(`section extrude volume    = ${sectionVolume.toFixed(3)} mm^3`);

  const silhouetteCode = `
    const cyl = cylinder(10, 50);
    const outline = await cyl.silhouette([1, 0, 0]);
    return outline.extrude(2);
  `;
  const silhouetteVolume = await volumeOf(silhouetteCode, resolve(here, 'silhouette-inline.kcad.ts'), here);
  console.log(`silhouette extrude volume = ${silhouetteVolume.toFixed(3)} mm^3`);

  // The three un-awaited misuse chains from the bug report.
  await expectMissingAwait(
    `
      const plate = box(60, 40, 10)
        .hole('top', { u: -15, v: 0, diameter: 10, depth: 'through' })
        .hole('top', { u: 15, v: 0, diameter: 8, depth: 'through' });
      return plate.sectionSketch({ plane: 'xy', offset: 5 }).extrude(3);
    `,
    resolve(here, 'unawaited-section.kcad.ts'),
    here,
    'sectionSketch',
  );
  await expectMissingAwait(
    `
      const cyl = cylinder(10, 50);
      return cyl.silhouette([1, 0, 0]).extrude(2);
    `,
    resolve(here, 'unawaited-silhouette.kcad.ts'),
    here,
    'silhouette',
  );
  await expectMissingAwait(
    `
      const plate = box(60, 40, 10, false, { faceLabels: { top: 'top' } });
      return plate.faceSketch('top').extrude(8);
    `,
    resolve(here, 'unawaited-faceSketch.kcad.ts'),
    here,
    'faceSketch',
  );
}

main();
