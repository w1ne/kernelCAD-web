// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The kernelcad.com landing hero is a pinned, explicit choice — not "the demo
// of the current release". A release that ships a new docs/demos/v0.X packet
// does not change the landing hero; only an edit to LANDING_HERO does.
// site/scripts/build-demo.ts publishes this packet as /demo.mp4,
// /demo-poster.png and /demo.json; the production probe expects its
// demoIteration.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const LANDING_HERO = {
  /** Packet dir, relative to the repo root. */
  dir: 'docs/demos/landing-hero/so100',
  /** demo.json `demoIteration` for the pinned packet. */
  demoIteration: 'landing-hero',
} as const;

export interface LandingHeroDemo {
  demoIteration: string;
  task: string;
  heroArtifact: string;
  mp4Path: string;
  posterPath: string;
}

/** Resolve the pinned hero packet. Throws when a file is missing, so a broken
 *  pin fails the site build instead of shipping a hero without video. */
export function resolveLandingHero(repoRoot: string, hero: { dir: string; demoIteration: string } = LANDING_HERO): LandingHeroDemo {
  const dir = path.join(repoRoot, hero.dir);
  const mp4Path = path.join(dir, 'demo.mp4');
  const posterPath = path.join(dir, 'hero-frame.png');
  const metaPath = path.join(dir, 'meta.json');
  for (const p of [mp4Path, posterPath, metaPath]) {
    if (!existsSync(p)) throw new Error(`landing hero ${hero.dir}: missing ${path.basename(p)}`);
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { taskId?: unknown; heroArtifact?: unknown };
  if (typeof meta.heroArtifact !== 'string' || meta.heroArtifact.length === 0) {
    throw new Error(`landing hero ${hero.dir}: meta.json has no heroArtifact`);
  }
  const task = typeof meta.taskId === 'string' && meta.taskId.length > 0 ? meta.taskId : path.basename(dir);
  return { demoIteration: hero.demoIteration, task, heroArtifact: meta.heroArtifact, mp4Path, posterPath };
}
