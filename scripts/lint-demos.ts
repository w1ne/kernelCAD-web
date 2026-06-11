#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lint-demos.ts
//
// Validates the docs/demos/ directory contents against H11 ship-gate criteria.
// Fails CI on tag pushes when a v0.X.0 tag exists without a complete demo set.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateDemoMeta } from './lib/demoMetaValidator';

const _dirname = dirname(fileURLToPath(import.meta.url));
const DEMOS_ROOT = resolve(_dirname, '../docs/demos');

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());
}

function ffprobeDuration(mp4Path: string): number {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp4Path}"`,
  ).toString().trim();
  return parseFloat(out);
}

function lintModule(moduleSlug: string): string[] {
  const errors: string[] = [];
  const moduleDir = join(DEMOS_ROOT, moduleSlug);
  if (!existsSync(moduleDir)) {
    return [`${moduleSlug}: directory missing (docs/demos/${moduleSlug}/)`];
  }
  const taskDirs = listSubdirs(moduleDir);
  if (taskDirs.length === 0) {
    return [`${moduleSlug}: contains no task subdirectories`];
  }
  for (const taskName of taskDirs) {
    const taskDir = join(moduleDir, taskName);
    for (const f of ['demo.mp4', 'panel.png', 'whats-new.md', 'meta.json']) {
      if (!existsSync(join(taskDir, f))) errors.push(`${moduleSlug}/${taskName}: missing ${f}`);
    }
    const wnPath = join(taskDir, 'whats-new.md');
    if (existsSync(wnPath) && readFileSync(wnPath, 'utf8').includes('TODO:')) {
      errors.push(`${moduleSlug}/${taskName}: whats-new.md contains 'TODO:' marker (must be filled)`);
    }
    const mp4Path = join(taskDir, 'demo.mp4');
    if (existsSync(mp4Path)) {
      try {
        const duration = ffprobeDuration(mp4Path);
        if (duration < 10 || duration > 30) {
          errors.push(`${moduleSlug}/${taskName}: demo.mp4 duration ${duration.toFixed(1)}s not in [10, 30]`);
        }
      } catch (e) {
        errors.push(`${moduleSlug}/${taskName}: ffprobe failed: ${(e as Error).message}`);
      }
    }
    const metaPath = join(taskDir, 'meta.json');
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
        for (const err of validateDemoMeta(meta, moduleSlug)) {
          errors.push(`${moduleSlug}/${taskName}: ${err}`);
        }
      } catch (e) {
        errors.push(`${moduleSlug}/${taskName}: meta.json parse failed: ${(e as Error).message}`);
      }
    }
  }
  return errors;
}

function findVersionTags(): string[] {
  // Pull all current v*.*.* tags (the gate is "every shipped v0.X.0 has demos").
  return execSync('git tag --list "v*.*.*"').toString().split('\n').filter(Boolean);
}

function moduleSlugFromTag(tag: string): string {
  // v0.2.0 → v0.2, v0.13.0 → v0.13, v0.1.0 → v0.1
  const m = tag.match(/^v(\d+)\.(\d+)\.\d+$/);
  if (!m) return tag;
  return `v${m[1]}.${m[2]}`;
}

function main(): void {
  const tags = findVersionTags();
  const slugsSeen = new Set<string>();
  const errors: string[] = [];
  for (const tag of tags) {
    const slug = moduleSlugFromTag(tag);
    if (slugsSeen.has(slug)) continue;
    slugsSeen.add(slug);
    errors.push(...lintModule(slug));
  }
  if (errors.length > 0) {
    console.error('lint-demos: failed\n');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log(`lint-demos: ok (${slugsSeen.size} module${slugsSeen.size === 1 ? '' : 's'} checked)`);
}

main();
