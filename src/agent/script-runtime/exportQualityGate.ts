// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/exportQualityGate.ts
//
// Export-time geometry-quality gate. Runs the topology half of the
// `verify({ check: 'geometry-quality' })` screen (tiny faces, short edges; no
// symmetry sampling, no meshing) on every solid body of a solid/mesh
// fabrication export (STL, STEP, 3MF, OBJ, PLY, G-code) and reports a compact
// summary plus stable diagnostics. 'warn' (default) never blocks; 'block'
// turns a failing check into an export error; 'off' skips the gate.

import type { ShapeBackend } from '../../kernel/backends/backend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { screenBodyTopology, type BodyTopologyScreen, type TopologyQualityReport } from '../../modeling/runtime/geometryQuality';
import { resolveGeometryQualityOptions, type ResolvedGeometryQualityOptions } from '../../modeling/runtime/geometryQualityTypes';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import type { Vec3 } from '../../shared/intent/types';
import type { Transform } from '../../shared/runtime/se3';

export type QualityGateMode = 'warn' | 'block' | 'off';
export const QUALITY_GATE_MODES: readonly QualityGateMode[] = ['warn', 'block', 'off'];

/** Formats that ship solid or mesh geometry to fabrication. Drawings, DXF,
 *  BOMs, robot descriptions and viewer formats (GLB/USD) are not gated. */
export const QUALITY_GATED_FORMATS: ReadonlySet<string> = new Set(['stl', 'step', '3mf', 'obj', 'ply', 'gcode']);

/** Default face budget across all checked bodies. Measuring is a per-face BREP
 *  area integral plus a per-edge length, so cost grows with face count; above
 *  the budget remaining bodies are skipped with an info diagnostic. */
export const DEFAULT_QUALITY_GATE_MAX_FACES = 10_000;
const MAX_WORST = 5;

export interface ExportQualityGateInput {
  mode?: QualityGateMode;
  tiny_face_area_mm2?: number;
  short_edge_length_mm?: number;
  /** Face budget (tests / power users); default {@link DEFAULT_QUALITY_GATE_MAX_FACES}. */
  max_faces?: number;
}

export interface GeometryQualityWorst {
  part: string;
  kind: 'tiny-face' | 'short-edge';
  /** BREP id within that part's solid (scoped to this rebuild). */
  id: string;
  /** World-frame location (face center / edge midpoint), mm. */
  location: Vec3;
  /** Face area in mm² for tiny faces, edge length in mm for short edges. */
  size: number;
  unit: 'mm2' | 'mm';
}

export type GeometryQualityPart =
  | { part: string; ok: boolean; tinyFaces: number; shortEdges: number; faces: number; edges: number }
  | { part: string; skipped: string };

export interface ExportGeometryQualitySummary {
  ok: boolean;
  mode: Exclude<QualityGateMode, 'off'>;
  tinyFaces: number;
  shortEdges: number;
  /** Up to 5 findings, smallest relative to their threshold first. */
  worst: GeometryQualityWorst[];
  thresholds: { tinyFaceAreaMm2: number; shortEdgeLengthMm: number };
  parts: GeometryQualityPart[];
  budget: { maxFaces: number; facesChecked: number };
  elapsedMs: number;
}

export interface ExportQualityGateResult {
  summary?: ExportGeometryQualitySummary;
  diagnostics: CompilerDiagnostic[];
  /** True in 'block' mode when the check failed: the export must not ship. */
  blocked: boolean;
}

/** One body to screen; `transform` maps its local frame to world for reported locations. */
export interface GateBody { name: string; shape: ShapeBackend; transform?: Transform }

/** Validate gate options before the script runs; returns an error message. */
export function qualityGateOptionsError(input: ExportQualityGateInput | undefined): string | undefined {
  if (input === undefined) return undefined;
  if (input.mode !== undefined && !QUALITY_GATE_MODES.includes(input.mode)) {
    return `qualityGate must be one of ${QUALITY_GATE_MODES.join(' | ')}; got ${JSON.stringify(input.mode)}.`;
  }
  try { resolveGeometryQualityOptions(input); } catch (e) { return e instanceof Error ? e.message : String(e); }
  return undefined;
}

