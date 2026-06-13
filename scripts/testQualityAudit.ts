// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AuditKind = 'focused-test' | 'todo-test' | 'env-gated-suite';

export interface AuditFinding {
  kind: AuditKind;
  file: string;
  line: number;
  text: string;
}

export interface FileAudit {
  file: string;
  blockers: AuditFinding[];
  warnings: AuditFinding[];
}

const focusedRe = /\b(?:describe|it|test)\.only\s*\(/;
const todoRe = /\b(?:it|test)\.todo\s*\(/;
const envGatedRe = /(?:describe|it|test)\.skip|describe\.skipIf|ctx\.skip\(/;

export function auditTestText(file: string, text: string): FileAudit {
  const blockers: AuditFinding[] = [];
  const warnings: AuditFinding[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const line = index + 1;
    if (focusedRe.test(lineText)) {
      blockers.push({ kind: 'focused-test', file, line, text: lineText.trim() });
    }
    if (todoRe.test(lineText)) {
      blockers.push({ kind: 'todo-test', file, line, text: lineText.trim() });
    }
    if (envGatedRe.test(lineText)) {
      warnings.push({ kind: 'env-gated-suite', file, line, text: lineText.trim() });
    }
  });

  return { file, blockers, warnings };
}

export function formatAuditReport(results: FileAudit[]): string {
  const lines: string[] = [];
  for (const result of results) {
    for (const finding of result.blockers) {
      lines.push(`${finding.file}:${finding.line} ${finding.kind} ${finding.text}`);
    }
    for (const finding of result.warnings) {
      lines.push(`${finding.file}:${finding.line} ${finding.kind} ${finding.text}`);
    }
  }
  return lines.join('\n');
}

export function auditRepo(cwd = process.cwd()): FileAudit[] {
  const roots = ['src', 'tests', 'eval', 'scripts', 'site'];
  const files: string[] = [];

  function walk(dir: string): void {
    const absDir = join(cwd, dir);
    if (!existsSync(absDir)) return;
    for (const entry of readdirSync(absDir)) {
      const rel = `${dir}/${entry}`;
      if (rel.includes('/node_modules/')) continue;
      const abs = join(cwd, rel);
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        walk(rel);
      } else if (/\.(test|spec)\.(ts|tsx)$/.test(rel)) {
        files.push(rel);
      }
    }
  }

  for (const root of roots) walk(root);
  files.sort();

  return files.map(file => auditTestText(file, readFileSync(join(cwd, file), 'utf8')));
}

function main(): void {
  const results = auditRepo();
  const blockers = results.flatMap(r => r.blockers);
  const report = formatAuditReport(results);
  if (report) console.log(report);
  if (blockers.length > 0) {
    console.error(`test-quality audit failed: ${blockers.length} blocker(s)`);
    process.exit(1);
  }
}

const invoked = process.argv[1] === fileURLToPath(import.meta.url);
if (invoked) main();
