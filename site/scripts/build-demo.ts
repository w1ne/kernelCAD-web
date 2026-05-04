#!/usr/bin/env node
// Picks the catalog-conformant hero demo for the current package.json.version,
// copies its mp4 into site/public/demo.mp4, and writes site/public/demo.json.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectHeroDemo } from '../../scripts/lib/selectHeroDemo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DEMOS_ROOT = path.join(REPO_ROOT, 'docs/demos');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

function main() {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const result = selectHeroDemo({
    packageVersion: pkg.version,
    demosRoot: DEMOS_ROOT,
  });

  mkdirSync(PUBLIC_DIR, { recursive: true });
  copyFileSync(result.mp4Path, path.join(PUBLIC_DIR, 'demo.mp4'));

  const meta = {
    version: result.iterationKey,
    task: result.task,
    heroArtifact: result.heroArtifact,
    source: path.relative(REPO_ROOT, result.mp4Path),
    captured_at: new Date().toISOString(),
  };
  writeFileSync(path.join(PUBLIC_DIR, 'demo.json'), JSON.stringify(meta, null, 2));

  console.log(
    `✓ ${result.iterationKey}/${result.task}: copied demo.mp4 → site/public/demo.mp4`,
  );
}

main();
