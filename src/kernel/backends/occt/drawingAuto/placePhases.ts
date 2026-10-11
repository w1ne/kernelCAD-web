// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/placePhases.ts

import { escAttr, fcfCells } from '../drawingAnnotations';
import { principalAxis } from '../drawingFeatures';
import type { ChamferFeature, RadiusFeature, V3 } from '../drawingFeatures';
import { formatDimValue } from '../drawingLayout';
import type { DrawingViewName, Pt2 } from '../drawingLayout';
import { viewBasis } from '../drawingProjection';
import { datumRendered, FALLBACK_FRACTIONS, fcfLineCandidates, fcfRendered, noteCandidates } from './candidates';
import { flatnessFor } from './iso2768';
import { FAR_STEMS, fallbackAngles, leaderCallout, orderedAngles, STEMS } from './placement';
import { beginAnnotation, choose, commit, outwardAngle, toSheet } from './renderContext';
import type { Candidate, RenderCtx } from './renderContext';
import { edgeOnLines, viewAlong } from './views';
import { cross, dot, len } from './vectors';
import { annotationId, invalidReview } from '../draftingReview';

export function placeHoleCallouts(ctx: RenderCtx): void {
  const { opts, include, holeGroups, views, scale } = ctx;
  if (opts.enabled && include.has('holes')) {
    for (const g of holeGroups) {
      const originalText = [g.label, ...g.rows.map(r => r.join(' '))].join(' | ');
      const id = annotationId('hole', `${g.key}:${g.holes.map(h => h.entry.join(',')).sort().join(';')}`);
      const review = beginAnnotation(ctx, id, 'hole', g.view, originalText);
      if (!review) continue;
      const view = review.view;
      const label = ctx.input.annotationOverrides?.[id]?.text ?? g.label;
      if (principalAxis(g.holes[0].axis) === null) continue;
      const owner = ctx.ownerSeq;
      const reps = g.holes
        .map(h => ({ h, p: toSheet(ctx, h.entry, view) }))
        .sort((p, q) => {
          const box = views[view].placement.box;
          const d = (x: Pt2) => Math.hypot(x[0] - (box.x + box.w / 2), x[1] - (box.y + box.h / 2));
          return d(q.p) - d(p.p);
        });
      const modelRadius = (g.holes[0].counterbore?.diameter ?? g.holes[0].countersink?.diameter ?? g.holes[0].diameter) / 2;
      const radius = modelRadius * scale;
      const build = (wide: boolean): Candidate[] => {
        const out: Candidate[] = [];
        reps.forEach((rep, ri) => {
          const preferred = outwardAngle(ctx, rep.p, view);
          (wide ? fallbackAngles(preferred) : orderedAngles(preferred)).forEach((angle, ai) => {
            (wide ? FAR_STEMS : STEMS).forEach(stem => {
              out.push({
                penalty: stem + ai * 4 + ri * 2,
                render: () => leaderCallout(
                  view === g.view ? [rep.p[0] + Math.cos(angle) * radius, rep.p[1] + Math.sin(angle) * radius]
                    : projectedRimTip(ctx, rep.h.entry, rep.h.axis, modelRadius, angle, view),
                  angle, stem + review.offset, label, g.rows,
                  `<g class="dim hole-callout" data-kc-auto="hole" data-kc-count="${g.holes.length}" fill="none" stroke="#000" stroke-width="0.18">`,
                  true,
                ),
              });
            });
          });
        });
        return out;
      };
      const best = choose(ctx, owner, build(false), () => build(true));
      if (best) commit(ctx, 'hole', view, [label, ...g.rows.map(r => r.join(' '))].join(' | '), best.r, false, review);
    }
  }
}

/** A circle viewed obliquely is not a sheet-space circle. Anchor on its real
 *  projected rim when a reviewer moves its callout to another view. */
