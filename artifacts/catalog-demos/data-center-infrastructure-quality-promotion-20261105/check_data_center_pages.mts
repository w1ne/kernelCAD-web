// Build local catalog pages, then verify every promoted asset's source controls and preview.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const here = import.meta.dirname;
const repoRoot = resolve(here, '../../..');
const outputDir = mkdtempSync(join(tmpdir(), 'kcad-data-center-quality-pages-'));
const index = JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')) as {
  assets: Array<{
    id: string;
    kit: string;
    title: string;
    params: Array<{ name: string }>;
    presets?: Record<string, Record<string, unknown>>;
    stats?: { triangles?: number };
  }>;
};

try {
  execFileSync('npx', ['tsx', 'scripts/buildCatalogPages.ts', outputDir], { cwd: repoRoot, stdio: 'pipe' });
  const pagesRoot = join(outputDir, 'catalog');
  const generatedPages = readdirSync(pagesRoot).filter((kit) => statSync(join(pagesRoot, kit)).isDirectory())
    .flatMap((kit) => readdirSync(join(pagesRoot, kit)).map((id) => join(pagesRoot, kit, id, 'index.html')))
    .filter(existsSync).length;
  if (generatedPages !== index.assets.length) {
    throw new Error(`generated ${generatedPages} asset pages for ${index.assets.length} indexed assets`);
  }

  const rows = index.assets.filter((asset) => asset.kit === 'data-center-infrastructure');
  if (rows.length !== 50) throw new Error(`expected 50 data-center rows, found ${rows.length}`);
  const checked = [];
  for (const asset of rows) {
    const pagePath = join(pagesRoot, asset.kit, asset.id, 'index.html');
    const previewPath = join(pagesRoot, asset.kit, asset.id, 'preview.png');
    const html = readFileSync(pagePath, 'utf8');
    const paramNames = asset.params.map((param) => param.name);
    const materialNames = paramNames.filter((name) => name !== 'scale');
    const presetNames = Object.keys(asset.presets ?? {});
    const checks = {
      title: html.includes(`<h1>${asset.title}</h1>`),
      preview: existsSync(previewPath) && html.includes('src="preview.png"'),
      studioLink: html.includes(`catalog=${asset.kit}/${asset.id}`),
      materialControls: materialNames.length >= 2 && materialNames.length <= 4
        && paramNames.includes('scale') && materialNames.every((name) => html.includes(`<code>${name}</code>`)),
      namedPresets: presetNames.includes('facilityStandard') && presetNames.includes('highVisibility')
        && presetNames.every((name) => html.includes(`<strong>${name}</strong>`)),
      triangleStats: typeof asset.stats?.triangles === 'number'
        && html.includes(`<dt>Triangles</dt><dd>${asset.stats.triangles.toLocaleString('en-US')} `),
    };
    if (Object.values(checks).some((pass) => !pass)) {
      throw new Error(`${asset.id} page check failed: ${JSON.stringify(checks)}`);
    }
    checked.push({ id: asset.id, params: paramNames, presets: presetNames, triangles: asset.stats?.triangles, ...checks });
  }

  const report = {
    checkedAt: new Date().toISOString(),
    method: 'npx tsx artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/check_data_center_pages.mts',
    localOnly: true,
    totalIndexedAssets: index.assets.length,
    generatedAssetPages: generatedPages,
    kitPages: checked.length,
    pageAndPreviewPairs: checked.filter((row) => row.preview).length,
    checkedPages: checked,
    liveDeployment: 'not verified; the feature branch has not been deployed',
  };
  writeFileSync(join(here, 'catalog-pages-check.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`verified ${checked.length} data-center pages among ${generatedPages} generated catalog pages`);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
