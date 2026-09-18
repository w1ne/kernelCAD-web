// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/edgeSelectionLabels.ts
//
// Face-label resolution helpers for edgeSelection: upstream metadata.faceLabels
// lookup (lineage-scoped) and the sketch-segment probe-query builder. Split out
// of edgeSelection.ts purely to keep that file under the file-length ratchet;
// behaviour is unchanged.

import type { FeatureRecord, FaceLabelsMap } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { CanonicalFace, FeatureId, FeatureRef } from '../../../shared/intent/types';
import type { OcctBackend } from './occtBackend';
import type { FaceQuery } from './edgeQueries';

export interface MetadataLabelHit {
  /** The originating feature whose metadata.faceLabels declared this label. */
  origin: FeatureRecord;
  /** The resolved value: a canonical face name or a FaceQuery descriptor. */
  resolved: CanonicalFace | FaceQuery;
}

/** Pull the referenced feature id out of a `FeatureRef`, if it has one.
 *  `surface` refs point into the Surface table, not the feature-record
 *  array, so they contribute no lineage edge here. */
function featureRefTargetId(ref: FeatureRef): FeatureId | undefined {
  switch (ref.kind) {
    case 'feature': return ref.id;
    case 'face':
    case 'edge':
    case 'vertex': return ref.featureId;
    default: return undefined;
  }
}

/**
 * Transitive closure of `consumer.inputs` — every record the consumer is
 * actually built from (boolean operands `base`/`cutter_N`, pattern & mirror
 * `base`, sketch `profile`, assembly part `shape`, face/edge ref owners),
 * excluding the consumer itself.
 *
 * This is the scope a consumer legitimately "sees". Two independent shape
 * subtrees produced by the same factory helper share no ancestors, so each
 * may declare the same `faceLabels` name without colliding.
 *
 * Cycle-safe: the `ancestors` set doubles as the visited guard, so a
 * malformed graph cannot hang the walk.
 */
function collectAncestorIds(
  records: readonly FeatureRecord[],
  consumer: FeatureRecord,
): Set<FeatureId> {
  const byId = new Map<FeatureId, FeatureRecord>();
  for (const rec of records) byId.set(rec.id, rec);

  const ancestors = new Set<FeatureId>();
  const queue: FeatureId[] = [];
  const pushInputs = (rec: FeatureRecord): void => {
    for (const ref of Object.values(rec.inputs)) {
      const id = featureRefTargetId(ref);
      if (id !== undefined && id !== consumer.id && !ancestors.has(id)) {
        ancestors.add(id);
        queue.push(id);
      }
    }
  };

  pushInputs(consumer);
  while (queue.length > 0) {
    const next = byId.get(queue.pop() as FeatureId);
    if (next) pushInputs(next);
  }
  return ancestors;
}

/**
 * Walk the consumer's lineage (the transitive closure of its inputs) and look
 * for any `metadata.faceLabels` entry that declares `label`. Returns a
 * three-way discriminated union:
 *   - `{ hit }` — exactly one ancestor declares it.
 *   - `{ collision }` — two or more ancestors in the SAME lineage conflict (fatal).
 *   - `{ miss }` — no ancestor declares it (fall through to sketch path).
 *
 * Scoping by lineage rather than by script order is what makes a reusable
 * factory safe: `makeBase()` called three times stamps
 * `faceLabels: { lid: 'top' }` on three unrelated records, and each consumer
 * only ever sees the one in its own subtree.
 */
export function findFaceLabelInMetadata(
  records: readonly FeatureRecord[],
  consumer: FeatureRecord,
  label: string,
): { hit: MetadataLabelHit } | { collision: CompilerDiagnostic } | { miss: true } {
  const ancestors = collectAncestorIds(records, consumer);
  const hits: MetadataLabelHit[] = [];
  for (const rec of records) {
    if (rec.id === consumer.id) break; // only upstream
    if (!ancestors.has(rec.id)) continue; // ...and only within this lineage
    const fl = (rec.metadata as { faceLabels?: FaceLabelsMap } | undefined)?.faceLabels;
    if (fl && Object.prototype.hasOwnProperty.call(fl, label)) {
      const resolved = fl[label];
      hits.push({ origin: rec, resolved: resolved as CanonicalFace | FaceQuery });
    }
  }
  if (hits.length === 0) return { miss: true };
  if (hits.length > 1) {
    return {
      collision: {
        target: 'export-occt',
        code: 'feature.label.collision',
        featureId: consumer.id,
        severity: 'error',
        message: `Label '${label}' is declared by multiple upstream features: ${hits.map(h => h.origin.id).join(', ')}. Each label must be unique within the scope a consumer sees.`,
        hint: 'Rename one of the conflicting faceLabels entries upstream so the consumer sees a unique name.',
      },
    };
  }
  return { hit: hits[0] };
}

