// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Local inspect render of docs/demos/step-to-features/source.step.
// Writes four labeled PNGs beside this file. Not a deployed-page check
// and not hardware acceptance.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectStepViews } from '../../../src/agent/inspect/stepInspectViews.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const step = join(root, 'docs/demos/step-to-features/source.step');
const width = 480;
const height = 340;

async function main(): Promise<void> {
  mkdirSync(here, { recursive: true });
  const listed = await inspectStepViews({
    file: step,
    out_dir: join('/tmp', 'kcad-step-inspect-demo-probe'),
    width,
    height,
    max_labels: 8,
  });
  if (!listed.ok || !listed.faces) {
    console.error(JSON.stringify({ ok: false, error: listed.error, errorCode: listed.errorCode }));
    process.exit(1);
  }
  const top = listed.faces
    .filter((face) => face.surfaceType === 'PLANE' && face.normal[2] > 0.999)
    .sort((a, b) => b.area - a.area)[0];
  const views = await inspectStepViews({
    file: step,
    target_face: top.id,
    out_dir: here,
    width,
    height,
    max_labels: 8,
  });
  rmSync(join(here, 'report.json'), { force: true });
  rmSync(join('/tmp', 'kcad-step-inspect-demo-probe'), { recursive: true, force: true });
  if (!views.ok || !views.images || !views.target) {
    console.error(JSON.stringify({ ok: false, error: views.error, errorCode: views.errorCode }));
    process.exit(1);
  }
  const evidence = {
    scope: 'Local inspect render of one normalized STEP import. Not deployed behavior and not hardware acceptance.',
    invocation: 'node --import tsx docs/demos/step-inspect-views/render.ts',
    source: 'docs/demos/step-to-features/source.step',
    width,
    height,
    pngHeight: height + 56,
    importGeneration: views.importGeneration,
    refScope: views.refScope,
    target: {
      id: top.id,
      area: top.area,
      normal: top.normal,
      centroid: top.centroid,
      ref: top.ref,
      listRef: top.listRef,
      visibleIn: views.target.visibleIn,
    },
    views: views.images.map((image) => ({
      name: image.name,
      file: image.path.split('/').pop(),
      targetVisible: image.targetVisible,
      targetPixels: image.targetPixels,
      labeledFaceIds: image.labeledFaceIds,
      legendFaceIds: image.legendFaceIds,
      labeledEdgeIds: image.labeledEdgeIds,
      legendEdgeIds: image.legendEdgeIds,
    })),
  };
  writeFileSync(join(here, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}

main();
