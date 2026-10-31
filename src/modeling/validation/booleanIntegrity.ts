// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Detached-material guard: a `subtract()` that severs the only connection to
// a piece of the body leaves that piece floating.
//
// `union()` has its own guard (`union.disconnected`): operands that never
// fused. A subtraction has the mirror-image failure. Removing material cannot
// create bodies, so if the result has more separate solids than the body it
// cut, the cut went clean through the piece's only connection and left a
// remnant behind. CADGenBench 207 is the reported case: the model cut a band
// across the middle of three bosses inside a closed shell, which shortened
// them but left the upper stubs floating. The STEP was watertight, every
// solid was valid, the official gate passed, and the part was simply wrong.
//
// Rules:
//   - only `difference` records are judged; an `intersection` can legitimately
//     return several pieces (a slab through a U-shaped body) and the intended
//     result is not inferable from the count;
//   - the base operand's own solid count is the baseline, so an imported or
//     already-multi-solid body is not blamed for its input;
//   - a result used only as a cutting tool (`cutter_*` of a later boolean,
//     directly or through pattern/mirror) is exempt, exactly like the union
//     guard: separate cutters are legitimate;
//   - a result that later flows into a `union()` is exempt too. A cut may
//     split one body into several so a later fuse can put them back together
//     (a bore through a scalloped ring leaves 8 lobe segments that the web
//     then joins); the union guard judges the fused result, so flagging the
//     intermediate would be a false positive;
//   - zero-volume fusion slivers are filtered by `realSolids`;
//   - the failure path names the detached pieces (bbox, volume, gap), which is
//     what the repair loop needs to extend the cut or stop it earlier.
//
// Emitted from the shared evaluate seam and the export seam, so `evaluate`,
// `/__kernelcad/review` and the CADGenBench gate all carry it.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId, Vec3 } from '../../shared/intent/types';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { getOC } from 'replicad';
import { brepExtremaDistance, wrappedShape } from '../runtime/brepDistance';
import { realSolids, safeVolume } from './solidComponents';

/** Cap on the number of detached pieces named in one message. */
const MAX_NAMED_PIECES = 6;

export interface BooleanIntegrityInput {
  records: readonly FeatureRecord[];
  shapes: ReadonlyMap<FeatureId, ShapeBackend>;
  /**
   * Severity of a detached-material finding. Default 'error' (the export
   * seam: a scored STEP that carries loose material is not the requested
   * part). The evaluate seam passes 'warn': a subtract that separates
   * material is sometimes a deliberate stock-removal or split cut whose
   * leftover the author still has to remove, so it is reported for the
   * author and the repair loop without failing an otherwise sound design.
   */
  severity?: 'error' | 'warn';
}

type Box = { min: Vec3; max: Vec3 };

interface Piece {
  shape: OcctBackend;
  box: Box;
  volume: number;
}

const fmt = (v: number, digits = 2) => String(Number(v.toFixed(digits)));
const fmtBox = (b: Box) =>
  `[${b.min.map(v => fmt(v, 1)).join(', ')}] → [${b.max.map(v => fmt(v, 1)).join(', ')}] mm`;

function isDifference(r: FeatureRecord): boolean {
  return r.kind === 'boolean' && r.params.op?.expression === "'difference'" && !r.suppressed;
}

function isUnion(r: FeatureRecord): boolean {
  return r.kind === 'boolean' && r.params.op?.expression === "'union'" && !r.suppressed;
}

interface Consumers {
  /** Feature ids whose result later flows into a `union()` (directly or
   *  through a pattern/mirror copy). Those pieces can be fused back; the
   *  union guard judges the fused result. */
  bridgedByUnion: ReadonlySet<FeatureId>;
  /** Feature ids whose every consumer is a cutting tool. */
  toolOnly: ReadonlySet<FeatureId>;
}

function consumerGraph(records: readonly FeatureRecord[]): Consumers {
  const uses = new Map<FeatureId, Array<{ c: FeatureRecord; key: string }>>();
  for (const c of records) {
    for (const [key, ref] of Object.entries(c.inputs)) {
      if (ref.kind !== 'feature') continue;
      const list = uses.get(ref.id) ?? [];
      list.push({ c, key });
      uses.set(ref.id, list);
    }
  }

  const toolMemo = new Map<FeatureId, boolean>();
  const isTool = (id: FeatureId, seen: Set<FeatureId>): boolean => {
    const cached = toolMemo.get(id);
    if (cached !== undefined) return cached;
    const list = uses.get(id);
    if (list === undefined || list.length === 0) return false;
    const result = list.every(({ c, key }) => {
      if (c.kind === 'boolean') return !isUnion(c) && key.startsWith('cutter_');
      if ((c.kind === 'pattern' || c.kind === 'mirror') && !seen.has(c.id)) {
        seen.add(c.id);
        return isTool(c.id, seen);
      }
      return false;
    });
    toolMemo.set(id, result);
    return result;
  };

  const bridgeMemo = new Map<FeatureId, boolean>();
  const reachesUnion = (id: FeatureId, seen: Set<FeatureId>): boolean => {
    const cached = bridgeMemo.get(id);
    if (cached !== undefined) return cached;
    const list = uses.get(id) ?? [];
    const result = list.some(({ c }) => {
      if (isUnion(c)) return true;
      if ((c.kind === 'pattern' || c.kind === 'mirror') && !seen.has(c.id)) {
        seen.add(c.id);
        return reachesUnion(c.id, seen);
      }
      return false;
    });
    bridgeMemo.set(id, result);
    return result;
  };

  const toolOnly = new Set<FeatureId>();
  const bridgedByUnion = new Set<FeatureId>();
  for (const id of uses.keys()) {
    if (isTool(id, new Set())) toolOnly.add(id);
    if (reachesUnion(id, new Set())) bridgedByUnion.add(id);
  }
  return { toolOnly, bridgedByUnion };
}

