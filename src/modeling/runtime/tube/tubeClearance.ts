// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tube clearance: every tube against every scene part that is not a tube and
// against every other tube, in the world frame.
//
//   - Required distance: the largest `clearance.pairs[].min` naming the two
//     tube systems (either order), else `clearance.default`. A part has no
//     system, so tube-to-part pairs use the default.
//   - A tube against the part that owns one of its ports is measured as a
//     solid rod of the path with the end straight the rule requires at that
//     port trimmed off: the fitting zone is contact by design, the rest of
//     the tube is not exempt. Nothing left after the trim: pair skipped.
//   - Two tubes are always measured in full, shared port or not.
//
// Resilience. A kernel failure on one tube or one pair (bounding box, the
// trimmed-rod sweep, the distance, the shared-volume probe) becomes a warn
// `feature.kernel-failed` naming it; every other pair is still measured.
//
// Cost. Pairs are ordered by the distance between their bounding boxes (a
// lower bound on the true distance) and the exact kernel measurement runs
// only while that bound is below the required distance or below the nearest
// distance already measured for the tube. So each tube pays for the pairs
// that are actually near, and still reports its exact nearest neighbour.

import { getOC } from 'replicad';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { trimPathEnds, type V3 } from '../../../shared/tube/tubePath';
import { tubeSolid } from '../../backends/occt/tubeLowerer';
import { brepExtremaClosest, wrappedShape, type BrepClosest } from '../brepDistance';
import { bboxGap, transformScenePart } from '../dfm/clearance';
import { endStraightNeed, mm2, xyz2, type TubeRuleSpec } from './tubeRules';
import { tubeDiagnostic, type ResolvedTube, type TubeSceneContext } from './tubeScene';

export interface NearestClearance { mm: number; to: string; at: V3 }

/** Distances at or below this are "surfaces touch or cross"; a shared-volume
 *  probe tells which (the DFM clearance thresholds). */
const CONTACT_EPS_MM = 1e-7;
const OVERLAP_EPSILON_MM3 = 0.01;
/** A measured distance this far under the rule still passes: a route drawn
 *  exactly on the limit must not fail on kernel rounding. */
const RULE_TOL_MM = 1e-6;

type Bbox = { min: [number, number, number]; max: [number, number, number] };

/** One measurable solid in the world frame. */
interface Body { name: string; shape: OcctBackend; bbox: Bbox; tube?: ResolvedTube }

interface Pair { tube: TubeBody; other: Body; need: number; side: OcctBackend; lower: number }

function pairNeed(spec: TubeRuleSpec, a: string | undefined, b: string | undefined): number {
  const mins = spec.clearance.pairs
    .filter((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))
    .map((p) => p.min);
  return mins.length > 0 ? Math.max(...mins) : spec.clearance.default;
}

type TubeBody = Body & { tube: ResolvedTube };

function kernelFailed(tube: ResolvedTube, what: string, scope: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'feature.kernel-failed',
    severity: 'warn',
    featureId: tube.id,
    message: `tube.clearance: ${what} failed on tube '${tube.name}'${scope}.`,
    hint: 'The OCCT kernel could not process this geometry: check it for degenerate shapes with evaluate. The remaining pairs were still measured.',
  };
}

const pairScope = (other: string): string => ` and '${other}'; this pair's clearance was not checked`;

/** The tube where it is in the world: its scene part when it has one, else
 *  the shape as built. Undefined when there is nothing to measure. */
function tubeBody(tube: ResolvedTube, diagnostics: CompilerDiagnostic[]): TubeBody | undefined {
  if (tube.scenePart !== undefined) {
    const t = transformScenePart(tube.scenePart, diagnostics);
    return t.shape !== undefined && t.bbox !== undefined ? { name: tube.name, shape: t.shape, bbox: t.bbox, tube } : undefined;
  }
  if (tube.shape === undefined) return undefined;
  try {
    return { name: tube.name, shape: tube.shape, bbox: tube.shape.boundingBox(), tube };
  } catch {
    diagnostics.push(kernelFailed(tube, 'the bounding box', "; the tube's clearance was not checked"));
    return undefined;
  }
}

function obstacleBodies(ctx: TubeSceneContext, diagnostics: CompilerDiagnostic[]): Body[] {
  const parts: SceneBackend['parts'] = ctx.scene?.parts ?? [];
  return parts.filter((p) => !ctx.tubePartNames.has(p.name)).flatMap((p) => {
    const t = transformScenePart(p, diagnostics);
    return t.shape !== undefined && t.bbox !== undefined ? [{ name: p.name, shape: t.shape, bbox: t.bbox }] : [];
  });
}

/** What to measure against `partName`: the whole tube, or, when the part owns
 *  one of the tube's ports, a solid rod with that fitting zone trimmed off.
 *  Undefined when the trim leaves nothing. A tube that was scaled or mirrored
 *  has no placement for the rod and is measured whole. */