function projectedRimTip(ctx: RenderCtx, entry: V3, axis: V3, radius: number, angle: number, view: DrawingViewName): Pt2 {
  const basis = viewBasis(view);
  const direction: V3 = basis.x.map((c, i) => c * Math.cos(angle) - basis.y[i] * Math.sin(angle)) as V3;
  const axial = dot(direction, axis);
  let radial: V3 = direction.map((c, i) => c - axis[i] * axial) as V3;
  if (len(radial) < 1e-8) radial = cross(axis, Math.abs(axis[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]);
  const factor = radius / len(radial);
  return toSheet(ctx, entry.map((c, i) => c + radial[i] * factor) as V3, view);
}

const DATUM_STEMS = [5, 9, 13, 18, 24, 30];
const DATUM_FAR_STEMS = [...DATUM_STEMS, 36, 45, 56];

export function placeDatumSymbols(ctx: RenderCtx): void {
  const { datums } = ctx;
  for (const label of [...datums.keys()].sort()) {
    const d = datums.get(label)!;
    if (!d.draw) continue;
    const review = beginAnnotation(ctx, annotationId('datum', label), 'datum', 'front', `datum ${label}`);
    if (!review) continue;
    if (review.originalText !== undefined) invalidReview(`annotation ${review.id} has no primary label; edit its datum declaration`);
    let lines = d.plane ? edgeOnLines(d.plane) : [];
    if (ctx.input.annotationOverrides?.[review.id]?.view !== undefined) {
      lines = lines.filter(line => line.view === review.view);
      if (!lines.length && d.plane) invalidReview(`annotation ${review.id}: view ${review.view} cannot show the datum face edge-on`);
    }
    const owner = ctx.ownerSeq;
    const attrs = ` data-kc-auto="datum" data-kc-datum="${escAttr(label)}"`;
    const build = (wide: boolean): Array<Candidate & { view: DrawingViewName }> => {
      const out: Array<Candidate & { view: DrawingViewName }> = [];
      if (lines.length > 0) {
        lines.forEach((line, li) => {
          const a = toSheet(ctx, line.a, line.view);
          const b = toSheet(ctx, line.b, line.view);
          const basis = viewBasis(line.view);
          const angle = Math.atan2(-dot(line.normal, basis.y), dot(line.normal, basis.x));
          (wide ? FALLBACK_FRACTIONS : [0.5, 0.35, 0.65, 0.2, 0.8]).forEach((f, fi) => {
            const tip: Pt2 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
            (wide ? DATUM_FAR_STEMS : DATUM_STEMS).forEach(stem => {
              out.push({
                view: line.view,
                penalty: stem + fi * 3 + li * 12,
                render: () => datumRendered(tip, angle, label, stem + review.offset, attrs),
              });
            });
          });
        });
      } else {
        const tip = toSheet(ctx, d.point, review.view);
        (wide ? fallbackAngles(-Math.PI / 4) : orderedAngles(-Math.PI / 4)).forEach((angle, ai) => {
          (wide ? DATUM_FAR_STEMS : [5, 9, 13, 18, 24]).forEach(stem => {
            out.push({ view: review.view, penalty: stem + ai * 3, render: () => datumRendered(tip, angle, label, stem + review.offset, attrs) });
          });
        });
      }
      return out;
    };
    const best = choose(ctx, owner, build(false), () => build(true));
    if (best) {
      const chosen = best.candidate;
      const line = lines.find(l => l.view === chosen.view);
      if (line) ctx.datumLines.set(label, line);
      commit(ctx, 'datum', chosen.view, `datum ${label}`, best.r, false, review);
    }
  }
}

export function placeFlatnessOnA(ctx: RenderCtx): void {
  const { opts, include, datums, resolvedTols, datumLines } = ctx;
  const datumA = datums.get('A');
  if (datumA?.plane) {
    const declaredFlat = resolvedTols.find(t =>
      t.decl.type === 'flatness' && t.plane && t.plane.index === datumA.plane!.index);
    const aLines = edgeOnLines(datumA.plane);
    const preferred = datumLines.get('A');
    const lines = preferred ? [preferred, ...aLines.filter(l => l.view !== preferred.view)] : aLines;
    const wanted = declaredFlat !== undefined || (opts.enabled && include.has('flatness'));
    if (lines.length > 0 && wanted) {
      const p = datumA.plane;
      const longest = Math.max(p.max[0] - p.min[0], p.max[1] - p.min[1], p.max[2] - p.min[2]);
      const cells = declaredFlat
        ? fcfCells(declaredFlat.decl)
        : fcfCells({ type: 'flatness', value: flatnessFor(opts.tolerance, longest) });
      if (declaredFlat) ctx.consumedTols.add(declaredFlat.index);
      const review = beginAnnotation(ctx, annotationId('flatness', 'A'), 'flatness', lines[0].view, cells.join(' '));
      if (!review) return;
      if (review.originalText !== undefined) invalidReview(`annotation ${review.id} has no primary label; edit its tolerance declaration`);
      const available = ctx.input.annotationOverrides?.[review.id]?.view !== undefined ? lines.filter(line => line.view === review.view) : lines;
      if (!available.length) invalidReview(`annotation ${review.id}: view ${review.view} cannot show this toleranced face edge-on`);
      const owner = ctx.ownerSeq;
      const build = (wide: boolean) => available.flatMap((line, li) =>
        fcfLineCandidates(line, cells, 'flatness', (p2, v) => toSheet(ctx, p2, v), wide, review.offset)
          .map(c => ({ ...c, penalty: c.penalty + li * 12, view: line.view })));
      const best = choose(ctx, owner, build(false), () => build(true));
      if (best) commit(ctx, 'flatness', best.candidate.view, cells.join(' '), best.r, false, review);
    }
  }
}

export function placeRadiusAndChamferNotes(ctx: RenderCtx): void {
  const { opts, include } = ctx;
  if (opts.enabled && include.has('fillets')) placeFilletRadiusNotes(ctx);
  if (opts.enabled && include.has('chamfers')) placeChamferNotes(ctx);
}

function placeFilletRadiusNotes(ctx: RenderCtx): void {
  const { model } = ctx;
  const groups = new Map<string, RadiusFeature[]>();
  for (const r of model.radii) {
    const k = `${viewAlong(r.axis)}|${formatDimValue(r.radius)}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const [k, feats] of groups) {
    const originalView = k.split('|')[0] as DrawingViewName;
    const originalLabel = `${feats.length > 1 ? `${feats.length}× ` : ''}R${formatDimValue(feats[0].radius)}`;
    const review = beginAnnotation(ctx, annotationId('fillet', `${k}:${feats.map(f => f.arcPoint.join(',')).sort().join(';')}`), 'fillet', originalView, originalLabel);
    if (!review) continue;
    const view = review.view, label = review.text;
    const targets = feats.flatMap(f => [f.arcPoint, ...f.samples]).map(p => toSheet(ctx, p, view));
    const build = (wide: boolean) => noteCandidates(targets, label, 'fillet', view, (p, v) => outwardAngle(ctx, p, v), wide, review.offset);
    const best = choose(ctx, ctx.ownerSeq, build(false), () => build(true));
    if (best) commit(ctx, 'fillet', view, label, best.r, false, review);
  }
}

function placeChamferNotes(ctx: RenderCtx): void {
  const { model } = ctx;
  const groups = new Map<string, ChamferFeature[]>();
  for (const c of model.chamfers) {
    const k = `${viewAlong(c.edgeDir)}|${formatDimValue(c.legs[0])}|${formatDimValue(c.legs[1])}`;
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  for (const [k, feats] of groups) {
    const originalView = k.split('|')[0] as DrawingViewName;
    const [l0, l1] = feats[0].legs;
    const size = Math.abs(l0 - l1) < 0.01
      ? `${formatDimValue(l0)} × 45°`
      : `${formatDimValue(l0)} × ${formatDimValue(l1)}`;
    const originalLabel = `${feats.length > 1 ? `${feats.length}× ` : ''}${size}`;
    const review = beginAnnotation(ctx, annotationId('chamfer', `${k}:${feats.map(f => f.midPoint.join(',')).sort().join(';')}`), 'chamfer', originalView, originalLabel);
    if (!review) continue;
    const view = review.view, label = review.text;
    const targets = feats.map(f => toSheet(ctx, f.midPoint, view));
    const build = (wide: boolean) => noteCandidates(targets, label, 'chamfer', view, (p, v) => outwardAngle(ctx, p, v), wide, review.offset);
    const best = choose(ctx, ctx.ownerSeq, build(false), () => build(true));
    if (best) commit(ctx, 'chamfer', view, label, best.r, false, review);
  }
}

export function placeLeftoverTolerances(ctx: RenderCtx): void {
  const { resolvedTols, consumedTols } = ctx;
  for (const t of resolvedTols) {
    if (consumedTols.has(t.index)) continue;
    const cells = fcfCells(t.decl);
    const review = beginAnnotation(ctx, annotationId('tolerance', t.decl), 'tolerance', t.edgeLine?.view ?? t.view, cells.join(' '));
    if (!review) continue;
    if (review.originalText !== undefined) invalidReview(`annotation ${review.id} has no primary label; edit its tolerance declaration`);
    const line = t.edgeLine && t.edgeLine.view === review.view ? t.edgeLine : undefined;
    const build = (wide: boolean): Candidate[] => {
      if (line) return fcfLineCandidates(line, cells, 'tolerance', (p, v) => toSheet(ctx, p, v), wide, review.offset);
      const tip = toSheet(ctx, t.target, review.view);
      const out: Candidate[] = [];
      const preferred = outwardAngle(ctx, tip, review.view);
      (wide ? fallbackAngles(preferred) : orderedAngles(preferred)).forEach((angle, ai) => {
        (wide ? FAR_STEMS : STEMS).forEach(stem => {
          out.push({
            penalty: stem + ai * 4,
            render: () => fcfRendered(tip, angle, cells, stem + review.offset, 'tolerance'),
          });
        });
      });
      return out;
    };
    const best = choose(ctx, ctx.ownerSeq, build(false), () => build(true));
    if (best) commit(ctx, 'tolerance', review.view, cells.join(' '), best.r, false, review);
  }
}
