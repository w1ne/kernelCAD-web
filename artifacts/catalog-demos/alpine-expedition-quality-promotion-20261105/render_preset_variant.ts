// Render the indexed highVisibility palette of the promoted Alpine dry bag.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, variantSource } from '../../../src/agent/catalog/catalogStore';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const bundle = dirname(fileURLToPath(import.meta.url));
const root = resolve(bundle, '../../..');
const outputDir = join(bundle, 'high-visibility');
const id = 'alpine-dry-bag';
const presetName = 'highVisibility';
const index = JSON.parse(readFileSync(join(root, 'catalog/index.json'), 'utf8')) as {
  assets: Array<{ id: string; kit: string; source: string; title: string; presets?: Record<string, Record<string, string | number | boolean>> }>;
};

await initOcct();
mkdirSync(outputDir, { recursive: true });
const asset = index.assets.find((row) => row.kit === 'alpine-expedition' && row.id === id);
if (asset === undefined) throw new Error('missing indexed asset alpine-expedition/' + id);
const preset = asset.presets?.[presetName];
if (preset === undefined) throw new Error('missing indexed ' + presetName + ' preset');
const source = readFileSync(join(root, asset.source), 'utf8');
const glb = await exportLowPolyAsset(variantSource(source, preset), basename(asset.source));
const png = await renderTrianglesPng(await glbTriangles(glb), {
  size: 720,
  label: asset.title + ' · ' + presetName,
});
writeFileSync(join(outputDir, id + '.' + presetName + '.png'), png);
console.log('rendered alpine-expedition/' + id + ' from indexed ' + presetName + ' preset (' + Object.keys(preset).length + ' material overrides)');
