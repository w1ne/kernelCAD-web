// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Reader for inspect({ of: 'continuity' }).
import type { Edge } from 'replicad';
import { inspectContinuity, type ContinuityClass } from '../../../kernel/backends/occt/surfaceQuality';
import { resolveEdgeQuery, isSameEdge, type EdgeQuery } from '../../../kernel/backends/occt/edgeQueries';
import { formatTopoRef } from '../../../kernel/naming';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import { loadInspectOcctShape, type InspectShapeInput } from './inspectShapeLoad';
import type { Vec3 } from '../../../shared/intent/types';

export interface InspectContinuityInput extends InspectShapeInput {
  /** EdgeQuery, a single @kc[...] ref, or an array of refs. Omit to sample every shared edge. */
  edges?: EdgeQuery | string | string[];
}

export interface ContinuityEdgeReport {
  ref: string;
  id: string;
  class: ContinuityClass;
  maxPositionGapMm: number;
  maxNormalAngleDeg: number;
  maxCurvatureDiff: number;
  worstSample: {
    t: number;
    point: Vec3;
    positionGapMm: number;
    normalAngleDeg: number;
    curvatureDiff: number;
  };
  sampleCount: number;
  occtContinuity?: ContinuityClass;
}

export interface InspectContinuityOutput {
  ok: boolean;
  edges?: ContinuityEdgeReport[];
  summary?: { shared: number; g0: number; g1: number; g2: number; broken: number };
  diagnostics?: CompilerDiagnostic[];
  error?: string;
  errorCode?: string;
}

function asEdgeQuery(edges: InspectContinuityInput['edges']): EdgeQuery | undefined {
  if (edges === undefined) return undefined;
  if (typeof edges === 'string' || Array.isArray(edges)) return undefined;
  return edges;
}

function asRefs(edges: InspectContinuityInput['edges']): string[] | undefined {
  if (typeof edges === 'string') return [edges];
  if (Array.isArray(edges) && edges.every(e => typeof e === 'string')) return edges;
  return undefined;
}

export async function inspectContinuityTool(input: InspectContinuityInput): Promise<InspectContinuityOutput> {
  const loaded = await loadInspectOcctShape(input);
  if (!loaded.ok) return loaded;
  const { shape, owner } = loaded;

  const query = asEdgeQuery(input.edges);
  const refs = asRefs(input.edges);
  const matched = query !== undefined ? resolveEdgeQuery(shape, query) : undefined;

  const sampled = inspectContinuity(shape, (edge: Edge, index: number) => {
    if (matched !== undefined) return matched.some(m => isSameEdge(m, edge));
    if (refs !== undefined) {
      const id = `e${index}`;
      const ref = formatTopoRef({ owner, kind: 'edge', segments: [id] });
      return refs.includes(ref) || refs.includes(id);
    }
    return true;
  });

  const edges: ContinuityEdgeReport[] = sampled.map(s => ({
    ref: formatTopoRef({ owner, kind: 'edge', segments: [`e${s.edgeIndex}`] }),
    id: `e${s.edgeIndex}`,
    class: s.class,
    maxPositionGapMm: s.maxPositionGapMm,
    maxNormalAngleDeg: s.maxNormalAngleDeg,
    maxCurvatureDiff: s.maxCurvatureDiff,
    worstSample: {
      t: s.worstSample.t,
      point: s.worstSample.point,
      positionGapMm: s.worstSample.positionGapMm,
      normalAngleDeg: s.worstSample.normalAngleDeg,
      curvatureDiff: s.worstSample.curvatureDiff,
    },
    sampleCount: s.sampleCount,
    ...(s.occtContinuity !== undefined ? { occtContinuity: s.occtContinuity } : {}),
  }));

  const summary = {
    shared: edges.length,
    g0: edges.filter(e => e.class === 'G0').length,
    g1: edges.filter(e => e.class === 'G1').length,
    g2: edges.filter(e => e.class === 'G2').length,
    broken: edges.filter(e => e.class === 'broken').length,
  };

  const diagnostics: CompilerDiagnostic[] = [];
  if (summary.broken > 0) {
    const hit = edges.find(e => e.class === 'broken')!;
    diagnostics.push({
      target: 'export-occt',
      code: 'inspect.continuity.broken',
      severity: 'error',
      message:
        `${summary.broken} shared edge(s) fail G0 (position gap). Worst ${hit.ref} gap ` +
        `${hit.maxPositionGapMm.toExponential(2)} mm at [${hit.worstSample.point.map(n => n.toFixed(2)).join(', ')}].`,
      hint: HINT_TEMPLATES['inspect.continuity.broken'].template,
    });
  }
  if (summary.g0 > 0) {
    const hit = edges.find(e => e.class === 'G0')!;
    diagnostics.push({
      target: 'export-occt',
      code: 'inspect.continuity.g1-break',
      severity: 'warn',
      message:
        `${summary.g0} shared edge(s) are G0 only (G1 broken). Worst ${hit.ref} normal jump ` +
        `${hit.maxNormalAngleDeg.toFixed(1)}° at [${hit.worstSample.point.map(n => n.toFixed(2)).join(', ')}]. ` +
        `Fillet or blend the edge; a G2 fillet needs NURBS-adjacent faces.`,
      hint: HINT_TEMPLATES['inspect.continuity.g1-break'].template,
    });
  }

  return { ok: true, edges, summary, diagnostics: withNextActions(diagnostics) };
}