function tubeSideAgainst(body: TubeBody, partName: string, spec: TubeRuleSpec): OcctBackend | undefined {
  const { path, od, meta, placement } = body.tube;
  const ownsFrom = meta.from.part === partName;
  const ownsTo = meta.to.part === partName;
  if ((!ownsFrom && !ownsTo) || placement === undefined) return body.shape;
  const trimmed = trimPathEnds(path,
    ownsFrom ? endStraightNeed(od, meta.from, spec) : 0, ownsTo ? endStraightNeed(od, meta.to, spec) : 0);
  if (trimmed === undefined) return undefined;
  return tubeSolid(trimmed, od, od).applyTransform(placement);
}

/** One tube against one part. The trimmed-rod sweep and its bounding box are
 *  kernel calls: a failure skips this pair only. */
function partPair(t: TubeBody, other: Body, spec: TubeRuleSpec, diagnostics: CompilerDiagnostic[]): Pair[] {
  try {
    const side = tubeSideAgainst(t, other.name, spec);
    if (side === undefined) return [];
    const bbox = side === t.shape ? t.bbox : side.boundingBox();
    return [{ tube: t, other, need: spec.clearance.default, side, lower: bboxGap(bbox, other.bbox) }];
  } catch {
    diagnostics.push(kernelFailed(t.tube, 'building the tube without its fitting zone', pairScope(other.name)));
    return [];
  }
}

function buildPairs(tubes: TubeBody[], obstacles: Body[], spec: TubeRuleSpec, diagnostics: CompilerDiagnostic[]): Pair[] {
  const pairs: Pair[] = [];
  tubes.forEach((t, i) => {
    for (const other of obstacles) pairs.push(...partPair(t, other, spec, diagnostics));
    for (const other of tubes.slice(i + 1)) {
      const need = pairNeed(spec, t.tube.meta.system, other.tube.meta.system);
      pairs.push({ tube: t, other, need, side: t.shape, lower: bboxGap(t.bbox, other.bbox) });
    }
  });
  return pairs.sort((a, b) => a.lower - b.lower);
}

function measure(pair: Pair): BrepClosest | undefined {
  try {
    return brepExtremaClosest(getOC(), wrappedShape(pair.side), wrappedShape(pair.other.shape));
  } catch {
    return undefined;
  }
}

/** Touching or crossing: shared volume decides between overlap and contact. */
function contactDiagnostic(pair: Pair, at: V3): CompilerDiagnostic {
  let volume: number;
  try {
    volume = pair.side.intersectionVolume(pair.other.shape);
  } catch {
    return kernelFailed(pair.tube.tube, 'the shared-volume probe', pairScope(pair.other.name));
  }
  const { tube, other, need } = pair;
  if (volume > OVERLAP_EPSILON_MM3) {
    return tubeDiagnostic('tube.clearance.overlap',
      `tube '${tube.name}' passes through '${other.name}' (${mm2(volume)} mm^3 shared).`, tube.tube.id);
  }
  return violation(tube, other.name, 0, need, at);
}

function violation(tube: Pair['tube'], other: string, d: number, need: number, at: V3): CompilerDiagnostic {
  return tubeDiagnostic('tube.clearance.violated',
    `tube '${tube.name}' is ${mm2(d)} mm from '${other}'; the rule needs ${mm2(need)} mm. ` +
    `Closest point on the tube: ${xyz2(at)}.`, tube.tube.id);
}

function classify(pair: Pair, m: BrepClosest): CompilerDiagnostic | undefined {
  if (m.distance <= CONTACT_EPS_MM) return contactDiagnostic(pair, m.onA);
  if (m.distance < pair.need - RULE_TOL_MM) return violation(pair.tube, pair.other.name, m.distance, pair.need, m.onA);
  return undefined;
}

/**
 * Measure every tube against the scene's parts and the other tubes. Appends
 * `tube.clearance.*` (and warn `feature.kernel-failed`) to `diagnostics` and
 * returns each tube's exact nearest neighbour by tube name; a tube with
 * nothing around it has no entry.
 */
export function checkTubeClearance(
  tubes: readonly ResolvedTube[], ctx: TubeSceneContext, spec: TubeRuleSpec, diagnostics: CompilerDiagnostic[],
): Map<string, NearestClearance> {
  const nearest = new Map<string, NearestClearance>();
  const bodies = tubes.flatMap((t) => tubeBody(t, diagnostics) ?? []);
  const best = (name: string): number => nearest.get(name)?.mm ?? Infinity;
  const note = (name: string, mm: number, to: string, at: V3): void => {
    if (mm < best(name)) nearest.set(name, { mm, to, at });
  };
  for (const pair of buildPairs(bodies, obstacleBodies(ctx, diagnostics), spec, diagnostics)) {
    const { tube, other, lower } = pair;
    const nearer = lower < best(tube.name) || (other.tube !== undefined && lower < best(other.name));
    if (lower >= pair.need && !nearer) continue;
    const m = measure(pair);
    if (m === undefined) {
      diagnostics.push(kernelFailed(tube.tube, 'the distance measurement', pairScope(other.name)));
      continue;
    }
    const mm = m.distance <= CONTACT_EPS_MM ? 0 : m.distance;
    note(tube.name, mm, other.name, m.onA);
    if (other.tube !== undefined) note(other.name, mm, tube.name, m.onB);
    const d = classify(pair, m);
    if (d !== undefined) diagnostics.push(d);
  }
  return nearest;
}
