// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/listFaces.ts
//
// MCP tool: list faces of a kernelCAD shape with optional FaceQuery filter.
//
// F-surface F2: each face summary now carries a stable `ref` string of the form
// `@kc[<owner>/face/<refName>]` plus a `lineage` record describing how the ref
// was derived. The positional `id` (`f<N>`) is kept alongside: it is what the
// ref falls back to when a face has no canonical name or label. (A former
// per-face `deprecated: true` marker was dropped — it flagged every face of
// every listing, carrying no information.)
//
// Geometry fields are reported in agent-facing form: `surfaceType` uses the
// public English names ('CYLINDER', not OCCT's 'CYLINDRE'), `area` is the
// real BREP surface area, and `normal` is a unit vector.

import { RecomputeEngine, type RecomputeResult } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { faceUnitNormal, resolveFaceQuery, type FaceQuery } from '../../../kernel/backends/occt/edgeQueries';
import { measureArea, type Face, type Vector } from 'replicad';
import { publicSurfaceType } from '../../../shared/intent/queryNormalize';
import { runMcpScript } from '../runMcpScript';
import { formatTopoRef, type TopoKind } from '../../../kernel/naming';
import type { FaceLineage } from '../../../kernel/naming/evolutionRecord';
import type { FaceLabelsMap, FeatureRecord } from '../../../shared/intent/featureRecord';

export interface ListFacesInput {
  file?: string;
  code?: string;
  feature_id?: string;
  query?: FaceQuery;
}

/** Resolution context that describes how the face's `ref` was derived.
 *  Mirrors the live fields on the per-shape HistoryMap lineage entries; any
 *  field may be omitted when the lineage does not carry that signal. */
export interface FaceLineageSummary {
  canonicalName?: string;
  labelName?: string;
  featureKind?: string;
  featureOrdinal?: number;
  featureName?: string;
  surfaceType?: string;
}

export interface FaceSummary {
  /** Positional id (`f<N>`) within this lowering. Prefer `ref` for anything
   *  that must survive an upstream edit. */
  id: string;
  /** Stable string ref of the form `@kc[<owner>/face/<refName>]`. */
  ref: string;
  /** Resolution context for the ref. */
  lineage: FaceLineageSummary;
  centroid: [number, number, number];
  /** Unit outward normal at the face's UV-centre. */
  normal: [number, number, number];
  /** Public surface-type name: PLANE / CYLINDER / CONE / SPHERE / TORUS /
   *  BSPLINE_SURFACE / … (OCCT's 'CYLINDRE' is reported as 'CYLINDER'). */
  surfaceType: string;
  /** Surface area in mm². */
  area: number;
  label: string | null;
  /**
   * Number of inner boundary loops (holes) on this face — i.e. cutouts fully
   * enclosed by the face, such as the lens openings on an eyewear front. A
   * solid/uncut face reports 0. This is a structural property of the BREP:
   * unlike a render heuristic it is invariant to whether a lens body is
   * inserted into the opening.
   */
  innerLoops: number;
}

export interface ListFacesOutput {
  ok: boolean;
  faces?: FaceSummary[];
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on both failure paths:
   *  (1) script-runtime exception → `KernelError` code or
   *  `cli.script-exception` for non-kernel throws; (2) lowering-error path →
   *  the first error diagnostic's `code`. */
  errorCode?: string;
}

/** Compute the OCCT hash of a replicad Face wrapper. Mirrors the convention
 *  used by `edgeSelection.faceByHash` and `OcctBackend.faceHashes` so the
 *  lookup keys match. */
function faceHashOf(face: Face): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (face as any).wrapped;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wrapped as any).HashCode(2147483647).toString(16);
}

/** Count inner boundary loops (holes) on a face via replicad's `innerWires()`.
 *  Returns 0 for a solid/uncut face, or on any introspection error (a missing
 *  loop count must never crash the listing). */
function countInnerLoops(face: Face): number {
  try {
    const inner = (face as unknown as { innerWires?: () => unknown[] }).innerWires?.();
    return Array.isArray(inner) ? inner.length : 0;
  } catch {
    return 0;
  }
}

function lineageField<K extends keyof FaceLineage>(lineage: FaceLineage | undefined, key: K): FaceLineage[K] | undefined {
  if (lineage === undefined) return undefined;
  return lineage[key];
}

function summarizeLineage(lineage: FaceLineage | undefined, metadataLabel: string | undefined): FaceLineageSummary {
  const canonicalName = lineageField(lineage, 'canonicalName');
  const labelName = lineageField(lineage, 'labelName');
  const featureKind = lineageField(lineage, 'featureKind');
  const featureOrdinal = lineageField(lineage, 'featureOrdinal');
  const featureName = lineageField(lineage, 'featureName');
  const surfaceType = lineageField(lineage, 'surfaceType');
  const summary: FaceLineageSummary = {};
  if (canonicalName !== undefined) summary.canonicalName = canonicalName;
  if (labelName !== undefined) summary.labelName = labelName;
  if (metadataLabel !== undefined && labelName === undefined) summary.labelName = metadataLabel;
  if (featureKind !== undefined) summary.featureKind = featureKind;
  if (featureOrdinal !== undefined) summary.featureOrdinal = featureOrdinal;
  if (featureName !== undefined) summary.featureName = featureName;
  if (surfaceType !== undefined) summary.surfaceType = publicSurfaceType(surfaceType);
  return summary;
}

