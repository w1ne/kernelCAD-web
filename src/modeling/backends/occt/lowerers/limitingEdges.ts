// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Names the edges that limit a refused constant fillet/chamfer (#1588). The
 * max-feasible probe gives one size for the whole selection; an agent also
 * needs to know WHICH edge stops a larger one. Each selected edge is tried
 * alone at the smallest value the probe saw fail: an edge that fails alone
 * there is a limiting edge. When every edge builds alone, the limit comes
 * from selected edges interacting, and no single edge is named.
 *
 * Runs only on the failure path and is bounded to `MAX_SOLO_EDGE_PROBES`
 * kernel calls. Nothing is applied.
 */
import type { Edge } from 'replicad';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import { stableEdgeIdForEdge } from '../../../../kernel/backends/occt/edgeIdentity';

/** Solo kernel attempts spent naming limiting edges, shortest edges first. */
export const MAX_SOLO_EDGE_PROBES = 32;
/** Limiting edges spelled out in the hint and `details.failingEdgeRefs`. */
const MAX_NAMED_EDGES = 4;

export interface LimitingEdge {
  /** Persistent geometry-fingerprint edge ID (`s<16 hex>`). */
  id: string;
  /** `@kc[<base>/edge/<id>]` selector; absent when the ID is not unique on the base shape. */
  ref?: string;
  /** Curve kind, length and midpoint, for a human or a `near` query. */
  locator: string;
}

export interface LimitingEdgeReport {
  /** `named`: these edges fail alone. `interaction`: every probed edge builds
   *  alone, so the selected edges limit each other. */
  status: 'named' | 'interaction';
  edges: LimitingEdge[];
  /** Value (mm) each edge was tried at. */
  probeValue: number;
  /** Solo kernel attempts spent. */
  attempts: number;
  /** Edges left untried because the selection exceeds the probe bound. */
  unprobed: number;
}

const fmt = (v: number): string => String(Number(v.toPrecision(4)));

function edgeLength(edge: Edge): number {
  try { return edge.length; } catch { return 0; }
}

function locatorOf(edge: Edge): string {
  const kind = (edge as unknown as { geomType?: string }).geomType ?? 'OTHER';
  const mid = edge.pointAt(0.5) as unknown as { x: number; y: number; z: number };
  return `${kind}, ${fmt(edgeLength(edge))} mm long, midpoint (${fmt(mid.x)}, ${fmt(mid.y)}, ${fmt(mid.z)})`;
}

/**
 * Describe `edges` with stable IDs. A selector is given only when the ID
 * matches exactly one edge of `allEdges`, so a retry cannot land on a
 * geometrically coincident neighbour.
 */
export function describeEdges(edges: readonly Edge[], allEdges: readonly Edge[], baseId: string | undefined): LimitingEdge[] {
  const uses = new Map<string, number>();
  for (const e of allEdges) {
    const id = stableEdgeIdForEdge(e);
    uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  return edges.map((edge) => {
    const id = stableEdgeIdForEdge(edge);
    const unique = baseId !== undefined && uses.get(id) === 1;
    return { id, ...(unique ? { ref: `@kc[${baseId}/edge/${id}]` } : {}), locator: locatorOf(edge) };
  });
}

/**
 * Find the edges of `edges` that fail alone at `probeValue`. A one-edge
 * selection is its own limiting edge and costs no kernel call.
 */
export function findLimitingEdges<E>(
  edges: readonly E[],
  probeValue: number,
  buildsAlone: (edge: E, value: number) => boolean,
  lengthOf: (edge: E) => number,
): { status: LimitingEdgeReport['status']; limiting: E[]; attempts: number; unprobed: number } {
  if (edges.length === 1) return { status: 'named', limiting: [edges[0]!], attempts: 0, unprobed: 0 };
  const shortestFirst = [...edges].sort((a, b) => lengthOf(a) - lengthOf(b)).slice(0, MAX_SOLO_EDGE_PROBES);
  const limiting = shortestFirst.filter((edge) => !buildsAlone(edge, probeValue));
  return {
    status: limiting.length > 0 ? 'named' : 'interaction',
    limiting,
    attempts: shortestFirst.length,
    unprobed: edges.length - shortestFirst.length,
  };
}

/** `findLimitingEdges` on replicad edges, with the edges described for the refusal. */
export function limitingEdgeReport(
  edges: readonly Edge[],
  allEdges: readonly Edge[],
  baseId: string | undefined,
  probeValue: number,
  buildsAlone: (edge: Edge, value: number) => boolean,
): LimitingEdgeReport {
  const found = findLimitingEdges(edges, probeValue, buildsAlone, edgeLength);
  return {
    status: found.status,
    edges: describeEdges(found.limiting, allEdges, baseId),
    probeValue,
    attempts: found.attempts,
    unprobed: found.unprobed,
  };
}

function limitingEdgeText(report: LimitingEdgeReport, param: string, selected: number): string {
  if (report.status === 'interaction') {
    const scope = report.unprobed > 0 ? `each of the ${report.attempts} shortest selected edges` : 'each selected edge';
    return `No single edge is the limit: ${scope} builds alone at ${param} ${fmt(report.probeValue)} mm, so the selected edges limit each other (adjacent blends share a face). Split the selection or reduce ${param} on neighbouring edges.`;
  }
  const named = report.edges.slice(0, MAX_NAMED_EDGES).map((e) => `${e.ref ?? e.id} (${e.locator})`).join('; ');
  const more = report.edges.length > MAX_NAMED_EDGES ? `; and ${report.edges.length - MAX_NAMED_EDGES} more` : '';
  if (selected === 1) return `Failing edge: ${named}.`;
  const noun = report.edges.length === 1 ? 'Failing edge' : `Failing edges (${report.edges.length} of ${selected})`;
  return `${noun}, each rejected alone at ${param} ${fmt(report.probeValue)} mm: ${named}${more}.`;
}

/** Attach the limiting-edge report to a fillet/chamfer refusal: one sentence
 *  on the hint and flat `failingEdge*` facts on `details`. */
export function withLimitingEdges(
  diagnostic: CompilerDiagnostic,
  report: LimitingEdgeReport,
  param: 'radius' | 'distance',
  selected: number,
): CompilerDiagnostic {
  const first = report.edges[0];
  const named = report.edges.slice(0, MAX_NAMED_EDGES);
  const text = limitingEdgeText(report, param, selected);
  return {
    ...diagnostic,
    hint: diagnostic.hint ? `${diagnostic.hint} ${text}` : text,
    details: {
      ...diagnostic.details,
      failingEdgeStatus: report.status,
      failingEdgeCount: report.edges.length,
      failingEdgeProbeValue: report.probeValue,
      failingEdgeProbeAttempts: report.attempts,
      ...(report.unprobed > 0 ? { failingEdgeUnprobed: report.unprobed } : {}),
      ...(first === undefined ? {} : {
        failingEdgeId: first.id,
        failingEdgeLocator: first.locator,
        ...(first.ref === undefined ? {} : { failingEdgeRef: first.ref }),
        failingEdgeIds: named.map((e) => e.id).join(','),
      }),
    },
  };
}
