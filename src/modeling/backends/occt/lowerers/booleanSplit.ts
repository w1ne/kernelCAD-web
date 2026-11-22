// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// booleanSplit lowers with BRepAlgoAPI_Cut and BRepAlgoAPI_Common (already
// bound). BRepAlgoAPI_Splitter is not in the bundled wasm. Empty fragments
// are omitted from the SceneBackend; a specifically requested empty fragment
// is an error. A disjoint cut equalling A is the leftover, not a subtractive
// no-op. Face lineage is the same split/ambiguous history as other booleans.

import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { cutWithHistory, intersectWithHistory, mergeBooleanHistory } from '../../../../kernel/backends/occt/historyAwareBooleans';
import { booleanRecoveryDiagnostic } from '../../../../kernel/backends/occt/booleanRecovery';
import { isSceneBackend, type SceneBackend } from '../../../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import { Transform } from '../../../../shared/runtime/se3';
import { intersectionEmptyDiagnostic } from '../additiveNoOp';
import { mergeEdges, wrapBooleanResult } from './boolean';
import { built, finished, noShape, type LowerContext, type LowerOutcome } from './context';

/** Same floor as `intersectionEmptyDiagnostic`. */
const VOLUME_FLOOR = 1e-6;
type FragmentName = 'intersection' | 'a_only' | 'b_only';

interface FragmentSolid {
  name: FragmentName;
  solid: OcctBackend;
  kept: boolean;
}

const omittedByScene = new WeakMap<SceneBackend, ReadonlyMap<string, OcctBackend>>();

