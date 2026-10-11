// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/validateAssembly.ts
//
// verify({ check: 'assembly' }) — the static half of review_cad on one
// assembly: the mate-aware validator (with default-pose interference), joint
// topology, mechanical plausibility / intent / transmission, judged by the
// SAME blocking rules review_cad uses (summarizeMechanismFitness). `ok` is
// false exactly when one of those findings blocks, so a model verify passes
// is never blocked by review_cad for a static reason. review_cad adds the
// pose-envelope sweep and the mechanism-truth physics probe on top.

import type { Assembly } from '../../../modeling/capture/assembly';
import { isKernelError } from '../../../shared/intent/kernelError';
import type { ValidatorStatus } from '../../../modeling/mates/validator';
import type { MechanismRepairMode } from '../../../modeling/mates/mechanismFitness';
import {
  evaluateForReview,
  runStaticAssemblyReview,
  type ReviewDiagnostic,
} from '../../review/reviewPipeline';
import { getActiveMcpSession, setActiveMcpSession, type ActiveMcpSession } from '../activeSession';

export interface ValidateAssemblyInput {
  /** Script to evaluate; omit both to validate the active session. */
  file?: string;
  code?: string;
  scriptDir?: string;
  assembly?: string;
}

/** One finding that blocks the assembly (same rule set as review_cad). */
export interface AssemblyBlockingFinding {
  readonly code: string;
  readonly message: string;
  readonly hint: string;
}

export type ValidateAssemblyOutput =
  | {
      /** true when no finding blocks; false when `blocking` is non-empty. */
      ok: boolean;
      status: ValidatorStatus;
      diagnostics: ReviewDiagnostic[];
      blocking: AssemblyBlockingFinding[];
      repairMode: MechanismRepairMode;
      partCount: number;
      jointCount: number;
      /** What this static check does not cover. */
      scope: string;
    }
  | { ok: false; error: string; errorCode?: string; errorHint?: string };

const SCOPE_NOTE =
  'Static checks (validator, default-pose interference, joint topology, mechanical plausibility/intent/transmission) with review_cad\'s blocking rules. ' +
  'review_cad additionally sweeps the declared joint ranges and runs the physics probe.';

export async function validateAssemblyTool(input: ValidateAssemblyInput): Promise<ValidateAssemblyOutput> {
  const source = await resolveSession(input);
  if ('error' in source) return source.error;
  const assemblies = source.active.session.assemblies;
  if (assemblies.size === 0) {
    return {
      ok: false,
      error: 'No assembly captured by the script.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.assembly.no-assembly — evaluate a script that calls assembly(...) and returns arm.model() or arm.solvedModel().',
    };
  }
  const arm = (input.assembly !== undefined
    ? assemblies.get(input.assembly)
    : assemblies.values().next().value) as Assembly | undefined;
  if (!arm) {
    return {
      ok: false,
      error: `verify assembly: assembly '${input.assembly ?? '<default>'}' not found.`,
      errorCode: 'feature.invalid-args',
    };
  }
  try {
    return await reviewStatically(arm, source.active);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: isKernelError(e) ? e.code : undefined,
      errorHint: isKernelError(e) ? e.hint : undefined,
    };
  }
}

async function reviewStatically(arm: Assembly, active: ActiveMcpSession): Promise<ValidateAssemblyOutput> {
  const review = await runStaticAssemblyReview(arm, active);
  const blocking = review.fitness.blockingReasons.map((reason) => ({
    code: reason.code,
    message: reason.message,
    hint: reason.repairHint,
  }));
  return {
    ok: blocking.length === 0,
    status: review.validator.status,
    diagnostics: dedupeDiagnostics(review.diagnostics),
    blocking,
    repairMode: review.fitness.repairMode,
    partCount: review.validator.partCount,
    jointCount: review.validator.jointCount,
    scope: SCOPE_NOTE,
  };
}

type SessionSource =
  | { active: ActiveMcpSession }
  | { error: Extract<ValidateAssemblyOutput, { error: string }> };

/** Evaluate `file` / `code` when given (and make it the active session, like
 *  evaluate_script); otherwise use the session evaluate_script left. */
async function resolveSession(input: ValidateAssemblyInput): Promise<SessionSource> {
  if (input.file === undefined && input.code === undefined) {
    const active = getActiveMcpSession();
    if (active) return { active };
    return {
      error: {
        ok: false,
        error: 'No script to check. Pass { file } or { code }, or run evaluate_script first.',
        errorCode: 'feature.invalid-args',
        errorHint: 'invalid-args.session.no-active-session — verify({ check: "assembly", code }) evaluates the script itself.',
      },
    };
  }
  const { evaluation, model } = await evaluateForReview(input);
  if (evaluation.exitCode !== 0 || !model) {
    const first = evaluation.diagnostics.find((d) => d.severity === 'error') ?? evaluation.diagnostics[0];
    return {
      error: {
        ok: false,
        error: first?.message ?? 'Script evaluation failed.',
        errorCode: first?.code,
        errorHint: first?.hint,
      },
    };
  }
  const active: ActiveMcpSession = {
    session: model.session,
    tailId: model.tailId,
    tailShape: model.tailShape,
    rootId: model.rootId,
    rootShape: model.rootShape,
  };
  setActiveMcpSession(active);
  return { active };
}

/** The validator folds joint-topology findings on a non-converging solve;
 *  state each finding once. */
function dedupeDiagnostics(diagnostics: readonly ReviewDiagnostic[]): ReviewDiagnostic[] {
  const seen = new Set<string>();
  const out: ReviewDiagnostic[] = [];
  for (const d of diagnostics) {
    const key = `${d.code}\u0000${d.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}
