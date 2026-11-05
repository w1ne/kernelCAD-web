// Render one real indexed highVisibility preset from its promoted source.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, variantSource } from '../../../src/agent/catalog/catalogStore';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const bundle = dirname(fileURLToPath(import.meta.url));
const root = resolve(bundle, '../../..');
const variantDir = join(bundle, 'high-visibility-variants');
const id = 'continuous-miner';
const index = JSON.parse(readFileSync(join(root, 'catalog/index.json'), 'utf8')) as {
  assets: Array<{ id: string; kit: string; source: string; title: string; presets?: Record<string, Record<string, string | number | boolean>> }>;
};

await initOcct();
mkdirSync(variantDir, { recursive: true });
const asset = index.assets.find((row) => row.kit === 'mining' && row.id === id);
if (asset === undefined) throw new Error(`missing indexed asset mining/${id}`);
const preset = asset.presets?.highVisibility;
if (preset === undefined) throw new Error(`mining/${id} has no indexed highVisibility preset`);
const source = readFileSync(join(root, asset.source), 'utf8');
const variant = variantSource(source, preset);
const glb = await exportLowPolyAsset(variant, basename(asset.source));
const png = await renderTrianglesPng(await glbTriangles(glb), {
  size: 720,
  label: `${asset.title} · highVisibility`,
});
writeFileSync(join(variantDir, `${id}.highVisibility.png`), png);
console.log(`rendered mining/${id} from indexed highVisibility preset (${Object.keys(preset).length} material controls)`);
