#!/usr/bin/env node
// Picks the hero demo for the current package.json release, copies its mp4
// into site/public/demo.mp4, and writes site/public/demo.json.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectHeroDemo } from '../../scripts/lib/selectHeroDemo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DEMOS_ROOT = path.join(REPO_ROOT, 'docs/demos');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

function demoKeyToPackageVersion(key: string): string | null {
  const match = /^v(\d+)\.(\d+)(?:\.(\d+))?$/.exec(key);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3] ?? '0'}`;
}

function availableDemoVersions(): string[] {
  if (!existsSync(DEMOS_ROOT)) return [];
  return readdirSync(DEMOS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => demoKeyToPackageVersion(entry.name))
    .filter((version): version is string => version !== null)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

function selectSiteHeroDemo(packageVersion: string) {
  try {
    return selectHeroDemo({ packageVersion, demosRoot: DEMOS_ROOT });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/no demo dir/.test(message)) throw err;
  }

  const fallbacks = availableDemoVersions();
  for (const fallbackVersion of fallbacks) {
    try {
      const result = selectHeroDemo({ packageVersion: fallbackVersion, demosRoot: DEMOS_ROOT });
      console.warn(
        `build-demo: no demo directory for package ${packageVersion}; using latest available ${result.iterationKey}/${result.task}`,
      );
      return result;
    } catch {
      // Keep scanning: older demo dirs may be incomplete or pre-policy.
    }
  }
  throw new Error(`build-demo: no usable demo under ${DEMOS_ROOT}`);
}

function main() {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const result = selectSiteHeroDemo(pkg.version);

  mkdirSync(PUBLIC_DIR, { recursive: true });
  copyFileSync(result.mp4Path, path.join(PUBLIC_DIR, 'demo.mp4'));
  const posterPath = path.join(path.dirname(result.mp4Path), 'hero-frame.png');
  const publicPosterPath = path.join(PUBLIC_DIR, 'demo-poster.png');
  if (existsSync(posterPath)) {
    copyFileSync(posterPath, publicPosterPath);
  }

  const meta = {
    version: `v${pkg.version}`,
    demoIteration: result.iterationKey,
    task: result.task,
    heroArtifact: result.heroArtifact,
    source: path.relative(REPO_ROOT, result.mp4Path),
    poster: existsSync(publicPosterPath) ? 'demo-poster.png' : null,
    captured_at: new Date().toISOString(),
  };
  writeFileSync(path.join(PUBLIC_DIR, 'demo.json'), JSON.stringify(meta, null, 2));

  console.log(
    `✓ ${result.iterationKey}/${result.task}: copied demo.mp4 → site/public/demo.mp4`,
  );
}

main();
