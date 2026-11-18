#!/usr/bin/env node
// Inspect the built npm file list without running lifecycle scripts or writing a tarball.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const bundle = dirname(fileURLToPath(import.meta.url));
const root = resolve(bundle, '../../..');
const pack = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
  cwd: root,
  encoding: 'utf8',
}))[0];
const files = pack.files.map((file) => file.path);
const postalSources = files.filter((path) => /^catalog\/kits\/postal-logistics\/[^/]+\.kcad\.ts$/.test(path));
const postalPreviews = files.filter((path) => /^catalog\/kits\/postal-logistics\/previews\/[^/]+\.png$/.test(path));
const productLikePaths = files.filter((path) => /(^|\/)(billing|checkout|entitlements|supplier|quote-routing|commission|commercial-orchestration)(\/|\.|$)/i.test(path));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const result = {
  command: 'npm pack --dry-run --ignore-scripts --json',
  package: pack.name,
  version: pack.version,
  postalSources: postalSources.length,
  postalPreviews: postalPreviews.length,
  catalogTotal: JSON.parse(readFileSync(join(root, 'catalog/index.json'), 'utf8')).assets.length,
  indexIncluded: files.includes('catalog/index.json'),
  builtDistFiles: files.filter((path) => path.startsWith('dist/')).length,
  packageExports: packageJson.exports,
  productLikePaths,
  lifecycleScriptsRun: false,
  tarballWritten: false,
};
if (
  postalSources.length !== 52
  || postalPreviews.length !== 52
  || result.catalogTotal !== 1743
  || !result.indexIncluded
  || result.builtDistFiles === 0
  || JSON.stringify(result.packageExports) !== JSON.stringify({ './package.json': './package.json' })
  || productLikePaths.length > 0
) {
  throw new Error(`npm pack boundary audit failed: ${JSON.stringify(result)}`);
}
writeFileSync(join(bundle, 'npm-pack-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
