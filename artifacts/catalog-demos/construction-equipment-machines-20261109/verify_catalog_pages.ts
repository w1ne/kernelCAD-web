// SPDX-License-Identifier: MIT
// Check generated catalog metadata and the page renderer in memory for the
// four existing assets. No deployment is performed by this verification.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderAssetPage } from '../../../scripts/buildCatalogPages';

type Param = { name: string; type: string; default: string | number | boolean; label?: string; choices?: string[] };
type Asset = {
  id: string; kit: string; title: string; description: string; category: string; tags: string[];
  compat: string[]; license: string; triangleBudget: number; params: Param[];
  presets: Record<string, Record<string, unknown>>; stats: { triangles: number; sizeM: number[] };
  source: string; sourceSha256: string; preview?: string;
};
type Kit = { id: string; title: string; description: string; assets: string[] };

const root = resolve(import.meta.dirname, '../../..');
const out = import.meta.dirname;
const index = JSON.parse(readFileSync(join(root, 'catalog/index.json'), 'utf8')) as { kits: Kit[]; assets: Asset[] };
const expected: Record<string, { choices: string[]; presets: string[] }> = {
  'walk-behind-power-trowel': { choices: ['compact', 'standard', 'wide'], presets: ['weathered', 'highVisibility'] },
  'vibrating-concrete-screed': { choices: ['short', 'standard', 'wide', 'working', 'folded'], presets: ['weathered', 'highVisibility'] },
  'rebar-bending-machine': { choices: ['compact', 'extended', 'hook', 'stirrup'], presets: ['highVisibility', 'siteBlue'] },
  'portable-material-hoist': { choices: ['short', 'standard', 'open', 'guarded'], presets: ['weathered', 'highVisibility'] },
};
const reports = [];
for (const [id, needs] of Object.entries(expected)) {
  const asset = index.assets.find((row) => row.kit === 'construction-equipment' && row.id === id);
  if (asset === undefined) throw new Error(`${id} is absent from catalog/index.json`);
  const source = readFileSync(join(root, asset.source));
  const actualHash = createHash('sha256').update(source).digest('hex');
  const sourceHashMatches = actualHash === asset.sourceSha256;
  const previewPath = join(root, 'catalog/kits/construction-equipment/previews', `${id}.png`);
  const previewIndexed = asset.preview === `/assets/construction-equipment-${id}.png`;
  const colorKnobs = asset.params.filter((param) => param.type === 'color');
  const choiceValues = asset.params.flatMap((param) => param.choices ?? []);
  const choicesPresent = needs.choices.every((value) => choiceValues.includes(value));
  const presetNames = Object.keys(asset.presets);
  const presetsPresent = needs.presets.every((name) => presetNames.includes(name));
  const kit = index.kits.find((row) => row.id === asset.kit);
  const siblings = index.assets.filter((row) => row.kit === asset.kit);
  const html = renderAssetPage(asset, kit, siblings);
  const checks = {
    sourceShaMatches: sourceHashMatches,
    renderedPreviewExists: existsSync(previewPath),
    previewPathIndexed: previewIndexed,
    exactlyFourMaterialColorKnobs: colorKnobs.length === 4,
    selectableShapeChoicesPresent: choicesPresent,
    namedPresetsPresent: presetsPresent,
    pageTitle: html.includes(`<h1>${asset.title}</h1>`),
    previewImage: html.includes('<img src="preview.png"'),
    studioLink: html.includes('Open in Studio'),
    pageControls: asset.params.every((param) => html.includes(param.label ?? param.name)),
    pageChoices: needs.choices.every((value) => html.includes(`<code>${value}</code>`)),
    pagePresets: needs.presets.every((name) => html.includes(`<strong>${name}</strong>`)),
    triangleBudgetFact: html.includes(`${asset.stats.triangles.toLocaleString('en-US')} (budget ${asset.triangleBudget.toLocaleString('en-US')})`),
  };
  reports.push({ id, triangleCount: asset.stats.triangles, triangleBudget: asset.triangleBudget, colorKnobs: colorKnobs.map((param) => param.name), choices: choiceValues, presets: presetNames, checks });
  if (!Object.values(checks).every(Boolean)) throw new Error(`${id} failed local catalog page checks: ${JSON.stringify(checks)}`);
}
const report = { renderer: 'scripts/buildCatalogPages.ts renderAssetPage (in-memory)', assets: reports, allPassed: true, deploymentVerified: false };
writeFileSync(join(out, 'catalog-page-check.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