function keepOf(record: FeatureRecord): string {
  return String(record.params.keep?.expression ?? '').replace(/'/g, '');
}

function fragmentName(record: FeatureRecord): string {
  const named = record.metadata?.fragment;
  if (typeof named === 'string') return named;
  return String(record.params.fragment?.expression ?? '').replace(/'/g, '');
}

function aboveFloor(solid: OcctBackend): boolean {
  return !solid.isEmpty() && solid.volume() > VOLUME_FLOOR;
}

function operand(ctx: LowerContext, record: FeatureRecord, key: string): OcctBackend | undefined {
  const shape = ctx.inputs.byKey[key];
  if (shape instanceof OcctBackend) return shape;
  ctx.diagnostics.push(argDiagnostic(ctx, record, key, 'a BRep solid from this script'));
  return undefined;
}

function argDiagnostic(ctx: LowerContext, record: FeatureRecord, path: string, requires: string): CompilerDiagnostic {
  return {
    target: ctx.target,
    code: 'feature.invalid-args',
    featureId: record.id,
    severity: 'error',
    ...invalidArgsText({
      api: 'shape.split(other, opts)',
      path,
      gotText: 'a missing or non-solid input',
      requires,
      example: 'box(20, 20, 20).split(box(20, 20, 20).translate(10, 0, 0))',
    }),
  };
}

function runOp(
  body: OcctBackend,
  tool: OcctBackend,
  op: 'cut' | 'common',
  label: string,
  record: FeatureRecord,
  ctx: LowerContext,
): OcctBackend {
  const result = op === 'cut' ? cutWithHistory(body, tool) : intersectWithHistory(body, tool);
  const recovered = booleanRecoveryDiagnostic(record.id, label, result);
  if (recovered) ctx.diagnostics.push(recovered);
  return wrapBooleanResult(
    result,
    mergeBooleanHistory(body.historyMap, tool.historyMap, result),
    mergeEdges([body.edgeHistoryMap, tool.edgeHistoryMap], result),
    record.id,
  );
}

function computeFragments(ctx: LowerContext, record: FeatureRecord): FragmentSolid[] | undefined {
  const base = operand(ctx, record, 'base');
  const tool = operand(ctx, record, 'tool');
  if (!base || !tool) return undefined;
  const specs = [
    ['intersection', 'common', base, tool, 'boolean split intersection'],
    ['a_only', 'cut', base, tool, 'boolean split a_only'],
    ['b_only', 'cut', tool, base, 'boolean split b_only'],
  ] as const;
  return specs.map(([name, op, body, cutter, label]) => {
    const solid = runOp(body, cutter, op, label, record, ctx);
    return { name, solid, kept: aboveFloor(solid) };
  });
}

function missingFragment(ctx: LowerContext, record: FeatureRecord, keep: string): CompilerDiagnostic {
  if (keep === 'intersection') {
    const empty = intersectionEmptyDiagnostic({ featureId: record.id, volumeAfter: 0, isEmpty: true });
    if (empty) return empty;
  }
  return {
    target: ctx.target,
    code: 'feature.invalid-args',
    featureId: record.id,
    severity: 'error',
    ...invalidArgsText({
      api: 'shape.split(other, { keep })',
      path: 'opts.keep',
      got: keep,
      requires: 'a fragment whose volume is above 1e-6 mm³; this one is empty',
      example: "box(20, 20, 20).split(box(20, 20, 20).translate(10, 0, 0), { keep: 'a_only' })",
      unit: 'mm³',
    }),
  };
}

function lowerSingle(ctx: LowerContext, record: FeatureRecord, keep: string): LowerOutcome {
  const solids = computeFragments(ctx, record);
  if (!solids) return noShape();
  const found = solids.find((solid) => solid.name === keep && solid.kept);
  if (!found) {
    ctx.diagnostics.push(missingFragment(ctx, record, keep));
    return noShape();
  }
  return built(found.solid);
}

function sceneOf(ctx: LowerContext, solids: readonly FragmentSolid[]): SceneBackend {
  const scene: SceneBackend = {
    target: ctx.target,
    assemblyName: 'split',
    parts: solids.filter((solid) => solid.kept).map((solid) => ({
      name: solid.name,
      shape: solid.solid,
      worldTransform: Transform.identity(),
    })),
    _kind: 'scene',
  };
  const omitted = new Map(solids.filter((solid) => !solid.kept).map((solid) => [solid.name, solid.solid]));
  if (omitted.size > 0) omittedByScene.set(scene, omitted);
  return scene;
}

function lowerParts(ctx: LowerContext, record: FeatureRecord): LowerOutcome {
  const solids = computeFragments(ctx, record);
  if (!solids) return noShape();
  if (!solids.some((solid) => solid.kept)) {
    ctx.diagnostics.push(argDiagnostic(
      ctx,
      record,
      'shape.split(other)',
      'at least one fragment with volume above 1e-6 mm³',
    ));
    return noShape();
  }
  return finished(sceneOf(ctx, solids) as unknown as ShapeBackend);
}

function parkedOrPart(scene: SceneBackend, name: string): OcctBackend | undefined {
  const parked = omittedByScene.get(scene)?.get(name);
  if (parked) return parked;
  const part = scene.parts.find((entry) => entry.name === name);
  return part?.shape instanceof OcctBackend ? part.shape : undefined;
}

function emptyFragmentSolid(): OcctBackend {
  return new OcctBackend(replicad.makeCompound([]) as replicad.Shape3D);
}

function lowerFragment(ctx: LowerContext, record: FeatureRecord): LowerOutcome {
  const scene = ctx.inputs.byKey.split;
  if (!isSceneBackend(scene)) {
    ctx.diagnostics.push(argDiagnostic(ctx, record, 'split', 'the parent split Scene'));
    return noShape();
  }
  const solid = parkedOrPart(scene, fragmentName(record));
  if (!solid) return finished(emptyFragmentSolid());
  const kept = scene.parts.some((part) => part.name === fragmentName(record));
  return kept ? built(solid.clone()) : finished(solid.clone());
}

/** `booleanSplit` — one Scene of kept fragments, or the single requested solid. */
export function lowerBooleanSplit(ctx: LowerContext, record: FeatureRecord): LowerOutcome {
  if (record.metadata?.splitRole === 'fragment') return lowerFragment(ctx, record);
  const keep = keepOf(record);
  return keep === 'parts' ? lowerParts(ctx, record) : lowerSingle(ctx, record, keep);
}
