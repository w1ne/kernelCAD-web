import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type PackageAuditKind = 'missing-prepack-build' | 'missing-bin-file-entry';

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
  const pkg = JSON.parse(text) as PackageJsonShape;
  const blockers: PackageAuditFinding[] = [];

  if (pkg.scripts?.prepack !== 'npm run build:cli') {
    blockers.push({
      kind: 'missing-prepack-build',
      message: 'package.json scripts.prepack must run npm run build:cli',
    });
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

  return { blockers };
}

export function formatPackageAuditReport(result: PackageAuditResult): string {
  return result.blockers.map(finding => `${finding.kind}: ${finding.message}`).join('\n');
}

function main(): void {
  const result = auditPackageJsonText(readFileSync('package.json', 'utf8'));
  const report = formatPackageAuditReport(result);
  if (report) console.error(report);
  if (result.blockers.length > 0) {
    process.exit(1);
  }
}

const invoked = process.argv[1] === fileURLToPath(import.meta.url);
if (invoked) main();