/** Bodies of a lowered target: one per scene part, or the single shape. */
function gateBodies(lowered: ShapeBackend, targetId: string): GateBody[] {
  if (!isSceneBackend(lowered)) return [{ name: targetId, shape: lowered }];
  return lowered.parts.map(p => ({ name: p.name, shape: p.shape, transform: p.worldTransform }));
}

const place = (t: Transform | undefined, p: Vec3): Vec3 => (t ? [...t.point(p)] as Vec3 : p);

function collectWorst(part: string, solidIndex: number, multi: boolean, r: TopologyQualityReport, t: Transform | undefined, out: (GeometryQualityWorst & { ratio: number })[]): void {
  const id = (raw: string) => (multi ? `solid${solidIndex}:${raw}` : raw);
  for (const f of r.tinyFaces) {
    out.push({ part, kind: 'tiny-face', id: id(f.id), location: place(t, f.location), size: f.areaMm2, unit: 'mm2', ratio: f.areaMm2 / r.thresholds.tinyFaceAreaMm2 });
  }
  for (const e of r.shortEdges) {
    out.push({ part, kind: 'short-edge', id: id(e.id), location: place(t, e.location), size: e.lengthMm, unit: 'mm', ratio: e.lengthMm / r.thresholds.shortEdgeLengthMm });
  }
}

function partEntry(name: string, reports: TopologyQualityReport[]): GeometryQualityPart {
  const sum = (k: (r: TopologyQualityReport) => number) => reports.reduce((n, r) => n + k(r), 0);
  return {
    part: name,
    ok: reports.every(r => r.ok),
    tinyFaces: sum(r => r.tinyFaces.length),
    shortEdges: sum(r => r.shortEdges.length),
    faces: sum(r => r.counts.faces),
    edges: sum(r => r.counts.edges),
  };
}

function fmt(n: number): string {
  return n === 0 ? '0' : Math.abs(n) < 0.001 ? n.toExponential(2) : String(Number(n.toPrecision(4)));
}

const FINDING_SPECS = {
  'tiny-face': {
    code: 'export.geometry-quality.tiny-faces',
    noun: 'face(s) smaller than',
    unit: 'mm²',
    count: (q: ExportGeometryQualitySummary) => q.tinyFaces,
    threshold: (q: ExportGeometryQualitySummary) => q.thresholds.tinyFaceAreaMm2,
    perPart: (p: { tinyFaces: number }) => p.tinyFaces,
    hint: 'Snap near-coincident steps/offsets to an exact shared value (or make them >= the threshold), then re-export; turn the gate off (qualityGate: "off" / --quality-gate off) only to ship knowingly.',
  },
  'short-edge': {
    code: 'export.geometry-quality.short-edges',
    noun: 'edge(s) shorter than',
    unit: 'mm',
    count: (q: ExportGeometryQualitySummary) => q.shortEdges,
    threshold: (q: ExportGeometryQualitySummary) => q.thresholds.shortEdgeLengthMm,
    perPart: (p: { shortEdges: number }) => p.shortEdges,
    hint: 'Merge or lengthen the reported short edges (snap near-equal dimensions, remove micro-steps), then re-export; turn the gate off (qualityGate: "off" / --quality-gate off) only to ship knowingly.',
  },
} as const;

function findingDiagnostic(kind: GeometryQualityWorst['kind'], summary: ExportGeometryQualitySummary, block: boolean): CompilerDiagnostic | undefined {
  const spec = FINDING_SPECS[kind];
  const count = spec.count(summary);
  if (count === 0) return undefined;
  const worst = summary.worst.find(w => w.kind === kind);
  const parts = summary.parts.flatMap(p => ('ok' in p && spec.perPart(p) > 0 ? [p.part] : []));
  const where = worst ? ` Worst: ${worst.part} ${worst.id} ${fmt(worst.size)} ${spec.unit} at [${worst.location.map(fmt).join(', ')}].` : '';
  const blocked = block ? ' Export blocked (qualityGate: block).' : '';
  return {
    target: 'export-occt',
    code: spec.code,
    featureId: parts[0],
    severity: block ? 'error' : 'warn',
    message: `Geometry quality: ${count} ${spec.noun} ${fmt(spec.threshold(summary))} ${spec.unit} in ${parts.join(', ')}.${where}${blocked}`,
    hint: spec.hint,
    nextAction: NEXT_ACTIONS[spec.code],
    details: { count, worstSize: worst?.size ?? 0, parts: parts.join(',') },
  };
}

