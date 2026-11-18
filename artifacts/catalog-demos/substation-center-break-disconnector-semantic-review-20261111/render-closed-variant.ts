// Render the parameterized closed state for the center-break disconnector demo.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const sourceFile = join(repoRoot, 'catalog/kits/grid-substation/substation-center-break-disconnector.kcad.ts');
const source = readFileSync(sourceFile, 'utf8');
const closedSource = source.replace('param("switchState", "open"', 'param("switchState", "closed"');
if (closedSource === source) throw new Error('Could not select the closed blade-position variant.');

await initOcct();
const exported = await runAndExport({
  code: closedSource,
  fileName: 'substation-center-break-disconnector.kcad.ts',
  scriptDir: resolve(sourceFile, '..'),
  format: 'glb',
  options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 2200 } },
});
const errors = exported.diagnostics.filter(diagnostic => diagnostic.severity === 'error');
if (errors.length > 0) throw new Error(errors.map(error => error.message).join('\n'));

const triangles = await glbTriangles(exported.bytes);
const png = await renderTrianglesPng(triangles, {
  label: `Center break disconnector · closed · ${triangles.length} tris`,
});
writeFileSync(join(import.meta.dirname, 'previews/closed.png'), png);
console.log(`closed state: ${triangles.length} triangles`);
