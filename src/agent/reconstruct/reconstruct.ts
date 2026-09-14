// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/reconstruct.ts
//
// Mesh → editable feature tree, end to end: measure once, then up to four
// fit/emit/verify passes, each tightening the simplification tolerance and
// the snap grid (the last pass snaps nothing). The first pass that is
// faithful by the metric wins; otherwise the pass with the best volume IoU.
// The verdict is computed from the measured numbers against thresholds that
// are echoed back — the tool never reports `faithful` on its own say-so.
//
// The evaluator (script → tessellated mesh) is injected so this module stays
// free of OCCT and `node:` imports; the MCP tool and CLI supply the real one.

import type { AssumptionFact, AssumptionLedger } from '../vision/ledger';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { analyseMesh, type MeshAnalysis, type UnmatchedCandidate, type UnmatchedRegion } from './analysis';
import { buildPlan, type FeaturePlan, type PassParams } from './plan';
import { emitScript, num } from './emit';
import {
  classifyFidelity,
  maxDistanceToMesh,
  surfaceDeviation,
  volumeIoU,
  type FidelityThresholds,
  type FidelityVerdict,
  type TriMesh,
} from './fidelity';
import type { MeshReport } from './meshClean';
import type { TriangleSoup } from './meshIO';

export type ReconstructEvaluator = (
  script: string,
) => Promise<{ ok: true; mesh: TriMesh; holes?: Array<{ diameterMm: number; depthMm: number; kind: 'blind' | 'through' }> } | { ok: false; error: string; errorCode?: string }>;

export interface ReconstructOptions {
  /** Name shown in the script banner. */
  sourceName?: string;
  /** Minimum volume IoU for `faithful`. Default 0.98. */
  minIoU?: number;
  /** Maximum surface deviation (mm) for `faithful`. Default max(0.25, 0.1 % of the bbox diagonal). */
  maxDeviationMm?: number;
  /** Refinement passes, 1–4. Default 4. */
  maxPasses?: number;
  /** Vertex weld distance (mm). */
  weldToleranceMm?: number;
}

export interface FidelityReport {
  maxDeviationMm: number;
  rmsMm: number;
  volumeIoU: number;
  verdict: FidelityVerdict;
  thresholds: FidelityThresholds;
  meshVolumeMm3: number;
  reconstructedVolumeMm3: number;
  /** Pass (0-based) whose script is returned. */
  pass: number;
}

export interface PassSummary {
  pass: number;
  epsMm: number;
  snapToleranceMm: number;
  ok: boolean;
  volumeIoU?: number;
  maxDeviationMm?: number;
  rmsMm?: number;
  verdict?: FidelityVerdict;
  error?: string;
  errorCode?: string;
}

export interface ReconstructSuccess {
  ok: true;
  script: string;
  ledger: AssumptionLedger;
  fidelity: FidelityReport;
  unmatchedRegions: UnmatchedRegion[];
  mesh: Omit<MeshReport, 'crackClusters'> & { crackClusters: MeshReport['crackClusters'] };
  features: {
    body: 'revolve' | 'extrude';
    bodyBlocks: number;
    holes: FeaturePlan['holeSummary'];
    cutouts: number;
    booleanRemainders: number;
    params: Array<{ name: string; value: number; measured: number; snapped: boolean }>;
    extrusionAxis: [number, number, number];
  };
  /** Measured by the hole detector on the reconstructed B-rep, when the evaluator provides it. */
  reconstructedHoles?: Array<{ diameterMm: number; depthMm: number; kind: 'blind' | 'through' }>;
  passes: PassSummary[];
  notRepresented: string[];
  diagnostics: CompilerDiagnostic[];
}

export interface ReconstructFailure {
  ok: false;
  error: string;
  errorCode?: string;
  passes?: PassSummary[];
  mesh?: MeshReport;
  diagnostics: CompilerDiagnostic[];
}

export type ReconstructResult = ReconstructSuccess | ReconstructFailure;

interface PassOutcome {
  plan: FeaturePlan;
  script: string;
  summary: PassSummary;
  unmatched?: UnmatchedRegion[];
  metrics?: { volumeIoU: number; maxDeviationMm: number; rmsMm: number; reconVolume: number; meshVolume: number };
  holes?: Array<{ diameterMm: number; depthMm: number; kind: 'blind' | 'through' }>;
}

