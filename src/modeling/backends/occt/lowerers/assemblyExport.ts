// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend, type SceneBackendPart } from '../../../../kernel/backends/sceneBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/** `assemblyExport` — Scene.toCompound() / Scene.toUnion(). */
export function lowerAssemblyExport(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const scene = readSceneInput(ctx, r);
  if (!scene) return noShape();
  const op = readExportOperation(ctx, r);
  if (op === undefined) return noShape();
  if (scene.parts.length === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: 'assemblyExport: scene has no parts.',
      hint: 'Call assembly.part(...) at least once before exporting the scene.',
    });
    return noShape();
  }
  const transformed = transformSceneParts(scene.parts);
  return op === 'compound' ? makeCompound(transformed) : makeUnion(transformed);
}

function readSceneInput(ctx: LowerContext, r: FeatureRecord): SceneBackend | undefined {
  const input = ctx.inputs.byKey.scene as unknown;
  if (isSceneBackend(input)) return input;
  ctx.diagnostics.push({
    target: ctx.target,
    code: 'feature.invalid-args',
    featureId: r.id,
    severity: 'error',
    message: 'assemblyExport: input \'scene\' is not a SceneBackend (upstream solvedAssembly / assemblyModel must lower to a SceneBackend).',
    hint: 'Construct via Scene.toCompound() / Scene.toUnion() on a Scene returned by Assembly.model() / Assembly.solvedModel().',
  });
  return undefined;
}

function readExportOperation(ctx: LowerContext, r: FeatureRecord): 'compound' | 'union' | undefined {
  const op = (r.metadata as { op?: 'compound' | 'union' } | undefined)?.op;
  if (op === 'compound' || op === 'union') return op;
  ctx.diagnostics.push({
    target: ctx.target,
    code: 'feature.invalid-args',
    featureId: r.id,
    severity: 'error',
    message: `assemblyExport: metadata.op must be 'compound' or 'union'; got ${JSON.stringify(op)}.`,
    hint: 'Use Scene.toCompound() or Scene.toUnion() rather than constructing the feature directly.',
  });
  return undefined;
}

function transformSceneParts(parts: readonly SceneBackendPart[]): ShapeBackend[] {
  // Clone OCCT shapes before applying transforms because the operation mutates
  // the source handle; scene parts may be reused by a later recompute.
  return parts.map((part) => part.shape instanceof OcctBackend
    ? part.shape.clone().applyTransform(part.worldTransform)
    : (part.shape as import('../../../../kernel/backends/meshBackend').MeshBackend).transform(part.worldTransform));
}

function makeCompound(parts: readonly ShapeBackend[]): LowerOutcome {
  if (parts.some((part) => !(part instanceof OcctBackend))) {
    throw new Error('Scene.toCompound() cannot combine display mesh bodies into a BRep compound; keep the scene as a render mesh.');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapes = parts.map((part) => (part as OcctBackend).getReplicadShape() as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return built(new OcctBackend(replicad.makeCompound(shapes) as any));
}

function makeUnion(parts: readonly ShapeBackend[]): LowerOutcome {
  if (parts.some((part) => !(part instanceof OcctBackend))) {
    throw new Error('Scene.toUnion() does not support display mesh bodies; convert to BRep explicitly when solid operations are needed.');
  }
  let fused = parts[0] as OcctBackend;
  for (let index = 1; index < parts.length; index++) {
    fused = fused.union(parts[index]) as OcctBackend;
  }
  return built(fused);
}
