#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductionSiteChecks } from './lib/productionSiteProbe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    throw new Error('package.json version is missing');
  }
  return `v${pkg.version}`;
}

function argValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const baseUrl = argValue('--url') ?? 'https://kernelcad.com';
  const expectedVersion = argValue('--expected-version') ?? readPackageVersion();
  const expectedDemoIteration = argValue('--expected-demo-iteration');
  const mode = argValue('--mode') === 'app' || new URL(baseUrl).hostname === 'app.kernelcad.com'
    ? 'app'
    : 'marketing';
  const checks = buildProductionSiteChecks({
    baseUrl,
    expectedVersion,
    expectedDemoIteration,
    mode,
    allGalleryAssets: hasFlag('--all-gallery-assets'),
    fetch,
  });

  let failed = false;
  for (const check of checks) {
    const res = await check.run();
    const mark = res.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${res.name}: ${res.detail}`);
    failed ||= !res.ok;
  }

  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
