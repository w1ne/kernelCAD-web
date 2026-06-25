// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export type PackageAuditKind =
  | 'missing-prepack-build'
  | 'missing-bin-file-entry'
  | 'package-version-ahead-of-local-tag'
  | 'package-version-ahead-of-remote-tag'
  | 'github-release-missing'
  | 'github-release-draft'
  | 'github-release-prerelease'
  | 'github-release-not-latest';

export interface PackageAuditFinding {
  kind: PackageAuditKind;
  message: string;
}

export interface PackageAuditResult {
  blockers: PackageAuditFinding[];
}

interface PackageJsonShape {
  bin?: Record<string, string> | string;
  files?: string[];
  scripts?: Record<string, string>;
  version?: string;
}

interface PackageAuditInput {
  packageJsonText: string;
  tagNames?: string[];
  remoteTagNames?: string[];
  githubRelease?: GithubReleaseState | null;
  latestGithubReleaseTag?: string | null;
}

interface GithubReleaseState {
  tagName: string;
  isDraft: boolean;
  isPrerelease: boolean;
}

function binPaths(pkg: PackageJsonShape): string[] {
  if (typeof pkg.bin === 'string') return [pkg.bin];
  if (pkg.bin && typeof pkg.bin === 'object') return Object.values(pkg.bin);
  return [];
}

