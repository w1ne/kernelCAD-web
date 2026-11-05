// Render a declared catalog preset from the source, then software-render its GLB.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { runScript } from '../../../src/composition/runScript';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const sourcePath = join(root, 'catalog/kits/lab-infrastructure/laboratory-fume-hood.kcad.ts');
const code = readFileSync(sourcePath, 'utf8');
const fileName = basename(sourcePath);
const scriptDir = dirname(sourcePath);
await initOcct();

const original = await runScript({ code, fileName, scriptDir });
const preset = original.session.assetPresets?.highVisibility;
if (preset === undefined) throw new Error('laboratory-fume-hood has no highVisibility preset');

let variantCode = code;
for (const [name, value] of Object.entries(preset)) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`(param\\(['"]${escaped}['"],\\s*)'[^']*'`);
  if (!expression.test(variantCode)) throw new Error(`preset refers to undeclared parameter ${name}`);
  variantCode = variantCode.replace(expression, (_match, prefix: string) => `${prefix}${JSON.stringify(value)}`);
}

const variant = await runScript({ code: variantCode, fileName, scriptDir });
const triangleBudget = Number(variant.session.assetMetadata?.triangleBudget ?? 1800);
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
const outputPath = join(outputDir, 'laboratory-fume-hood-highVisibility.png');
writeFileSync(outputPath, await renderTrianglesPng(triangles, {
  label: `Laboratory fume hood · highVisibility · ${triangles.length} tris`,
}));
const result = {
  source: 'catalog/kits/lab-infrastructure/laboratory-fume-hood.kcad.ts',
  sourceSha256: createHash('sha256').update(code).digest('hex'),
  preset: 'highVisibility',
  appliedOverrides: preset,
  triangles: triangles.length,
  triangleBudget,
  output: 'variants/laboratory-fume-hood-highVisibility.png',
  workflow: 'evaluate authored preset, export low-poly GLB, and software-render the resolved mesh',
};
writeFileSync(join(bundle, 'variant-verification.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
