// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import { findRootSheetMetalRecord, sheetMetalPredecessor } from '../../../sheetMetal';
import { planFold, type FlatBend, type FlatBlank, type FoldStep } from '../../../sheetMetalFold';
import {
  lowerSheetMetalBend as bendSheetMetalBody,
  resolveBendAxis,
  type BendAxisSpec,
  type BendBox,
  type BendRecord,
} from '../sheetMetalLowerer';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/** `sheetMetal` — reuses the sketch to extrude pipeline; the record kind
 *  carries the k-factor / sketch plane for `.bend()` and `flattenPattern()`. */
export function lowerSheetMetal(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  // Reuse the sketch→extrude pipeline. Sheet metal differs only in:
  //   (a) the record kind is 'sheetMetal' (threaded for face-label
  //       canonicalization and bend lineage walks);
  //   (b) thickness = depth;
  //   (c) kFactor + sketchPlane carried on metadata for .bend() and
  //       flattenPattern().
  const depth = r.params.thickness.evaluated;
  const sketchInput = ctx.inputs.byKey.sketch as OcctBackend | undefined;
  if (!sketchInput) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'sheetMetal(profile, opts)',
        path: 'profile',
        gotText: 'no sketch input',
        requires:
          'a closed sketch as the FIRST argument — build it with path()...close(); the flat blank outline is what gets thickened',
        example:
          "sheetMetal(path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close(), { thickness: 1.5, kFactor: 0.42 })",
      }),
    });
    return noShape();
  }
  try {
    shape = OcctBackend.extrudeFromSketch(sketchInput, depth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT extrude failed during sheetMetal lowering: ${msg}`,
      hint: 'sheetMetal lowers via the extrude pipeline. Check for self-intersecting profile or near-zero thickness.',
    });
    return noShape();
  }
  return built(shape);
}

/** `sheetMetalBend` — folds a sheet body along a bend line given in flat-blank
 *  coordinates. Earlier bends of the same chain are replayed (pure math) to
 *  locate this bend's zone on the already-folded body. */
export function lowerSheetMetalBend(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'bend(edgeRef, angle, radius)',
        path: 'inputs.base',
        gotText: 'no base shape',
        requires: 'a Shape returned by sheetMetal(...) to chain onto',
        example: "blank.bend({ face: 'right' }, 90, 1.5)",
      }),
    });
    return noShape();
  }
  const records = ctx.allRecords ?? [];
  const rootRec = findRootSheetMetalRecord(r, records);
  if (!rootRec) {
    ctx.diagnostics.push(notSheetMetalDiagnostic(r));
    return noShape();
  }
  const kFactor = rootRec.params.kFactor.evaluated;
  const thickness = rootRec.params.thickness.evaluated;
  const chain = bendChainOf(r, records);
  const flatBox = flatBlankBox(chain, base, rootRec, records);
  const flatBends: FlatBend[] = [];
  let axis: BendAxisSpec | undefined;
  for (const rec of chain) {
    const res = resolveBendAxis({ boundingBox: () => flatBox }, rec.inputs.edges, rec.inputs.face, rec.id, thickness);
    if ('diagnostic' in res) {
      if (rec.id === r.id) ctx.diagnostics.push(res.diagnostic);
      return noShape();
    }
    axis = res.axis;
    flatBends.push(flatBendOf(res.axis, rec));
  }
  const blank: FlatBlank = {
    min: [flatBox.min[0], flatBox.min[1]],
    max: [flatBox.max[0], flatBox.max[1]],
    z0: flatBox.min[2],
    thickness,
    kFactor,
  };
  let steps: FoldStep[];
  try {
    steps = planFold(flatBends, blank);
  } catch (e) {
    ctx.diagnostics.push(foldPlanDiagnostic(r, e));
    return noShape();
  }
  const result = bendSheetMetalBody({
    featureId: r.id,
    base,
    step: steps[steps.length - 1],
    thickness,
    radius: r.params.radius.evaluated,
    kFactor,
    flat: {
      axis: axis!,
      bounds: [flatBox.min[0], flatBox.min[1], flatBox.max[0], flatBox.max[1]],
      z0: flatBox.min[2],
    },
  });
  ctx.diagnostics.push(...result.diagnostics);
  if (!result.shape) return noShape();
  // Persist the bend record on r.metadata for flattenPattern.
  if (result.bendRecord) {
    const md = (r.metadata ??= {}) as Record<string, unknown>;
    md.bendRecord = result.bendRecord;
  }
  const shape: ShapeBackend = result.shape;
  return built(shape);
}

function notSheetMetalDiagnostic(r: FeatureRecord): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'feature.invalid-args',
    featureId: r.id,
    severity: 'error',
    ...invalidArgsText({
      api: 'bend(edgeRef, angle, radius)',
      path: 'the receiving Shape',
      gotText: 'a Shape whose lineage does not root at sheetMetal(...)',
      requires:
        'a sheet-metal body — .bend() reads thickness and kFactor from the root sheetMetal(...) record, so build the blank with sheetMetal(profile, { thickness, kFactor }) first; a box or extrude cannot be bent',
      example:
        "sheetMetal(profile, { thickness: 1.5, kFactor: 0.42 }).bend({ face: 'right' }, 90, 1.5)",
    }),
  };
}

function foldPlanDiagnostic(r: FeatureRecord, e: unknown): CompilerDiagnostic {
  const msg = e instanceof Error ? e.message : String(e);
  return {
    target: 'export-occt',
    code: 'feature.invalid-args',
    featureId: r.id,
    severity: 'error',
    ...invalidArgsText({
      api: 'bend(edgeRef, angle, radius)',
      path: 'edgeRef',
      gotText: msg,
      requires: 'bend lines far enough apart that their bend zones (one bend allowance wide, centred on each line) do not overlap',
      example: "blank.bend({ atX: 20 }, 90, 2).bend({ atX: 80 }, 90, 2)",
    }),
  };
}

/** The sheetMetalBend records from the root to `r` (inclusive), root first. */
function bendChainOf(r: FeatureRecord, records: readonly FeatureRecord[]): FeatureRecord[] {
  const byId = new Map(records.map(x => [x.id, x]));
  const out: FeatureRecord[] = [];
  let cur: FeatureRecord | undefined = r;
  while (cur && cur.kind !== 'sheetMetal') {
    if (cur.kind === 'sheetMetalBend') out.push(cur);
    const prev = sheetMetalPredecessor(cur);
    cur = prev ? byId.get(prev) : undefined;
  }
  return out.reverse();
}

/** Flat blank extents: the first bend of the chain sees the flat body; later
 *  bends reuse the extents the first one recorded. */
function flatBlankBox(
  chain: FeatureRecord[],
  base: OcctBackend,
  root: FeatureRecord,
  records: readonly FeatureRecord[],
): BendBox {
  if (chain.length <= 1) return base.boundingBox();
  const md = (chain[0].metadata as { bendRecord?: Partial<BendRecord> } | undefined)?.bendRecord;
  if (md?.flatBounds && typeof md.flatZ0 === 'number') {
    const [x0, y0, x1, y1] = md.flatBounds;
    return { min: [x0, y0, md.flatZ0], max: [x1, y1, md.flatZ0 + root.params.thickness.evaluated] };
  }
  return sketchBox(root, records) ?? base.boundingBox();
}

/** Fallback: the root sketch's command points (polyline blanks are exact). */
function sketchBox(root: FeatureRecord, records: readonly FeatureRecord[]): BendBox | undefined {
  const ref = root.inputs.sketch;
  if (!ref || ref.kind !== 'feature') return undefined;
  const sketch = records.find(x => x.id === ref.id);
  const cmds = (sketch?.metadata as { commands?: { x?: { evaluated: number }; y?: { evaluated: number } }[] } | undefined)?.commands;
  if (!Array.isArray(cmds)) return undefined;
  const xs = cmds.map(c => c.x?.evaluated).filter((v): v is number => typeof v === 'number');
  const ys = cmds.map(c => c.y?.evaluated).filter((v): v is number => typeof v === 'number');
  if (xs.length < 2 || ys.length < 2) return undefined;
  const t = root.params.thickness.evaluated;
  return { min: [Math.min(...xs), Math.min(...ys), 0], max: [Math.max(...xs), Math.max(...ys), t] };
}

function flatBendOf(axis: BendAxisSpec, rec: FeatureRecord): FlatBend {
  const alongY = Math.abs(axis.direction[1]) > 0.5;
  return {
    orient: alongY ? 'x' : 'y',
    at: alongY ? axis.origin[0] : axis.origin[1],
    angleDeg: rec.params.angle.evaluated,
    radius: rec.params.radius.evaluated,
  };
}