function resolveFaceRefName(lineage: FaceLineage | undefined, metadataLabel: string | undefined, idx: number): string {
  return lineage?.labelName
    ?? metadataLabel
    ?? lineage?.canonicalName
    ?? `f${idx >= 0 ? idx : 0}`;
}

/** BREP surface area; 0 only if OCCT cannot integrate the face. */
function faceArea(f: Face): number {
  try {
    return measureArea(f);
  } catch {
    return 0;
  }
}

function summarizeFace(
  f: Face,
  c: Vector,
  n: [number, number, number],
  idx: number,
  lineage: FaceLineage | undefined,
  metadataLabel: string | undefined,
  owner: string,
  kind: TopoKind,
): FaceSummary {
  const refName = resolveFaceRefName(lineage, metadataLabel, idx);
  const ref = formatTopoRef({ owner, kind, segments: [refName] });
  const lineageSummary: FaceLineageSummary = summarizeLineage(lineage, metadataLabel);
  return {
    id: `f${idx >= 0 ? idx : 0}`,
    ref,
    lineage: lineageSummary,
    centroid: [c.x, c.y, c.z],
    normal: n,
    surfaceType: publicSurfaceType((f as unknown as { geomType?: string }).geomType),
    area: faceArea(f),
    label: lineage?.labelName ?? metadataLabel ?? null,
    innerLoops: countInnerLoops(f),
  };
}

type ResolvedListFacesShape = { ok: true; shape: OcctBackend } | { ok: false; output: ListFacesOutput };

function resolveListFacesShape(result: RecomputeResult, targetId: string): ResolvedListFacesShape {
  const shape = result.shapes.get(targetId);
  if (!shape) {
    const fatal = result.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      output: {
        ok: false,
        error: fatal
          ? `Feature '${targetId}' has no lowered shape: ${fatal.message}`
          : `Feature '${targetId}' has no lowered shape.`,
        errorCode: fatal?.code,
      },
    };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, output: { ok: false, error: 'Shape is not an OcctBackend.' } };
  }
  return { ok: true, shape };
}

function buildCanonicalToLabel(records: readonly FeatureRecord[], targetId: string): Map<string, string> {
  // Build a reverse map of metadata.faceLabels declared at-or-upstream-of the
  // target feature: canonicalName → label string. The list_faces resolver does
  // not run feature-resolution (which would invoke `findFaceLabelInMetadata`),
  // so we mirror that look-up directly so user-applied labels surface on the
  // face summary's `label` and on the canonical ref's segment name.
  const canonicalToLabel = new Map<string, string>();
  for (const rec of records) {
    const fl = (rec.metadata as { faceLabels?: FaceLabelsMap } | undefined)?.faceLabels;
    if (!fl) continue;
    for (const [label, value] of Object.entries(fl)) {
      if (typeof value === 'string') {
        // canonical alias — `lid: 'top'` etc.
        canonicalToLabel.set(value, label);
      }
    }
    if (rec.id === targetId) break;
  }
  return canonicalToLabel;
}

export async function listFacesTool(input: ListFacesInput): Promise<ListFacesOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;
  if (run.records.length === 0) {
    return { ok: false, error: 'Script returned no features.' };
  }

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const resolved = resolveListFacesShape(r, targetId);
  if (!resolved.ok) return resolved.output;
  const shape = resolved.shape;

  const matchedFaces = resolveFaceQuery(shape, input.query ?? {});
  const allFaces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;
  // Match faces by computed OCCT hash so the index survives the
  // `getReplicadShape()` getter returning fresh wrappers per call.
  const allHashes = allFaces.map((f) => faceHashOf(f));

  const historyMap = shape.historyMap;
  const owner = input.feature_id ?? run.records[run.records.length - 1].id;
  const kind: TopoKind = 'face';

  const canonicalToLabel = buildCanonicalToLabel(run.records, targetId);

  const faces: FaceSummary[] = matchedFaces.map(f => {
    const c = f.center;
    const n = faceUnitNormal(f) ?? [0, 0, 0];
    const faceHash = faceHashOf(f);
    const idx = allHashes.indexOf(faceHash);
    const lineage = historyMap !== undefined ? historyMap.get(faceHash) : undefined;
    const metadataLabel = lineage?.canonicalName !== undefined
      ? canonicalToLabel.get(lineage.canonicalName)
      : undefined;
    return summarizeFace(f, c, n, idx, lineage, metadataLabel, owner, kind);
  });

  return { ok: true, faces };
}