/** Operand shape of the base of a boolean; undefined when it did not lower. */
function baseShape(
  r: FeatureRecord,
  shapes: ReadonlyMap<FeatureId, ShapeBackend>,
  byId: ReadonlyMap<FeatureId, FeatureRecord>,
): ShapeBackend | undefined {
  const ref = r.inputs.base;
  if (ref === undefined || ref.kind !== 'feature' || !byId.has(ref.id)) return undefined;
  return shapes.get(ref.id);
}

function piecesOf(s: ShapeBackend): Piece[] {
  return realSolids(s).map(shape => ({
    shape,
    box: shape.boundingBox() as Box,
    volume: safeVolume(shape),
  }));
}

function boxGap(a: Box, b: Box): number {
  let sum = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.max(0, a.min[k] - b.max[k], b.min[k] - a.max[k]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** BREP distance between two solids, with the AABB gap as fallback. */
function gapMm(a: Piece, b: Piece): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const d = brepExtremaDistance(oc, wrappedShape(a.shape), wrappedShape(b.shape));
    if (d !== undefined && Number.isFinite(d)) return Math.max(0, d);
  } catch {
    // fall through to the bounding-box gap
  }
  return boxGap(a.box, b.box);
}

export function detectDetachedMaterial(input: BooleanIntegrityInput): CompilerDiagnostic[] {
  const differences = input.records.filter(isDifference);
  if (differences.length === 0) return [];
  const byId = new Map(input.records.map(r => [r.id, r] as const));
  const consumers = consumerGraph(input.records);

  const out: CompilerDiagnostic[] = [];
  for (const r of differences) {
    if (consumers.toolOnly.has(r.id)) continue;
    if (consumers.bridgedByUnion.has(r.id)) continue;
    const result = input.shapes.get(r.id);
    if (result === undefined) continue;
    const pieces = piecesOf(result);
    if (pieces.length <= 1) continue;

    const base = baseShape(r, input.shapes, byId);
    if (base === undefined) continue;
    const baseCount = Math.max(1, piecesOf(base).length);
    if (pieces.length <= baseCount) continue;

    out.push(detached(r, pieces, baseCount, input.severity ?? 'error'));
  }
  return out;
}

function detached(
  r: FeatureRecord,
  pieces: Piece[],
  baseCount: number,
  severity: 'error' | 'warn',
): CompilerDiagnostic {
  // Largest piece is the body; every other piece is material the cut severed.
  const ordered = [...pieces].sort((a, b) => b.volume - a.volume);
  const [main, ...floating] = ordered;
  const named = floating.slice(0, MAX_NAMED_PIECES).map(p =>
    `bbox ${fmtBox(p.box)}, ${fmt(p.volume, 1)} mm³, gap ${fmt(gapMm(main, p))} mm to the main body`);
  const rest = floating.length > MAX_NAMED_PIECES
    ? ` and ${floating.length - MAX_NAMED_PIECES} more`
    : '';
  const pieceWord = floating.length === 1 ? 'piece' : 'pieces';
  return {
    target: 'export-occt',
    code: 'feature.boolean.detached-material',
    severity,
    featureId: r.id,
    ...(r.scriptLocation !== undefined ? { scriptLocation: r.scriptLocation } : {}),
    message:
      `subtract() left ${floating.length} detached ${pieceWord} of material: the result is ` +
      `${pieces.length} separate solids but the body it cut was ${baseCount}. ` +
      `Detached: ${named.join('; ')}${rest}. ` +
      'Material that is not connected to the body is a modelling error, not a feature.',
    hint:
      'A cut must not sever the only connection to material you keep. Extend the cutter so it removes ' +
      'the detached remnant completely (cut from the free end up to the target face instead of a band ' +
      'across the middle), or stop the cut before the pieces separate. If the pieces are separate parts, ' +
      'build each with assembly().part(name, shape).',
    nextAction: NEXT_ACTIONS['feature.boolean.detached-material'],
  };
}
