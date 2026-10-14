// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Edge, Face } from 'replicad';
import type { BuiltModel } from '../buildModel';
import type { ShapeBackend } from '../../kernel/backends/backend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { inspectEdgeBreaks, type EdgeBreakEdge, type EdgeBreakFace } from '../../kernel/backends/occt/edgeRadius';
import { resolveEdgeQuery, resolveFaceQuery, type EdgeQuery, type FaceQuery } from '../../kernel/backends/occt/edgeQueries';
import { faceHashOf } from '../../kernel/backends/occt/createdRefs';
import { formatTopoRef } from '../../kernel/naming/topoRef';
import { validateEdgeRadiusFilter } from './edgeRadiusSelection';

export interface EdgeRadiusOptions {
  min_radius_mm?: number;
  max_radius_mm?: number;
  require_edge_break?: 'external' | 'internal' | 'all';
  feature_id?: string;
  assembly?: string;
  /** Explicit assembly part names; default all parts of the returned scene. */
  parts?: string[];
  edges?: EdgeQuery | string | string[];
  faces?: FaceQuery | string | string[];
}
export interface EdgeRadiusViolation {
  rule: 'min-radius' | 'max-radius' | 'required-edge-break';
  ref: string;
  measuredMm: number;
  limitMm: number | null;
}
export interface EdgeRadiusBodyReport {
  part: string;
  bodyIndex: number;
  edges: Array<EdgeBreakEdge & { ref: string; faceRefs: string[] }>;
  breaks: Array<EdgeBreakFace & { ref: string; edgeRefs: string[] }>;
  violations: EdgeRadiusViolation[];
  unknownRefs: string[];
}
export interface EdgeRadiusReport {
  ok: boolean;
  source: 'local';
  status: 'pass' | 'fail' | 'partial' | 'no-coverage';
  bodies: EdgeRadiusBodyReport[];
  checkedEdges: number;
  checkedFillets: number;
  limitations: string[];
}

