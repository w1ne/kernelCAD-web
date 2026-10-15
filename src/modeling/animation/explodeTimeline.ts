// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** Pure assembly-order driven exploded-view timeline helpers. */

export interface ExplodePartInput {
  name: string;
  center: readonly [number, number, number];
  size: readonly [number, number, number];
}

export interface ExplodeTrack {
  /** Param name expected by animationView(). */
  param: string;
  /** Assembly part this track moves. */
  part: string;
  offset: [number, number, number];
  keys: Array<{ atMs: number; value: number; ease: 'linear' | 'step' | 'easeInOut' }>;
}

export interface ExplodeCameraPlan {
  target: [number, number, number];
  distance: number;
  keyframes: Array<{ atMs: number; target: [number, number, number]; distance: number; ease: 'easeInOut' }>;
}

export interface ExplodeTimeline {
  order: string[];
  tracks: ExplodeTrack[];
  reverseTracks: ExplodeTrack[];
  durationMs: number;
  warnings: string[];
  cameraPlan: ExplodeCameraPlan;
}

export function resolveExplodeOrder(
  parts: readonly ExplodePartInput[],
  explicitOrder?: readonly string[],
  metadataOrder?: readonly string[],
): { order: string[]; warnings: string[] } {
  if (parts.length === 0) throw new Error('parts must contain at least one part.');
  const names = parts.map((part) => part.name);
  if (names.some((name) => typeof name !== 'string' || name.length === 0) || new Set(names).size !== names.length) {
    throw new Error('parts must have unique, nonempty names.');
  }
  for (const part of parts) {
    if ([...part.center, ...part.size].some((value) => !Number.isFinite(value)) || part.size.some((value) => value <= 0)) {
      throw new Error(`part '${part.name}' center must be finite and size must be finite and positive.`);
    }
  }
  const warnings: string[] = [];
  const candidate = explicitOrder?.length ? explicitOrder : metadataOrder?.length ? metadataOrder : names;
  const unique = [...new Set(candidate)];
  const unknown = unique.filter((name) => !names.includes(name));
  if (unknown.length) warnings.push(`Ignored unknown assembly-order part(s): ${unknown.join(', ')}.`);
  const order = unique.filter((name) => names.includes(name));
  for (const name of names) {
    if (!order.includes(name)) {
      order.push(name);
      if (candidate !== names) warnings.push(`Part '${name}' was not ordered; appended in declaration order.`);
    }
  }
  return { order, warnings };
}

