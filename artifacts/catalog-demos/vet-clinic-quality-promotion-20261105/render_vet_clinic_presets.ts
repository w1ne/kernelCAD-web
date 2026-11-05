// SPDX-License-Identifier: MIT
// Replay the exact source preset color values through the catalog GLB renderer.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const sourceRel = 'catalog/kits/vet-clinic/anesthesia-machine.kcad.ts';
const original = readFileSync(join(root, sourceRel), 'utf8');
const variants = [
  ['clinicClean', { paintedSteelColor: '#e4ebe7' }],
  ['softTeal', { paintedSteelColor: '#4d858d', glassColor: '#3f7480' }],
] as const;

function overrideDefault(code: string, name: string, color: string): string {
  const pattern = new RegExp(`(param\\('${name}',\\s*')[^']+(')`);
  const updated = code.replace(pattern, `$1${color}$2`);
  if (updated === code) throw new Error(`could not override ${name}`);
  return updated;
}

await initOcct();
const outputDir = join(bundle, 'presets');
mkdirSync(outputDir, { recursive: true });

for (const [preset, overrides] of variants) {
  let code = original;
  for (const [name, color] of Object.entries(overrides)) code = overrideDefault(code, name, color);

  const tempRoot = mkdtempSync(join(tmpdir(), 'kernelcad-vet-clinic-preset-'));
  try {
    const tempSource = join(tempRoot, sourceRel);
    mkdirSync(join(tempRoot, 'catalog/kits/vet-clinic'), { recursive: true });
    writeFileSync(tempSource, code);
    const { asset, glb } = await buildCatalogAssetWithGlb(tempRoot, sourceRel);
    const png = await renderTrianglesPng(await glbTriangles(glb), {
      label: `${asset.title} · ${preset}`,
    });
    writeFileSync(join(outputDir, `anesthesia-machine-${preset}.png`), png);
    console.log(`${preset}: ${asset.stats.triangles} tris`);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
    await resetOcct();
  }
}
