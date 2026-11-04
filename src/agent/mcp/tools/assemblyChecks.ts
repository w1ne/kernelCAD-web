// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// assembly_checks — one MCP entry that runs the named assembly checks by
// reusing verify({ check: 'assembly' }) / runStaticAssemblyReview and, for
// support, verify({ check: 'assembly-path', sequence, stability }).
// Geometry checks are not reimplemented here; findings are partitioned by code.

import type { CheckAssemblyPathOutput } from './checkAssemblyPath';
import { checkAssemblyPathTool } from './checkAssemblyPath';
import type { ValidateAssemblyOutput } from './validateAssembly';
import { validateAssemblyTool } from './validateAssembly';

export const ASSEMBLY_CHECK_NAMES = ['interference', 'floating', 'joints', 'stability'] as const;
export type AssemblyCheckName = (typeof ASSEMBLY_CHECK_NAMES)[number];

export interface AssemblyChecksInput {
  file?: string;
  code?: string;
  assembly?: string;
  /** Subset of interference, floating, joints, stability. Omit to run all four. */
  checks?: string[];
}

export interface AssemblyCheckFinding {
  code: string;
  message: string;
  hint?: string;
  severity?: string;
  parts?: string[];
}

export interface AssemblyCheckResult {
  ok: boolean;
  findings: AssemblyCheckFinding[];
  summary: string;
}

export interface AssemblyChecksOutput {
  /** False when any selected check has a severity-error finding, or the review did not run. */
  ok: boolean;
  checks: Partial<Record<AssemblyCheckName, AssemblyCheckResult>>;
  summary: string;
  error?: string;
  errorCode?: string;
  errorHint?: string;
}

/** Loose shape shared by review diagnostics and test fixtures. */
export interface AssemblyFindingInput {
  code: string;
  message: string;
  hint?: string;
  severity?: string;
  parts?: readonly string[];
  part?: string;
  partA?: string;
  partB?: string;
}

const FLOATING_CODES = new Set([
  'assembly.part.floating',
  'assembly.part.orphan',
  'assembly.mechanical.part-disconnected',
  'assembly.connectivity.floating-moving-part',
  'assembly.connectivity.no-load-path',
  'assembly.structure.unstructured-bodies',
  'mechanism.orphan-part',
  'mechanism.disconnect',
]);

/** Joint limits, axis, topology, mate graph, and mechanical plausibility. */
const JOINT_PREFIXES = [
  'assembly.joint',
  'assembly.mate.',
  'assembly.solver.',
  'assembly.loop.',
  'assembly.pose.out-of-limits',
  'assembly.pose-envelope.solve-failed',
  'assembly.pose-envelope.connector-unresolved',
  'assembly.mechanical.',
  'assembly.transmission.',
  'assembly.mounting-hole.',
  'assembly.part.under-constrained',
  'assembly.connector.',
  'assembly.workspace.',
  'mechanism.dof-mismatch',
  'mechanism.joint-mesh-gap',
];

const STABILITY_SCOPE =
  'Approximate centre-of-mass support projection from the assembly-path gate, plus static-review stability findings. Not a physics simulation.';

/** Map a diagnostic code onto one assembly check. Unlisted codes stay out. */
export function assemblyCheckForCode(code: string): AssemblyCheckName | undefined {
  if (isStabilityCode(code)) return 'stability';
  if (code.includes('interference') || code === 'mechanism.interpenetration' || code === 'assembly.contact.tolerance-exceeded') {
    return 'interference';
  }
  if (FLOATING_CODES.has(code)) return 'floating';
  if (JOINT_PREFIXES.some((prefix) => code.startsWith(prefix))) return 'joints';
  return undefined;
}

function isStabilityCode(code: string): boolean {
  return code.startsWith('assembly.joint.static-hold')
    || code === 'mechanism.unstable-under-gravity'
    || code === 'mechanism.drops-on-release'
    || code.includes('needs-hold');
}

