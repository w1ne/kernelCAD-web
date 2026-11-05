// Generate every catalog page locally and audit this kit's parameter/preset rows.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const here = import.meta.dirname;
const repoRoot = resolve(here, '../../..');
const outputDir = mkdtempSync(join(tmpdir(), 'kcad-lab-quality-pages-'));
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

  const rows = index.assets.filter((asset) => asset.kit === 'lab-infrastructure');
  if (rows.length !== 60) throw new Error(`expected 60 lab-infrastructure rows, found ${rows.length}`);
  const checked = [];
  for (const asset of rows) {
    const pagePath = join(pagesRoot, asset.kit, asset.id, 'index.html');
    const previewPath = join(pagesRoot, asset.kit, asset.id, 'preview.png');
    const html = readFileSync(pagePath, 'utf8');
    const paramNames = asset.params.map((param) => param.name);
    const presetNames = Object.keys(asset.presets ?? {});
    const checks = {
      title: html.includes(`<h1>${asset.title}</h1>`),
      preview: existsSync(previewPath) && html.includes('src="preview.png"'),
      studioLink: html.includes(`catalog=${asset.kit}/${asset.id}`),
      materialControls: paramNames.length >= 3 && paramNames.length <= 5 && paramNames.includes('scale') && paramNames.slice(1).every((name) => html.includes(`<code>${name}</code>`)),
      namedPresets: presetNames.length >= 1 && presetNames.every((name) => html.includes(`<strong>${name}</strong>`)),
      triangleStats: typeof asset.stats?.triangles === 'number' && html.includes(`<dt>Triangles</dt><dd>${asset.stats.triangles} `),
    };
    if (Object.values(checks).some((pass) => !pass)) {
      throw new Error(`${asset.id} page check failed: ${JSON.stringify(checks)}`);
    }
    checked.push({ id: asset.id, params: paramNames, presets: presetNames, triangles: asset.stats?.triangles, ...checks });
  }

  const report = {
    checkedAt: new Date().toISOString(),
    method: 'npx tsx artifacts/catalog-demos/lab-infrastructure-quality-promotion-20261105/check_lab_pages.mts',
    localOnly: true,
    totalIndexedAssets: index.assets.length,
    generatedAssetPages: generatedPages,
    kitPages: checked.length,
    pageAndPreviewPairs: checked.filter((row) => row.preview).length,
    checkedPages: checked,
    liveDeployment: 'not verified; the feature branch has not been deployed',
  };
  writeFileSync(join(here, 'catalog-pages-check.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`verified ${checked.length} lab-infrastructure pages among ${generatedPages} generated catalog pages`);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
