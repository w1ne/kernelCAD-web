// Build the self-contained CLI archive attached to a GitHub Release.
// Run after `npm run build` and `npm prune --omit=dev`.
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const stageName = `kernelcad-${version}`;
const releaseDir = 'release';
const stage = `${releaseDir}/${stageName}`;

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(`${stage}/bin`, { recursive: true });

for (const path of [
  'dist/cli',
  'dist/headless-player',
  'assets/parts',
  'assets/reference-parts',
  'assets/parts-seed',
  'licenses',
]) {
  if (existsSync(path)) cpSync(path, `${stage}/${path}`, { recursive: true, dereference: true });
}
for (const file of ['package.json', 'package-lock.json', 'README.md', 'LICENSE', 'NOTICE', 'ATTRIBUTION.md']) {
  if (existsSync(file)) cpSync(file, `${stage}/${file}`);
}
cpSync('node_modules', `${stage}/node_modules`, { recursive: true, dereference: true });

writeFileSync(
  `${stage}/bin/kernelcad`,
  '#!/usr/bin/env sh\nDIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)\nexec node "$DIR/dist/cli/index.js" "$@"\n',
);
chmodSync(`${stage}/bin/kernelcad`, 0o755);

const archive = `${releaseDir}/kernelcad-${version}-linux-x86_64.tar.gz`;
execFileSync('tar', ['-czf', archive, '-C', releaseDir, stageName], { stdio: 'inherit' });
console.log(`wrote ${archive}`);
