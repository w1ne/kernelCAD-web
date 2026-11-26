// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import { built, finished, type LowerContext, type LowerOutcome } from './context';

/** `pad` — fuses a sketch-driven prism grown outward from a selected face. */
export async function lowerPad(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  const target = ctx.inputs.byKey.target as OcctBackend | undefined;
  if (!target) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'pad(profile, opts)',
        path: 'target',
        gotText: 'no target input',
        requires: 'a solid body chained before .pad()',
        example: "box(40, 30, 10).pad(path().circle(0, 0, 4), { face: 'top', depth: 5 })",
        hint: 'Chain .pad() onto a solid shape, passing a closed sketch profile.',
      }),
    });
    throw new Error('pad: no target shape');
  }
  const { lowerPad: padProfileOnBackend } = await import('../../../../kernel/backends/occt/padLowerer');
  const res = padProfileOnBackend(r, target, ctx.allRecords, ctx.inputs.resolveRecord);
  ctx.diagnostics.push(...res.diagnostics);
  if (res.diagnostics.some(d => d.severity === 'error')) {
    return finished(target);
  }
  const shape: ShapeBackend = res.backend;
  return built(shape);
}
