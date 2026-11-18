import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAssetPage } from '../../../scripts/buildCatalogPages';

const root = resolve(import.meta.dirname, '../../..');
const index = JSON.parse(readFileSync(resolve(root, 'catalog/index.json'), 'utf8')) as {
  kits: { id: string; title: string; description: string; assets: string[] }[];
  assets: {
    id: string; kit: string; title: string; description: string; category: string;
    tags: string[]; compat: string[]; license: string; triangleBudget: number;
    params: { name: string; type: string; default: string | number | boolean; label?: string; choices?: string[] }[];
    presets: Record<string, Record<string, unknown>>;
    stats: { triangles: number; sizeM: number[] };
  }[];
};
const asset = index.assets.find((row) => row.kit === 'garden' && row.id === 'compost-bin');
if (asset === undefined) throw new Error('compost-bin is missing from catalog/index.json');
const kit = index.kits.find((row) => row.id === asset.kit);
const siblings = index.assets.filter((row) => row.kit === asset.kit);
const html = renderAssetPage(asset, kit, siblings);
const checks = {
  title: html.includes('<h1>Slatted compost bin</h1>'),
  preview: html.includes('<img src="preview.png"'),
  studioLink: html.includes('Open in Studio'),
  frontAccessChoices: ['frontAccess', 'open', 'lower-access', 'closed'].every((value) => html.includes(value)),
  materialControls: ['Treated timber', 'Compost'].every((value) => html.includes(value)),
  namedPresets: ['recycled', 'painted', 'mature'].every((value) => html.includes(value)),
  triangleFact: html.includes('296 (budget 420)'),
};
const report = { renderer: 'scripts/buildCatalogPages.ts renderAssetPage (in-memory)', checks, allPassed: Object.values(checks).every(Boolean) };
console.log(JSON.stringify(report, null, 2));
if (!report.allPassed) process.exit(1);
