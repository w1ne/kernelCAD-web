// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Structured S1 binding comparison. `selectionDriftDiagnostics` turns the same
// comparison into warning/info diagnostics; this module keeps the result as
// data so an edit preview can list exactly which selectors moved or re-bound
// before a change is written.

import type { BindingFingerprint, SelectionRecord } from '../../shared/intent/selectionRecord';
import {
  compareSelections,
  type BindingComparison,
  type BindingVerdict,
} from './bindingCompare';

export interface BindingPairReport {
  verdict: BindingVerdict;
  reasons: string[];
  deltas: BindingComparison['deltas'];
  before?: BindingFingerprint;
  after?: BindingFingerprint;
}

export interface SelectionBindingChange {
  consumerFeatureId: string;
  selectorText: string;
  syntax: SelectionRecord['syntax'];
  /** 0-based occurrence within the same consumer + selector text. */
  occurrence: number;
  /** `changed` outranks `moved` for the whole selection. */
  verdict: Exclude<BindingVerdict, 'same'>;
  pairs: BindingPairReport[];
}

function key(selection: SelectionRecord): string {
  return `${selection.consumerFeatureId}\u0000${selection.selectorText}`;
}

function groups(selections: readonly SelectionRecord[]): Map<string, SelectionRecord[]> {
  const out = new Map<string, SelectionRecord[]>();
  for (const selection of selections) {
    const k = key(selection);
    const list = out.get(k) ?? [];
    list.push(selection);
    out.set(k, list);
  }
  return out;
}

/** Every selector whose bound entity moved or changed between two
 *  evaluations. Matched by consumer + selector text + occurrence, exactly
 *  like `selectionDriftDiagnostics`; unchanged selectors are omitted. */
export function diffSelectionBindings(
  before: readonly SelectionRecord[],
  after: readonly SelectionRecord[],
): SelectionBindingChange[] {
  const prior = groups(before);
  const changes: SelectionBindingChange[] = [];

  for (const [k, now] of groups(after)) {
    const was = prior.get(k);
    if (was === undefined) continue;
    now.forEach((afterSelection, occurrence) => {
      const beforeSelection = was[occurrence];
      if (beforeSelection === undefined) return;
      const pairs = compareSelections(beforeSelection, afterSelection)
        .filter((pair) => pair.comparison.verdict !== 'same')
        .map((pair): BindingPairReport => ({
          verdict: pair.comparison.verdict,
          reasons: [...pair.comparison.reasons],
          deltas: { ...pair.comparison.deltas },
          ...(pair.before !== undefined ? { before: pair.before } : {}),
          ...(pair.after !== undefined ? { after: pair.after } : {}),
        }));
      if (pairs.length === 0) return;
      const verdict = pairs.some((pair) => pair.verdict === 'changed') ? 'changed' : 'moved';
      changes.push({
        consumerFeatureId: afterSelection.consumerFeatureId,
        selectorText: afterSelection.selectorText,
        syntax: afterSelection.syntax,
        occurrence,
        verdict,
        pairs,
      });
    });
  }

  return changes;
}
