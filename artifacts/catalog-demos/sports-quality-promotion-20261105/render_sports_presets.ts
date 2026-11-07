// SPDX-License-Identifier: MIT
// Replay source-declared default and clubColors variants through the local catalog renderer.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const targets = ['basketball', 'soccer-ball', 'tennis-racket'] as const;
const results: Array<{ asset: string; variant: string; triangles: number; colors: Record<string, string> }> = [];

function readClubColors(source: string): Record<string, string> {
  const block = source.match(/presets\(\{\s*clubColors:\s*\{([^}]*)\}\s*\}\s*\);/);
  if (!block) throw new Error('source has no clubColors preset');
  return Object.fromEntries([...block[1].matchAll(/([A-Za-z]\w*):\s*'([^']+)'/g)].map((match) => [match[1], match[2]]));
}

function applyColors(source: string, colors: Record<string, string>): string {
  let updated = source;
  for (const [name, value] of Object.entries(colors)) {
    const pattern = new RegExp(`(param\\('${name}',\\s*)(?:"[^"]+"|'[^']+')`);
    if (!pattern.test(updated)) throw new Error(`could not replay ${name}`);
    updated = updated.replace(pattern, `$1${JSON.stringify(value)}`);
  }
  return updated;
}

for (const id of targets) {
  const sourceRel = `catalog/kits/sports/${id}.kcad.ts`;
  const source = readFileSync(join(root, sourceRel), 'utf8');
  const variants = [
    { name: 'default', source, colors: {} },
    { name: 'clubColors', source: applyColors(source, readClubColors(source)), colors: readClubColors(source) },
  ];
  for (const variant of variants) {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kernelcad-sports-preset-'));
    mkdirSync(join(tempRoot, 'catalog/kits/sports'), { recursive: true });
    writeFileSync(join(tempRoot, sourceRel), variant.source);
    try {
      await initOcct();
      const { asset, glb } = await buildCatalogAssetWithGlb(tempRoot, sourceRel);
      const png = await renderTrianglesPng(await glbTriangles(glb), { label: `${asset.title} · ${variant.name}` });
      mkdirSync(join(bundle, 'presets'), { recursive: true });
      writeFileSync(join(bundle, 'presets', `${id}-${variant.name}.png`), png);
      results.push({ asset: id, variant: variant.name, triangles: asset.stats.triangles, colors: variant.colors });
      console.log(`${id}/${variant.name}: ${asset.stats.triangles} tris`);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
      await resetOcct();
    }
  }
}

writeFileSync(join(bundle, 'preset-renders.json'), `${JSON.stringify({ targets, results }, null, 2)}\n`);
