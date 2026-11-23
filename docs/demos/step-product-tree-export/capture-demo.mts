// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/step-product-tree-export/capture-demo.mts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { inspectBomTool } from '../../../src/agent/mcp/tools/inspectBom';
import { importBrepBytes } from '../../../src/kernel/backends/occt/importBrep';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepAssembly } from '../../../src/kernel/import/stepAssemblyImport';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = 'examples/bom/panel-with-fasteners.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/step-product-tree-export/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/kernel/backends/occt/sceneStepExport.ts',
  'src/kernel/backends/occt/stepAssemblyExport.ts',
  'src/kernel/export/stepReproducible.ts',
  'src/modeling/backends/occt/lowerers/partPrototype.ts',
];
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits));

await initOcct();
const code = await readFile(SOURCE, 'utf8');
const exported = await runAndExport({ code, fileName: SOURCE, format: 'step' });
assert.deepEqual(exported.diagnostics.filter((d) => d.severity === 'error'), []);

const snapshot = await importStepAssembly(exported.bytes, 'panel.step');
const products = snapshot.definitions.map((definition) => {
  const instances = snapshot.occurrences.filter((o) => o.definitionId === definition.id);
  return {
    product: definition.name,
    solidCount: definition.solidCount,
    volumeMm3: round(definition.volumeMm3, 3),
    localBoundsMm: { min: definition.boundsMm.min.map((v) => round(v, 4)), max: definition.boundsMm.max.map((v) => round(v, 4)) },
    instances: instances.map((o) => ({
      name: o.name,
      path: o.sourcePath,
      translationMm: [round(o.transform[12]), round(o.transform[13]), round(o.transform[14])],
      color: o.color?.hex ?? null,
    })),
  };
});

const bom = await inspectBomTool({ file: SOURCE });
assert.ok(bom.ok, 'BOM extraction failed');
const bomRows = bom.rows.map((row) => ({ name: row.name, quantity: row.quantity, kind: row.kind, instances: row.instancePaths }));

// Acceptance: the STEP tree and the BOM agree on every repeated part.
for (const row of bomRows) {
  const product = products.find((p) => p.instances.some((i) => i.name === row.name));
  assert.ok(product, `no STEP product holds BOM row '${row.name}'`);
  assert.equal(product.instances.length, row.quantity, `instance count for '${row.name}'`);
  assert.deepEqual(product.instances.map((i) => i.name).sort(), [...row.instances].sort());
}
// Acceptance: placements are the script's `at` values.
const standoffs = products.find((p) => p.instances.some((i) => i.name === 'standoff_0'))!;
assert.deepEqual(standoffs.instances.map((i) => i.translationMm), [[20, 10, 3], [80, 10, 3], [140, 10, 3]]);
const screws = products.find((p) => p.instances.some((i) => i.name === 'screw_0'))!;
assert.deepEqual(screws.instances.map((i) => i.translationMm), [[20, 110, 3], [80, 110, 3], [140, 110, 3], [200, 110, 3]]);

const placedVolumeMm3 = products.reduce((sum, p) => sum + p.volumeMm3 * p.instances.length, 0);
const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
await writeFile(join(HERE, 'panel.step'), exported.bytes);
const evidence = {
  scope: 'Local kernelCAD Node API export, then re-import of the written bytes through the OCCT XCAF STEP reader.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  step: { file: 'panel.step', bytes: exported.bytes.length, sha256: sha256(exported.bytes) },
  tree: {
    productCount: products.length,
    instanceCount: snapshot.occurrences.length,
    placedVolumeMm3: round(placedVolumeMm3, 3),
    importWarnings: snapshot.warnings,
    products,
  },
  bom: { rows: bomRows, totals: bom.totals },
  checks: {
    bomQuantitiesMatchStepInstanceCounts: true,
    placementsMatchScript: true,
  },
  limits: [
    'Parts are grouped only when their source feature content is identical; a placement baked into the shape (translate/rotate before part()) makes a separate product.',
    'Other CAD systems were not used to open the file.',
    'The file hash is for this capture only: OCCT orders the colour style entities of a multi-colour scene differently between writes.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
// One mesh per re-imported product; the video places it once per instance.
const geometry = snapshot.definitions.map((definition) => {
  const backend = importBrepBytes(definition.brep);
  try {
    const mesh = backend.getMesh();
    return {
      product: definition.name,
      positions: Array.from(mesh.positions, (v) => round(v, 4)),
      indices: Array.from(mesh.indices),
      placements: snapshot.occurrences.filter((o) => o.definitionId === definition.id).map((o) => o.transform.map((v) => round(v, 6))),
    };
  } finally {
    backend.dispose();
  }
});
await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify(geometry)}\n`);
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ step: evidence.step, productCount: products.length, instanceCount: snapshot.occurrences.length, bom: bomRows.map((r) => `${r.name} x${r.quantity}`) }, null, 2));
