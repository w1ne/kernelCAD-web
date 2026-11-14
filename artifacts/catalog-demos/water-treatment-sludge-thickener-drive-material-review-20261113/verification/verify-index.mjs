import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../../../..');
const before = JSON.parse(execFileSync('git', ['show', 'HEAD:catalog/index.json'], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
}));
const after = JSON.parse(readFileSync(resolve(repoRoot, 'catalog/index.json'), 'utf8'));
const key = (row) => `${row.kit}/${row.id}`;
const beforeRows = new Map(before.assets.map((row) => [key(row), JSON.stringify(row)]));
const afterRows = new Map(after.assets.map((row) => [key(row), JSON.stringify(row)]));
const changedRows = [...afterRows]
  .filter(([assetKey, serialized]) => beforeRows.get(assetKey) !== serialized)
  .map(([assetKey]) => assetKey)
  .sort();
const sourceHashMismatches = [];
const missingPreviews = [];

for (const row of after.assets) {
  const sourcePath = resolve(repoRoot, row.source);
  const sourceSha256 = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
  if (sourceSha256 !== row.sourceSha256) sourceHashMismatches.push(key(row));
  const previewPath = resolve(repoRoot, 'catalog', 'kits', row.kit, 'previews', `${row.id}.png`);
  if (!existsSync(previewPath)) missingPreviews.push(key(row));
}

const report = {
  assetCount: after.assets.length,
  kitCount: new Set(after.assets.map((row) => row.kit)).size,
  changedRows,
  sourceHashMismatchCount: sourceHashMismatches.length,
  sourceHashMismatches,
  missingPreviewCount: missingPreviews.length,
  missingPreviews,
  target: after.assets.find((row) => key(row) === 'water-treatment/sludge-thickener-tank'),
};

if (report.assetCount !== before.assets.length) throw new Error('Catalog asset count changed.');
if (JSON.stringify(changedRows) !== JSON.stringify(['water-treatment/sludge-thickener-tank'])) {
  throw new Error(`Unexpected generated index row set: ${changedRows.join(', ')}`);
}
if (sourceHashMismatches.length > 0) throw new Error(`Source hash mismatch: ${sourceHashMismatches.join(', ')}`);
if (missingPreviews.length > 0) throw new Error(`Missing previews: ${missingPreviews.join(', ')}`);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
