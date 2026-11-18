#!/usr/bin/env node
// Inspect the publishable file list without running lifecycle scripts or writing a tarball.
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
const apiarySources = files.filter((path) => /^catalog\/kits\/apiary\/[^/]+\.kcad\.ts$/.test(path));
const apiaryPreviews = files.filter((path) => /^catalog\/kits\/apiary\/previews\/[^/]+\.png$/.test(path));
const productLikePaths = files.filter((path) => /(^|\/)(billing|checkout|entitlements|supplier|quote-routing|commission|commercial-orchestration)(\/|\.|$)/i.test(path));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const result = {
  package: pack.name,
  version: pack.version,
  apiarySources: apiarySources.length,
  apiaryPreviews: apiaryPreviews.length,
  indexIncluded: files.includes('catalog/index.json'),
  packageExports: packageJson.exports,
  productLikePaths,
  lifecycleScriptsRun: false,
  tarballWritten: false,
};
if (apiarySources.length !== 50 || apiaryPreviews.length !== 50 || !result.indexIncluded || productLikePaths.length > 0) {
  throw new Error(`npm pack boundary audit failed: ${JSON.stringify(result)}`);
}
writeFileSync(join(bundle, 'npm-pack-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
