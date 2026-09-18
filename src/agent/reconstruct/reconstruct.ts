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
import { buildPlan, withFillets, type FeaturePlan, type OutlineKind, type PassParams, type RoundsKind } from './plan';
import { detectEdgeBlends, groupBlends, selectorsForGroup } from './blends';
import { emitScript, num } from './emit';
import {
  classifyFidelity,
  maxDistanceToMesh,
  pointInsideMesh,
  surfaceDeviation,
  volumeIoU,
  type FidelityThresholds,
  type FidelityVerdict,
  type TriMesh,
} from './fidelity';
import type { MeshReport } from './meshClean';
import type { SharpEdge } from './blends';
import type { TriangleSoup } from './meshIO';

export type ReconstructEvaluator = (
  script: string,
  opts?: { withEdges?: boolean; withHoles?: boolean },
) => Promise<
  | {
      ok: true;
      mesh: TriMesh;
      holes?: Array<{ diameterMm: number; depthMm: number; kind: 'blind' | 'through' }>;
      /** Sharp-model edges with adjacent-face normals, when `withEdges` was asked for. */
      edges?: SharpEdge[];
    }
  | { ok: false; error: string; errorCode?: string }
>;

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
  /** Which reading of the pass this is: the plain profile, the profile with
   *  corner rounds made sharp, or either one with measured edge fillets. */
  variant: 'sharp' | 'sharpened' | 'fillets' | 'sharpened+fillets';
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
    /** Constant-radius edge blends emitted as fillets. */
    fillets: Array<{ radiusMm: number; edges: number }>;
    /**
     * How each body block's outline is written: `rectangle` / `rectilinear`
     * corners and `circle` radii are driven by named params, `literal` keeps
     * measured coordinates (an irregular outline), `revolve` is a turned
     * profile. `rounds`: corner rounds as an edge `fillet`, as tangent `arcs`
     * with a radius param, or `none`.
     */
    profiles: Array<{ block: number; outline: OutlineKind | 'revolve'; rounds: RoundsKind }>;
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
  /** Blend measurements that did not become fillets (variable radius, partial…). */
  blendNotes?: string[];
  metrics?: { volumeIoU: number; maxDeviationMm: number; rmsMm: number; reconVolume: number; meshVolume: number };
  holes?: Array<{ diameterMm: number; depthMm: number; kind: 'blind' | 'through' }>;
}

interface ReconstructContext {
  analysis: MeshAnalysis;
  evaluate: ReconstructEvaluator;
  thresholds: FidelityThresholds;
  meshTri: TriMesh;
  sourceName: string;
  outcomes: PassOutcome[];
}