export async function reconstructFromSoup(
  soup: TriangleSoup,
  evaluate: ReconstructEvaluator,
  opts: ReconstructOptions = {},
): Promise<ReconstructResult> {
  const analysis = analyseMesh(soup, opts.weldToleranceMm);
  if (analysis.bands.length === 0 || analysis.report.triangles < 4) {
    return {
      ok: false,
      error: 'mesh_to_features: the mesh has no usable volume — no band of material could be sectioned.',
      errorCode: 'cli.invalid-args',
      mesh: analysis.report,
      diagnostics: [],
    };
  }
  const thresholds: FidelityThresholds = {
    minIoU: opts.minIoU ?? 0.98,
    maxDeviationMm: opts.maxDeviationMm ?? Math.max(0.25, 0.001 * analysis.diagonal),
    approximateIoU: 0.85,
  };
  const maxPasses = Math.max(1, Math.min(4, opts.maxPasses ?? 4));
  const noise = analysis.seg.noiseMm;
  const eps0 = Math.max(0.02, 3 * noise, 1e-4 * analysis.diagonal);
  const snap0 = Math.max(0.01, 3 * noise);
  // Pass 0 fits at the measured noise; pass 1 tightens fit and snap; pass 2
  // loosens both (a noisier mesh than the estimate says); pass 3 snaps nothing
  // and spells out every depth, the most literal reading of the mesh.
  const schedule: PassParams[] = [
    { index: 0, eps: eps0, snapTol: snap0, angleTolDeg: 2, allowThroughKeyword: true },
    { index: 1, eps: eps0 / 2, snapTol: snap0 / 2, angleTolDeg: 1, allowThroughKeyword: true },
    { index: 2, eps: eps0 * 2.5, snapTol: snap0 * 2, angleTolDeg: 3, allowThroughKeyword: true },
    { index: 3, eps: eps0 / 4, snapTol: 0, angleTolDeg: 0, allowThroughKeyword: false },
  ].slice(0, maxPasses);

  const sourceName = opts.sourceName ?? `a ${soup.format.toUpperCase()} mesh`;
  const meshTri: TriMesh = { positions: analysis.mesh.positions, indices: analysis.mesh.triangles };
  const outcomes: PassOutcome[] = [];
  let winner: PassOutcome | undefined;
  for (const pass of schedule) {
    let plan: FeaturePlan;
    try {
      plan = buildPlan(analysis, pass);
    } catch (e) {
      outcomes.push({
        plan: undefined as unknown as FeaturePlan,
        script: '',
        summary: { pass: pass.index, epsMm: pass.eps, snapToleranceMm: pass.snapTol, ok: false, error: `planning failed: ${e instanceof Error ? e.message : String(e)}` },
      });
      continue;
    }
    const script = emitScript(plan, { frame: analysis.frame, sourceName });
    const evaluated = await evaluate(script);
    if (!evaluated.ok) {
      outcomes.push({
        plan,
        script,
        summary: { pass: pass.index, epsMm: pass.eps, snapToleranceMm: pass.snapTol, ok: false, error: evaluated.error, errorCode: evaluated.errorCode },
      });
      continue;
    }
    const iou = volumeIoU(meshTri, evaluated.mesh);
    const dev = surfaceDeviation(meshTri, evaluated.mesh);
    const metrics = {
      volumeIoU: iou.iou,
      maxDeviationMm: dev.maxDeviationMm,
      rmsMm: dev.rmsDeviationMm,
      reconVolume: iou.volumeB,
      meshVolume: iou.volumeA,
    };
    const unmatched = unmatchedAgainst(analysis, evaluated.mesh, thresholds.maxDeviationMm);
    const verdict = classifyFidelity(metrics, thresholds, analysis.report.watertight, unmatched.length);
    const outcome: PassOutcome = {
      plan,
      script,
      metrics,
      unmatched,
      holes: evaluated.holes,
      summary: {
        pass: pass.index,
        epsMm: pass.eps,
        snapToleranceMm: pass.snapTol,
        ok: true,
        volumeIoU: metrics.volumeIoU,
        maxDeviationMm: metrics.maxDeviationMm,
        rmsMm: metrics.rmsMm,
        verdict,
      },
    };
    outcomes.push(outcome);
    if (verdict === 'faithful') {
      winner = outcome;
      break;
    }
  }
  if (!winner) {
    const measured = outcomes.filter((o) => o.metrics);
    measured.sort((a, b) => b.metrics!.volumeIoU - a.metrics!.volumeIoU || a.metrics!.maxDeviationMm - b.metrics!.maxDeviationMm);
    winner = measured[0];
  }
  const passes = outcomes.map((o) => o.summary);
  if (!winner || !winner.metrics) {
    const last = outcomes[outcomes.length - 1];
    return {
      ok: false,
      error: `mesh_to_features: no pass produced a script that evaluates (last error: ${last?.summary.error ?? 'none'}).`,
      errorCode: last?.summary.errorCode ?? 'cli.script-exception',
      passes,
      mesh: analysis.report,
      diagnostics: [],
    };
  }

  const m = winner.metrics;
  const verdict = winner.summary.verdict!;
  const fidelity: FidelityReport = {
    maxDeviationMm: m.maxDeviationMm,
    rmsMm: m.rmsMm,
    volumeIoU: m.volumeIoU,
    verdict,
    thresholds,
    meshVolumeMm3: m.meshVolume,
    reconstructedVolumeMm3: m.reconVolume,
    pass: winner.summary.pass,
  };
  const script = emitScript(winner.plan, {
    frame: analysis.frame,
    sourceName,
    headerNotes: [
      `Measured fidelity vs the mesh: volume IoU ${m.volumeIoU.toFixed(4)}, max deviation ${m.maxDeviationMm.toFixed(3)} mm,`,
      `RMS ${m.rmsMm.toFixed(3)} mm — verdict ${verdict} (thresholds: IoU >= ${thresholds.minIoU}, max dev <= ${num(thresholds.maxDeviationMm)} mm).`,
    ],
  });

  const unmatched = winner.unmatched ?? [];
  const ledger = buildMeshLedger(analysis, winner.plan, soup, unmatched);
  const diagnostics = buildDiagnostics(analysis, fidelity, unmatched);
  const plan = winner.plan;
  return {
    ok: true,
    script,
    ledger,
    fidelity,
    unmatchedRegions: unmatched,
    mesh: analysis.report,
    features: {
      body: plan.body.kind,
      bodyBlocks: plan.body.kind === 'revolve' ? plan.body.steps.length : plan.body.blocks.length,
      holes: plan.holeSummary,
      cutouts: plan.ops.filter((o) => o.kind === 'cutout').length,
      booleanRemainders: plan.ops.filter((o) => o.kind === 'subtractCylinder' || o.kind === 'subtractPrism').length,
      params: plan.params.map((p) => ({ name: p.name, value: p.value, measured: round6(p.measured), snapped: p.snapped })),
      extrusionAxis: analysis.frame.axis,
    },
    ...(winner.holes ? { reconstructedHoles: winner.holes } : {}),
    passes,
    notRepresented: plan.notRepresented,
    diagnostics,
  };
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * The candidate regions (surface no feature type names) that the emitted
 * script actually misses: a region whose vertices all lie within the faithful
 * deviation bound of the reconstruction is reproduced, whatever its
 * segmentation label; the rest are reported.
 */
function unmatchedAgainst(an: MeshAnalysis, recon: TriMesh, boundMm: number): UnmatchedRegion[] {
  const out: UnmatchedRegion[] = [];
  for (const c of an.unmatched) {
    const pts = regionPoints(an, c);
    const dist = maxDistanceToMesh(pts, recon);
    if (dist <= boundMm) continue;
    const { tris: _tris, ...summary } = c;
    void _tris;
    out.push({ ...summary, distanceToReconstructionMm: Math.round(dist * 1000) / 1000 });
  }
  return out;
}

function regionPoints(an: MeshAnalysis, c: UnmatchedCandidate): Float64Array {
  const seen = new Set<number>();
  const pts: number[] = [];
  for (const t of c.tris) {
    for (let k = 0; k < 3; k++) {
      const v = an.mesh.triangles[t * 3 + k];
      if (seen.has(v)) continue;
      seen.add(v);
      pts.push(an.mesh.positions[v * 3], an.mesh.positions[v * 3 + 1], an.mesh.positions[v * 3 + 2]);
    }
  }
  return Float64Array.from(pts);
}

export function buildMeshLedger(an: MeshAnalysis, plan: FeaturePlan, soup: TriangleSoup, unmatched: UnmatchedRegion[]): AssumptionLedger {
  const facts: AssumptionFact[] = [];
  const bbox = an.report.bbox;
  facts.push(
    soup.unitDeclared
      ? {
          id: 'units',
          statement: `The ${soup.format.toUpperCase()} file declares its unit as '${soup.unit}'; coordinates were converted to millimetres.`,
          kind: 'visible',
          evidence: { source: 'mesh' },
          value: 'mm',
          confidence: 1,
          resolution: 'confirmed',
        }
      : {
          id: 'units',
          statement: `${soup.format.toUpperCase()} carries no unit; coordinates were read as millimetres (bbox ${num(bbox.max[0] - bbox.min[0])} x ${num(bbox.max[1] - bbox.min[1])} x ${num(bbox.max[2] - bbox.min[2])}).`,
          kind: 'assumed',
          evidence: { source: 'mesh' },
          value: 'mm',
          confidence: 0.5,
          resolution: 'open',
        },
  );
  facts.push({
    id: 'mesh.watertight',
    statement: an.report.watertight
      ? `The mesh is closed and consistently oriented (${an.report.triangles} triangles).`
      : `The mesh is NOT watertight: ${an.report.openEdges} open, ${an.report.nonManifoldEdges} non-manifold and ${an.report.inconsistentEdges} mis-oriented edges; sections near them may be incomplete.`,
    kind: 'visible',
    evidence: { source: 'mesh' },
    value: { watertight: an.report.watertight, openEdges: an.report.openEdges, nonManifoldEdges: an.report.nonManifoldEdges },
    confidence: 1,
    resolution: an.report.watertight ? 'confirmed' : 'open',
  });
  facts.push({
    id: 'frame.axis',
    statement: `Extrusion axis inferred as [${an.frame.axis.map(num).join(', ')}]: it explains ${(an.frame.chosen.explainedFraction * 100).toFixed(1)} % of the surface as caps, walls or cross bores in ${an.frame.chosen.bands} band(s)${an.frame.axisSnapped ? `, after snapping a ${an.frame.axisSnapDeg.toFixed(3)}° tilt onto the world axis` : ''}.`,
    kind: 'inferred',
    evidence: { source: 'mesh' },
    value: an.frame.axis,
    confidence: Math.max(0, Math.min(1, an.frame.chosen.explainedFraction)),
    resolution: 'open',
  });
  for (const p of plan.params) {
    facts.push(
      p.snapped
        ? {
            id: p.name,
            statement: `${p.description} Measured ${num(p.measured)} mm, snapped to ${num(p.value)} mm (grid ${p.grid}).`,
            kind: 'inferred',
            evidence: { source: 'mesh' },
            value: p.value,
            confidence: Math.max(0, Math.min(1, 1 - Math.abs(p.value - p.measured) / Math.max(1e-9, plan.pass.snapTol))),
            resolution: 'open',
          }
        : {
            id: p.name,
            statement: `${p.description} Measured ${num(p.measured)} mm, used as measured.`,
            kind: 'visible',
            evidence: { source: 'mesh' },
            value: p.value,
            confidence: 1,
            resolution: 'confirmed',
          },
    );
  }
  if (plan.literalSnaps.length > 0) {
    facts.push({
      id: 'profile.snaps',
      statement: `${plan.literalSnaps.length} literal coordinate(s) (profile corners, arc centres, bore positions, origin) were snapped to a round grid within ${num(plan.pass.snapTol)} mm.`,
      kind: 'inferred',
      evidence: { source: 'mesh' },
      value: plan.literalSnaps.map((s) => ({ what: s.what, measured: round6(s.measured), value: s.value })),
      confidence: 1 - Math.max(...plan.literalSnaps.map((s) => Math.abs(s.value - s.measured))) / Math.max(1e-9, plan.pass.snapTol),
      resolution: 'open',
    });
  }
  plan.holeSummary.forEach((h) => {
    facts.push({
      id: `${h.name}.kind`,
      statement: `${h.name}: ${h.count} ${h.kind}${h.counterbore ? ' counterbored' : ''} hole(s), Ø${num(h.diameterMm)} mm — classified from which bore ends open to air.`,
      kind: 'inferred',
      evidence: { source: 'mesh' },
      value: h.counterbore ? 'counterbore' : h.kind,
      confidence: 1,
      resolution: 'open',
    });
  });
  plan.entryAssumptions.forEach((a, i) => {
    facts.push({
      id: `entry.${i + 1}`,
      statement: a.statement,
      kind: 'assumed',
      evidence: { source: 'mesh' },
      value: a.feature,
      confidence: 0.5,
      resolution: 'open',
    });
  });
  unmatched.forEach((u, i) => {
    facts.push({
      id: `unmatched.${i + 1}`,
      statement: `${u.reason} ${num(u.areaMm2)} mm² over ${u.triangleCount} triangles near (${u.centroid.map(num).join(', ')}); not represented in the script.`,
      kind: 'missing',
      evidence: { source: 'mesh', bbox: u.bbox },
      confidence: 0,
      resolution: 'open',
    });
  });
  plan.notRepresented.forEach((note, i) => {
    facts.push({
      id: `not-represented.${i + 1}`,
      statement: note,
      kind: 'missing',
      evidence: { source: 'mesh' },
      confidence: 0,
      resolution: 'open',
    });
  });
  return { facts, unresolvedCount: facts.filter((f) => f.resolution === 'open').length };
}

function buildDiagnostics(an: MeshAnalysis, f: FidelityReport, unmatched: UnmatchedRegion[]): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  if (!an.report.watertight) {
    const where = an.report.crackClusters.slice(0, 3).map((c) => `(${c.center.map(num).join(', ')})`).join(', ');
    out.push({
      target: 'export-occt',
      code: 'reference.mesh.not-watertight',
      severity: 'warn',
      message: `The input mesh is not watertight: ${an.report.openEdges} open, ${an.report.nonManifoldEdges} non-manifold and ${an.report.inconsistentEdges} mis-oriented edges${where ? ` (largest cracks near ${where})` : ''}. Sections and volume IoU near those edges are unreliable, so the result cannot be faithful.`,
      hint: 'Repair the mesh (close holes, fix orientation) or re-export it watertight, then run mesh_to_features again.',
      nextAction: NEXT_ACTIONS['reference.mesh.not-watertight'],
    });
  }
  const free = unmatched;
  if (free.length > 0) {
    const area = free.reduce((s, u) => s + u.areaMm2, 0);
    out.push({
      target: 'export-occt',
      code: 'reference.mesh.freeform-region-unmatched',
      severity: 'warn',
      message: `${free.length} surface region(s) totalling ${num(area)} mm² matched no plane, cylinder or supported feature (${free.slice(0, 3).map((u) => `${u.kind} near (${u.centroid.map(num).join(', ')})`).join('; ')}); they are absent from the script.`,
      hint: 'Model the listed regions by hand (see unmatchedRegions for each bbox), or accept the approximation the fidelity numbers describe.',
      nextAction: NEXT_ACTIONS['reference.mesh.freeform-region-unmatched'],
    });
  }
  if (f.verdict !== 'faithful') {
    out.push({
      target: 'export-occt',
      code: 'reference.mesh.low-fidelity',
      severity: 'warn',
      message: `The reconstruction is ${f.verdict}: volume IoU ${f.volumeIoU.toFixed(4)} (faithful needs >= ${f.thresholds.minIoU}), max deviation ${f.maxDeviationMm.toFixed(3)} mm (faithful needs <= ${num(f.thresholds.maxDeviationMm)} mm).`,
      hint: 'Treat the script as a starting point: compare it against the mesh, fix the features near the largest deviation, or model the unmatched regions before relying on its dimensions.',
      nextAction: NEXT_ACTIONS['reference.mesh.low-fidelity'],
    });
  }
  return out;
}
