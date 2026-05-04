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

export function selectHeroDemo(opts: {
  packageVersion: string;
  demosRoot: string;
}): HeroDemoResult {
  const { packageVersion, demosRoot } = opts;
  const parts = packageVersion.split('.');
  if (parts.length < 2) {
    throw new Error(`invalid package version: ${packageVersion}`);
  }
  const [maj, min] = parts;
  const iterationKey = `v${maj}.${min}`;
  const iterationDir = path.join(demosRoot, iterationKey);

  if (!existsSync(iterationDir)) {
    throw new Error(`no demo dir at ${iterationDir} for ${iterationKey}`);
  }

  const tasks = readdirSync(iterationDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (tasks.length === 0) {
    throw new Error(`no task subdirs under ${iterationDir}`);
  }

  const catalogTasks = tasks.filter((t) => {
    const meta = readMeta(path.join(iterationDir, t, 'meta.json'));
    return !!meta?.heroArtifact && isCatalogSlug(meta.heroArtifact, iterationKey);
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
  } else if (GRANDFATHERED_VERSIONS.has(iterationKey)) {
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
        `grandfathered ${iterationKey} cannot auto-pick hero: ${primaryCandidates.length} primary candidates, ${tasks.length} total tasks`,
      );
    }
  } else {
    throw new Error(
      `no task in ${iterationKey} has heroArtifact in catalog (and version is not single-task grandfathered)`,
    );
  }

  const mp4Path = path.join(iterationDir, task, 'demo.mp4');
  if (!existsSync(mp4Path)) {
    throw new Error(`hero task ${task} missing demo.mp4 at ${mp4Path}`);
  }

  return { iterationKey, task, heroArtifact, mp4Path, iterationDir };
}
