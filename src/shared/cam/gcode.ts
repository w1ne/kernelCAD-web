// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Mill dialect: G21/G90, G0/G1, and G81/G83. This is not the FDM slicer export.

import { round3 } from './geometry';
import type { CamDrillCycle, CamFeeds, CamSegment, MillPlanSuccess } from './types';

function fmt(value: number): string {
  return round3(value).toFixed(3);
}

interface Pen {
  x: number;
  y: number;
  z: number;
  feed: number;
}

function emitRapid(pen: Pen, segment: CamSegment): string[] {
  const lines: string[] = [];
  if (Math.abs(segment.z_mm - pen.z) > 1e-9) lines.push(`G0 Z${fmt(segment.z_mm)}`);
  if (Math.abs(segment.x_mm - pen.x) > 1e-9 || Math.abs(segment.y_mm - pen.y) > 1e-9) {
    lines.push(`G0 X${fmt(segment.x_mm)} Y${fmt(segment.y_mm)}`);
  }
  return lines;
}

function feedWord(pen: Pen, segment: CamSegment): string {
  if (segment.feed_mm_min === undefined) return '';
  if (Math.round(segment.feed_mm_min) === Math.round(pen.feed)) return '';
  return ` F${Math.round(segment.feed_mm_min)}`;
}

function emitFeed(pen: Pen, segment: CamSegment): string[] {
  const sameXY = Math.abs(segment.x_mm - pen.x) < 1e-9 && Math.abs(segment.y_mm - pen.y) < 1e-9;
  const word = feedWord(pen, segment);
  if (sameXY) return [`G1 Z${fmt(segment.z_mm)}${word}`];
  if (Math.abs(segment.z_mm - pen.z) < 1e-9) return [`G1 X${fmt(segment.x_mm)} Y${fmt(segment.y_mm)}${word}`];
  return [`G1 X${fmt(segment.x_mm)} Y${fmt(segment.y_mm)} Z${fmt(segment.z_mm)}${word}`];
}

function emitDrill(holes: CamDrillCycle[], feeds: CamFeeds): string[] {
  const plunge = Math.round(feeds.plunge_mm_min);
  const retract = fmt(feeds.safe_z_mm);
  const lines = [`G0 Z${retract}`];
  for (const hole of holes) {
    const xy = `X${fmt(hole.x_mm)} Y${fmt(hole.y_mm)} Z${fmt(hole.z_mm)} R${retract}`;
    if (hole.cycle === 'G83') lines.push(`G83 ${xy} Q${fmt(hole.peck_mm ?? 0)} F${plunge}`);
    else lines.push(`G81 ${xy} F${plunge}`);
  }
  lines.push('G80');
  return lines;
}

function header(plan: MillPlanSuccess): string[] {
  return [
    '; kernelCAD mill toolpath',
    `; ${plan.disclaimer}`,
    '; origin: stock minimum corner, Z up from the stock bottom, millimetres, absolute',
    '; feeds and speeds are heuristics',
    'G21',
    'G90',
    'G17',
    'G94',
    `M3 S${Math.round(plan.feeds.spindle_rpm)}`,
    `G0 Z${fmt(plan.feeds.safe_z_mm)}`,
  ];
}

export function emitMillGcode(plan: MillPlanSuccess): string {
  const lines = header(plan);
  const pen: Pen = { x: 0, y: 0, z: plan.feeds.safe_z_mm, feed: 0 };
  for (const op of plan.ops) {
    lines.push(`; ${op.kind}`);
    if (op.kind === 'drill' && op.holes) {
      lines.push(...emitDrill(op.holes, plan.feeds));
      pen.z = plan.feeds.safe_z_mm;
      pen.feed = 0;
      continue;
    }
    for (const segment of op.segments) {
      lines.push(...(segment.motion === 'rapid' ? emitRapid(pen, segment) : emitFeed(pen, segment)));
      pen.x = segment.x_mm;
      pen.y = segment.y_mm;
      pen.z = segment.z_mm;
      if (segment.feed_mm_min !== undefined) pen.feed = segment.feed_mm_min;
    }
  }
  lines.push('M5', `G0 Z${fmt(plan.feeds.safe_z_mm)}`, 'M30', '');
  return lines.join('\n');
}
