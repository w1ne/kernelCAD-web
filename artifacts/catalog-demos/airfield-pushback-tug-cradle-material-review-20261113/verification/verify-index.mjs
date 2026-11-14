import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const bundle = 'artifacts/catalog-demos/airfield-pushback-tug-cradle-material-review-20261113';
const before = JSON.parse(execFileSync('git', ['show', 'HEAD:catalog/index.json'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
}));
const after = JSON.parse(readFileSync(resolve(root, 'catalog/index.json'), 'utf8'));
const rows = (index) => new Map(index.assets.map((asset) => [asset.id, asset]));
const previous = rows(before);
const current = rows(after);
const changedIds = [...current.keys()].filter((id) =>
  JSON.stringify(previous.get(id)) !== JSON.stringify(current.get(id)),
);
const asset = current.get('pushback-tug');
const sourcePath = resolve(root, asset.source);
const previewPath = resolve(root, 'catalog/kits/airfield/previews/pushback-tug.png');
const sourceSha256 = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
const report = {
  assetCount: after.assets.length,
  changedIds,
  sourceSha256Matches: sourceSha256 === asset.sourceSha256,
  previewPathExists: existsSync(previewPath),
  indexedPreview: asset.preview,
  triangles: asset.stats.triangles,
  sizeM: asset.stats.sizeM,
};
if (report.assetCount !== 2402 || changedIds.length !== 1 || changedIds[0] !== 'pushback-tug'
  || !report.sourceSha256Matches || !report.previewPathExists) {
  throw new Error(`Catalog index audit failed: ${JSON.stringify(report)}`);
}
writeFileSync(resolve(root, bundle, 'verification/index-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
