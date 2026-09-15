// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Trace-guided repair, end to end, on real broken models.
//
// For each deliberately broken `.kcad.ts` in this directory it runs the exact
// MCP calls an agent makes, through the same dispatcher (`callMcpTool`):
//
//   1. evaluate_script              — the failure, as the agent first sees it
//   2. why_did_this_fail            — repair region + ranked candidates
//   3. repair_script  dry-run       — every candidate patch, nothing applied
//   4. repair_script  apply-first   — apply the top candidate, re-evaluate
//   5. evaluate_script on new_code  — confirm the repaired source is clean
//
// The broken fixtures are never rewritten, so the walkthrough is repeatable.
//
// Usage:
//   npx tsx examples/repair/run-repair-example.ts            # all fixtures
//   npx tsx examples/repair/run-repair-example.ts <file>...  # chosen fixtures
//
// Exit code is 0 only when every fixture starts broken and ends clean.

import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callMcpTool } from '../../src/agent/mcp/toolRegistry';

interface Diagnostic {
  code: string;
  severity: string;
  featureId?: string;
  message: string;
}

interface EvaluateResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  featureHealth: Array<{ featureId: string; status: string }>;
}

interface Candidate {
  id: string;
  summary: string;
  evidence: Record<string, string | number>;
  patch: { startLine: number; endLine: number; before: string; after: string };
}

interface WhyResult {
  ok: boolean;
  targetDiagnosticId?: string;
  repairRegion?: { ranges: Array<{ startLine: number; endLine: number; role: string; featureId?: string; paramName?: string }> };
  candidates?: Candidate[];
  candidateStatus?: string;
  candidateReason?: string;
  error?: string;
}

interface RepairResult {
  ok: boolean;
  applied?: string;
  new_code?: string;
  diff?: string;
  candidates: Candidate[];
  attempts: Array<{ candidateId: string; accepted: boolean; clearedDiagnostic?: boolean; newErrorCodes?: string[] }>;
  error?: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const DEFAULT_FIXTURES = [
  'oversized-fillet.kcad.ts',
  'hole-misses-plate.kcad.ts',
  'cutter-misses-body.kcad.ts',
].map(name => join(HERE, name));

function heading(text: string): void {
  console.log(`\n${'='.repeat(78)}\n${text}\n${'='.repeat(78)}`);
}

function step(text: string): void {
  console.log(`\n--- ${text}`);
}

function printDiagnostics(diagnostics: Diagnostic[]): void {
  const errors = diagnostics.filter(d => d.severity === 'error');
  if (errors.length === 0) {
    console.log('  (no error-severity diagnostics)');
    return;
  }
  for (const d of errors) {
    console.log(`  ${d.severity.toUpperCase()} ${d.code} [${d.featureId ?? 'script'}]`);
    console.log(`    ${d.message}`);
  }
}

function indent(text: string): string {
  return text.split('\n').map(line => `  ${line}`).join('\n');
}

async function repairOne(file: string): Promise<boolean> {
  heading(relative(REPO_ROOT, file));

  step('1. evaluate_script — before');
  const before = (await callMcpTool('evaluate_script', { file, skipMechanismCheck: true })) as EvaluateResult;
  console.log(`  ok: ${before.ok}`);
  console.log(`  featureHealth: ${JSON.stringify(before.featureHealth)}`);
  printDiagnostics(before.diagnostics);
  if (before.ok) {
    console.log('  fixture is not broken — nothing to demonstrate');
    return false;
  }

  step('2. why_did_this_fail — repair region and candidates');
  const why = (await callMcpTool('why_did_this_fail', { file })) as WhyResult;
  if (!why.ok) {
    console.log(`  error: ${why.error}`);
    return false;
  }
  console.log(`  targetDiagnosticId: ${why.targetDiagnosticId}`);
  console.log('  repairRegion:');
  for (const range of why.repairRegion?.ranges ?? []) {
    const owner = range.featureId ?? range.paramName ?? '';
    console.log(`    lines ${range.startLine}-${range.endLine}  ${range.role}  ${owner}`);
  }
  console.log(`  candidateStatus: ${why.candidateStatus}`);
  for (const candidate of why.candidates ?? []) {
    console.log(`    - ${candidate.id}: ${candidate.summary}`);
    console.log(`      evidence ${JSON.stringify(candidate.evidence)}`);
  }
  if (why.candidateStatus !== 'candidates' || why.targetDiagnosticId === undefined) {
    console.log(`  ${why.candidateReason ?? 'no candidates'}`);
    return false;
  }

  step('3. repair_script strategy: dry-run — preview every patch');
  const preview = (await callMcpTool('repair_script', {
    file,
    diagnostic: why.targetDiagnosticId,
    strategy: 'dry-run',
  })) as RepairResult;
  console.log(indent(preview.diff ?? '(no diff)'));

  step('4. repair_script strategy: apply-first — apply the top candidate and re-evaluate');
  const repaired = (await callMcpTool('repair_script', {
    file,
    diagnostic: why.targetDiagnosticId,
    strategy: 'apply-first',
  })) as RepairResult;
  console.log(`  ok: ${repaired.ok}`);
  console.log(`  applied: ${repaired.applied ?? '(none)'}`);
  for (const attempt of repaired.attempts) {
    console.log(
      `  attempt ${attempt.candidateId}: cleared=${attempt.clearedDiagnostic} ` +
        `newErrors=${JSON.stringify(attempt.newErrorCodes ?? [])} accepted=${attempt.accepted}`,
    );
  }
  console.log('  applied patch:');
  console.log(indent(repaired.diff ?? '(no diff)'));
  if (!repaired.ok || repaired.new_code === undefined) {
    console.log(`  repair did not complete: ${repaired.error ?? 'no candidate accepted'}`);
    return false;
  }

  step('5. evaluate_script — after, on the repaired source');
  const after = (await callMcpTool('evaluate_script', {
    code: repaired.new_code,
    skipMechanismCheck: true,
  })) as EvaluateResult;
  console.log(`  ok: ${after.ok}`);
  console.log(`  featureHealth: ${JSON.stringify(after.featureHealth)}`);
  printDiagnostics(after.diagnostics);
  return after.ok;
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2);
  const fixtures = requested.length > 0 ? requested : DEFAULT_FIXTURES;

  const results: Array<{ file: string; repaired: boolean }> = [];
  for (const file of fixtures) {
    results.push({ file, repaired: await repairOne(file) });
  }

  heading('summary');
  for (const { file, repaired } of results) {
    console.log(`  ${repaired ? 'REPAIRED' : 'NOT REPAIRED'}  ${relative(REPO_ROOT, file)}`);
  }
  process.exitCode = results.every(r => r.repaired) ? 0 : 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
