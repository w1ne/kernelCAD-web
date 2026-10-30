// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { Vec3Param } from '../../../../shared/intent/types';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';
import { normalizeAxis, readVec3Param } from './helpers';
import { translatePreservingLineage } from './transforms';

/** `assemblyPart` — clones the wrapped source shape and applies its `at:`. */
export function lowerAssemblyPart(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.shape as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: 'assembly part shape input is missing or failed.',
      hint: 'Assembly parts must wrap a successfully lowered source shape.',
    });
    return noShape();
  }
  let shape: ShapeBackend = base instanceof OcctBackend
    ? base.clone()
    : (base as import('../../../../kernel/backends/meshBackend').MeshBackend).clone();
  const at = (r.metadata as { at?: Vec3Param } | undefined)?.at;
  if (at !== undefined) {
    const [tx, ty, tz] = readVec3Param(at);
    shape = translatePreservingLineage(shape, tx, ty, tz);
  }
  return built(shape);
}

/** `assemblyJoint` — validates the joint axis; the shape is part A unchanged. */
export function lowerAssemblyJoint(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const partA = readAssemblyPartInput(ctx, r, 'joint');
  if (partA === undefined) return noShape();
  const jointMeta = r.metadata as { axis?: [number, number, number] } | undefined;
  if (jointMeta?.axis !== undefined) normalizeAxis(jointMeta.axis);
  return built(cloneShape(partA));
}

/** `assemblyConnect` — placement is resolved at capture time; hand back part A. */
export function lowerAssemblyConnect(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const partA = readAssemblyPartInput(ctx, r, 'connect');
  return partA === undefined ? noShape() : built(cloneShape(partA));
}

function readAssemblyPartInput(
  ctx: LowerContext,
  r: FeatureRecord,
  kind: 'joint' | 'connect',
): ShapeBackend | undefined {
  const part = ctx.inputs.byKey.a as ShapeBackend | undefined;
  if (part !== undefined) return part;
  ctx.diagnostics.push({
    target: ctx.target,
    code: 'recompute.input.missing',
    featureId: r.id,
    severity: 'error',
    message: `assembly ${kind} input 'a' is missing or failed.`,
    hint: `Assembly ${kind === 'joint' ? 'joints' : 'connect records'} must reference successfully lowered assembly parts.`,
  });
  return undefined;
}

function cloneShape(shape: ShapeBackend): ShapeBackend {
  return shape instanceof OcctBackend
    ? shape.clone()
    : (shape as import('../../../../kernel/backends/meshBackend').MeshBackend).clone();
}
