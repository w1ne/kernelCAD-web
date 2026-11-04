// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// XY polylines for the bbox mill plan. No kernel calls.

import { DEFAULT_FEED_MM_MIN, DEFAULT_RAPID_MM_MIN, type CamSegment, type Vec3 } from './types';

export interface Xy {
  x: number;
  y: number;
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function round3Vec(values: Vec3): Vec3 {
  return [round3(values[0]), round3(values[1]), round3(values[2])];
}

/** Inclusive stops from `start` to `end`. A zero span is one stop. */
export function axisStops(start: number, end: number, step: number): number[] {
  const stops = [start];
  if (end <= start + 1e-9) return stops;
  let cursor = start + step;
  while (cursor < end - 1e-9) {
    stops.push(cursor);
    cursor += step;
  }
  stops.push(end);
  return stops;
}

/** Cut levels from just under `top` down to `floor`, including the floor. */
export function zLevels(top: number, floor: number, step: number): number[] {
  if (!(top > floor + 1e-9)) return [];
  const levels: number[] = [];
  let z = top - step;
  while (z > floor + 1e-9) {
    levels.push(z);
    z -= step;
  }
  levels.push(floor);
  return levels;
}

export function insetRect(x0: number, y0: number, x1: number, y1: number, radius: number): Rect | null {
  const rect = { x0: x0 + radius, y0: y0 + radius, x1: x1 - radius, y1: y1 - radius };
  if (rect.x1 < rect.x0 - 1e-9 || rect.y1 < rect.y0 - 1e-9) return null;
  return rect;
}

export function rasterPoints(rect: Rect, step: number): Xy[] {
  const points: Xy[] = [];
  axisStops(rect.y0, rect.y1, step).forEach((y, index) => {
    const forward = index % 2 === 0;
    const from = forward ? rect.x0 : rect.x1;
    const to = forward ? rect.x1 : rect.x0;
    points.push({ x: from, y });
    if (Math.abs(to - from) > 1e-9) points.push({ x: to, y });
  });
  return points;
}

/** Closed rectangle. Clockwise is climb for an outside profile with spindle M3. */
export function rectPoints(rect: Rect, clockwise: boolean): Xy[] {
  const { x0, y0, x1, y1 } = rect;
  if (clockwise) {
    return [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
      { x: x0, y: y0 },
    ];
  }
  return [
    { x: x0, y: y0 },
    { x: x0, y: y1 },
    { x: x1, y: y1 },
    { x: x1, y: y0 },
    { x: x0, y: y0 },
  ];
}

function segmentAt(motion: CamSegment['motion'], point: Xy, z: number, feed?: number): CamSegment {
  const segment: CamSegment = {
    motion,
    x_mm: round3(point.x),
    y_mm: round3(point.y),
    z_mm: round3(z),
  };
  if (feed !== undefined) segment.feed_mm_min = feed;
  return segment;
}

/** Retract, plunge, cut, retract. Each layer starts and ends at `safeZ`. */
export function linkLayers(
  layers: ReadonlyArray<{ z: number; points: Xy[] }>,
  safeZ: number,
  plunge: number,
  feed: number,
): CamSegment[] {
  const segments: CamSegment[] = [];
  for (const layer of layers) {
    const [start, ...rest] = layer.points;
    if (!start) continue;
    const end = rest[rest.length - 1] ?? start;
    segments.push(segmentAt('rapid', start, safeZ));
    segments.push(segmentAt('feed', start, layer.z, plunge));
    for (const next of rest) segments.push(segmentAt('feed', next, layer.z, feed));
    segments.push(segmentAt('rapid', end, safeZ));
  }
  return segments;
}

export function pathLengths(segments: CamSegment[]): { cut: number; rapid: number; time: number } {
  let cut = 0;
  let rapid = 0;
  let time = 0;
  let previous: CamSegment | undefined;
  for (const segment of segments) {
    if (previous) {
      const length = Math.hypot(
        segment.x_mm - previous.x_mm,
        segment.y_mm - previous.y_mm,
        segment.z_mm - previous.z_mm,
      );
      const rate = segment.motion === 'rapid' ? DEFAULT_RAPID_MM_MIN : (segment.feed_mm_min ?? DEFAULT_FEED_MM_MIN);
      if (segment.motion === 'rapid') rapid += length;
      else cut += length;
      time += (length / rate) * 60;
    }
    previous = segment;
  }
  return { cut: round3(cut), rapid: round3(rapid), time: round3(time) };
}
