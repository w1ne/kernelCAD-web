// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mechanismVerdict.ts
//
// The plain-language mechanism verdict every surface shows: evaluate_script,
// review_cad, `kernelcad validate`, the open_in_studio revision and the Studio
// badge. One builder, so "Motion checked" always says what was checked and
// "Motion not checked" always says why.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { Assembly } from '../capture/assembly';
import type { MechanismCoverage } from './mechanismTruth';
import { hasMotionIntent } from './motionIntent';

export type MechanismVerdictKind = 'real' | 'broken' | 'unverified';

export interface MechanismVerdictFailure {
  readonly code: string;
  /** Why it is broken, in one sentence that names the joint when known. */
  readonly reason: string;
  /** Mate / joint the failure is on, when the check knows it. */
  readonly joint?: string;
  /** Part the failure moves or names, when the check knows it. */
  readonly part?: string;
}

/** One status level for the whole verdict (ClassCAD-style `maxLevel`):
 *  'error' when broken, 'warning' when not checked, 'ok' when checked. */
export type MechanismMaxLevel = 'ok' | 'warning' | 'error';

export interface MechanismVerdictSummary {
  readonly verdict: MechanismVerdictKind;
  readonly maxLevel: MechanismMaxLevel;
  /** One line an agent or a person can read without the diagnostics. */
  readonly statement: string;
  /** What ran and held. Empty unless verdict is 'real'. */
  readonly checked: readonly string[];
  /** What did not run, and why. On 'real', the moving DOFs nobody limited. */
  readonly skipped: readonly string[];
  /** Error-severity mechanism failures. Empty unless verdict is 'broken'. */
  readonly failures: readonly MechanismVerdictFailure[];
}

export interface MechanismVerdictInput {
  readonly mechanism: MechanismVerdictKind;
  readonly failures: readonly CompilerDiagnostic[];
  readonly coverage?: MechanismCoverage;
  /** Why the probe did not run at all (review cheap path, opt-out, throw). */
  readonly notRunReason?: string;
}

/** A verdict is worth showing only for a model that claims to move. */
export function needsMechanismVerdict(assemblies: readonly Assembly[]): boolean {
  return assemblies.some((a) => hasMotionIntent(a));
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function failureOf(d: CompilerDiagnostic): MechanismVerdictFailure {
  const { mateName: joint, partName: part } = d as { mateName?: unknown; partName?: unknown };
  return {
    code: d.code,
    reason: d.message,
    ...(typeof joint === 'string' ? { joint } : {}),
    ...(typeof part === 'string' ? { part } : {}),
  };
}

function skippedOf(input: MechanismVerdictInput): string[] {
  const out: string[] = [];
  if (input.notRunReason !== undefined) out.push(input.notRunReason);
  for (const d of input.failures) {
    if (d.code !== 'mechanism.unverified-budget-exceeded') continue;
    const m = /estimated work (\d+) exceeds the budget (\d+)/.exec(d.message);
    out.push(m
      ? `collision sweep across the joint travel skipped: work ${m[1]} is over the budget ${m[2]}`
      : 'collision sweep across the joint travel skipped: over the work budget');
  }
  if (out.length === 0 && input.coverage !== undefined && !input.coverage.sweep) {
    out.push('collision sweep across the joint travel did not run');
  }
  if (out.length === 0) out.push('the mechanism check did not run');
  return [...out, ...(input.coverage?.skipped ?? [])];
}

function checkedOf(c: MechanismCoverage | undefined): string[] {
  if (c === undefined) return ['rest pose'];
  const poses = c.joints === 0
    ? 'rest pose only (no moving joints)'
    : `${plural(c.poses, 'pose')} across ${plural(c.joints, 'joint')} (each joint at its limits)`;
  return [
    poses,
    ...(c.limitsChecked > 0 ? [`animation within limits on ${plural(c.limitsChecked, 'joint')}`] : []),
    ...(c.matesChecked ? ['all mates satisfied'] : []),
    'no collisions',
    ...(c.fastened > 0 ? ['fastened parts stay rigid'] : []),
    ...(c.physics ? ['holds under gravity'] : []),
  ];
}

/** Build the verdict summary from one (possibly aggregated) probe result. */
export function summarizeMechanism(input: MechanismVerdictInput): MechanismVerdictSummary {
  if (input.mechanism === 'broken') {
    const failures = input.failures.filter((d) => d.severity === 'error').map(failureOf);
    const first = failures[0]?.reason ?? 'a mechanism check failed';
    const more = failures.length > 1 ? ` (+${failures.length - 1} more)` : '';
    return { verdict: 'broken', maxLevel: 'error', statement: `Mechanism broken: ${first}${more}`, checked: [], skipped: [], failures };
  }
  if (input.mechanism === 'unverified') {
    const skipped = skippedOf(input);
    return {
      verdict: 'unverified',
      maxLevel: 'warning',
      statement: `Motion not checked: ${skipped[0]}. Do not call this mechanism working.`,
      checked: [],
      skipped,
      failures: [],
    };
  }
  const checked = checkedOf(input.coverage);
  const skipped = [...(input.coverage?.skipped ?? [])];
  const gravity = input.coverage?.physics === true ? '' : ' Gravity not checked.';
  const ranges = skipped.length === 0 ? '' : ` Not checked: ${skipped[0]}${skipped.length > 1 ? ` (+${skipped.length - 1} more)` : ''}.`;
  return {
    verdict: 'real',
    maxLevel: 'ok',
    statement: `Motion checked: ${checked.join(', ')}.${ranges}${gravity}`,
    checked,
    skipped,
    failures: [],
  };
}

/** Fold several assemblies' coverage into one. */
export function mergeCoverage(list: ReadonlyArray<MechanismCoverage | undefined>): MechanismCoverage | undefined {
  const present = list.filter((c): c is MechanismCoverage => c !== undefined);
  if (present.length === 0) return undefined;
  return {
    poses: present.reduce((n, c) => n + c.poses, 0),
    joints: present.reduce((n, c) => n + c.joints, 0),
    fastened: present.reduce((n, c) => n + c.fastened, 0),
    sweep: present.every((c) => c.sweep),
    physics: present.every((c) => c.physics),
    limitsChecked: present.reduce((n, c) => n + c.limitsChecked, 0),
    matesChecked: present.every((c) => c.matesChecked),
    skipped: present.flatMap((c) => c.skipped),
  };
}
