// src/mcp/tools/listFaces.ts
//
// MCP tool: list faces of a kernelCAD shape with optional FaceQuery filter.
//
// F-surface F2: each face summary now carries a stable `ref` string of the form
// `@kc[<owner>/face/<refName>]` plus a `lineage` record describing how the ref
// was derived. The legacy `id` field is retained one release with
// `deprecated: true` per spec §3.6.

import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { resolveFaceQuery, type FaceQuery } from '../../../kernel/backends/occt/edgeQueries';
import type { Face } from 'replicad';
import { runMcpScript } from '../runMcpScript';
import { formatTopoRef, type TopoKind } from '../../../kernel/naming';
import type { FaceLabelsMap } from '../../../shared/intent/featureRecord';

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
  /** @deprecated — use `ref` instead. Removed in the release after F-surface. */
  id: string;
  /** Marker that the consumer should migrate to `ref`. */
  deprecated: true;
  /** Stable string ref of the form `@kc[<owner>/face/<refName>]`. */
  ref: string;
  /** Resolution context for the ref. */
  lineage: FaceLineageSummary;
  centroid: [number, number, number];
  normal: [number, number, number];
  surfaceType: string;
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
  const shape = r.shapes.get(targetId);
  if (!shape) {
    const fatal = r.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' has no lowered shape: ${fatal.message}`
        : `Feature '${targetId}' has no lowered shape.`,
      errorCode: fatal?.code,
    };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'Shape is not an OcctBackend.' };
  }

  const matchedFaces = resolveFaceQuery(shape, input.query ?? {});
  const allFaces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;
  // Match faces by computed OCCT hash so the index survives the
  // `getReplicadShape()` getter returning fresh wrappers per call.
  const allHashes = allFaces.map((f) => faceHashOf(f));

  const historyMap = shape.historyMap;
  const owner = input.feature_id ?? run.records[run.records.length - 1].id;
  const kind: TopoKind = 'face';

  // Build a reverse map of metadata.faceLabels declared at-or-upstream-of the
  // target feature: canonicalName → label string. The list_faces resolver does
  // not run feature-resolution (which would invoke `findFaceLabelInMetadata`),
  // so we mirror that look-up directly so user-applied labels surface on the
  // face summary's `label` and on the canonical ref's segment name.
  const canonicalToLabel = new Map<string, string>();
  for (const rec of run.records) {
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

  const faces: FaceSummary[] = matchedFaces.map(f => {
    const c = f.center;
    const n = f.normalAt();
    const faceHash = faceHashOf(f);
    const idx = allHashes.indexOf(faceHash);
    const lineage = historyMap !== undefined ? historyMap.get(faceHash) : undefined;
    const metadataLabel = lineage?.canonicalName !== undefined
      ? canonicalToLabel.get(lineage.canonicalName)
      : undefined;
    const refName = lineage?.labelName
      ?? metadataLabel
      ?? lineage?.canonicalName
      ?? `f${idx >= 0 ? idx : 0}`;
    const ref = formatTopoRef({ owner, kind, segments: [refName] });
    const lineageSummary: FaceLineageSummary = {
      ...(lineage?.canonicalName !== undefined ? { canonicalName: lineage.canonicalName } : {}),
      ...(lineage?.labelName !== undefined ? { labelName: lineage.labelName } : {}),
      ...(metadataLabel !== undefined && lineage?.labelName === undefined
        ? { labelName: metadataLabel }
        : {}),
      ...(lineage?.featureKind !== undefined ? { featureKind: lineage.featureKind } : {}),
      ...(lineage?.featureOrdinal !== undefined ? { featureOrdinal: lineage.featureOrdinal } : {}),
      ...(lineage?.featureName !== undefined ? { featureName: lineage.featureName } : {}),
      ...(lineage?.surfaceType !== undefined ? { surfaceType: lineage.surfaceType } : {}),
    };
    return {
      id: `f${idx >= 0 ? idx : 0}`,
      deprecated: true,
      ref,
      lineage: lineageSummary,
      centroid: [c.x, c.y, c.z],
      normal: [n.x, n.y, n.z],
      surfaceType: (f as unknown as { geomType?: string }).geomType ?? 'UNKNOWN',
      area: (f as unknown as { area?: number }).area ?? 0,
      label: lineage?.labelName ?? metadataLabel ?? null,
      innerLoops: countInnerLoops(f),
    };
  });

  return { ok: true, faces };
}
