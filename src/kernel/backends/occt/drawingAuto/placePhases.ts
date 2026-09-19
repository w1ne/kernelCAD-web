// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/placePhases.ts

import { escAttr, fcfCells } from '../drawingAnnotations';
import { principalAxis } from '../drawingFeatures';
import type { ChamferFeature, RadiusFeature } from '../drawingFeatures';
import { formatDimValue } from '../drawingLayout';
import type { DrawingViewName, Pt2 } from '../drawingLayout';
import { viewBasis } from '../drawingProjection';
import { datumRendered, fcfLineCandidates, fcfRendered, noteCandidates } from './candidates';
import { flatnessFor } from './iso2768';
import { leaderCallout, orderedAngles, STEMS } from './placement';
import type { Rendered } from './placement';
import { choose, commit, outwardAngle, toSheet } from './renderContext';
import type { RenderCtx } from './renderContext';
import { edgeOnLines, viewAlong } from './views';
import { dot } from './vectors';

export function placeHoleCallouts(ctx: RenderCtx): void {
  const { opts, include, holeGroups, views, scale } = ctx;
  if (opts.enabled && include.has('holes')) {
    for (const g of holeGroups) {
      const view = g.view;
      if (principalAxis(g.holes[0].axis) === null) continue;
      const owner = ctx.ownerSeq;
      const reps = g.holes
        .map(h => ({ h, p: toSheet(ctx, h.entry, view) }))
        .sort((p, q) => {
          const box = views[view].placement.box;
          const d = (x: Pt2) => Math.hypot(x[0] - (box.x + box.w / 2), x[1] - (box.y + box.h / 2));
          return d(q.p) - d(p.p);
        });
      const radius = (g.holes[0].counterbore?.diameter ?? g.holes[0].countersink?.diameter ?? g.holes[0].diameter) / 2 * scale;
      const candidates: Array<{ render: () => Rendered; penalty: number }> = [];
      reps.forEach((rep, ri) => {
        orderedAngles(outwardAngle(ctx, rep.p, view)).forEach((angle, ai) => {
          STEMS.forEach(stem => {
            candidates.push({
              penalty: stem + ai * 4 + ri * 2,
              render: () => leaderCallout(
                [rep.p[0] + Math.cos(angle) * radius, rep.p[1] + Math.sin(angle) * radius],
                angle, stem, g.label, g.rows,
                `<g class="dim hole-callout" data-kc-auto="hole" data-kc-count="${g.holes.length}" fill="none" stroke="#000" stroke-width="0.18">`,
                true,
              ),
            });
          });
        });
      });
      const best = choose(ctx, owner, candidates);
      if (best) commit(ctx, 'hole', view, [g.label, ...g.rows.map(r => r.join(' '))].join(' | '), best.r);
    }
  }
}

export function placeDatumSymbols(ctx: RenderCtx): void {
  const { datums } = ctx;
  for (const label of [...datums.keys()].sort()) {
    const d = datums.get(label)!;
    if (!d.draw) continue;
    const lines = d.plane ? edgeOnLines(d.plane) : [];
    const owner = ctx.ownerSeq;
    const candidates: Array<{ render: () => Rendered; penalty: number; view: DrawingViewName }> = [];
    const attrs = ` data-kc-auto="datum" data-kc-datum="${escAttr(label)}"`;
    if (lines.length > 0) {
      lines.forEach((line, li) => {
        const a = toSheet(ctx, line.a, line.view);
        const b = toSheet(ctx, line.b, line.view);
        const basis = viewBasis(line.view);
        const angle = Math.atan2(-dot(line.normal, basis.y), dot(line.normal, basis.x));
        [0.5, 0.35, 0.65, 0.2, 0.8].forEach((f, fi) => {
          const tip: Pt2 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          [5, 9, 13, 18, 24, 30].forEach(stem => {
            candidates.push({
              view: line.view,
              penalty: stem + fi * 3 + li * 12,
              render: () => datumRendered(tip, angle, label, stem, attrs),
            });
          });
        });
      });
    } else {
      const tip = toSheet(ctx, d.point, 'front');
      orderedAngles(-Math.PI / 4).forEach((angle, ai) => {
        [5, 9, 13, 18, 24].forEach(stem => {
          candidates.push({ view: 'front', penalty: stem + ai * 3, render: () => datumRendered(tip, angle, label, stem, attrs) });
        });
      });
    }
    const best = choose(ctx, owner, candidates);
    if (best) {
      const chosen = candidates[best.index];
      const line = lines.find(l => l.view === chosen.view);
      if (line) ctx.datumLines.set(label, line);
      commit(ctx, 'datum', chosen.view, `datum ${label}`, best.r);
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
      const owner = ctx.ownerSeq;
      const candidates = lines.flatMap((line, li) =>
        fcfLineCandidates(line, cells, 'flatness', (p2, v) => toSheet(ctx, p2, v)).map(c => ({ ...c, penalty: c.penalty + li * 12, view: line.view })));
      const best = choose(ctx, owner, candidates);
      if (best) commit(ctx, 'flatness', candidates[best.index].view, cells.join(' '), best.r);
    }
  }
}

