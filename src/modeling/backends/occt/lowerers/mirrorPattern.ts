// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { fuseWithHistory, mergeBooleanHistory } from '../../../../kernel/backends/occt/historyAwareBooleans';
import { retagInstance } from '../../../../kernel/backends/occt/patternHistory';
import { propagateTransformHistory } from '../../../../kernel/naming/evolutionRecord';
import type { HistoryMap } from '../../../../kernel/naming/evolutionRecord';
import { HINT_TEMPLATES } from '../../../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { isValidPlaneSpec } from '../../../../shared/intent/types';
import type { PatternSpec, PlaneSpec } from '../../../../shared/intent/types';
import { built, finished, noShape, type LowerContext, type LowerOutcome } from './context';

/** `mirror` — reflects the base and unions the two halves. */
export function lowerMirror(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `mirror requires an input named 'base'.`,
      hint: "Chain mirror onto a solid shape, e.g. box(10,10,10).mirror({ plane: 'yz' }).",
    });
    throw new Error('mirror: no base shape');
  }
  const meta = r.metadata as { plane?: PlaneSpec } | undefined;
  const plane = meta?.plane;
  if (!isValidPlaneSpec(plane)) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `mirror requires a valid plane spec; got ${JSON.stringify(plane)}.`,
      hint: "Pass 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset: <number> }.",
    });
    return finished(base);
  }
  const mirrorInputHashes = base.faceHashes();
  const mirrorInputMap = base.historyMap;
  try {
    shape = base.mirror(plane);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT mirror union failed: ${msg}`,
      hint: 'OCCT rejected the mirror union — translate the source away from the mirror plane, or use { plane, offset }.',
    });
    return finished(base);
  }
  // Mirror is a union internally; face count may change if faces on the
  // mirror plane merge. Only propagate historyMap when face count matches.
  if (mirrorInputMap !== undefined) {
    const mirrorOutputBackend = shape as OcctBackend;
    const mirrorOutputHashes = mirrorOutputBackend.faceHashes();
    if (mirrorOutputHashes.length === mirrorInputHashes.length) {
      const newMap = propagateTransformHistory(mirrorInputMap, mirrorInputHashes, mirrorOutputHashes);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wrapped = (mirrorOutputBackend.getReplicadShape() as any);
      shape = new OcctBackend(wrapped, undefined, newMap);
    }
    // else: face count mismatch due to mirror-plane face merging — leave shape
    // without historyMap; resolver will return face-ref-not-resolvable.
  }
  return built(shape);
}

/** `pattern` — linear / circular / grid instancing, fused cumulatively with
 *  per-instance lineage retagging. */
export function lowerPattern(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.pattern.source-not-found',
      featureId: r.id,
      severity: 'error',
      message: `pattern base input is missing or failed.`,
      hint: HINT_TEMPLATES['feature.pattern.source-not-found'].template,
    });
    return noShape();
  }
  const pattern = (r.metadata as { pattern?: PatternSpec } | undefined)?.pattern;
  if (!pattern) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: 'pattern feature is missing pattern metadata.',
      hint: 'Create patterns through .patternLinear(...) / .patternCircular(...) / .patternGrid(...).',
    });
    return finished(base);
  }

  // Runtime count guard (catches Param-bound counts < 2 that capture-time
  // proxy validation can't see).
  const totalCount = pattern.kind === 'grid'
    ? pattern.x.count * pattern.y.count
    : pattern.count;
  if (totalCount < 2) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.pattern.count-out-of-range',
      featureId: r.id,
      severity: 'error',
      message: `pattern total instance count is ${totalCount}; must be >= 2.`,
      hint: HINT_TEMPLATES['feature.pattern.count-out-of-range'].template,
    });
    return finished(base);
  }

  // Source FeatureId is the named input that the captured FeatureRecord
  // references. We retag every lineage entry whose featureId matches it.
  const sourceId = (r.inputs.base as { kind: 'feature'; id: string }).id;

  // --- Instance enumeration -------------------------------------------
  // Build an iterator yielding (i, transformFn) pairs covering all
  // count-1 derived instances. Instance 0 = base (no transform applied
  // beyond retag). Order: linear/circular walk i=1..count-1; grid walks
  // (x,y) skipping (0,0) in (x then y) order. We preserve the (x,y)
  // order so historyMap entries match an externally predictable instance
  // numbering: i = x * y.count + y, skipping (0,0).

  type Instance = { i: number; applyTo: (s: OcctBackend) => OcctBackend };
  const instances: Instance[] = [];
  if (pattern.kind === 'linear') {
    for (let i = 1; i < pattern.count; i++) {
      const [dx, dy, dz] = pattern.direction;
      const s = pattern.spacing * i;
      instances.push({
        i,
        applyTo: (sh) => sh.translate(dx * s, dy * s, dz * s),
      });
    }
  } else if (pattern.kind === 'circular') {
    for (let i = 1; i < pattern.count; i++) {
      const ang = (pattern.angleDeg / pattern.count) * i;
      instances.push({
        i,
        applyTo: (sh) => sh.rotate(pattern.axis, ang),
      });
    }
  } else {
    // grid: instance index = x * y.count + y; skip (0,0).
    for (let x = 0; x < pattern.x.count; x++) {
      for (let y = 0; y < pattern.y.count; y++) {
        if (x === 0 && y === 0) continue;
        const idx = x * pattern.y.count + y;
        const tx =
          pattern.x.direction[0] * pattern.x.spacing * x +
          pattern.y.direction[0] * pattern.y.spacing * y;
        const ty =
          pattern.x.direction[1] * pattern.x.spacing * x +
          pattern.y.direction[1] * pattern.y.spacing * y;
        const tz =
          pattern.x.direction[2] * pattern.x.spacing * x +
          pattern.y.direction[2] * pattern.y.spacing * y;
        instances.push({ i: idx, applyTo: (sh) => sh.translate(tx, ty, tz) });
      }
    }
  }

  // --- Cumulative fuse with retagged-per-instance history --------------

  // Instance 0 — base, no transform. Retag its lineage entries.
  // We reuse `base`'s TopoDS directly (no clone), so its face hashes
  // match `tagged0`'s keys. Subsequent fuses build new OcctBackends so
  // base remains untouched.
  const base0Map = (base.historyMap ?? new Map()) as HistoryMap;
  const tagged0 = retagInstance(base0Map, sourceId, 0);
  let cumulative = new OcctBackend(
    base.getReplicadShape() as replicad.Shape3D,
    base.kind,
    tagged0,
  );

  // Hashes are read from `base` directly (not a clone). Cloning may
  // refresh TShape pointers and shift face hashes; reading from `base`
  // keeps them aligned with `base.historyMap`. The transform is applied
  // to a clone so it doesn't mutate `base`.
  const baseInputHashes = base.faceHashes();
  for (const inst of instances) {
    // Clone base, apply transform; propagate history through transform.
    const cloneOfBase = base.clone();
    const transformed = inst.applyTo(cloneOfBase);
    const outputHashes = transformed.faceHashes();
    let transformedMap: HistoryMap;
    if (base.historyMap && outputHashes.length === baseInputHashes.length) {
      transformedMap = propagateTransformHistory(base.historyMap, baseInputHashes, outputHashes);
    } else {
      transformedMap = new Map();   // defensive — no history to propagate
    }
    const taggedInstanceMap = retagInstance(transformedMap, sourceId, inst.i);
    const instanceBackend = new OcctBackend(
      transformed.getReplicadShape() as replicad.Shape3D,
      base.kind,
      taggedInstanceMap,
    );
    // History-aware fuse — same pattern as `case 'boolean':`.
    const fused = fuseWithHistory(cumulative, instanceBackend);
    const newMap = mergeBooleanHistory(cumulative.historyMap, instanceBackend.historyMap, fused);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = replicad.cast(fused.shape as any) as replicad.Shape3D;
    cumulative = new OcctBackend(wrapped, base.kind, newMap);
  }
  const shape: ShapeBackend = cumulative;
  return built(shape);
}