function validateRadiusRules(options: EdgeRadiusOptions): void {
  for (const key of ['min_radius_mm','max_radius_mm'] as const) {
    const n = options[key];
    if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n) || n < 0)) throw new Error(`${key} must be finite and nonnegative.`);
  }
  if (options.min_radius_mm !== undefined && options.max_radius_mm !== undefined && options.min_radius_mm > options.max_radius_mm) throw new Error('min_radius_mm must not exceed max_radius_mm.');
  if (options.require_edge_break !== undefined && !['external','internal','all'].includes(options.require_edge_break)) throw new Error('require_edge_break must be external, internal or all.');
  if (options.min_radius_mm === undefined && options.max_radius_mm === undefined && options.require_edge_break === undefined) throw new Error('Declare min_radius_mm, max_radius_mm or require_edge_break.');
}
function validateScope(options: EdgeRadiusOptions): void {
  for (const key of ['assembly','feature_id'] as const) if (options[key] !== undefined && (typeof options[key] !== 'string' || !options[key])) throw new Error(`${key} must be a nonempty name.`);
  if (options.parts !== undefined && (!Array.isArray(options.parts) || !options.parts.length || options.parts.some(p => typeof p !== 'string' || !p) || new Set(options.parts).size !== options.parts.length)) throw new Error('parts must contain unique nonempty assembly part names.');
  if (options.assembly !== undefined && options.feature_id !== undefined) throw new Error('Choose assembly or feature_id, not both.');
}
export function validateEdgeRadiusOptions(options: EdgeRadiusOptions): void {
  validateRadiusRules(options);
  validateScope(options);
  validateEdgeRadiusFilter(options.edges, 'edges');
  validateEdgeRadiusFilter(options.faces, 'faces');
}
interface Target { owner: string; shape: ShapeBackend }
function targetsOf(model: BuiltModel, options: EdgeRadiusOptions): Target[] {
  let root = options.feature_id !== undefined ? model.shapes.get(options.feature_id) : model.rootShape;
  if (options.assembly !== undefined && !(isSceneBackend(root) && root.assemblyName === options.assembly)) root = [...model.shapes.values()].reverse().find(s => isSceneBackend(s) && s.assemblyName === options.assembly);
  if (!root) throw new Error('Requested feature/assembly has no lowered geometry.');
  if (isSceneBackend(root)) {
    if (options.parts?.some(name => !root.parts.some(p => p.name === name))) throw new Error('Requested parts are absent from the assembly.');
    return root.parts.filter(p => options.parts === undefined || options.parts.includes(p.name)).map(p => ({ owner: p.name, shape: p.shape }));
  }
  if (options.parts !== undefined) throw new Error('parts requires an assembly.');
  return [{ owner: options.feature_id ?? model.rootId ?? 'model', shape: root }];
}
function ref(owner: string, kind: 'edge' | 'face', name: string): string {
  return formatTopoRef({ owner, kind, segments: [name] });
}
function refsOf(selection: unknown): string[] | undefined {
  return typeof selection === 'string' ? [selection] : Array.isArray(selection) ? selection : undefined;
}
function matchedIndices<T extends Edge | Face>(all: T[], selection: unknown, refs: string[], resolve: () => T[]): Set<number> {
  if (selection === undefined) return new Set(all.map((_,i) => i));
  const requested = refsOf(selection);
  if (requested) return new Set(all.flatMap((_,i) => requested.includes(refs[i]) ? [i] : []));
  const matches = resolve();
  return new Set(all.flatMap((entity,i) => matches.some(m => m.isSame(entity)) ? [i] : []));
}
function bodyReports(target: Target, options: EdgeRadiusOptions): EdgeRadiusBodyReport[] {
  if (!(target.shape instanceof OcctBackend)) return [{ part: target.owner, bodyIndex: 0, edges: [], breaks: [], violations: [], unknownRefs: [`${target.owner}:unsupported-backend`] }];
  const shape = target.shape;
  const allFaces = shape.getReplicadShape().faces, allEdges = shape.getReplicadShape().edges;
  const faceRefs = allFaces.map((f,i) => {
    const history = shape.historyMap?.get(faceHashOf(f));
    return ref(target.owner,'face',history?.labelName ?? history?.canonicalName ?? `f${i}`);
  });
  const edgeRefs = allEdges.map((_,i) => ref(target.owner,'edge',`e${i}`));
  const selectedEdges = matchedIndices(allEdges, options.edges, edgeRefs, () => resolveEdgeQuery(shape, options.edges as EdgeQuery));
  const selectedFaces = matchedIndices(allFaces, options.faces, faceRefs, () => {
    const query = options.faces as FaceQuery;
    // FaceQuery spells CYLINDER; replicad's surface tag is CYLINDRE.
    if (query.ofSurfaceType === 'CYLINDER' || query.ofSurfaceType === 'BSPLINE') {
      const tag = query.ofSurfaceType === 'CYLINDER' ? 'CYLINDRE' : 'BSPLINE_SURFACE';
      return resolveFaceQuery(shape, { ...query, ofSurfaceType: undefined }).filter(f => f.geomType === tag);
    }
    return resolveFaceQuery(shape, query);
  });
  const measured = inspectEdgeBreaks(shape);
  const selected = measured.edges.filter(e => selectedEdges.has(e.edgeIndex) && (e.faceIndices.some(f => selectedFaces.has(f)) || (e.faceIndices.length === 0 && options.faces === undefined)));
  const breaks = measured.breaks.filter(b => selectedFaces.has(b.faceIndex) && (options.edges === undefined || b.edgeIndices.some(e => selectedEdges.has(e))));
  const components = shape.solidComponents();
  const coveredFaces = new Set<number>();
  const reports = components.map((component,bodyIndex) => {
    const componentFaces = component.getReplicadShape().faces;
    const indices = new Set(allFaces.flatMap((f,i) => componentFaces.some(c => c.isSame(f)) ? [i] : []));
    indices.forEach(i => coveredFaces.add(i));
    const edges = selected.filter(e => e.faceIndices.some(f => indices.has(f))).map(e => ({ ...e, ref: edgeRefs[e.edgeIndex], faceRefs: e.faceIndices.map(f => faceRefs[f]) }));
    const selectedBreaks = breaks.filter(b => indices.has(b.faceIndex)).map(b => ({ ...b, ref: faceRefs[b.faceIndex], edgeRefs: b.edgeIndices.map(e => edgeRefs[e]) }));
    const violations: EdgeRadiusViolation[] = [];
    for (const b of selectedBreaks) {
      if (b.radiusMm === null) continue; // A chamfer has no fillet radius.
      if (options.min_radius_mm !== undefined && b.radiusMm < options.min_radius_mm - 1e-6) violations.push({ rule: 'min-radius', ref: b.ref, measuredMm: b.radiusMm, limitMm: options.min_radius_mm });
      if (options.max_radius_mm !== undefined && b.radiusMm > options.max_radius_mm + 1e-6) violations.push({ rule: 'max-radius', ref: b.ref, measuredMm: b.radiusMm, limitMm: options.max_radius_mm });
    }
    const unknownRefs = edges.filter(e => e.kind === 'unknown').map(e => e.ref);
    for (const e of edges) {
      if (!options.require_edge_break || e.kind !== 'sharp') continue;
      if (options.require_edge_break !== 'all' && e.side === 'unknown') { unknownRefs.push(e.ref); continue; }
      if (options.require_edge_break === 'all' || options.require_edge_break === e.side) violations.push({ rule: 'required-edge-break', ref: e.ref, measuredMm: 0, limitMm: options.min_radius_mm ?? null });
    }
    return { part: target.owner, bodyIndex, edges, breaks: selectedBreaks, violations, unknownRefs };
  });
  // A compound can also contain faces, open shells, or standalone wires.
  // Preserve selected topology outside all solids instead of dropping it.
  const uncovered = selected.filter(e => !e.faceIndices.some(f => coveredFaces.has(f)));
  const uncoveredFaces = [...selectedFaces].filter(f => !coveredFaces.has(f) && (options.edges === undefined || uncovered.some(e => e.faceIndices.includes(f))));
  if (uncovered.length || uncoveredFaces.length || components.length === 0) {
    reports.push({
      part: target.owner, bodyIndex: components.length,
      edges: uncovered.map(e => ({ ...e, ref: edgeRefs[e.edgeIndex], faceRefs: e.faceIndices.map(f => faceRefs[f]) })), breaks: [], violations: [],
      unknownRefs: [...uncovered.map(e => edgeRefs[e.edgeIndex]), ...uncoveredFaces.map(f => faceRefs[f])],
    });
  }
  return reports;
}