function skippedDiagnostic(part: string, reason: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'export.geometry-quality.skipped',
    severity: 'info',
    featureId: part,
    message: `Geometry quality check skipped for '${part}': ${reason}.`,
    hint: "Run verify({ check: 'geometry-quality', feature_id }) on the body directly if it must be screened.",
    nextAction: NEXT_ACTIONS['export.geometry-quality.skipped'],
  };
}

interface GateState {
  parts: GeometryQualityPart[];
  worst: (GeometryQualityWorst & { ratio: number })[];
  diagnostics: CompilerDiagnostic[];
  facesChecked: number;
  /** Shared local shapes (repeated fasteners) are measured once. */
  cache: Map<ShapeBackend, BodyTopologyScreen>;
}

function gateOneBody(body: GateBody, options: ResolvedGeometryQualityOptions, maxFaces: number, st: GateState): void {
  let check = st.cache.get(body.shape);
  if (check === undefined) {
    try {
      check = screenBodyTopology(body.shape, options, maxFaces - st.facesChecked);
    } catch (e) {
      check = { skipped: `measurement failed (${e instanceof Error ? e.message : String(e)})`, faces: 0 };
    }
    st.facesChecked += check.faces;
    // Budget skips are not cached: a smaller later body may still fit.
    if ('reports' in check) st.cache.set(body.shape, check);
  }
  if ('skipped' in check) {
    st.parts.push({ part: body.name, skipped: check.skipped });
    st.diagnostics.push(skippedDiagnostic(body.name, check.skipped));
    return;
  }
  st.parts.push(partEntry(body.name, check.reports));
  const multi = check.reports.length > 1;
  check.reports.forEach((r, i) => collectWorst(body.name, i, multi, r, body.transform, st.worst));
}

/** Run the gate on a lowered export target. Never throws: a measurement
 *  failure on one body becomes an info skip for that body. */
export function runExportQualityGate(
  format: string,
  lowered: ShapeBackend,
  targetId: string,
  input: ExportQualityGateInput | undefined,
): ExportQualityGateResult {
  if (!QUALITY_GATED_FORMATS.has(format)) return { diagnostics: [], blocked: false };
  return runQualityGateOnBodies(gateBodies(lowered, targetId), input);
}

/** Gate explicit bodies (per-part export). Mode 'off' returns no summary. */
export function runQualityGateOnBodies(bodies: readonly GateBody[], input: ExportQualityGateInput | undefined): ExportQualityGateResult {
  const mode = input?.mode ?? 'warn';
  if (mode === 'off') return { diagnostics: [], blocked: false };
  const started = performance.now();
  const options = resolveGeometryQualityOptions({ tiny_face_area_mm2: input?.tiny_face_area_mm2, short_edge_length_mm: input?.short_edge_length_mm });
  const maxFaces = input?.max_faces ?? DEFAULT_QUALITY_GATE_MAX_FACES;
  const st: GateState = { parts: [], worst: [], diagnostics: [], facesChecked: 0, cache: new Map() };
  for (const body of bodies) gateOneBody(body, options, maxFaces, st);
  const checked = st.parts.filter((p): p is Extract<GeometryQualityPart, { ok: boolean }> => 'ok' in p);
  const summary: ExportGeometryQualitySummary = {
    ok: checked.every(p => p.ok),
    mode,
    tinyFaces: checked.reduce((n, p) => n + p.tinyFaces, 0),
    shortEdges: checked.reduce((n, p) => n + p.shortEdges, 0),
    worst: st.worst.sort((a, b) => a.ratio - b.ratio).slice(0, MAX_WORST).map(({ ratio, ...w }) => (void ratio, w)),
    thresholds: { tinyFaceAreaMm2: options.tinyFaceAreaMm2, shortEdgeLengthMm: options.shortEdgeLengthMm },
    parts: st.parts,
    budget: { maxFaces, facesChecked: st.facesChecked },
    elapsedMs: Math.round((performance.now() - started) * 10) / 10,
  };
  const block = mode === 'block' && !summary.ok;
  const findings = [findingDiagnostic('tiny-face', summary, block), findingDiagnostic('short-edge', summary, block)]
    .filter((d): d is CompilerDiagnostic => d !== undefined);
  return { summary, diagnostics: [...findings, ...st.diagnostics], blocked: block };
}