export function placeRadiusAndChamferNotes(ctx: RenderCtx): void {
  const { opts, include, model } = ctx;
  if (opts.enabled && include.has('fillets')) {
    const groups = new Map<string, RadiusFeature[]>();
    for (const r of model.radii) {
      const k = `${viewAlong(r.axis)}|${formatDimValue(r.radius)}`;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    for (const [k, feats] of groups) {
      const view = k.split('|')[0] as DrawingViewName;
      const label = `${feats.length > 1 ? `${feats.length}× ` : ''}R${formatDimValue(feats[0].radius)}`;
      const targets = feats.flatMap(f => [f.arcPoint, ...f.samples]).map(p => toSheet(ctx, p, view));
      const candidates = noteCandidates(targets, label, 'fillet', view, (p, v) => outwardAngle(ctx, p, v));
      const best = choose(ctx, ctx.ownerSeq, candidates);
      if (best) commit(ctx, 'fillet', view, label, best.r);
    }
  }
  if (opts.enabled && include.has('chamfers')) {
    const groups = new Map<string, ChamferFeature[]>();
    for (const c of model.chamfers) {
      const k = `${viewAlong(c.edgeDir)}|${formatDimValue(c.legs[0])}|${formatDimValue(c.legs[1])}`;
      groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    for (const [k, feats] of groups) {
      const view = k.split('|')[0] as DrawingViewName;
      const [l0, l1] = feats[0].legs;
      const size = Math.abs(l0 - l1) < 0.01
        ? `${formatDimValue(l0)} × 45°`
        : `${formatDimValue(l0)} × ${formatDimValue(l1)}`;
      const label = `${feats.length > 1 ? `${feats.length}× ` : ''}${size}`;
      const targets = feats.map(f => toSheet(ctx, f.midPoint, view));
      const candidates = noteCandidates(targets, label, 'chamfer', view, (p, v) => outwardAngle(ctx, p, v));
      const best = choose(ctx, ctx.ownerSeq, candidates);
      if (best) commit(ctx, 'chamfer', view, label, best.r);
    }
  }
}

export function placeLeftoverTolerances(ctx: RenderCtx): void {
  const { resolvedTols, consumedTols } = ctx;
  for (const t of resolvedTols) {
    if (consumedTols.has(t.index)) continue;
    const cells = fcfCells(t.decl);
    let candidates: Array<{ render: () => Rendered; penalty: number }>;
    if (t.edgeLine) {
      candidates = fcfLineCandidates(t.edgeLine, cells, 'tolerance', (p, v) => toSheet(ctx, p, v));
    } else {
      const tip = toSheet(ctx, t.target, t.view);
      candidates = [];
      orderedAngles(outwardAngle(ctx, tip, t.view)).forEach((angle, ai) => {
        STEMS.forEach(stem => {
          candidates.push({
            penalty: stem + ai * 4,
            render: () => fcfRendered(tip, angle, cells, stem, 'tolerance'),
          });
        });
      });
    }
    const best = choose(ctx, ctx.ownerSeq, candidates);
    if (best) commit(ctx, 'tolerance', t.edgeLine?.view ?? t.view, cells.join(' '), best.r);
  }
}
