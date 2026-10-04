// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildDemo } from './build-demo';
import { LANDING_HERO } from '../../scripts/lib/landingHero';

const REPO_ROOT = path.resolve(__dirname, '../..');

describe('buildDemo (landing hero)', () => {
  let tmp: string | undefined;
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  it('publishes the pinned SO-100 packet, not the current release demo', () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'build-demo-'));
    const publicDir = path.join(tmp, 'public');
    const meta = buildDemo({ repoRoot: REPO_ROOT, publicDir, now: new Date('2026-09-29T00:00:00Z') });

    const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
    expect(meta).toEqual({
      version: `v${pkg.version}`,
      demoIteration: LANDING_HERO.demoIteration,
      task: 'so100',
      heroArtifact: 'so100',
      source: 'docs/demos/landing-hero/so100/demo.mp4',
      poster: 'demo-poster.png',
      captured_at: '2026-09-29T00:00:00.000Z',
    });
    expect(JSON.parse(readFileSync(path.join(publicDir, 'demo.json'), 'utf8'))).toEqual(meta);
    const heroDir = path.join(REPO_ROOT, LANDING_HERO.dir);
    expect(readFileSync(path.join(publicDir, 'demo.mp4'))).toEqual(readFileSync(path.join(heroDir, 'demo.mp4')));
    expect(readFileSync(path.join(publicDir, 'demo-poster.png'))).toEqual(readFileSync(path.join(heroDir, 'hero-frame.png')));
  });

  it('keeps the same hero when a newer release demo packet lands', () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'build-demo-'));
    const repo = path.join(tmp, 'repo');
    cpSync(path.join(REPO_ROOT, LANDING_HERO.dir), path.join(repo, LANDING_HERO.dir), { recursive: true });
    writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ version: '9.9.0' }));
    const release = path.join(repo, 'docs/demos/v9.9/new-hero');
    mkdirSync(release, { recursive: true });
    writeFileSync(path.join(release, 'demo.mp4'), 'release demo');
    writeFileSync(path.join(release, 'meta.json'), JSON.stringify({ heroArtifact: 'new-hero', overrideApprovedBy: 'x' }));

    const meta = buildDemo({ repoRoot: repo, publicDir: path.join(tmp, 'public') });
    expect(meta.version).toBe('v9.9.0');
    expect(meta.heroArtifact).toBe('so100');
    expect(meta.source).toBe(`${LANDING_HERO.dir}/demo.mp4`);
  });

  it('fails the build when the pinned packet is incomplete', () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'build-demo-'));
    const repo = path.join(tmp, 'repo');
    cpSync(path.join(REPO_ROOT, LANDING_HERO.dir), path.join(repo, LANDING_HERO.dir), { recursive: true });
    writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ version: '0.17.0' }));
    rmSync(path.join(repo, LANDING_HERO.dir, 'demo.mp4'));

    expect(() => buildDemo({ repoRoot: repo, publicDir: path.join(tmp, 'public') })).toThrow(/missing demo\.mp4/);
  });

  it('ships a real 16:9 video and poster', () => {
    const heroDir = path.join(REPO_ROOT, LANDING_HERO.dir);
    expect(statSync(path.join(heroDir, 'demo.mp4')).size).toBeGreaterThan(100_000);
    const png = readFileSync(path.join(heroDir, 'hero-frame.png'));
    // PNG IHDR: width at byte 16, height at byte 20 (big-endian).
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1920, 1080]);
  });
});
