// SPDX-License-Identifier: MIT
// Replay source-declared retail-store palettes through the local catalog renderer.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const targets = ['checkout-counter', 'shopping-cart', 'upright-drink-cooler'] as const;
const results: Array<{ asset: string; preset: string; triangles: number; colors: Record<string, string> }> = [];

function readPresets(source: string): Array<[string, Record<string, string>]> {
  const block = source.match(/presets\(\{\s*([\s\S]*?)\n\}\);/);
  if (!block) throw new Error('source has no presets block');
  return [...block[1].matchAll(/^[ \t]*([A-Za-z]\w*):[ \t]*\{([^}]+)\},?$/gm)].map((match) => {
    const colors = Object.fromEntries(
      [...match[2].matchAll(/([A-Za-z]\w*):\s*'([^']+)'/g)].map((item) => [item[1], item[2]]),
    );
    if (Object.keys(colors).length < 2) throw new Error(`${match[1]} must set at least two materials`);
    return [match[1], colors];
  });
}

function applyPreset(source: string, colors: Record<string, string>): string {
  let updated = source;
  for (const [name, color] of Object.entries(colors)) {
    const pattern = new RegExp(`(param\\('${name}',\\s*)(?:"[^"]+"|'[^']+')`);
    const next = updated.replace(pattern, `$1${JSON.stringify(color)}`);
    if (next === updated) throw new Error(`could not replay ${name}`);
    updated = next;
  }
  return updated;
}

for (const id of targets) {
  const sourceRel = `catalog/kits/retail-store/${id}.kcad.ts`;
  const original = readFileSync(join(root, sourceRel), 'utf8');
  for (const [preset, colors] of readPresets(original)) {
    const replay = applyPreset(original, colors);
    const tempRoot = mkdtempSync(join(tmpdir(), 'kernelcad-retail-preset-'));
    mkdirSync(join(tempRoot, 'catalog/kits/retail-store'), { recursive: true });
    writeFileSync(join(tempRoot, sourceRel), replay);
    try {
      await initOcct();
      const { asset, glb } = await buildCatalogAssetWithGlb(tempRoot, sourceRel);
      const png = await renderTrianglesPng(await glbTriangles(glb), {
        label: `${asset.title} · ${preset}`,
      });
      mkdirSync(join(bundle, 'presets'), { recursive: true });
      writeFileSync(join(bundle, 'presets', `${id}-${preset}.png`), png);
      results.push({ asset: id, preset, triangles: asset.stats.triangles, colors });
      console.log(`${id}/${preset}: ${asset.stats.triangles} tris`);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
      await resetOcct();
    }
  }
}

writeFileSync(join(bundle, 'preset-renders.json'), `${JSON.stringify({ targets, results }, null, 2)}\n`);
