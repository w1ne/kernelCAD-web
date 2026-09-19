// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/resolvePhases.ts

import { NEXT_ACTIONS } from '../../../../shared/diagnostics/registry';
import { KernelError } from '../../../../shared/intent/kernelError';
import type { DrawingDatumDecl } from '../../../../shared/intent/drawingGdtRecord';
import { circumcircle, cylinderAxisOf } from '../drawingFeatures';
import type { V3 } from '../drawingFeatures';
import type { DrawingViewName } from '../drawingLayout';
import { deriveDatums } from './datums';
import { matchPlanar, oneEdge, oneFace } from './queries';
import type { RenderCtx, ResolvedTolerance } from './renderContext';
import { edgeOnLines, viewAlong } from './views';
import { len, sub } from './vectors';

export function resolveDatumFacts(ctx: RenderCtx): void {
  const { input, opts, parts, model } = ctx;
  const fixed = ctx.fixed;
  const declare = (d: DrawingDatumDecl, draw: boolean, role: string) => {
    const face = oneFace(parts, d.face, role, 'drawing.datum.unresolved');
    const plane = matchPlanar(face, model.planar);
    const c = face.center;
    const n = plane?.normal ?? null;
    const prev = fixed.get(d.label);
    if (prev) {
      if (len(sub(prev.point, [c.x, c.y, c.z])) < 1e-3) {
        if (draw && !prev.draw) return; // already drawn by options.annotations
        if (!draw) prev.draw = false;
        return;
      }
      throw new KernelError(
        'feature.invalid-args',
        `svg-drawing: datum '${d.label}' is declared on two different faces (${role} and an earlier declaration).`,
        undefined,
        'Declare each datum letter once — in options.annotations, options.autoAnnotate.datums, or shape.datum().',
      );
    }
    fixed.set(d.label, {
      label: d.label, source: 'declared', plane, point: [c.x, c.y, c.z], normal: n, draw,
    });
  };
  input.authoredDatums.forEach((d, i) => declare(d, false, `annotations datum '${d.label}' (#${i})`));
  opts.datums.forEach((d, i) => declare(d, true, `autoAnnotate.datums[${i}]`));
  ctx.declarations.datums.forEach(d => declare(d, true, `datum('${d.label}')`));

  let datums = fixed;
  if (opts.enabled && ctx.include.has('datums')) {
    const derived = deriveDatums(model, fixed);
    datums = derived.datums;
    if (derived.missing.length > 0) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'drawing.auto.datum-ambiguous',
        severity: 'warn',
        message:
          `svg-drawing autoAnnotate could not establish datum${derived.missing.length > 1 ? 's' : ''} ` +
          derived.missing.map(m => `${m.label} (${m.why})`).join(', ') +
          '. Tolerances reference only the datums that exist.',
        hint: "Declare the missing datum with shape.datum('<letter>', faceQuery) or options.autoAnnotate.datums.",
        nextAction: NEXT_ACTIONS['drawing.auto.datum-ambiguous'],
      });
    }
  }
  ctx.datums = datums;
}

export function resolveDeclaredTolerances(ctx: RenderCtx): ResolvedTolerance[] {
  const { parts, declarations, model } = ctx;
  return declarations.tolerances.map((decl, index) => {
    const role = `tolerance(${decl.type}) #${index}`;
    if (decl.edge) {
      const edge = oneEdge(parts, decl.edge, role);
      const mid = edge.pointAt(0.5);
      const target: V3 = [mid.x, mid.y, mid.z];
      if ((edge as unknown as { geomType?: string }).geomType === 'CIRCLE') {
        const p = (t: number): V3 => { const q = edge.pointAt(t); return [q.x, q.y, q.z]; };
        const circle = circumcircle(p(0), p(1 / 3), p(2 / 3));
        if (circle) {
          return { decl, index, axis: { point: circle.centre, dir: circle.normal }, target, view: viewAlong(circle.normal) };
        }
      }
      return { decl, index, target, view: 'front' as DrawingViewName };
    }
    const face = oneFace(parts, decl.face!, role, 'drawing.tolerance.feature-unresolved');
    const type = (face as unknown as { geomType?: string }).geomType;
    if (type === 'PLANE') {
      const plane = matchPlanar(face, model.planar);
      const line = plane ? (edgeOnLines(plane)[0] ?? null) : null;
      const c = face.center;
      return {
        decl, index, plane, edgeLine: line, target: [c.x, c.y, c.z],
        view: line?.view ?? 'front',
      };
    }
    if (type === 'CYLINDRE') {
      const cyl = cylinderAxisOf(face);
      const p = face.pointOnSurface(0.5, 0.5);
      if (cyl) {
        return { decl, index, axis: { point: cyl.loc, dir: cyl.dir }, target: [p.x, p.y, p.z], view: viewAlong(cyl.dir) };
      }
    }
    const c = face.center;
    return { decl, index, target: [c.x, c.y, c.z], view: 'front' as DrawingViewName };
  });
}
