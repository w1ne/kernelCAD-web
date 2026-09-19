// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/collectPhases.ts

import { DIM_BASE, DIM_STEP, extractTextBoxes, fcfCells } from '../drawingAnnotations';
import { principalAxis } from '../drawingFeatures';
import type { HoleComposite, V3 } from '../drawingFeatures';
import { dimensionToSvg, formatDimValue } from '../drawingLayout';
import type { DrawingViewName, Pt2, SheetSpec } from '../drawingLayout';
import { viewBasis } from '../drawingProjection';
import { GEOMETRY_OWNER, Obstacles } from '../drawingObstacles';
import type { Box, Seg } from '../drawingObstacles';
import type { AutoDrawingInput } from './contracts';
import { POSITION_ZONE } from './iso2768';
import { CHAR_W, TEXT_H, textBox } from './placement';
import { HOLE_SIDES, commit, holeKey, holeLabel, toSheet } from './renderContext';
import type { LinearItem, RenderCtx } from './renderContext';
import { STANDARD_VIEWS, viewAlong } from './views';
import { cross, dot, len, sub } from './vectors';

export function buildObstacles(
  input: AutoDrawingInput,
  views: AutoDrawingInput['views'],
  scale: number,
  sheet: SheetSpec,
): Obstacles {
  const margin = sheet.margin;
  const obstacles = new Obstacles({
    x0: margin + 1,
    y0: margin + 1,
    x1: sheet.w - margin - 1,
    y1: sheet.h - margin - sheet.titleBlock.h - 1,
  });
  for (const name of [...STANDARD_VIEWS, 'iso'] as DrawingViewName[]) {
    const { placement, polylines } = views[name];
    for (const pl of polylines) {
      for (let k = 0; k + 1 < pl.length; k++) {
        obstacles.addSegment([
          placement.tx + pl[k][0] * scale, placement.ty - pl[k][1] * scale,
          placement.tx + pl[k + 1][0] * scale, placement.ty - pl[k + 1][1] * scale,
        ], GEOMETRY_OWNER);
      }
    }
  }
  const AUTHORED = -2;
  const foreign = [...input.authoredSvg, input.extraObstacleSvg ?? ''];
  for (const b of foreign.flatMap((s, i) => extractTextBoxes(s, i))) {
    obstacles.addBox({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }, AUTHORED);
  }
  for (const fragment of foreign) {
    for (const m of fragment.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g)) {
      obstacles.addSegment([Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])], AUTHORED);
    }
  }
  return obstacles;
}

export function collectHoleGroups(ctx: RenderCtx): void {
  const { model, opts, include, resolvedTols, frameDatums } = ctx;
  const holeGroups = ctx.holeGroups;
  {
    for (const h of model.holes) {
      const key = holeKey(h);
      const g = holeGroups.find(x => x.key === key);
      if (g) g.holes.push(h);
      else holeGroups.push({ key, holes: [h], view: viewAlong(h.axis), rows: [], label: '' });
    }
  }
  for (const g of holeGroups) {
    g.label = holeLabel(g.holes[0], g.holes.length);
    const matched = resolvedTols.filter(t => t.axis && g.holes.some(h =>
      Math.abs(dot(t.axis!.dir, h.axis)) > 0.9999 &&
      len(cross(sub(h.entry, t.axis!.point), t.axis!.dir)) < 0.05));
    const declaredTypes = new Set(matched.map(t => t.decl.type));
    if (opts.enabled && include.has('holes') && !declaredTypes.has('position')) {
      g.rows.push(fcfCells({ type: 'position', value: POSITION_ZONE[opts.tolerance], modifier: '⌀', datums: frameDatums }));
    }
    if (opts.enabled && include.has('holes')) {
      for (const t of matched) {
        g.rows.push(fcfCells(t.decl));
        ctx.consumedTols.add(t.index);
      }
    }
  }
}

export function collectHolePositionDimensions(ctx: RenderCtx): LinearItem[] {
  const { opts, include, datums, holeGroups, views } = ctx;
  const linear: LinearItem[] = [];
  const bb = ctx.input.compound.boundingBox();
  if (!(opts.enabled && include.has('hole-positions'))) return linear;
  const byView = new Map<DrawingViewName, HoleComposite[]>();
  for (const g of holeGroups) {
    if (principalAxis(g.holes[0].axis) === null) continue;
    byView.set(g.view, [...(byView.get(g.view) ?? []), ...g.holes]);
  }
  for (const [view, holes] of byView) {
    const b = viewBasis(view);
    for (const screen of ['x', 'y'] as const) {
      const w = screen === 'x' ? b.x : b.y;
      const axisIdx = Math.abs(w[0]) > 0.5 ? 0 : Math.abs(w[1]) > 0.5 ? 1 : 2;
      const datum = [...datums.values()].find(d => d.plane && Math.abs(d.normal![axisIdx]) > 0.999);
      const ref = datum ? datum.point[axisIdx] : bb.min[axisIdx];
      const coords: number[] = [];
      for (const h of holes) {
        const c = h.entry[axisIdx];
        if (Math.abs(c - ref) < 0.01) continue;
        if (!coords.some(x => Math.abs(x - c) < 0.01)) coords.push(c);
      }
      const side = screen === 'x' ? HOLE_SIDES[view].horizontal : HOLE_SIDES[view].vertical;
      const box = views[view].placement.box;
      for (const c of coords) {
        const hole = holes.find(h => Math.abs(h.entry[axisIdx] - c) < 0.01)!;
        const to = toSheet(ctx, hole.entry, view);
        // Reference point: on the datum plane at the hole's in-view position,
        // pushed to the view outline nearest the dimension line.
        const refPoint: V3 = [...hole.entry] as V3;
        refPoint[axisIdx] = ref;
        const from = toSheet(ctx, refPoint, view);
        const fromPt: Pt2 = screen === 'x'
          ? [from[0], side === 'top' ? box.y : box.y + box.h]
          : [side === 'left' ? box.x : box.x + box.w, from[1]];
        linear.push({
          kind: 'hole-position', view, side, from: fromPt, to,
          label: formatDimValue(Math.abs(c - ref)), order: Math.abs(c - ref),
        });
      }
    }
  }
  return linear;
}