/** General edge-break spec on final BREP. Coordinates and selectors are part-local. */
export function checkEdgeRadius(model: BuiltModel, options: EdgeRadiusOptions): EdgeRadiusReport {
  validateEdgeRadiusOptions(options);
  const bodies = targetsOf(model,options).flatMap(t => bodyReports(t,options));
  for (const [selection, matched] of [
    [options.edges, bodies.flatMap(b => b.edges.map(e => e.ref))],
    [options.faces, bodies.flatMap(b => [...b.breaks.map(f => f.ref), ...b.edges.flatMap(e => e.faceRefs)])],
  ] as const) {
    const unresolved = refsOf(selection)?.filter(r => !matched.includes(r)) ?? [];
    if (unresolved.length && bodies[0]) bodies[0].unknownRefs.push(...unresolved);
  }
  const checkedEdges = bodies.reduce((n,b) => n+b.edges.filter(e => e.kind !== 'seam' && e.kind !== 'degenerate').length,0);
  const checkedFillets = bodies.reduce((n,b) => n+b.breaks.filter(f => f.kind === 'fillet').length,0);
  const failed = bodies.some(b => b.violations.length > 0), unknown = bodies.some(b => b.unknownRefs.length > 0);
  const radiusRequested = options.min_radius_mm !== undefined || options.max_radius_mm !== undefined;
  const noCoverage = checkedEdges + checkedFillets === 0 || (radiusRequested && checkedFillets === 0);
  const status = failed ? 'fail' : unknown ? 'partial' : noCoverage ? 'no-coverage' : 'pass';
  return {
    ok: status === 'pass', source: 'local', status, bodies, checkedEdges, checkedFillets,
    limitations: [
      'Local BREP geometry validation; not deployed behavior or hardware acceptance.',
      'Analytic radii are measured from cylinder/sphere surfaces and torus minor-section derivatives; tangent-support recognition is geometric, not feature provenance.',
      'Planar chamfer strips are heuristic; radius bounds apply only to fillets. Chamfer end edges remain independently classified.',
      'Freeform blend radius and nonmanifold/open geometry are unsupported and cannot pass. Edge normals are sampled at three interior stations with 0.0001 degree tangency tolerance.',
      'Selectors and reported points are part-local; refs use the feature owner, or assembly part name. Topology indices are local to that final shape.',
    ],
  };
}
