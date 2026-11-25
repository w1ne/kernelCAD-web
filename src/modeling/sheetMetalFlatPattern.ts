// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/sheetMetalFlatPattern.ts
//
// Flat pattern WITH inner loops. `flattenPattern(records)` recovers the outer
// outline and bend lines from the records alone; holes and cutouts made on
// the blank before bending exist only in the lowered solid, so this lowers
// (or reuses) the blank and reads its top-face inner wires back.
//
// Cuts made AFTER a bend are not in that blank. A cut that opens the still
// flat part of the sheet (the base) appears on the terminal solid's flat top
// plane and is merged in here. A cut that lands on a folded flange cannot be
// projected into the flat pattern by XY; it is refused with
// `feature.flattenPattern.post-bend-geometry` instead of vanishing from the
// DXF.

import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureId } from '../shared/intent/types';
import type { FlatPatternBead, Region, Vec2 } from '../shared/intent/region';
import type { ShapeBackend } from '../kernel/backends/backend';
import type { ParamTable } from '../shared/runtime/paramTable';
import { resolveParams } from '../shared/runtime/resolveParams';
import { KernelError } from '../shared/intent/kernelError';
import { initOcct, OcctBackend } from '../kernel/backends/occt/occtBackend';
import { flatBlankMeta, flattenPattern } from '../kernel/backends/occt/flattenPattern';
import { flatBlankInnerLoops, scanFlatPlaneInnerLoops } from '../kernel/backends/occt/flatBlankLoops';
import { sheetMetalPredecessor } from './sheetMetal';
import { RecomputeEngine } from './compute/recomputeEngine';
import { OcctLowerer } from './backends/occt/occtLowerer';

/** Record kinds that only remove material from the shape below them. */
const SUBTRACTIVE_KINDS = new Set(['hole', 'holes', 'cutout']);

/** Flat-plane scan options: bead footprints are formed features, not holes. */
type FlatLoopOptions = { zTop?: number; excludeBeads?: readonly FlatPatternBead[] };

/**
 * The flat pattern of the sheet-metal Shape `terminalId` (default: the last
 * record), including the holes / cutouts on the blank. `lowered` reuses an
 * existing recompute's shapes; otherwise the records up to the blank (or the
 * whole terminal for post-bend cuts) are lowered here. Throws the same
 * KernelErrors as `flattenPattern`.
 */
export async function flattenPatternWithHoles(
  records: readonly FeatureRecord[],
  terminalId?: string,
  lowered?: ReadonlyMap<FeatureId, ShapeBackend>,
  paramTable?: ParamTable,
): Promise<Region> {
  // The lowerers receive parameter-resolved records, but this JS-side outline
  // reconstruction reads the sketch commands directly. Resolve that same
  // source record set here so a ParamRef-driven blank agrees with its BREP.
  const resolvedRecords = paramTable
    ? records.map(record => resolveParams(record, paramTable) as FeatureRecord)
    : records;
  const { blankId, thickness, beads } = flatBlankMeta(resolvedRecords, terminalId);
  const terminalRecordId = terminalId ?? records[records.length - 1]?.id;
  const postBend = postBendRecords(records, terminalRecordId);
  const postBendCuts = postBend.filter(isSubtractiveRecord);
  assertPostBendSupported(terminalRecordId, postBend);

  const shapes = await resolveFlatShapes(records, blankId, terminalRecordId, postBendCuts.length > 0, lowered, paramTable);
  const beadOpts = beads.length > 0 && thickness !== undefined
    ? { zTop: thickness, excludeBeads: beads }
    : undefined;
  const blankHoles = shapes.blank instanceof OcctBackend
    ? flatBlankInnerLoops(shapes.blank, beadOpts)
    : [];
  const holes = postBendCuts.length === 0
    ? blankHoles
    : mergePostBendHoles(shapes, blankHoles, postBendCuts.length, terminalRecordId, beadOpts);
  return flattenPattern(resolvedRecords, terminalId, { holes });
}

/** Root-first chain from the sheetMetal root to the terminal record. */
function flattenChain(records: readonly FeatureRecord[], terminalId: string | undefined): FeatureRecord[] {
  if (terminalId === undefined) return [];
  const byId = new Map(records.map((r) => [r.id, r]));
  const chain: FeatureRecord[] = [];
  let cur = byId.get(terminalId);
  while (cur) {
    chain.push(cur);
    if (cur.kind === 'sheetMetal') break;
    const prev = sheetMetalPredecessor(cur);
    cur = prev === undefined ? undefined : byId.get(prev);
  }
  return chain.reverse();
}

/** Every record applied after the first bend, in root-to-terminal order. */
function postBendRecords(records: readonly FeatureRecord[], terminalId: string | undefined): FeatureRecord[] {
  const chain = flattenChain(records, terminalId);
  const firstBend = chain.findIndex((r) => r.kind === 'sheetMetalBend');
  return firstBend < 0 ? [] : chain.slice(firstBend + 1);
}

