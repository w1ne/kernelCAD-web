// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Verifier-free best-of-N selection by geometric consensus (arXiv 2608.09706).
//
// Generate N candidate scripts for one prompt, execute all of them, drop the
// ones that fail to run or produce no valid solid, then keep the candidate
// whose geometry agrees most with the others: the MEDOID under a pairwise
// geometric distance. Independent samples that got the part right tend to
// agree with each other; a sample that went wrong goes wrong in its own way,
// so it sits far from the cluster. No judge, no reference, no training.
//
// Distance: symmetric Chamfer distance on sampled surface points — the pooled
// mean point-to-surface distance A→B and B→A from `meshDeviation`. All
// candidates answer the same prompt in the same model frame, so no
// re-alignment is done: a candidate that put the part somewhere else IS a
// different answer.
//
// Pure and host-agnostic: it takes meshes, not scripts or files, so the
// closed loop can use it without pulling in OCCT or node:fs. The host
// (design_loop, the eval runner) executes the scripts and hands meshes in.

import type { RuntimeMesh } from '../../kernel/backends/runtimeMesh';
import { meshDeviation } from '../../modeling/runtime/meshDeviation';

/** One executed candidate. */
export interface ConsensusCandidate {
  /** Caller label, echoed in the scores (e.g. a design_loop attempt id). */
  id?: string;
  /** Candidate source. Its length is the last tie-break (shorter wins). */
  script: string;
  /** World-frame mesh of everything the script produced; null when the
   *  candidate failed to execute or produced no valid solid. */
  mesh: RuntimeMesh | null;
  /** Why `mesh` is null (echoed as the drop reason). */
  invalidReason?: string;
  /** Verify / review gates this candidate passed. First tie-break (more wins). */
  gatesPassed?: number;
}

/** Pairwise distance in mm. Must be symmetric and >= 0. */
export type ConsensusDistance = (a: RuntimeMesh, b: RuntimeMesh) => number;

export interface ConsensusOptions {
  /** Pairwise distance. Default: symmetric Chamfer (`chamferDistanceMm`). */
  distance?: ConsensusDistance;
  /** Mean distances closer than this (mm) count as a tie. Default 1e-6. */
  tieToleranceMm?: number;
}

export interface ConsensusScore {
  index: number;
  id?: string;
  status: 'chosen' | 'ranked' | 'dropped';
  /** Mean distance (mm) to every OTHER valid candidate. Lower = more agreement.
   *  0 when this is the only valid candidate. Absent when dropped. */
  meanDistanceMm?: number;
  /** 1 = chosen. Absent when dropped. */
  rank?: number;
  gatesPassed: number;
  scriptLength: number;
  droppedReason?: string;
}

export interface ConsensusResult {
  /** Index into the input array; null when no candidate is valid. */
  chosenIndex: number | null;
  /** One entry per input candidate, in input order. */
  scores: ConsensusScore[];
  /** N×N pairwise distances (mm) in input order; null where either side was dropped. */
  distances: (number | null)[][];
  /** Why the chosen candidate won (or why none was chosen). */
  reason: string;
}

/** Symmetric Chamfer distance (mm): pooled mean of the sampled point-to-surface
 *  distances A→B and B→A. Deterministic (strided, never random, sampling). */
export function chamferDistanceMm(a: RuntimeMesh, b: RuntimeMesh): number {
  return meshDeviation(a, b).meanDeviationMm;
}

function meshInvalidReason(mesh: RuntimeMesh): string | undefined {
  if (mesh.indices.length < 3 || mesh.positions.length < 9) return 'empty mesh (no triangles)';
  for (let i = 0; i < mesh.positions.length; i++) {
    if (!Number.isFinite(mesh.positions[i])) return 'mesh has non-finite vertex coordinates';
  }
  return undefined;
}

type TieBreak = 'distance' | 'gates' | 'script-length' | 'index';

/** Order two valid candidates: distance (with tolerance), then more gates,
 *  then shorter script, then lower index. Returns the deciding key too. */
function compare(a: ConsensusScore, b: ConsensusScore, tol: number): { order: number; by: TieBreak } {
  const da = a.meanDistanceMm ?? Infinity;
  const db = b.meanDistanceMm ?? Infinity;
  if (Math.abs(da - db) > tol) return { order: da - db, by: 'distance' };
  if (a.gatesPassed !== b.gatesPassed) return { order: b.gatesPassed - a.gatesPassed, by: 'gates' };
  if (a.scriptLength !== b.scriptLength) return { order: a.scriptLength - b.scriptLength, by: 'script-length' };
  return { order: a.index - b.index, by: 'index' };
}

