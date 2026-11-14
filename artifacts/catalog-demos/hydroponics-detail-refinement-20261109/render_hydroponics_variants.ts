// Render alternate looks from the presets and choices stored in catalog/index.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, variantSource } from '../../../src/agent/catalog/catalogStore';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Preset = Record<string, string | number | boolean>;
type Row = {
  id: string;
  kit: string;
  source: string;
  title: string;
  presets?: Record<string, Preset>;
};

const bundle = dirname(fileURLToPath(import.meta.url));
const root = resolve(bundle, '../../..');
const outputDir = join(bundle, 'variants');
const index = JSON.parse(readFileSync(join(root, 'catalog/index.json'), 'utf8')) as { assets: Row[] };
const targets = [
  { id: 'greenhouse-tunnel-bay', preset: 'highVisibility', choices: { sideCurtains: 'closed' } },
  { id: 'wall-mounted-co2-sensor', preset: 'weathered', choices: { display: 'blind' } },
];
const renderedSettings: Array<{ id: string; preset: string; choices: Preset; values: Preset }> = [];

await initOcct();
mkdirSync(outputDir, { recursive: true });
for (const target of targets) {
  const row = index.assets.find((asset) => asset.kit === 'hydroponics' && asset.id === target.id);
  if (row === undefined) throw new Error(`missing indexed hydroponics asset '${target.id}'`);
  const preset = row.presets?.[target.preset];
  if (preset === undefined) throw new Error(`hydroponics/${target.id} has no indexed ${target.preset} preset`);
  const values = { ...preset, ...target.choices };
  const source = readFileSync(join(root, row.source), 'utf8');
  const glb = await exportLowPolyAsset(variantSource(source, values), basename(row.source));
  const png = await renderTrianglesPng(await glbTriangles(glb), {
    size: 720,
    label: `${row.title} · ${target.preset}`,
  });
  writeFileSync(join(outputDir, `${target.id}.${target.preset}-${Object.keys(target.choices)[0]}.png`), png);
  renderedSettings.push({ id: target.id, preset: target.preset, choices: target.choices, values });
  console.log(`rendered hydroponics/${target.id} from indexed ${target.preset} preset + ${JSON.stringify(target.choices)}`);
}
writeFileSync(join(bundle, 'variant-settings.json'), `${JSON.stringify(renderedSettings, null, 2)}\n`);