async function measurePlan(
  ctx: ReconstructContext,
  plan: FeaturePlan,
  variant: PassSummary['variant'],
  withEdges: boolean,
): Promise<{ outcome: PassOutcome; edges?: SharpEdge[]; mesh?: TriMesh }> {
  const { analysis, evaluate, thresholds, meshTri, sourceName } = ctx;
  const pass = plan.pass;
  const script = emitScript(plan, { frame: analysis.frame, sourceName });
  const evaluated = await evaluate(script, { withEdges });
  if (!evaluated.ok) {
    return {
      outcome: {
        plan,
        script,
        summary: { pass: pass.index, variant, epsMm: pass.eps, snapToleranceMm: pass.snapTol, ok: false, error: evaluated.error, errorCode: evaluated.errorCode },
      },
    };
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
  return {
    outcome: {
      plan,
      script,
      metrics,
      unmatched,
      holes: evaluated.holes,
      summary: {
        pass: pass.index,
        variant,
        epsMm: pass.eps,
        snapToleranceMm: pass.snapTol,
        ok: true,
        volumeIoU: metrics.volumeIoU,
        maxDeviationMm: metrics.maxDeviationMm,
        rmsMm: metrics.rmsMm,
        verdict,
      },
    },
    edges: evaluated.edges,
    mesh: evaluated.mesh,
  };
}

async function runReconstructionPass(
  ctx: ReconstructContext,
  pass: PassParams,
): Promise<PassOutcome | undefined> {
  const { analysis, evaluate, outcomes } = ctx;
  let plan: FeaturePlan;
  try {
    plan = buildPlan(analysis, pass);
  } catch (e) {
    outcomes.push({
      plan: undefined as unknown as FeaturePlan,
      script: '',
      summary: { pass: pass.index, variant: 'sharp', epsMm: pass.eps, snapToleranceMm: pass.snapTol, ok: false, error: `planning failed: ${e instanceof Error ? e.message : String(e)}` },
    });
    return undefined;
  }
  const base = await measurePlan(ctx, plan, 'sharp', false);
  outcomes.push(base.outcome);
  const baseFaithful = base.outcome.summary.verdict === 'faithful';
  // Blends change a part by a thin skin along its edges; a reading that is
  // further off than that (a freeform body, a wrong axis) is not one blend
  // search away from faithful, so do not spend kernel fillets on it.
  if (!baseFaithful && (!base.outcome.metrics || base.outcome.metrics.volumeIoU < 0.95)) return undefined;
  // Tangent corner rounds in the profile: try the design-intent reading, a
  // sharp profile plus a fillet feature, even when the arcs already fit —
  // one radius param then drives every round, cap edge or corner, and the
  // kernel builds the corner patches.
  const sharpened = buildPlan(analysis, { ...pass, sharpenCorners: true });
  if (baseFaithful && sharpened.sharpenedArcs === 0) {
    return base.outcome;
  }
  // Each attempt is built only when the one before it did not verify, so a
  // part whose rounds are all sharp-profile fillets never pays for reading
  // the plain model's edges.
  const attempts: Array<() => Promise<{ plan: FeaturePlan; variant: PassSummary['variant'] } | undefined>> = [
    async () => {
      if (sharpened.sharpenedArcs === 0) return undefined;
      const sharp = await measurePlan(ctx, sharpened, 'sharpened', true);
      if (!sharp.edges || !sharp.mesh) return undefined;
      const f = filletPlan(analysis, sharpened, sharp.edges, sharp.mesh);
      base.outcome.blendNotes = f.notes;
      return f.plan ? { plan: f.plan, variant: 'sharpened+fillets' } : undefined;
    },
    async () => {
      // Not faithful: read the plain model's edges to look for blends too.
      if (baseFaithful) return undefined;
      const withEdges = await evaluate(base.outcome.script, { withEdges: true });
      if (!withEdges.ok || !withEdges.edges) return undefined;
      const plain = filletPlan(analysis, plan, withEdges.edges, withEdges.mesh);
      if (!base.outcome.blendNotes) base.outcome.blendNotes = plain.notes;
      return plain.plan ? { plan: plain.plan, variant: 'fillets' } : undefined;
    },
  ];
  for (const build of attempts) {
    const a = await build();
    if (!a) continue;
    const r = await measurePlan(ctx, a.plan, a.variant, false);
    r.outcome.blendNotes = base.outcome.blendNotes;
    outcomes.push(r.outcome);
    if (r.outcome.summary.verdict === 'faithful') {
      return r.outcome;
    }
  }
  if (baseFaithful) {
    // The fillet reading did not verify; the arcs in the profile did.
    base.outcome.blendNotes = undefined;
    return base.outcome;
  }
  return undefined;
}

function selectBestOutcome(outcomes: PassOutcome[]): PassOutcome | undefined {
  const rank = { faithful: 0, approximate: 1, failed: 2 } as const;
  const measured = outcomes.filter((o) => o.metrics);
  measured.sort(
    (a, b) =>
      rank[a.summary.verdict!] - rank[b.summary.verdict!] ||
      Math.round(1e4 * (b.metrics!.volumeIoU - a.metrics!.volumeIoU)) ||
      a.metrics!.maxDeviationMm - b.metrics!.maxDeviationMm,
  );
  return measured[0];
}

async function buildReconstructSuccess(
  ctx: ReconstructContext,
  soup: TriangleSoup,
  winner: PassOutcome,
  thresholds: FidelityThresholds,
  passes: PassSummary[],
): Promise<ReconstructSuccess> {
  const { analysis, evaluate, sourceName } = ctx;
  const m = winner.metrics!;
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

  // The B-rep hole detector runs once, on the script that is returned.
  const final = await evaluate(winner.script, { withHoles: true });
  if (final.ok && final.holes) winner.holes = final.holes;
  const unmatched = winner.unmatched ?? [];
  // A blend the detector measured but did not fillet only matters when the
  // script misses the mesh; on a faithful script it is within the bound.
  const notRepresented = [...winner.plan.notRepresented, ...(verdict === 'faithful' ? [] : winner.blendNotes ?? [])];
  const ledger = buildMeshLedger(analysis, { ...winner.plan, notRepresented }, soup, unmatched);
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
      fillets: plan.ops.flatMap((o) => (o.kind === 'fillet' ? o.groups.map((g) => ({ radiusMm: g.radius, edges: g.edgeCount })) : [])),
      profiles:
        plan.body.kind === 'revolve'
          ? [{ block: 1, outline: 'revolve' as const, rounds: 'none' as const }]
          : plan.body.blocks.map((b, i) => ({
              block: i + 1,
              outline: b.outline,
              rounds: b.rounds === 'fillet' && !plan.ops.some((o) => o.kind === 'fillet') ? ('none' as const) : b.rounds,
            })),
      booleanRemainders: plan.ops.filter((o) => o.kind === 'subtractCylinder' || o.kind === 'subtractPrism').length,
      params: plan.params.map((p) => ({ name: p.name, value: p.value, measured: round6(p.measured), snapped: p.snapped })),
      extrusionAxis: analysis.frame.axis,
    },
    ...(winner.holes ? { reconstructedHoles: winner.holes } : {}),
    passes,
    notRepresented,
    diagnostics,
  };
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
  const ctx: ReconstructContext = { analysis, evaluate, thresholds, meshTri, sourceName, outcomes };
  let winner: PassOutcome | undefined;

  for (const pass of schedule) {
    const passWinner = await runReconstructionPass(ctx, pass);
    if (passWinner !== undefined) {
      winner = passWinner;
      break;
    }
  }
  if (!winner) {
    winner = selectBestOutcome(outcomes);
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
  return buildReconstructSuccess(ctx, soup, winner, thresholds, passes);
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * Measure constant-radius blends of the mesh on the edges of an evaluated
 * sharp plan and, when any are found, return the plan with one fillet
 * feature appended. `edges` / `sharpMesh` are in the mesh's own frame.
 */
function filletPlan(
  an: MeshAnalysis,
  plan: FeaturePlan,
  edges: SharpEdge[],
  sharpMesh: TriMesh,
): { plan?: FeaturePlan; notes: string[] } {
  const { e1, e2, axis } = an.frame;
  const o = plan.origin;
  const rot = (v: readonly number[]): [number, number, number] => [
    v[0] * e1[0] + v[1] * e1[1] + v[2] * e1[2],
    v[0] * e2[0] + v[1] * e2[1] + v[2] * e2[2],
    v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2],
  ];
  const toEmit = (p: readonly number[]): [number, number, number] => {
    const r = rot(p);
    return [r[0] - o[0], r[1] - o[1], r[2] - o[2]];
  };
  const canonical: SharpEdge[] = edges.map((e) => {
    let convex: boolean | undefined;
    if (e.samples.length >= 2) {
      const m = e.samples[e.samples.length >> 1];
      const dir = [m.nA[0] + m.nB[0], m.nA[1] + m.nB[1], m.nA[2] + m.nB[2]];
      const dl = Math.hypot(dir[0], dir[1], dir[2]);
      if (dl > 1e-6) {
        const delta = 0.05;
        convex = pointInsideMesh(sharpMesh, m.p[0] - (delta * dir[0]) / dl, m.p[1] - (delta * dir[1]) / dl, m.p[2] - (delta * dir[2]) / dl);
      }
    }
    return {
      ...e,
      start: toEmit(e.start),
      end: toEmit(e.end),
      samples: e.samples.map((smp) => ({ p: toEmit(smp.p), nA: rot(smp.nA), nB: rot(smp.nB) })),
      ...(convex !== undefined ? { convex } : {}),
    };
  });
  // Surface samples: sub-triangle centroids, finer on long triangles (a ruled
  // strip spanning a whole edge must be seen along its length), each weighted
  // by the area it stands for so a densely meshed corner patch cannot outvote
  // a long, coarsely meshed blend.
  const step = Math.max(0.5, 0.01 * an.diagonal);
  const coords: number[] = [];
  const wts: number[] = [];
  const tri = an.mesh.triangles;
  const c = an.canonical;
  for (let t = 0; t < an.mesh.areas.length; t++) {
    const ia = tri[t * 3] * 3, ib = tri[t * 3 + 1] * 3, ic = tri[t * 3 + 2] * 3;
    const longest = Math.max(
      Math.hypot(c[ia] - c[ib], c[ia + 1] - c[ib + 1], c[ia + 2] - c[ib + 2]),
      Math.hypot(c[ib] - c[ic], c[ib + 1] - c[ic + 1], c[ib + 2] - c[ic + 2]),
      Math.hypot(c[ic] - c[ia], c[ic + 1] - c[ia + 1], c[ic + 2] - c[ia + 2]),
    );
    const m = Math.min(8, Math.max(1, Math.ceil(longest / step)));
    const w = an.mesh.areas[t] / (m * m);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m - i; j++) {
        // Upward and (when present) downward sub-triangle centroids.
        for (const [u, v] of [[i + 1 / 3, j + 1 / 3], [i + 2 / 3, j + 2 / 3]] as const) {
          if (u + v > m) continue;
          const a = u / m, b = v / m, g = 1 - a - b;
          for (let k = 0; k < 3; k++) coords.push(g * c[ia + k] + a * c[ib + k] + b * c[ic + k] - o[k]);
          wts.push(w);
        }
      }
    }
  }
  const depthTol = Math.max(0.01, 3 * an.seg.noiseMm);
  const detection = detectEdgeBlends(Float64Array.from(coords), Float64Array.from(wts), canonical, depthTol, 0.12 * an.diagonal);
  const notes = detection.rejected.map(
    (r) => `edge blend near (${edgeMid(canonical[r.edge]).map(num).join(', ')}) not filleted: ${r.reason} (median r ${num(r.medianRadius)} mm, spread ${num(r.spread)} mm over ${r.count} samples).`,
  );
  if (detection.blends.length === 0) return { notes };
  const groups = groupBlends(detection.blends, plan.pass.snapTol)
    .map((g) => ({ ...g, selectors: selectorsForGroup(canonical, g.edges) }))
    .filter((g): g is typeof g & { selectors: NonNullable<typeof g.selectors> } => {
      if (g.selectors) return true;
      notes.push(`fillet r ${num(g.radius)} mm on ${g.edges.length} edge(s) skipped: no edge query singles those edges out.`);
      return false;
    });
  if (groups.length === 0) return { notes };
  return { plan: withFillets(plan, groups), notes };
}

function edgeMid(e: SharpEdge): [number, number, number] {
  return [(e.start[0] + e.end[0]) / 2, (e.start[1] + e.end[1]) / 2, (e.start[2] + e.end[2]) / 2];
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