export function collectLinearDimensions(ctx: RenderCtx): LinearItem[] {
  const { opts, include, views } = ctx;
  const linear: LinearItem[] = collectHolePositionDimensions(ctx);
  const bb = ctx.input.compound.boundingBox();
  if (opts.enabled && include.has('overall')) {
    const f = views.front.placement.box;
    const t = views.top.placement.box;
    linear.push(
      { kind: 'overall', view: 'front', side: 'bottom', from: [f.x, f.y + f.h], to: [f.x + f.w, f.y + f.h], label: formatDimValue(bb.max[0] - bb.min[0]), order: Infinity },
      { kind: 'overall', view: 'front', side: 'right', from: [f.x + f.w, f.y], to: [f.x + f.w, f.y + f.h], label: formatDimValue(bb.max[2] - bb.min[2]), order: Infinity },
      { kind: 'overall', view: 'top', side: 'left', from: [t.x, t.y], to: [t.x, t.y + t.h], label: formatDimValue(bb.max[1] - bb.min[1]), order: Infinity },
    );
  }
  const buckets = new Map<string, LinearItem[]>();
  for (const item of linear) {
    const k = `${item.view}:${item.side}`;
    buckets.set(k, [...(buckets.get(k) ?? []), item]);
  }
  for (const items of buckets.values()) {
    items.sort((p, q) => p.order - q.order);
    items.forEach((item, i) => {
      const box = views[item.view].placement.box;
      const reserve = item.side === 'bottom'
        ? ctx.input.bottomReserve[item.view]
        : item.side === 'right' ? ctx.input.rightReserve[item.view] : 0;
      const dist = (reserve > 0 ? reserve + DIM_STEP : DIM_BASE) + i * DIM_STEP;
      const horizontal = item.side === 'top' || item.side === 'bottom';
      const linePos = item.side === 'top' ? box.y - dist
        : item.side === 'bottom' ? box.y + box.h + dist
          : item.side === 'left' ? box.x - dist : box.x + box.w + dist;
      if (item.side === 'bottom') ctx.bottomReserve[item.view] = Math.max(ctx.bottomReserve[item.view], dist);
      const dimSvg = dimensionToSvg({
        kind: horizontal ? 'horizontal' : 'vertical',
        from: item.from,
        to: item.to,
        linePos,
        label: item.label,
      }).replace('<g class="dim"', `<g class="dim" data-kc-auto="${item.kind}"`);
      const boxes: Box[] = horizontal
        ? [textBox((item.from[0] + item.to[0]) / 2, linePos - 1, TEXT_H, 'middle', item.label)]
        : (() => {
            const w = Math.max(item.label.length, 1) * TEXT_H * CHAR_W;
            const cy = (item.from[1] + item.to[1]) / 2;
            return [{ x0: linePos - 1 - TEXT_H * 0.92, y0: cy - w / 2, x1: linePos - 1 + TEXT_H * 0.29, y1: cy + w / 2 }];
          })();
      const segments: Seg[] = horizontal
        ? [[item.from[0], linePos, item.to[0], linePos], [item.from[0], item.from[1], item.from[0], linePos], [item.to[0], item.to[1], item.to[0], linePos]]
        : [[linePos, item.from[1], linePos, item.to[1]], [item.from[0], item.from[1], linePos, item.from[1]], [item.to[0], item.to[1], linePos, item.to[1]]];
      commit(ctx, item.kind, item.view, item.label, { svg: dimSvg, boxes, segments });
    });
  }
  return linear;
}

const CAPTIONS: Record<DrawingViewName, string> = { front: 'FRONT', top: 'TOP', left: 'LEFT', iso: 'ISOMETRIC' };

export function addViewCaptions(ctx: RenderCtx): void {
  for (const name of [...STANDARD_VIEWS, 'iso'] as DrawingViewName[]) {
    const box = ctx.views[name].placement.box;
    ctx.obstacles.addBox(
      textBox(box.x + box.w / 2, box.y + box.h + 5 + ctx.bottomReserve[name], 2.6, 'middle', CAPTIONS[name]),
      GEOMETRY_OWNER,
    );
  }
}
