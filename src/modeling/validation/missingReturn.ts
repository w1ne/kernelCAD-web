// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// A script that builds geometry but never `return`s still evaluates: the
// runtime falls back to the LAST CREATED record as the model. That kept old
// scripts working, but the skill's return rule says the script must return
// the part, and the fallback silently exports whatever was built last (a
// cutter, a helper). Emit the coded warning `script.no-return` so evaluate,
// the CLI and export all say so instead of a bare OK.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';

export interface MissingReturnInput {
  /** The raw value the script `return`ed (undefined when it returned nothing). */
  returnValue: unknown;
  /** Captured records: no records means nothing was built, nothing to say. */
  records: readonly FeatureRecord[];
}

/** 0 or 1 `script.no-return` warning. */
export function detectMissingReturn(input: MissingReturnInput): CompilerDiagnostic[] {
  if (input.returnValue !== undefined && input.returnValue !== null) return [];
  if (input.records.length === 0) return [];
  const last = input.records[input.records.length - 1];
  return [{
    target: 'export-occt',
    code: 'script.no-return',
    severity: 'warn',
    featureId: last.id,
    message: `The script returned nothing; the last created shape ('${last.id}', a ${last.kind}) stands in for the model.`,
    hint: HINT_TEMPLATES['script.no-return'].template,
    nextAction: NEXT_ACTIONS['script.no-return'],
  }];
}
