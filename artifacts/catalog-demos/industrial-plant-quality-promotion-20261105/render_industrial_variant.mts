// Render one declared catalog preset through kernelCAD's source evaluator and
// the same low-poly GLB/software renderer used for catalog previews.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { runScript } from '../../../src/composition/runScript';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const sourcePath = join(root, 'catalog/kits/industrial-plant/axial-flow-fan.kcad.ts');
const fileName = basename(sourcePath);
const scriptDir = dirname(sourcePath);
const originalCode = readFileSync(sourcePath, 'utf8');
await initOcct();

const original = await runScript({ code: originalCode, fileName, scriptDir });
const preset = original.session.assetPresets?.highVisibility;
if (preset === undefined) throw new Error('axial-flow-fan has no highVisibility catalog preset');

let variantCode = originalCode;
for (const [name, value] of Object.entries(preset)) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`(param\\(['"]${escaped}['"],\\s*)'[^']*'`);
  if (!expression.test(variantCode)) throw new Error(`preset refers to undeclared color parameter ${name}`);
  variantCode = variantCode.replace(expression, (_match, prefix: string) => `${prefix}${JSON.stringify(value)}`);
}

const variant = await runScript({ code: variantCode, fileName, scriptDir });
const triangleBudget = Number(variant.session.assetMetadata?.triangleBudget ?? 1400);
const exported = await runAndExport({
  code: variantCode,
  fileName,
  scriptDir,
  format: 'glb',
  options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: triangleBudget } },
});
const errors = exported.diagnostics.filter((item) => item.severity === 'error');
if (errors.length > 0 || exported.bytes.byteLength === 0) {
  throw new Error(errors.map((item) => `${item.code}: ${item.message}`).join('; ') || 'empty GLB');
}

const outputDir = join(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });
const triangles = await glbTriangles(exported.bytes);
const outputPath = join(outputDir, 'axial-flow-fan-highVisibility.png');
const image = await renderTrianglesPng(triangles, { label: `Axial flow fan · highVisibility · ${triangles.length} tris` });
writeFileSync(outputPath, image);
const result = {
  source: 'catalog/kits/industrial-plant/axial-flow-fan.kcad.ts',
  sourceSha256: createHash('sha256').update(originalCode).digest('hex'),
  preset: 'highVisibility',
  appliedOverrides: preset,
  triangles: triangles.length,
  triangleBudget,
  output: 'variants/axial-flow-fan-highVisibility.png',
  workflow: 'evaluate authored preset, export low-poly GLB, and software-render the resolved mesh',
};
writeFileSync(join(bundle, 'variant-verification.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
