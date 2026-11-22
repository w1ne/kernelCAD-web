// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// MCP `analyze_tolerance_stack`. Explicit contributors skip the kernel.
// A chain reads shape.dimension declarations on the returned shape.

import {
  analyzeToleranceStack,
  TOLERANCE_STACK_DISCLAIMER,
  type StackResult,
} from '../../../shared/tol/stackup';
import { analyzeToleranceChain } from './toleranceStackChain';

export interface AnalyzeToleranceStackInput {
  contributors?: unknown;
  chain?: unknown;
  file?: string;
  code?: string;
  requirement?: unknown;
}

function refused(error: string): StackResult {
  return { ok: false, errorCode: 'cli.invalid-args', error, disclaimer: TOLERANCE_STACK_DISCLAIMER };
}

type Mode =
  | { kind: 'explicit'; contributors: unknown[] }
  | { kind: 'chain'; file?: string; code?: string; chain: unknown }
  | { kind: 'refuse'; error: string };

function classify(input: AnalyzeToleranceStackInput): Mode {
  const hasContributors = input.contributors !== undefined;
  const hasChain = input.chain !== undefined;
  const hasScript = input.file !== undefined || input.code !== undefined;
  if (hasContributors && (hasChain || hasScript)) {
    return { kind: 'refuse', error: 'Pass contributors, or { file | code } with chain. Not both.' };
  }
  if (hasContributors) {
    if (!Array.isArray(input.contributors)) return { kind: 'refuse', error: 'contributors must be an array' };
    return { kind: 'explicit', contributors: input.contributors };
  }
  if (!hasChain) return { kind: 'refuse', error: 'Pass contributors, or { file | code } with chain.' };
  if (typeof input.file !== 'string' && typeof input.code !== 'string') {
    return { kind: 'refuse', error: 'chain needs file or code.' };
  }
  if (input.file !== undefined && input.code !== undefined) {
    return { kind: 'refuse', error: 'Pass file or code, not both.' };
  }
  return { kind: 'chain', file: input.file, code: input.code, chain: input.chain };
}

export async function analyzeToleranceStackTool(input: AnalyzeToleranceStackInput): Promise<StackResult> {
  const mode = classify(input);
  if (mode.kind === 'refuse') return refused(mode.error);
  if (mode.kind === 'explicit') return analyzeToleranceStack(mode.contributors, input.requirement);
  return analyzeToleranceChain({ file: mode.file, code: mode.code, chain: mode.chain, requirement: input.requirement });
}
