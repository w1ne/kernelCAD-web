import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const sourcePath = resolve(root, 'catalog/kits/fire-station/station-alerting-control-console.kcad.ts');
let code = readFileSync(sourcePath, 'utf8');
code = code.replace("param('scale', 1,", "param('scale', 1.15,");
code = code.replace('param("powderCoat", "#4d718c",', 'param("powderCoat", "#b83d34",');
code = code.replace('param("stainlessSteel", "#aeb9c0",', 'param("stainlessSteel", "#c3c9cc",');
if (!code.includes("param('scale', 1.15,") || !code.includes('param("powderCoat", "#b83d34",')) {
  throw new Error('could not apply scale and apparatus-red material overrides');
}

await initOcct();
const exported = await runAndExport({
  code,
  fileName: 'station-alerting-control-console.kcad.ts',
  scriptDir: dirname(sourcePath),
  format: 'glb',
  options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1800 } },
});
if (exported.bytes.byteLength === 0 || exported.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
  throw new Error(`variant GLB export failed: ${exported.diagnostics.map((diagnostic) => diagnostic.message).join('; ')}`);
}
const png = await renderTrianglesPng(await glbTriangles(exported.bytes), {
  label: 'Alert console · apparatus red · scale 1.15',
});
writeFileSync(resolve(bundle, 'quality-variant.png'), png);
console.log('rendered station-alerting-control-console at scale 1.15 with the apparatus-red material palette');