function fmt(mm: number): string {
  return `${mm.toFixed(3)} mm`;
}

/**
 * Pick the geometric medoid of the valid candidates.
 *
 * - Invalid candidates (null or empty mesh) are dropped with a reason.
 * - All invalid → `chosenIndex: null`.
 * - One valid → it is chosen (no agreement to measure; meanDistanceMm = 0).
 * - Ties on mean distance (within `tieToleranceMm`) are broken by more
 *   `gatesPassed`, then shorter script, then lower index. With exactly two
 *   valid candidates the distances always tie, so the tie-break decides.
 *
 * Deterministic: same inputs → same output.
 */
export function selectByConsensus(
  candidates: readonly ConsensusCandidate[],
  options: ConsensusOptions = {},
): ConsensusResult {
  const distance = options.distance ?? chamferDistanceMm;
  const tol = options.tieToleranceMm ?? 1e-6;
  const n = candidates.length;

  const scores: ConsensusScore[] = candidates.map((c, index) => {
    const base = {
      index,
      ...(c.id !== undefined ? { id: c.id } : {}),
      gatesPassed: c.gatesPassed ?? 0,
      scriptLength: c.script.length,
    };
    const droppedReason = c.mesh === null
      ? (c.invalidReason ?? 'candidate did not produce a valid solid')
      : meshInvalidReason(c.mesh);
    return droppedReason !== undefined
      ? { ...base, status: 'dropped' as const, droppedReason }
      : { ...base, status: 'ranked' as const };
  });

  const valid = scores.filter((s) => s.status !== 'dropped').map((s) => s.index);
  const distances: (number | null)[][] = Array.from({ length: n }, () => new Array<number | null>(n).fill(null));
  for (const i of valid) distances[i][i] = 0;
  for (let p = 0; p < valid.length; p++) {
    for (let q = p + 1; q < valid.length; q++) {
      const i = valid[p];
      const j = valid[q];
      const raw = distance(candidates[i].mesh as RuntimeMesh, candidates[j].mesh as RuntimeMesh);
      const d = Number.isFinite(raw) && raw >= 0 ? raw : Infinity;
      distances[i][j] = d;
      distances[j][i] = d;
    }
  }

  if (valid.length === 0) {
    return {
      chosenIndex: null,
      scores,
      distances,
      reason: n === 0
        ? 'No candidates were given.'
        : `All ${n} candidates were dropped (no valid solid); nothing to select.`,
    };
  }

  for (const i of valid) {
    const others = valid.filter((j) => j !== i);
    scores[i].meanDistanceMm = others.length === 0
      ? 0
      : others.reduce((sum, j) => sum + (distances[i][j] as number), 0) / others.length;
  }

  const ranked = valid.map((i) => scores[i]).sort((a, b) => compare(a, b, tol).order);
  ranked.forEach((s, r) => {
    s.rank = r + 1;
  });
  const winner = ranked[0];
  winner.status = 'chosen';

  return { chosenIndex: winner.index, scores, distances, reason: explain(winner, ranked, n, tol) };
}

function explain(winner: ConsensusScore, ranked: ConsensusScore[], n: number, tol: number): string {
  const label = winner.id !== undefined ? `'${winner.id}'` : `#${winner.index}`;
  const dropped = n - ranked.length;
  const droppedText = dropped > 0 ? ` ${dropped} of ${n} dropped as invalid.` : '';
  if (ranked.length === 1) {
    return `Candidate ${label} is the only valid candidate; chosen without a consensus vote.${droppedText}`;
  }
  const runnerUp = ranked[1];
  const { by } = compare(winner, runnerUp, tol);
  const agreement = `mean Chamfer distance ${fmt(winner.meanDistanceMm ?? 0)} to the other ${ranked.length - 1} valid candidate(s)`;
  switch (by) {
    case 'distance':
      return `Candidate ${label} is the geometric medoid: ${agreement} (next best ${fmt(runnerUp.meanDistanceMm ?? 0)}).${droppedText}`;
    case 'gates':
      return `Candidate ${label} ties on agreement (${agreement}); tie broken by more verify gates passed (${winner.gatesPassed} vs ${runnerUp.gatesPassed}).${droppedText}`;
    case 'script-length':
      return `Candidate ${label} ties on agreement (${agreement}) and gates passed; tie broken by the shorter script (${winner.scriptLength} vs ${runnerUp.scriptLength} chars).${droppedText}`;
    case 'index':
      return `Candidate ${label} ties on agreement (${agreement}), gates passed, and script length; the earliest candidate wins.${droppedText}`;
  }
}
