// Audit current indexed sources, material controls, presets, and preview paths.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Row = {
  id: string;
  kit: string;
  source: string;
  sourceSha256: string;
  triangleBudget: number;
  stats: { triangles: number };
  params: Array<{ name: string; type: string }>;
  presets?: Record<string, unknown>;
  preview?: string;
};

const bundle = resolve(fileURLToPath(new URL('.', import.meta.url)));
const root = resolve(bundle, '../../..');
const verificationPath = join(bundle, 'verification-status.json');
const verification = existsSync(verificationPath)
  ? JSON.parse(readFileSync(verificationPath, 'utf8')) as Record<string, string>
  : {};
const index = JSON.parse(readFileSync(join(root, 'catalog/index.json'), 'utf8')) as { assets: Row[] };
const allHashes = index.assets.filter((row) => createHash('sha256').update(readFileSync(join(root, row.source))).digest('hex') === row.sourceSha256);
const allPreviews = index.assets.filter((row) => row.preview !== undefined && existsSync(join(root, 'catalog/kits', row.kit, 'previews', `${row.id}.png`)));
const kitRows = index.assets.filter((row) => row.kit === 'hydroponics');
const hashes = kitRows.filter((row) => createHash('sha256').update(readFileSync(join(root, row.source))).digest('hex') === row.sourceSha256);
const previews = kitRows.filter((row) => row.preview !== undefined && existsSync(join(root, 'catalog/kits', row.kit, 'previews', `${row.id}.png`)));
const materialControls = kitRows.reduce((sum, row) => sum + row.params.filter((param) => param.type === 'color').length, 0);
const presetEntries = kitRows.reduce((sum, row) => sum + Object.keys(row.presets ?? {}).length, 0);
const budgetViolations = kitRows.filter((row) => row.stats.triangles > row.triangleBudget);
const fail = [
  allHashes.length === index.assets.length ? undefined : `${index.assets.length - allHashes.length} catalog source hashes mismatch`,
  allPreviews.length === index.assets.length ? undefined : `${index.assets.length - allPreviews.length} catalog preview paths missing`,
  kitRows.length === 52 ? undefined : `expected 52 existing kit rows, found ${kitRows.length}`,
  hashes.length === kitRows.length ? undefined : `${kitRows.length - hashes.length} source hashes mismatch`,
  previews.length === kitRows.length ? undefined : `${kitRows.length - previews.length} preview paths missing`,
  kitRows.every((row) => row.params.filter((param) => param.type === 'color').length >= 2 && Object.keys(row.presets ?? {}).length >= 1)
    ? undefined : 'one or more assets are missing material controls or presets',
  budgetViolations.length === 0 ? undefined : `${budgetViolations.length} indexed assets exceed their triangle budgets`,
].filter((message): message is string => message !== undefined);

const localChecksPass = verification.eslint === 'PASS'
  && verification.catalogIntegration === 'PASS'
  && verification.kitQuality === '52/52 PASS'
  && verification.overallQuality === '2402/2402 PASS'
  && verification.catalogPages === 'PASS';
const audit = {
  passed: fail.length === 0 && localChecksPass,
  totalCatalogAssets: index.assets.length,
  totalSourceHashesMatching: allHashes.length,
  totalRowsWithPreview: allPreviews.length,
  kitAssets: kitRows.length,
  assetsRefined: 2,
  sourceHashesMatching: hashes.length,
  indexedRowsWithPreview: previews.length,
  materialControls,
  presetEntries,
  triangleBudgetViolations: budgetViolations.map(({ id, stats, triangleBudget }) => ({ id, triangles: stats.triangles, budget: triangleBudget })),
  triangleBudgets: kitRows.map(({ id, stats, triangleBudget }) => ({ id, triangles: stats.triangles, budget: triangleBudget })),
  eslint: verification.eslint ?? 'pending',
  catalogIntegration: verification.catalogIntegration ?? 'pending',
  catalogIntegrationTestCount: verification.catalogIntegrationTestCount ?? 'pending',
  catalogPages: verification.catalogPages ?? 'pending',
  kitQuality: verification.kitQuality ?? 'pending',
  overallQuality: verification.overallQuality ?? 'pending',
  failures: fail,
};
writeFileSync(join(bundle, 'promotion-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));
if (fail.length > 0) process.exit(1);
