// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isCatalogSlug, GRANDFATHERED_VERSIONS } from './memorableBuildsCatalog';

export interface HeroDemoResult {
  iterationKey: string;
  task: string;
  heroArtifact: string | null;
  mp4Path: string;
  iterationDir: string;
}

function readMeta(
  metaPath: string,
): { heroArtifact?: string; overrideApprovedBy?: string | null } | null {
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

function hasTaskSubdirs(dir: string): boolean {
  try {
    return readdirSync(dir, { withFileTypes: true }).some((d) => d.isDirectory());
  } catch {
    return false;
  }
}

export function selectHeroDemo(opts: {
  packageVersion: string;
  demosRoot: string;
}): HeroDemoResult {
  const { packageVersion, demosRoot } = opts;
  const parts = packageVersion.split('.');
  if (parts.length < 2) {
    throw new Error(`invalid package version: ${packageVersion}`);
  }
  const [maj, min, patch] = parts;
  const minorKey = `v${maj}.${min}`;
  const patchKey = patch !== undefined ? `v${maj}.${min}.${patch}` : undefined;

  // Patch dir takes precedence: a v0.4.1 release that ships a refreshed hero
  // distinct from v0.4.0 lands in docs/demos/v0.4.1/ and selectHeroDemo picks
  // it before falling back to v0.4/. If no patch dir exists, behavior is
  // identical to before (minor-key only).
  const candidateDirs: Array<{ key: string; dir: string }> = [];
  if (patchKey !== undefined) {
    const patchDir = path.join(demosRoot, patchKey);
    if (existsSync(patchDir) && hasTaskSubdirs(patchDir)) {
      candidateDirs.push({ key: patchKey, dir: patchDir });
    }
  }
  candidateDirs.push({ key: minorKey, dir: path.join(demosRoot, minorKey) });

  const picked = candidateDirs.find(({ dir }) => existsSync(dir));
  if (!picked) {
    throw new Error(`no demo dir at ${candidateDirs.map(c => c.dir).join(' or ')} for ${minorKey}`);
  }
  const iterationKey = picked.key;
  const iterationDir = picked.dir;

  const tasks = readdirSync(iterationDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (tasks.length === 0) {
    throw new Error(`no task subdirs under ${iterationDir}`);
  }

  const catalogTasks = tasks.filter((t) => {
    const meta = readMeta(path.join(iterationDir, t, 'meta.json'));
    return !!meta?.heroArtifact && isCatalogSlug(meta.heroArtifact, minorKey);
  });
  const overrideTasks = tasks.filter((t) => {
    const meta = readMeta(path.join(iterationDir, t, 'meta.json'));
    return !!meta?.heroArtifact && typeof meta.overrideApprovedBy === 'string' && meta.overrideApprovedBy.length > 0;
  });

  let task: string;
  let heroArtifact: string | null;

  if (catalogTasks.length === 1) {
    task = catalogTasks[0];
    heroArtifact =
      readMeta(path.join(iterationDir, task, 'meta.json'))?.heroArtifact ?? null;
  } else if (catalogTasks.length > 1) {
    throw new Error(
      `ambiguous hero: ${catalogTasks.length} tasks in ${iterationKey} have catalog-conformant heroArtifact (${catalogTasks.join(', ')})`,
    );
  } else if (GRANDFATHERED_VERSIONS.has(minorKey)) {
    const primaryCandidates = tasks.filter((t) => {
      const meta = readMeta(path.join(iterationDir, t, 'meta.json'));
      return !!meta?.heroArtifact && (meta.overrideApprovedBy ?? null) === null;
    });
    if (primaryCandidates.length === 1) {
      task = primaryCandidates[0];
      heroArtifact =
        readMeta(path.join(iterationDir, task, 'meta.json'))?.heroArtifact ?? null;
    } else if (primaryCandidates.length === 0 && tasks.length === 1) {
      task = tasks[0];
      heroArtifact =
        readMeta(path.join(iterationDir, task, 'meta.json'))?.heroArtifact ?? null;
    } else {
      throw new Error(
        `grandfathered ${minorKey} cannot auto-pick hero: ${primaryCandidates.length} primary candidates, ${tasks.length} total tasks`,
      );
    }
  } else if (overrideTasks.length === 1) {
    task = overrideTasks[0];
    heroArtifact =
      readMeta(path.join(iterationDir, task, 'meta.json'))?.heroArtifact ?? null;
  } else if (overrideTasks.length > 1) {
    throw new Error(
      `ambiguous override hero: ${overrideTasks.length} tasks in ${iterationKey} have overrideApprovedBy (${overrideTasks.join(', ')})`,
    );
  } else {
    throw new Error(
      `no task in ${iterationKey} has heroArtifact in catalog or an approved override (and version is not single-task grandfathered)`,
    );
  }

  const mp4Path = path.join(iterationDir, task, 'demo.mp4');
  if (!existsSync(mp4Path)) {
    throw new Error(`hero task ${task} missing demo.mp4 at ${mp4Path}`);
  }

  return { iterationKey, task, heroArtifact, mp4Path, iterationDir };
}
