// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/selectionDrift.ts
//
// Compare the selections of a previous evaluation with the current one and
// report selectors that now point at something else. Pure: no geometry, no
// kernel. Selections are matched by consumer feature, selector text and
// occurrence; a selection with no counterpart (new feature, edited selector)
// has nothing to drift from and stays silent.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { BindingFingerprint, SelectionRecord } from '../../shared/intent/selectionRecord';
import { compareSelections, type BindingPair } from './bindingCompare';

const num = (n: number) => String(Math.round(n * 100) / 100);
const vec = (v: readonly number[]) => `(${v.map(num).join(', ')})`;

function describe(f: BindingFingerprint): string {
  const name = f.role !== undefined ? ` '${f.role}'` : '';
  const from = f.producer !== undefined ? ` of ${f.producer}` : '';
  const dir = f.direction !== undefined ? `, direction ${vec(f.direction)}` : '';
  const radius = f.radius !== undefined ? `, radius ${num(f.radius)}` : '';
  const unit = f.entityKind === 'face' ? 'area' : 'length';
  return `${f.geomType} ${f.entityKind}${name}${from} (${unit} ${num(f.size)}${radius}${dir}, centroid ${vec(f.centroid)})`;
}

function key(s: SelectionRecord): string {
  return `${s.consumerFeatureId}\u0000${s.selectorText}`;
}

/** Group by consumer + selector text, keeping evaluation order within a group. */
function groups(selections: readonly SelectionRecord[]): Map<string, SelectionRecord[]> {
  const out = new Map<string, SelectionRecord[]>();
  for (const s of selections) {
    const list = out.get(key(s)) ?? [];
    list.push(s);
    out.set(key(s), list);
  }
  return out;
}

function movedDetail(pairs: readonly BindingPair[]): string {
  const parts: string[] = [];
  for (const p of pairs) {
    if (p.comparison.verdict !== 'moved' || !p.before || !p.after) continue;
    const d = p.comparison.deltas;
    const bits: string[] = [];
    if (d.centroidMm !== undefined) bits.push(`centroid moved ${num(d.centroidMm)} mm`);
    if (d.sizeRelative !== undefined) bits.push(`${p.after.entityKind === 'face' ? 'area' : 'length'} ${num(p.before.size)} -> ${num(p.after.size)}`);
    if (d.radiusRelative !== undefined && p.before.radius !== undefined && p.after.radius !== undefined) {
      bits.push(`radius ${num(p.before.radius)} -> ${num(p.after.radius)}`);
    }
    if (d.angleDeg !== undefined) bits.push(`direction turned ${num(d.angleDeg)} deg`);
    parts.push(`${p.after.geomType} ${p.after.entityKind}${p.after.role ? ` '${p.after.role}'` : ''}: ${bits.join(', ')}`);
  }
  return parts.join('; ');
}

function changedDetail(pairs: readonly BindingPair[]): string {
  return pairs
    .filter((p) => p.comparison.verdict === 'changed')
    .map((p) => {
      const was = p.before ? describe(p.before) : 'nothing';
      const now = p.after ? describe(p.after) : 'nothing';
      return `was ${was}, now ${now} [${p.comparison.reasons.join('; ')}]`;
    })
    .join(' | ');
}

function isTypedEdgeMiss(selection: SelectionRecord, pairs: readonly BindingPair[]): boolean {
  const sourceCounts = new Map<string, number>();
  for (const fingerprint of selection.fingerprints) {
    if (fingerprint.entityKind !== 'edge' || fingerprint.sourceId === undefined) continue;
    sourceCounts.set(fingerprint.sourceId, (sourceCounts.get(fingerprint.sourceId) ?? 0) + 1);
  }
  if ([...sourceCounts.values()].some((count) => count > 1)) return true;
  return pairs.some((pair) => {
    const edge = pair.before?.entityKind === 'edge' || pair.after?.entityKind === 'edge';
    if (!edge) return false;
    if (pair.before?.sourceId !== undefined && pair.after === undefined) return true;
    if (pair.after?.sourceId !== undefined && pair.before === undefined) return true;
    return pair.comparison.reasons.some((reason) => reason.startsWith('edge lineage '));
  });
}

export function selectionDriftDiagnostics(
  baseline: readonly SelectionRecord[],
  current: readonly SelectionRecord[],
): CompilerDiagnostic[] {
  const before = groups(baseline);
  const diagnostics: CompilerDiagnostic[] = [];
  for (const [k, now] of groups(current)) {
    const was = before.get(k);
    if (!was) continue;
    now.forEach((after, i) => {
      const prior = was[i];
      if (!prior) return;
      const pairs = compareSelections(prior, after);
      if (pairs.some((p) => p.comparison.verdict === 'changed')) {
        const edgeMiss = isTypedEdgeMiss(after, pairs);
        diagnostics.push({
          target: 'export-occt',
          code: edgeMiss ? 'feature.selection.no-match' : 'selector.binding-changed',
          featureId: after.consumerFeatureId,
          severity: edgeMiss ? 'error' : 'warn',
          details: { consumerFeature: after.consumerFeatureId, selector: after.selectorText, syntax: after.syntax },
          message: edgeMiss
            ? `Edge selector '${after.selectorText}' no longer resolves to the same unique edge lineage: ${changedDetail(pairs)}.`
            : `selector '${after.selectorText}' (${after.syntax}) now selects a different entity: ${changedDetail(pairs)}.`,
          hint: edgeMiss
            ? 'An edge was deleted, split into ambiguous descendants, or replaced after the upstream edit. Re-pick the intended edge or refine the selector before continuing.'
            : 'The edit re-bound this selector to another entity, so the feature now acts on a different place than before. Tighten the selector (name the feature or add a position/size filter) or pin the intended entity, then re-evaluate.',
        });
        return;
      }
      const detail = movedDetail(pairs);
      if (detail !== '') {
        diagnostics.push({
          target: 'export-occt',
          code: 'selector.binding-moved',
          featureId: after.consumerFeatureId,
          severity: 'info',
          details: { consumerFeature: after.consumerFeatureId, selector: after.selectorText, syntax: after.syntax },
          message: `selector '${after.selectorText}' (${after.syntax}) still selects the same entity, which moved or resized: ${detail}.`,
          hint: 'Expected after a parameter edit. No action needed unless this feature should not follow the edit.',
        });
      }
    });
  }
  return diagnostics;
}
