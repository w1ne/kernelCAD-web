// SPDX-License-Identifier: MIT
// Source-driven variants for the electronics keyboard handoff.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const bundleDir = resolve(import.meta.dirname);
const repoRoot = resolve(bundleDir, '../../..');
const sourcePath = resolve(repoRoot, 'catalog/kits/electronics/keyboard.kcad.ts');
const outputDir = resolve(bundleDir, 'renders');
const source = await readFile(sourcePath, 'utf8');
const sourceSha256 = createHash('sha256').update(source).digest('hex');

const variants = [
  {
    id: 'default-tenkeyless',
    title: 'Default · tenkeyless',
    params: {},
    caption: 'Default graphite keycaps · ABS shell · coral accent',
  },
  {
    id: 'retro-tenkeyless',
    title: 'Preset · retro',
    params: { caseABS: '#9e8766', keycapPBT: '#f1e4c5', accentPBT: '#c66b3c', legendInk: '#514536' },
    caption: 'retro preset · cream PBT keycaps and warm ABS shell',
  },
  {
    id: 'white-compact',
    title: 'Layout · compact | preset · white',
    params: { layout: 'compact', caseABS: '#bfc5c7', keycapPBT: '#eff1ef', accentPBT: '#6d94bf', legendInk: '#535e67' },
    caption: 'compact layout · white preset · the navigation block is removed',
  },
  {
    id: 'full-gamer',
    title: 'Layout · full | preset · gamer',
    params: { layout: 'full', caseABS: '#141416', keycapPBT: '#26272b', accentPBT: '#38e07b', legendInk: '#b7ffc9' },
    caption: 'full layout · gamer preset · navigation block and number pad are visible',
  },
] as const;

await mkdir(outputDir, { recursive: true });
await initOcct();

const results = [];
for (const variant of variants) {
  const code = variantSource(source, variant.params);
  const exported = await runAndExport({
    code,
    fileName: basename(sourcePath),
    scriptDir: dirname(sourcePath),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 2000 } },
  });
  const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || exported.bytes.byteLength === 0) {
    throw new Error(`${variant.id}: ${errors.map((error) => `${error.code}: ${error.message}`).join('; ') || 'empty GLB'}`);
  }
  const triangles = await glbTriangles(exported.bytes);
  const file = `${variant.id}.png`;
  const png = await renderTrianglesPng(triangles, {
    size: 512,
    label: `Keyboard · ${variant.title} · ${triangles.length} tris`,
  });
  await writeFile(resolve(outputDir, file), png);
  results.push({
    id: variant.id,
    title: variant.title,
    caption: variant.caption,
    params: variant.params,
    triangles: triangles.length,
    render: `renders/${file}`,
    renderSha256: createHash('sha256').update(png).digest('hex'),
  });
  console.log(`${variant.id}: ${triangles.length} triangles`);
}

await writeFile(resolve(bundleDir, 'variants.json'), `${JSON.stringify({
  source: 'catalog/kits/electronics/keyboard.kcad.ts',
  sourceSha256,
  renderer: 'kernelCAD low-poly GLB export + scripts/lib/glbSoftwareRender.ts',
  variants: results,
}, null, 2)}\n`);
