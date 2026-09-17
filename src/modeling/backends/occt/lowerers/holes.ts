// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { subtractiveNoOpDiagnostic } from '../subtractiveNoOp';
import { built, finished, type LowerContext, type LowerOutcome } from './context';

/** `hole` — one positioned hole (optionally counterbored / threaded). */
export async function lowerHole(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  const target = ctx.inputs.byKey.target as OcctBackend | undefined;
  if (!target) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `hole requires an input named 'target'.`,
      hint: 'Chain .hole() onto a solid shape, e.g. box(20, 20, 20).hole("top", { u: 0, v: 0, diameter: 4, depth: 5 }).',
    });
    throw new Error('hole: no target shape');
  }
  const { lowerHole: cutHoleOnBackend } = await import('../../../../kernel/backends/occt/holeLowerer');
  const res = cutHoleOnBackend(r, target, ctx.allRecords);
  ctx.diagnostics.push(...res.diagnostics);
  if (res.diagnostics.some(d => d.severity === 'error')) {
    return finished(target);
  }
  const shape: ShapeBackend = res.backend;
  {
    const noop = subtractiveNoOpDiagnostic({
      featureId: r.id, opLabel: 'hole',
      volumeBefore: target.volume(), volumeAfter: res.backend.volume(),
    });
    if (noop) ctx.diagnostics.push(noop);
  }
  return built(shape);
}

/** `holes` — the multi-position form of `hole`. */
export async function lowerHoles(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  const target = ctx.inputs.byKey.target as OcctBackend | undefined;
  if (!target) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `holes requires an input named 'target'.`,
      hint: 'Chain .holes() onto a solid shape with at least one position.',
    });
    throw new Error('holes: no target shape');
  }
  const { lowerHoles: cutHolesOnBackend } = await import('../../../../kernel/backends/occt/holeLowerer');
  const res = cutHolesOnBackend(r, target, ctx.allRecords);
  ctx.diagnostics.push(...res.diagnostics);
  if (res.diagnostics.some(d => d.severity === 'error')) {
    return finished(target);
  }
  const shape: ShapeBackend = res.backend;
  {
    const noop = subtractiveNoOpDiagnostic({
      featureId: r.id, opLabel: 'holes',
      volumeBefore: target.volume(), volumeAfter: res.backend.volume(),
    });
    if (noop) ctx.diagnostics.push(noop);
  }
  return built(shape);
}

/** `cutout` — subtracts a swept closed sketch profile from the target. */
export async function lowerCutout(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  const target = ctx.inputs.byKey.target as OcctBackend | undefined;
  if (!target) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `cutout requires an input named 'target'.`,
      hint: 'Chain .cutout() onto a solid shape, passing a closed sketch profile.',
    });
    throw new Error('cutout: no target shape');
  }
  const profile = ctx.inputs.byKey.profile as OcctBackend | undefined;
  const { lowerCutout: cutProfileOnBackend } = await import('../../../../kernel/backends/occt/cutoutLowerer');
  const res = cutProfileOnBackend(r, target, profile, ctx.allRecords);
  ctx.diagnostics.push(...res.diagnostics);
  if (res.diagnostics.some(d => d.severity === 'error')) {
    return finished(target);
  }
  const shape: ShapeBackend = res.backend;
  {
    const noop = subtractiveNoOpDiagnostic({
      featureId: r.id, opLabel: 'cutout',
      volumeBefore: target.volume(), volumeAfter: res.backend.volume(),
    });
    if (noop) ctx.diagnostics.push(noop);
  }
  return built(shape);
}