export function labelToEdgeQuery(
  record: FeatureRecord,
  _base: OcctBackend,
  label: string,
  records: readonly FeatureRecord[] | undefined,
): { query: import('./edgeQueries').EdgeQuery } | { error: CompilerDiagnostic } {
  if (!records) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.no-upstream-sketch',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}' lookup requires record context (internal: records not threaded).`,
        hint: 'Internal error — record context was not threaded into the lowerer.',
      },
    };
  }

  const upstreamSketch = findUpstreamSketch(records, record);
  if (!upstreamSketch) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.no-upstream-sketch',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': base shape isn't sketch-derived. Labels work on shapes built from a path() sketch (extrude); apply the label upstream on the sketch.`,
        hint: 'Apply the label on the sketch, or use an inline FaceQuery (e.g. { atZ: ... }) for primitives.',
      },
    };
  }

  const commands = (upstreamSketch.metadata as { commands?: Array<{ kind: string; x?: { evaluated: number }; y?: { evaluated: number }; label?: string }> } | undefined)?.commands;
  if (!commands) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': upstream sketch has no commands metadata.`,
        hint: 'Construct sketches via path().moveTo(...).lineTo(...).label(...).close() so the commands are persisted.',
      },
    };
  }

  let labeledIdx = -1;
  for (let i = 0; i < commands.length; i++) {
    if (commands[i].label === label) { labeledIdx = i; break; }
  }
  if (labeledIdx < 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}' not found on the upstream sketch's segments. Use the list_face_labels MCP tool to see available labels.`,
        hint: 'Call list_face_labels to see available labels on this shape.',
      },
    };
  }

  const segment = commands[labeledIdx];
  const prev = commands[labeledIdx - 1];
  if (!prev || prev.x === undefined || prev.y === undefined || segment.x === undefined || segment.y === undefined) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': can't determine segment chord (prior command has no endpoint).`,
        hint: 'Place .label(...) immediately after a lineTo or arc segment with an endpoint.',
      },
    };
  }
  const prevX = prev.x.evaluated;
  const prevY = prev.y.evaluated;
  const segX = segment.x.evaluated;
  const segY = segment.y.evaluated;

  const depth = extractExtrudeDepth(records, record);
  if (depth === null) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unsupported-base',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': labels currently support extrude only. Revolve labels are deferred; use an inline query against the geometry as a workaround: {face: {atZ: ...}}.`,
        hint: 'Use an inline FaceQuery (e.g. { atZ: ... }) as a workaround for non-extrude bases.',
      },
    };
  }

  // The labeled segment maps to one side face of the extruded solid. That side
  // face has 4 outer-wire edges: two horizontal (at z=0 and z=depth, running
  // along the segment chord) and two vertical (at the segment's endpoints, both
  // running 0..depth). Build a `within` bounding region that brackets exactly
  // these four edges' midpoints — collapsed in any axis where the segment is
  // axis-parallel, expanded by `tol` to absorb floating-point noise.
  const tol = 1e-3;
  const xMin = Math.min(prevX, segX) - tol;
  const xMax = Math.max(prevX, segX) + tol;
  const yMin = Math.min(prevY, segY) - tol;
  const yMax = Math.max(prevY, segY) + tol;
  return {
    query: {
      within: {
        xMin, xMax,
        yMin, yMax,
        zMin: -tol,
        zMax: depth + tol,
      },
    },
  };
}

function findUpstreamSketch(records: readonly FeatureRecord[], record: FeatureRecord): FeatureRecord | null {
  // Walk from this record's `base` input → if the base is an extrude/revolve,
  // follow its `sketch` input → return the sketch record.
  const baseRef = record.inputs.base;
  if (!baseRef || baseRef.kind !== 'feature') return null;
  const base = records.find(r => r.id === baseRef.id);
  if (!base) return null;
  if (base.kind === 'sketch') return base;
  if (base.kind === 'extrude' || base.kind === 'revolve') {
    const sketchRef = base.inputs.sketch;
    if (sketchRef && sketchRef.kind === 'feature') {
      return records.find(r => r.id === sketchRef.id) ?? null;
    }
  }
  return null;
}

function extractExtrudeDepth(records: readonly FeatureRecord[], record: FeatureRecord): number | null {
  const baseRef = record.inputs.base;
  if (!baseRef || baseRef.kind !== 'feature') return null;
  const base = records.find(r => r.id === baseRef.id);
  if (!base || base.kind !== 'extrude') return null;
  return base.params.depth?.evaluated ?? null;
}
