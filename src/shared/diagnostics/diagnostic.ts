import type { FeatureId, ScriptLocation } from '../../intent/types';
import type { BackendTarget } from '../types/backendTarget';
import type { DiagnosticCode } from './codes';
import type { NextAction } from './nextAction';
import { NEXT_ACTIONS } from './nextAction';

export type { BackendTarget };
export type { DiagnosticCode };

export type DiagnosticSeverity = 'info' | 'warn' | 'error';

export interface CompilerDiagnostic {
  target: BackendTarget;
  code: DiagnosticCode;
  featureId?: FeatureId;
  scriptLocation?: ScriptLocation;
  severity: DiagnosticSeverity;
  message: string;
  /** Imperative one-sentence agent recovery instruction. Mandatory. */
  hint: string;
  /** Structured form of `hint`. Optional on the wire (older callers may
   *  construct diagnostics manually); always populated by the standard
   *  emit path. */
  nextAction?: NextAction;
}

/**
 * Fill `nextAction` from `NEXT_ACTIONS[code]` if not already set. Most
 * emit paths construct diagnostic literals without `nextAction` and rely
 * on this helper to apply the per-code default at the wire boundary.
 * Some emit sites are now construction-site-enriched (e.g. `runAndExport`
 * in `src/script-runtime/export.ts` populates `nextAction` directly on
 * every literal); for those, this helper is a true defense-in-depth
 * identity-op, leaving the explicitly-set value in place.
 */
export function withNextAction(d: CompilerDiagnostic): CompilerDiagnostic {
  if (d.nextAction !== undefined) return d;
  return { ...d, nextAction: NEXT_ACTIONS[d.code] };
}

/** Variadic form of {@link withNextAction} for the common case where a
 *  caller has a list of diagnostics to enrich before returning to its
 *  consumer. Returns a new array; does not mutate input. */
export function withNextActions(diags: readonly CompilerDiagnostic[]): CompilerDiagnostic[] {
  return diags.map(withNextAction);
}