function isSubtractiveRecord(rec: FeatureRecord): boolean {
  if (SUBTRACTIVE_KINDS.has(rec.kind)) return true;
  return rec.kind === 'boolean' && String(rec.params.op?.expression).replace(/'/g, '') === 'difference';
}

/** Virtual declarations (datum, dimension, drawing review) and suppressed
 *  records carry no B-rep change, so they cannot alter the flat pattern. */
function isDisplayOnly(rec: FeatureRecord): boolean {
  return rec.metadata?.virtual === true || rec.suppressed === true;
}

/** A post-bend union / fillet / emboss changes geometry the flat pattern
 *  cannot reconstruct from the root sketch. Do not drop it silently. */
function assertPostBendSupported(
  terminalRecordId: string | undefined,
  postBend: readonly FeatureRecord[],
): void {
  const unsupported = postBend.filter(
    (r) => r.kind !== 'sheetMetalBend' && !isSubtractiveRecord(r) && !isDisplayOnly(r),
  );
  if (unsupported.length === 0) return;
  throw postBendGeometryError(
    terminalRecordId,
    `post-bend ${unsupported.map((r) => `'${r.id}' (${r.kind})`).join(', ')}`,
  );
}

/** Reuse the caller's lowered shapes; otherwise lower up to the blank, or the
 *  whole chain once when the folded terminal solid is needed. */
async function resolveFlatShapes(
  records: readonly FeatureRecord[],
  blankId: string,
  terminalRecordId: string | undefined,
  needTerminal: boolean,
  lowered: ReadonlyMap<FeatureId, ShapeBackend> | undefined,
  paramTable: ParamTable | undefined,
): Promise<{ blank: ShapeBackend | undefined; terminal: ShapeBackend | undefined }> {
  let blank = lowered?.get(blankId);
  let terminal = terminalRecordId === blankId ? blank : lowered?.get(terminalRecordId as FeatureId);
  const needFullChain = needTerminal && !(terminal instanceof OcctBackend);
  if (blank instanceof OcctBackend && !needFullChain) return { blank, terminal };
  await initOcct();
  const lastId = needTerminal ? terminalRecordId : blankId;
  const upTo = records.findIndex((r) => r.id === lastId);
  const run = await new RecomputeEngine(new OcctLowerer())
    .run(records.slice(0, upTo + 1), paramTable ? { paramTable } : undefined);
  blank = run.shapes.get(blankId);
  if (needTerminal) terminal = run.shapes.get(terminalRecordId as FeatureId);
  return { blank, terminal };
}

/** Read the folded solid's flat top plane and merge those openings in. Refuse
 *  when an opening is on a flange or a cut left no closed opening. */
function mergePostBendHoles(
  shapes: { blank: ShapeBackend | undefined; terminal: ShapeBackend | undefined },
  blankHoles: readonly Vec2[][],
  postBendCutCount: number,
  terminalRecordId: string | undefined,
  beadOpts: FlatLoopOptions | undefined,
): Vec2[][] {
  const { blank, terminal } = shapes;
  if (!(terminal instanceof OcctBackend) || !(blank instanceof OcctBackend)) {
    throw postBendGeometryError(terminalRecordId, 'the folded solid could not be lowered');
  }
  const folded = terminal.getReplicadShape() as unknown as { solids?: readonly unknown[] };
  const solidCount = folded.solids?.length ?? 1;
  if (solidCount !== 1) {
    throw postBendGeometryError(
      terminalRecordId,
      `the folded solid has ${solidCount} separate bodies; a flat pattern must be one body`,
    );
  }
  const bb = blank.boundingBox();
  const scan = scanFlatPlaneInnerLoops(terminal, beadOpts?.zTop ?? bb.max[2], bb.min[2], {
    excludeBeads: beadOpts?.excludeBeads,
  });
  if (scan.offPlaneFaces.length > 0) {
    const face = scan.offPlaneFaces[0];
    throw postBendGeometryError(
      terminalRecordId,
      `a post-bend opening is not on the flat base plane (face centre ${face.center.map((v) => v.toFixed(1)).join(', ')}` +
        `, ${face.planar ? 'planar' : 'curved'}); its XYZ projection is not the flat pattern`,
    );
  }
  const holes = mergeLoops(blankHoles, scan.loops);
  const added = holes.length - blankHoles.length;
  if (added < postBendCutCount) {
    throw postBendGeometryError(
      terminalRecordId,
      `${postBendCutCount} post-bend cut(s) but only ${added} new closed opening(s) on the flat base plane`,
    );
  }
  return holes;
}

function postBendGeometryError(terminalId: string | undefined, detail: string): KernelError {
  return new KernelError(
    'feature.flattenPattern.post-bend-geometry',
    `flattenPattern: ${detail}.`,
    terminalId,
    'flatten-post-bend — put the cut on the flat blank before .bend() (its holes unfold exactly), keep post-bend cuts on the unbent base plane, or return the flat blank shape directly.',
  );
}

/** Merge loops, keeping the blank copy when the same opening appears twice. */
function mergeLoops(blank: readonly Vec2[][], terminal: readonly Vec2[][]): Vec2[][] {
  const out = blank.map((loop) => loop.slice());
  const seen = new Set(out.map(loopKey));
  for (const loop of terminal) {
    const key = loopKey(loop);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(loop.slice());
  }
  return out;
}

/** Quantized centroid + area + vertex count: the same opening has one key. */
function loopKey(poly: readonly Vec2[]): string {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  const area = twiceArea / 2;
  if (Math.abs(area) < 1e-9) {
    return `degenerate|${poly.length}|${poly[0]?.[0].toFixed(3) ?? ''}|${poly[0]?.[1].toFixed(3) ?? ''}`;
  }
  return [cx / (6 * area), cy / (6 * area), Math.abs(area), poly.length]
    .map((v) => (typeof v === 'number' ? v.toFixed(3) : String(v)))
    .join('|');
}