/** Move each successive assembly item farther along the requested axis. */
export function buildExplodeTimeline(
  parts: readonly ExplodePartInput[],
  options: { order?: readonly string[]; metadataOrder?: readonly string[]; mode?: 'axis' | 'radial'; axis?: readonly [number, number, number]; spacing?: number; durationMs?: number } = {},
): ExplodeTimeline {
  const mode = options.mode ?? 'axis';
  if (mode !== 'axis' && mode !== 'radial') throw new Error("mode must be 'axis' or 'radial'.");
  const axis = options.axis ?? [0, 0, 1];
  if (axis.some((v) => !Number.isFinite(v)) || Math.hypot(...axis) < 1e-9) throw new Error('axis must be a finite nonzero vector.');
  const length = Math.hypot(...axis);
  const unit = axis.map((v) => v / length) as [number, number, number];
  const spacing = options.spacing ?? 1.25;
  if (!Number.isFinite(spacing) || spacing <= 0) throw new Error('spacing must be a positive finite number.');
  const requestedDurationMs = options.durationMs ?? 3000;
  if (!Number.isInteger(requestedDurationMs) || requestedDurationMs < 500 || requestedDurationMs > 60000) throw new Error('duration_ms must be an integer in [500, 60000].');
  const resolved = resolveExplodeOrder(parts, options.order, options.metadataOrder);
  // At least one millisecond per part is required for distinct positive
  // intervals. Extend short requested timelines when the assembly is larger.
  const durationMs = Math.max(requestedDurationMs, resolved.order.length);
  const byName = new Map(parts.map((part) => [part.name, part]));
  const centroid = parts.reduce((sum, part) => [sum[0] + part.center[0] / parts.length, sum[1] + part.center[1] / parts.length, sum[2] + part.center[2] / parts.length] as [number, number, number], [0, 0, 0] as [number, number, number]);
  let axisDistance = 0;
  let previousAxisExtent = 0;
  let maxExplodedRadius = 0;
  const tracks = resolved.order.map((name, index) => {
    const part = byName.get(name)!;
    const radial = [part.center[0] - centroid[0], part.center[1] - centroid[1], part.center[2] - centroid[2]] as [number, number, number];
    const radialLength = Math.hypot(...radial);
    const direction = mode === 'radial'
      ? radialLength > 1e-9
        ? radial.map((value) => value / radialLength) as [number, number, number]
        : parts.length === 1
          ? unit
          : [Math.cos((2 * Math.PI * index) / parts.length), Math.sin((2 * Math.PI * index) / parts.length), 0]
      : unit;
    const extent = Math.abs(direction[0]) * part.size[0] + Math.abs(direction[1]) * part.size[1] + Math.abs(direction[2]) * part.size[2];
    if (mode === 'radial') {
      // Each part gets a distance from its own projected extent and its order
      // index. Accumulating here would make later radial parts drift outward.
    } else {
      if (index > 0) axisDistance += spacing * (previousAxisExtent + extent) / 2;
      previousAxisExtent = extent;
    }
    const explodeDistance = mode === 'radial'
      ? spacing * Math.max(extent, 1) * (index + 1)
      : axisDistance;
    const offset = direction.map((value) => value * explodeDistance) as [number, number, number];
    maxExplodedRadius = Math.max(maxExplodedRadius, Math.hypot(part.center[0] + offset[0] - centroid[0], part.center[1] + offset[1] - centroid[1], part.center[2] + offset[2] - centroid[2]) + Math.hypot(...part.size) / 2);
    // Distribute the integer remainder over early parts so all intervals are
    // positive, contiguous, and end exactly at durationMs (even when parts
    // outnumber milliseconds).
    const intervalBase = Math.floor(durationMs / resolved.order.length);
    const intervalRemainder = durationMs % resolved.order.length;
    const startMs = index * intervalBase + Math.min(index, intervalRemainder);
    const endMs = startMs + intervalBase + (index < intervalRemainder ? 1 : 0);
    const keys = startMs === 0
      ? [{ atMs: 0, value: 0, ease: 'easeInOut' as const }, { atMs: endMs, value: 1, ease: 'easeInOut' as const }]
      : [{ atMs: 0, value: 0, ease: 'easeInOut' as const }, { atMs: startMs, value: 0, ease: 'step' as const }, { atMs: endMs, value: 1, ease: 'easeInOut' as const }];
    return { param: name, part: name, offset, keys };
  });
  const reverseTracks = [...tracks].reverse().map((track) => {
    const forwardKeys = track.keys;
    const reversedKeys = [...forwardKeys].map((key) => ({
      ...key,
      atMs: key.atMs,
      value: 1 - key.value,
    }));
    // animationView stores easing on the destination key. When reversing a
    // segment, its easing must move from the old destination to the new
    // destination (the old source), otherwise staged holds become jumps.
    for (let index = 1; index < reversedKeys.length; index += 1) {
      const originalDestination = forwardKeys[forwardKeys.length - index]!;
      reversedKeys[index] = { ...reversedKeys[index]!, ease: originalDestination.ease };
    }
    return { ...track, keys: reversedKeys };
  });
  const radius = Math.max(maxExplodedRadius, 1);
  const cameraPlan: ExplodeCameraPlan = {
    target: centroid,
    distance: radius * 2.8,
    keyframes: [
      { atMs: 0, target: centroid, distance: radius * 2.8, ease: 'easeInOut' },
      { atMs: durationMs, target: centroid, distance: radius * 2.8, ease: 'easeInOut' },
    ],
  };
  return { order: resolved.order, tracks, reverseTracks, durationMs, warnings: resolved.warnings, cameraPlan };
}
