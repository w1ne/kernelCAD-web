// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/viewerDimensions/declared.ts
//
// Declared dimensions (`shape.dimension({...})`) resolved against the
// world-frame parts. Each spec resolves on its own: a failure becomes a
// `drawing.dimension.unresolved` warning and the rest still ship.

import type { Edge } from 'replicad';
import type { WorldFramePart } from '../sceneToWorldFrame';
import type { DimensionAnchor, DrawingDimensionSpec } from '../../../../shared/intent/drawingGdtRecord';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../../../shared/diagnostics/registry';
import type { Vec3 } from '../../../../shared/intent/types';
import type { EdgeQuery } from '../../../../shared/intent/queryTypes';
import { circleOf, edgeMid, fail, oneEdge, resolveAnchor } from '../drawingAnchors';
import type { Checkpoint } from './auto';
import type { V3, ViewerDimension } from './types';
import { formatMm } from '../../../../shared/intent/viewerDimensionFormat';
import { add, cross, dot, len, scale, sub, unit } from './vec';

type Draft = Omit<ViewerDimension, 'id' | 'source'>;
type Parts = readonly WorldFramePart[];

const geomType = (e: Edge): string | undefined => (e as unknown as { geomType?: string }).geomType;
const isCircle = (e: Edge): boolean => geomType(e) === 'CIRCLE';

/** Angular dimensions measure between straight edges only. */
function straightEdge(parts: Parts, q: EdgeQuery, role: string): Edge {
  const e = oneEdge(parts, q, role);
  if (geomType(e) !== 'LINE') fail(`${role}: edge is a ${geomType(e) ?? 'UNKNOWN'}, not a LINE — angular needs two straight edges`);
  return e;
}
const pt = (p: { x: number; y: number; z: number }): V3 => [p.x, p.y, p.z];

/** A linear end: a circular edge means its centre (hole-to-hole is
 *  centre-to-centre); any other anchor resolves as on a drawing. Shared by
 *  the viewer and the drawing sheet so both measure the same points. */
export function dimensionEnd(parts: Parts, anchor: DimensionAnchor, role: string): V3 {
  if (!Array.isArray(anchor) && 'edge' in anchor) {
    const edge = oneEdge(parts, anchor.edge, role);
    return isCircle(edge) ? circleOf(edge, role).center : edgeMid(edge);
  }
  const a = Array.isArray(anchor) ? ([...anchor] as Vec3) : (anchor as Exclude<DimensionAnchor, readonly number[]>);
  return resolveAnchor(parts, a, role);
}

function linearDraft(parts: Parts, spec: Extract<DrawingDimensionSpec, { kind: 'linear' }>, role: string): Draft {
  const a = dimensionEnd(parts, spec.from, `${role}.from`);
  const b = dimensionEnd(parts, spec.to, `${role}.to`);
  const value = formatMm(len(sub(b, a)));
  return { kind: 'linear', a, b, text: spec.label ? `${spec.label} ${value}` : value };
}

function radialDraft(parts: Parts, spec: Extract<DrawingDimensionSpec, { kind: 'diameter' | 'radius' }>, role: string): Draft {
  const edge = oneEdge(parts, spec.edge, `${role}.edge`);
  const { center, radius } = circleOf(edge, `${role}.edge`);
  const rim = pt(edge.pointAt(0));
  const quarter = pt(edge.pointAt(0.25));
  const axis = unit(cross(sub(rim, center), sub(quarter, center)));
  const diameter = spec.kind === 'diameter';
  const a = diameter ? sub(center, sub(rim, center)) : center;
  const value = diameter ? `Ø${formatMm(radius * 2)}` : `R${formatMm(radius)}`;
  return { kind: spec.kind, a, b: rim, centre: center, axis, text: spec.label ? `${spec.label} ${value}` : value };
}

/** Closest-approach midpoint of two lines (p + s·d, q + t·e). */
function apexOf(p: V3, d: V3, q: V3, e: V3, role: string): V3 {
  const w = sub(p, q);
  const b = dot(d, e);
  const denom = 1 - b * b;
  if (denom < 1e-9) fail(`${role}: the two edges are parallel — no apex to measure from`);
  const s = (b * dot(e, w) - dot(d, w)) / denom;
  const t = (dot(e, w) - b * dot(d, w)) / denom;
  return scale(add(add(p, scale(d, s)), add(q, scale(e, t))), 0.5);
}

/** Unit direction from the apex toward the edge end farther from it. */
function awayFrom(apex: V3, e: Edge): V3 {
  const s = pt(e.startPoint);
  const t = pt(e.endPoint);
  return unit(len(sub(s, apex)) > len(sub(t, apex)) ? sub(s, apex) : sub(t, apex));
}

function angularDraft(parts: Parts, spec: Extract<DrawingDimensionSpec, { kind: 'angular' }>, role: string): Draft {
  const eA = straightEdge(parts, spec.from, `${role}.from`);
  const eB = straightEdge(parts, spec.to, `${role}.to`);
  const dir = (e: Edge): V3 => unit(sub(pt(e.endPoint), pt(e.startPoint)));
  const apex = apexOf(pt(eA.startPoint), dir(eA), pt(eB.startPoint), dir(eB), role);
  const cos = Math.max(-1, Math.min(1, dot(awayFrom(apex, eA), awayFrom(apex, eB))));
  const deg = (Math.acos(cos) * 180) / Math.PI;
  const value = `${formatMm(deg)}°`;
  return { kind: 'angular', a: edgeMid(eA), b: edgeMid(eB), centre: apex, text: spec.label ? `${spec.label} ${value}` : value };
}

function draftFor(parts: Parts, spec: DrawingDimensionSpec, role: string): Draft {
  switch (spec.kind) {
    case 'linear': return linearDraft(parts, spec, role);
    case 'diameter':
    case 'radius': return radialDraft(parts, spec, role);
    case 'angular': return angularDraft(parts, spec, role);
  }
}

function unresolvedWarning(role: string, kind: string, err: unknown): CompilerDiagnostic {
  const why = err instanceof Error ? err.message : String(err);
  return {
    target: 'export-occt',
    code: 'drawing.dimension.unresolved',
    severity: 'warn',
    message: `${role} (${kind}) was skipped: ${why}`,
    hint: HINT_TEMPLATES['drawing.dimension.unresolved'].template,
    nextAction: NEXT_ACTIONS['drawing.dimension.unresolved'],
  };
}

/** Resolve every declared spec into `out`; unresolvable ones become
 *  warnings. Appends as it goes so a budget overrun keeps resolved specs. */
export function declaredDimensions(
  parts: Parts,
  specs: readonly DrawingDimensionSpec[],
  checkpoint: Checkpoint,
  out: { dimensions: ViewerDimension[]; diagnostics: CompilerDiagnostic[] },
): void {
  specs.forEach((spec, i) => {
    checkpoint();
    const role = `dimensions[${i}]`;
    try {
      out.dimensions.push({ ...draftFor(parts, spec, role), id: `declared:${i}`, source: 'declared' });
    } catch (err) {
      out.diagnostics.push(unresolvedWarning(role, spec.kind, err));
    }
  });
}
