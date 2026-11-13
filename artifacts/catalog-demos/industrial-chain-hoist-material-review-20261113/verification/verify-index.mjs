import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const bundle = 'artifacts/catalog-demos/industrial-chain-hoist-material-review-20261113';
const baselineCommit = 'd9123c515437719f6c192ff727d1896f38083637';
const current = JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8'));
const previousText = execFileSync('git', ['show', `${baselineCommit}:catalog/index.json`], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
const previous = JSON.parse(previousText);
const previousRows = new Map(previous.assets.map((row) => [row.id, JSON.stringify(row)]));
const changedRows = current.assets
  .filter((row) => previousRows.get(row.id) !== JSON.stringify(row))
  .map((row) => row.id);
const sourceShaMismatches = [];
const missingPreviewFiles = [];

for (const row of current.assets) {
  const digest = createHash('sha256').update(readFileSync(join(repoRoot, row.source))).digest('hex');
  if (digest !== row.sourceSha256) sourceShaMismatches.push(row.id);
  const preview = join(repoRoot, 'catalog', 'kits', row.kit, 'previews', `${row.id}.png`);
  if (!existsSync(preview)) missingPreviewFiles.push(row.id);
}

const result = {
  assets: current.assets.length,
  kits: current.kits.length,
  changedRows,
  sourceShaMismatches,
  missingPreviewFiles,
};
writeFileSync(join(repoRoot, bundle, 'verification/index-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

if (current.assets.length !== 2402 || current.kits.length !== 50
    || changedRows.join() !== 'electric-chain-hoist'
    || sourceShaMismatches.length !== 0 || missingPreviewFiles.length !== 0) {
  process.exit(1);
}
