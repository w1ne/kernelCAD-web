import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export type PackageAuditKind =
  | 'missing-prepack-build'
  | 'missing-bin-file-entry'
  | 'package-version-ahead-of-local-tag';

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
    const packageVersion = pkg.version ? parseStableSemverTag(`v${pkg.version}`) : null;
    const highestTag = highestStableTag(input.tagNames);
    if (packageVersion && highestTag && compareSemver(packageVersion, highestTag) > 0) {
      blockers.push({
        kind: 'package-version-ahead-of-local-tag',
        message: `package.json version ${pkg.version} is ahead of highest local stable tag v${formatSemver(highestTag)}`,
      });
    }
  }

  return { blockers };
}

export function formatPackageAuditReport(result: PackageAuditResult): string {
  return result.blockers.map(finding => `${finding.kind}: ${finding.message}`).join('\n');
}

function main(): void {
  const strictTags = process.env.KERNELCAD_RELEASE_AUDIT_TAGS === '1';
  const tagNames = strictTags
    ? execFileSync('git', ['tag', '--list'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    : undefined;
  const result = auditPackageReleaseState({
    packageJsonText: readFileSync('package.json', 'utf8'),
    tagNames,
  });
  const report = formatPackageAuditReport(result);
  if (report) console.error(report);
  if (result.blockers.length > 0) {
    process.exit(1);
  }
}

const invoked = process.argv[1] === fileURLToPath(import.meta.url);
if (invoked) main();
