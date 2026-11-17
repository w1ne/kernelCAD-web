// SPDX-License-Identifier: MIT
// Generate real low-poly software renders for the palletizer floor-control demo.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { setParamValue } from '../../../src/modeling/edits/setParamValue';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const bundleDir = resolve(import.meta.dirname);
const repoRoot = resolve(bundleDir, '../../..');
const sourcePath = resolve(repoRoot, 'catalog/kits/industrial-plant/palletizer-robot-cell.kcad.ts');
const fileName = basename(sourcePath);

async function render(code: string, output: string, label: string): Promise<void> {
  const result = await runAndExport({
    code,
    fileName,
    scriptDir: dirname(sourcePath),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1400 } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) {
    throw new Error(errors.map((diagnostic) => diagnostic.message).join('\n') || 'GLB export returned no bytes');
  }
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), { label, size: 512 });
  writeFileSync(resolve(bundleDir, output), png);
}

await initOcct();
const code = readFileSync(sourcePath, 'utf8');
await render(code, 'previews/after/from-source.png', 'Palletizer robot cell · concrete floor');

const edited = setParamValue(code, 'concrete', '#777a75');
if (!edited.ok) throw new Error(edited.error);
writeFileSync(resolve(bundleDir, 'sources/edited-concrete.kcad.ts'), edited.new_code);
await render(edited.new_code, 'previews/after/edited-concrete.png', 'Palletizer robot cell · concrete #777a75');
