#!/usr/bin/env node
// Publishes the pinned landing hero (scripts/lib/landingHero.ts): copies its
// mp4 to site/public/demo.mp4, its poster to site/public/demo-poster.png, and
// writes site/public/demo.json. The hero does not follow the package version.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLandingHero } from '../../scripts/lib/landingHero';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

export function buildDemo(opts: { repoRoot: string; publicDir: string; now?: Date }): Record<string, unknown> {
  const pkg = JSON.parse(readFileSync(path.join(opts.repoRoot, 'package.json'), 'utf8'));
  const hero = resolveLandingHero(opts.repoRoot);

  mkdirSync(opts.publicDir, { recursive: true });
  copyFileSync(hero.mp4Path, path.join(opts.publicDir, 'demo.mp4'));
  copyFileSync(hero.posterPath, path.join(opts.publicDir, 'demo-poster.png'));

  const meta = {
    version: `v${pkg.version}`,
    demoIteration: hero.demoIteration,
    task: hero.task,
    heroArtifact: hero.heroArtifact,
    source: path.relative(opts.repoRoot, hero.mp4Path),
    poster: 'demo-poster.png',
    captured_at: (opts.now ?? new Date()).toISOString(),
  };
  writeFileSync(path.join(opts.publicDir, 'demo.json'), JSON.stringify(meta, null, 2));
  return meta;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const meta = buildDemo({ repoRoot: REPO_ROOT, publicDir: PUBLIC_DIR });
  console.log(`✓ ${meta.demoIteration}/${meta.task}: copied demo.mp4 → site/public/demo.mp4`);
}
