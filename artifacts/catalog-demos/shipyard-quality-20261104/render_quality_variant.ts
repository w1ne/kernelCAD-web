import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const sourcePath = resolve(root, 'catalog/kits/shipyard/dock-gate-caisson.kcad.ts');
let code = readFileSync(sourcePath, 'utf8');
code = code.replace("param('scale', 1,", "param('scale', 1.12,");
code = code.replace('param("yardPaint", "#748987",', 'param("yardPaint", "#3f697e",');
code = code.replace('param("structuralSteel", "#b6c1c4",', 'param("structuralSteel", "#d9e0e1",');
code = code.replace('param("buoyancyCoat", "#4c969b",', 'param("buoyancyCoat", "#efbb39",');
if (!code.includes("param('scale', 1.12,") || !code.includes('param("buoyancyCoat", "#efbb39",')) {
  throw new Error('could not apply the scale and visible three-zone finish variant');
}

await initOcct();
const exported = await runAndExport({
  code,
  fileName: 'dock-gate-caisson.kcad.ts',
  scriptDir: dirname(sourcePath),
  format: 'glb',
  options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1800 } },
});
if (exported.bytes.byteLength === 0 || exported.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
  throw new Error(`variant GLB export failed: ${exported.diagnostics.map((diagnostic) => diagnostic.message).join('; ')}`);
}
const png = await renderTrianglesPng(await glbTriangles(exported.bytes), {
  label: 'Dock gate · local finish variant',
});
writeFileSync(resolve(bundle, 'quality-variant.png'), png);
console.log('rendered dock-gate-caisson with a local scale 1.12 and blue, steel, and yellow material overrides');