function quotedParts(message: string): string[] {
  return [...message.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function findingParts(input: AssemblyFindingInput): string[] | undefined {
  const named = [
    ...(input.parts ?? []),
    ...(input.part ? [input.part] : []),
    ...(input.partA ? [input.partA] : []),
    ...(input.partB ? [input.partB] : []),
  ];
  const parts = [...new Set((named.length > 0 ? named : quotedParts(input.message)).filter((part) => part.length > 0))];
  return parts.length > 0 ? parts : undefined;
}

function toFinding(input: AssemblyFindingInput): AssemblyCheckFinding {
  const parts = findingParts(input);
  return {
    code: input.code,
    message: input.message,
    ...(input.hint ? { hint: input.hint } : {}),
    ...(input.severity ? { severity: input.severity } : {}),
    ...(parts ? { parts } : {}),
  };
}

function emptyBuckets(): Record<AssemblyCheckName, AssemblyCheckFinding[]> {
  return { interference: [], floating: [], joints: [], stability: [] };
}

/** Split review findings into the four assembly checks. Exported for unit tests. */
export function partitionAssemblyFindings(
  findings: readonly AssemblyFindingInput[],
): Record<AssemblyCheckName, AssemblyCheckFinding[]> {
  const buckets = emptyBuckets();
  for (const finding of findings) {
    const name = assemblyCheckForCode(finding.code);
    if (name) buckets[name].push(toFinding(finding));
  }
  return buckets;
}

function blockingKey(code: string, message: string): string {
  return `${code}\u0000${message}`;
}

/** Error findings block, and so does anything the static review already listed as blocking
 *  (mechanical intent, transmission, and disconnected parts block even as warnings). */
function isBlocking(finding: AssemblyCheckFinding, blocking: ReadonlySet<string>): boolean {
  return finding.severity === 'error' || blocking.has(blockingKey(finding.code, finding.message));
}

function checkSummary(
  name: AssemblyCheckName,
  findings: readonly AssemblyCheckFinding[],
  blocking: ReadonlySet<string>,
  extra?: string,
): string {
  const blockingCount = findings.filter((finding) => isBlocking(finding, blocking)).length;
  const head = findings.length === 0
    ? `No ${name} findings.`
    : `${findings.length} ${name} finding(s), ${blockingCount} blocking.`;
  return extra ? `${head} ${extra}` : head;
}

function resultFor(
  name: AssemblyCheckName,
  findings: readonly AssemblyCheckFinding[],
  blocking: ReadonlySet<string>,
  extra?: string,
): AssemblyCheckResult {
  return {
    ok: !findings.some((finding) => isBlocking(finding, blocking)),
    findings: [...findings],
    summary: checkSummary(name, findings, blocking, extra),
  };
}

function selectedChecks(checks: readonly string[] | undefined): AssemblyCheckName[] | { error: string } {
  if (checks === undefined || checks.length === 0) return [...ASSEMBLY_CHECK_NAMES];
  const unknown = checks.filter((name) => !ASSEMBLY_CHECK_NAMES.includes(name as AssemblyCheckName));
  if (unknown.length > 0) {
    return { error: `Unknown assembly checks: ${unknown.join(', ')}. Use ${ASSEMBLY_CHECK_NAMES.join(', ')}.` };
  }
  const seen = new Set<AssemblyCheckName>();
  const selected: AssemblyCheckName[] = [];
  for (const name of checks) {
    const check = name as AssemblyCheckName;
    if (seen.has(check)) continue;
    seen.add(check);
    selected.push(check);
  }
  return selected;
}

function notRun(names: readonly AssemblyCheckName[], message: string, errorCode?: string, errorHint?: string): AssemblyChecksOutput {
  const checks: AssemblyChecksOutput['checks'] = {};
  for (const name of names) {
    checks[name] = { ok: false, findings: [], summary: `Not run: ${message}` };
  }
  return {
    ok: false,
    checks,
    summary: message,
    error: message,
    ...(errorCode ? { errorCode } : {}),
    ...(errorHint ? { errorHint } : {}),
  };
}

function isReviewError(review: ValidateAssemblyOutput): review is Extract<ValidateAssemblyOutput, { error: string }> {
  return 'error' in review;
}

function isPathError(report: CheckAssemblyPathOutput): report is Extract<CheckAssemblyPathOutput, { error: string }> {
  return 'error' in report;
}

function needsHoldFindings(report: CheckAssemblyPathOutput): AssemblyCheckFinding[] {
  if (isPathError(report) || !report.sequence?.needsHold) return [];
  return report.sequence.needsHold.map((hold) => ({
    code: 'assembly.stability.needs-hold',
    message: `Part '${hold.part}' needs a hold (${hold.reason}).`,
    hint: 'Add a fixture, a supporting contact, or an external hold. This projection is not a physics simulation.',
    severity: 'error',
    parts: [hold.part, ...hold.supports],
  }));
}

function stabilityNote(report: CheckAssemblyPathOutput, jointCount: number): string {
  const joints = jointCount === 0 ? ' Static review found no joints.' : '';
  if (isPathError(report)) {
    return `Support check skipped: ${report.error}${joints} ${STABILITY_SCOPE}`;
  }
  if (!report.sequence) {
    return `Support check skipped: assembly-path returned no sequence.${joints} ${STABILITY_SCOPE}`;
  }
  return `${STABILITY_SCOPE}${joints}`;
}

function finish(
  names: readonly AssemblyCheckName[],
  checks: AssemblyChecksOutput['checks'],
): AssemblyChecksOutput {
  const summary = names
    .map((name) => {
      const check = checks[name];
      return `${name}: ${check?.ok ? 'ok' : 'failed'}`;
    })
    .join('; ');
  return {
    ok: names.every((name) => checks[name]?.ok === true),
    checks,
    summary: `${summary}.`,
  };
}

/** Named entry for targeted assembly checks. `verify({ check: 'assembly' })` and `review_cad` stay available. */
export async function assemblyChecksTool(input: AssemblyChecksInput): Promise<AssemblyChecksOutput> {
  const selected = selectedChecks(input.checks);
  if ('error' in selected) {
    return { ok: false, checks: {}, summary: selected.error, error: selected.error, errorCode: 'feature.invalid-args' };
  }
  const review = await validateAssemblyTool({
    file: input.file,
    code: input.code,
    assembly: input.assembly,
  });
  if (isReviewError(review)) return notRun(selected, review.error, review.errorCode, review.errorHint);

  const buckets = partitionAssemblyFindings(review.diagnostics as readonly AssemblyFindingInput[]);
  const blocking = new Set(review.blocking.map((reason) => blockingKey(reason.code, reason.message)));
  const checks: AssemblyChecksOutput['checks'] = {};
  for (const name of selected) {
    if (name === 'stability') continue;
    checks[name] = resultFor(name, buckets[name], blocking);
  }
  if (selected.includes('stability')) {
    const path = await checkAssemblyPathTool({
      file: input.file,
      code: input.code,
      assembly: input.assembly,
      sequence: true,
      stability: true,
    });
    const holds = needsHoldFindings(path);
    for (const hold of holds) blocking.add(blockingKey(hold.code, hold.message));
    checks.stability = resultFor(
      'stability',
      [...buckets.stability, ...holds],
      blocking,
      stabilityNote(path, review.jointCount),
    );
  }
  return finish(selected, checks);
}
