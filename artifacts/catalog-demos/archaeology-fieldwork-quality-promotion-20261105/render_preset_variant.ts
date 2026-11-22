// Render a real indexed weathered palette from the promoted total-station source.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, variantSource } from '../../../src/agent/catalog/catalogStore';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const bundle = dirname(fileURLToPath(import.meta.url));
const root = resolve(bundle, '../../..');
const variantDir = join(bundle, 'weathered-variants');
const id = 'total-station';
const presetName = 'weathered';
const index = JSON.parse(readFileSync(join(root, 'catalog/index.json'), 'utf8')) as {
  assets: Array<{ id: string; kit: string; source: string; title: string; presets?: Record<string, Record<string, string | number | boolean>> }>;
};

await initOcct();
mkdirSync(variantDir, { recursive: true });
const asset = index.assets.find((row) => row.kit === 'archaeology-fieldwork' && row.id === id);
if (asset === undefined) throw new Error('missing indexed asset archaeology-fieldwork/' + id);
const preset = asset.presets?.[presetName];
if (preset === undefined) throw new Error('archaeology-fieldwork/' + id + ' has no indexed ' + presetName + ' preset');
const source = readFileSync(join(root, asset.source), 'utf8');
const variant = variantSource(source, preset);
const glb = await exportLowPolyAsset(variant, basename(asset.source));
const png = await renderTrianglesPng(await glbTriangles(glb), {
  size: 720,
  label: asset.title + ' · ' + presetName,
});
writeFileSync(join(variantDir, id + '.' + presetName + '.png'), png);
console.log('rendered archaeology-fieldwork/' + id + ' from indexed ' + presetName + ' preset (' + Object.keys(preset).length + ' material controls)');