function fileEntryIncludesPath(files: string[], path: string): boolean {
  const normalizedPath = path.replace(/^\.\//, '');
  return files.some(entry => {
    const normalizedEntry = entry.replace(/^\.\//, '').replace(/\/$/, '');
    return normalizedPath === normalizedEntry || normalizedPath.startsWith(`${normalizedEntry}/`);
  });
}

export function auditPackageJsonText(text: string): PackageAuditResult {
  return auditPackageReleaseState({ packageJsonText: text });
}

function parseStableSemverTag(tagName: string): [number, number, number] | null {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tagName.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function highestStableTag(tagNames: string[]): [number, number, number] | null {
  return tagNames
    .map(parseStableSemverTag)
    .filter((version): version is [number, number, number] => version !== null)
    .sort(compareSemver)
    .at(-1) ?? null;
}

function formatSemver(version: [number, number, number]): string {
  return version.join('.');
}

export function auditPackageReleaseState(input: PackageAuditInput): PackageAuditResult {
  const pkg = JSON.parse(input.packageJsonText) as PackageJsonShape;
  const blockers: PackageAuditFinding[] = [];
  const expectedTag = pkg.version ? `v${pkg.version}` : null;
  const packageVersion = expectedTag ? parseStableSemverTag(expectedTag) : null;

  // The package ships the CLI bundle (dist/cli) AND the static headless
  // player (dist/headless-player, consumed by render_preview) — prepack must
  // build both before npm pack or publish.
  const prepackSteps = (pkg.scripts?.prepack ?? '').split('&&').map(step => step.trim());
  for (const required of ['npm run build:cli', 'npm run build:player']) {
    if (!prepackSteps.includes(required)) {
      blockers.push({
        kind: 'missing-prepack-build',
        message: `package.json scripts.prepack must run ${required}`,
      });
    }
  }

  const files = pkg.files ?? [];
  for (const binPath of binPaths(pkg)) {
    if (!fileEntryIncludesPath(files, binPath)) {
      blockers.push({
        kind: 'missing-bin-file-entry',
        message: `package.json files must include bin path ${binPath}`,
      });
    }
  }

  if (input.tagNames) {
    const highestTag = highestStableTag(input.tagNames);
    if (packageVersion && highestTag && compareSemver(packageVersion, highestTag) > 0) {
      blockers.push({
        kind: 'package-version-ahead-of-local-tag',
        message: `package.json version ${pkg.version} is ahead of highest local stable tag v${formatSemver(highestTag)}`,
      });
    }
  }

  if (input.remoteTagNames) {
    const highestRemoteTag = highestStableTag(input.remoteTagNames);
    if (packageVersion && highestRemoteTag && compareSemver(packageVersion, highestRemoteTag) > 0) {
      blockers.push({
        kind: 'package-version-ahead-of-remote-tag',
        message: `package.json version ${pkg.version} is ahead of highest remote stable tag v${formatSemver(highestRemoteTag)}`,
      });
    }
  }

  if (expectedTag && input.githubRelease === null) {
    blockers.push({
      kind: 'github-release-missing',
      message: `GitHub Release ${expectedTag} must exist before the release is complete`,
    });
  } else if (expectedTag && input.githubRelease) {
    if (input.githubRelease.tagName !== expectedTag) {
      blockers.push({
        kind: 'github-release-missing',
        message: `GitHub Release ${expectedTag} must exist before the release is complete`,
      });
    }
    if (input.githubRelease.isDraft) {
      blockers.push({
        kind: 'github-release-draft',
        message: `GitHub Release ${expectedTag} must not be a draft`,
      });
    }
    if (input.githubRelease.isPrerelease) {
      blockers.push({
        kind: 'github-release-prerelease',
        message: `GitHub Release ${expectedTag} must not be a prerelease`,
      });
    }
  }

  if (expectedTag && input.latestGithubReleaseTag && input.latestGithubReleaseTag !== expectedTag) {
    blockers.push({
      kind: 'github-release-not-latest',
      message: `GitHub latest release is ${input.latestGithubReleaseTag}, expected ${expectedTag}`,
    });
  }

  return { blockers };
}

export function formatPackageAuditReport(result: PackageAuditResult): string {
  return result.blockers.map(finding => `${finding.kind}: ${finding.message}`).join('\n');
}

function main(): void {
  const strictTags = process.env.KERNELCAD_RELEASE_AUDIT_TAGS === '1';
  const strictRemote = process.env.KERNELCAD_RELEASE_AUDIT_REMOTE === '1';
  const strictGithub = process.env.KERNELCAD_RELEASE_AUDIT_GITHUB === '1';
  const tagNames = strictTags
    ? execFileSync('git', ['tag', '--list'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    : undefined;
  const remoteTagNames = strictRemote
    ? execFileSync('git', ['ls-remote', '--tags', 'origin'], { encoding: 'utf8' })
      .split('\n')
      .map(line => line.split('\t')[1]?.replace(/^refs\/tags\//, '').replace(/\^\{\}$/, ''))
      .filter((tagName): tagName is string => Boolean(tagName))
    : undefined;

  const packageJsonText = readFileSync('package.json', 'utf8');
  const packageVersion = (JSON.parse(packageJsonText) as PackageJsonShape).version;
  const expectedTag = packageVersion ? `v${packageVersion}` : null;
  let githubRelease: GithubReleaseState | null | undefined;
  let latestGithubReleaseTag: string | null | undefined;
  if (strictGithub && expectedTag) {
    try {
      githubRelease = JSON.parse(execFileSync('gh', [
        'release',
        'view',
        expectedTag,
        '--json',
        'tagName,isDraft,isPrerelease',
      ], { encoding: 'utf8' })) as GithubReleaseState;
    } catch {
      githubRelease = null;
    }

    try {
      latestGithubReleaseTag = JSON.parse(execFileSync('gh', [
        'release',
        'list',
        '--limit',
        '1',
        '--json',
        'tagName',
      ], { encoding: 'utf8' }))[0]?.tagName ?? null;
    } catch {
      latestGithubReleaseTag = null;
    }
  }

  const result = auditPackageReleaseState({
    packageJsonText,
    tagNames,
    remoteTagNames,
    githubRelease,
    latestGithubReleaseTag,
  });
  const report = formatPackageAuditReport(result);
  if (report) console.error(report);
  if (result.blockers.length > 0) {
    process.exit(1);
  }
}

const invoked = process.argv[1] === fileURLToPath(import.meta.url);
if (invoked) main();
