// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/query-dsl-composed/harness.ts
//
// Q10 — end-to-end exercise of the composed Query DSL pipeline.
//
//   1. The script evaluates clean (Query constructor + .and() filter
//      reach the lowerer; the lowerer's Query evaluator resolves the
//      labeled top face).
//   2. The output shape is non-empty (the hole was successfully drilled
//      through the resolved face — proving the Query was actually
//      consulted, not silently ignored).
//   3. No blocking `query.*` diagnostics surface (the strict gate per
//      §11 propagation list: a Query that doesn't resolve must raise
//      `query.empty` / `query.unknown-label`, never silently succeed).
//   4. The source uses the Query DSL (q.face / .and / .withLabel) and
//      passes the Query value directly into hole(...), not the
//      strings-as-sugar `@kc[...]` form. Both forms work end-to-end —
//      this task locks the typed-Query path specifically.

import { readFileSync } from 'node:fs';
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return {
      gates: { 'evaluates clean': false },
      scored: {},
    };
  }

  const src = readFileSync(scriptPath, 'utf8');
  const usesQFace = /\bq\.face\s*\(/.test(src);
  const usesAndComposer = /\.and\s*\(/.test(src);
  const usesWithLabel = /\bq\.withLabel\s*\(/.test(src);
  const usesStringForm = /'@kc\[/.test(src) || /"@kc\[/.test(src);

  // The Query must reach hole(...) as a Query value, not via the
  // strings-as-sugar string form. Either is valid Q DSL usage, but
  // this task locks the typed path so the gate catches regressions
  // that quietly fall back to strings.
  const usesTypedQueryPath = usesQFace && usesAndComposer && usesWithLabel && !usesStringForm;

  // Any blocking `query.*` diagnostic = the Query failed to resolve.
  // Info-severity entries (e.g. snapshot-fallback-used) are tolerable;
  // error severity is not.
  const blockingQueryDiagnostics = ev.diagnostics.filter((d) =>
    typeof d.code === 'string' && d.code.startsWith('query.') &&
    // info / warn are advisory; error is blocking
    !('severity' in d && (d as { severity?: string }).severity !== 'error'),
  );

  const s = await getShapeInfo(scriptPath);

  // Expected geometry: 40×40×10 mm box (16000 mm³) minus a Ø4 mm
  // through hole (≈ π × 2² × 10 = 125.66 mm³) ≈ 15874 mm³.
  const expectedMin = 15800;
  const expectedMax = 15950;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'no blocking query.* diagnostics': blockingQueryDiagnostics.length === 0,
      'uses q.face()': usesQFace,
      'uses .and(...) composer': usesAndComposer,
      'uses q.withLabel(...)': usesWithLabel,
      'passes typed Query (not @kc[...] string)': usesTypedQueryPath,
    },
    scored: {
      'volume in expected band (box minus through hole)':
        s.volume > expectedMin && s.volume < expectedMax,
    },
  };
}
