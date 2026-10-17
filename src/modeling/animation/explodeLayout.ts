// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Pure, deterministic exploded-view layout for an assembly.
 *
 * Input: one box per part (world centre + size) and the mate / joint links
 * between parts (optionally with the link's world axis). Output: a world
 * offset per part at explode factor 1. The offset is linear in the factor, so
 * a viewer scales it every frame without recomputing the layout.
 *
 * Algorithm (the SolidWorks / Fusion "auto explode along the mate tree" idea,
 * kept simple):
 *  1. Links make a graph. Each connected group gets a root: the caller's root
 *     when it is in the group, else the biggest part (bbox volume). The
 *     biggest group's root does not move.
 *  2. A breadth-first walk from the root gives each child one parent. A child
 *     moves away from its parent along the link axis (the mate normal) when
 *     one is known, else along the line between the two part centres.
 *     A child inside the parent's span along the axis (a washer on a pin)
 *     moves away from the grandparent instead, so stacks open outward.
 *  3. Siblings that move in the same direction are spread as a stack: each
 *     level of the stack moves clear of the parent, or of the level before
 *     it, plus one gap (6 % of the assembly diagonal).
 *  4. A child carries its own subtree: offset(child) = offset(parent) + step.
 *  5. Parts with no links, and the roots of the smaller groups, move radially
 *     away from the assembly centre.
 */

export type Vec3 = readonly [number, number, number];

export interface ExplodeLayoutPart {
  /** Unique key (the assembly part name). */
  key: string;
  /** World-space bounding-box centre. */
  center: Vec3;
  /** World-space bounding-box size (≥ 0 per axis). */
  size: Vec3;
}

export interface ExplodeLayoutLink {
  /** Part keys at the two ends. Order does not matter: the walk from the root decides the parent. */
  a: string;
  b: string;
  /** World-space mate / joint axis. Its sign is not used. */
  axis?: Vec3;
}

export interface ExplodeLayoutOptions {
  /** Part that stays fixed (the ground part). Default: the biggest part. */
  root?: string;
}

export interface ExplodeLayout {
  /** World offset per part key at explode factor 1. Every input key is present. */
  offsets: ReadonlyMap<string, Vec3>;
  /** The part that does not move. */
  root: string | undefined;
  /** Parent of each linked part in the explode tree (roots are absent). */
  parents: ReadonlyMap<string, string>;
  /** 'mates': at least one link was used. 'radial': no links, centre-out only. */
  mode: 'mates' | 'radial';
}

const ZERO: Vec3 = [0, 0, 0];
const UP: Vec3 = [0, 0, 1];
/** Gap between exploded neighbours, as a fraction of the assembly diagonal. */
const GAP_FRACTION = 0.06;
/** Siblings whose directions differ by less than ~11° share one stack. */
const SAME_DIRECTION_DOT = 0.98;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);

function unit(v: Vec3 | undefined): Vec3 | undefined {
  if (!v || !v.every(Number.isFinite)) return undefined;
  const n = length(v);
  return n > 1e-9 ? scale(v, 1 / n) : undefined;
}

/** Extent of a box of `size` measured along the unit direction `d`. */
export function extentAlong(size: Vec3, d: Vec3): number {
  return Math.abs(size[0] * d[0]) + Math.abs(size[1] * d[1]) + Math.abs(size[2] * d[2]);
}

function volume(p: ExplodeLayoutPart): number {
  return Math.max(p.size[0], 1e-6) * Math.max(p.size[1], 1e-6) * Math.max(p.size[2], 1e-6);
}

function assemblyCenter(parts: readonly ExplodeLayoutPart[]): { center: Vec3; diagonal: number } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i]!, p.center[i]! - p.size[i]! / 2);
      max[i] = Math.max(max[i]!, p.center[i]! + p.size[i]! / 2);
    }
  }
  if (parts.length === 0) return { center: ZERO, diagonal: 0 };
  const center: Vec3 = [(min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, (min[2]! + max[2]!) / 2];
  return { center, diagonal: Math.hypot(max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!) };
}

interface Neighbor { key: string; axis: Vec3 | undefined }

function buildAdjacency(
  parts: readonly ExplodeLayoutPart[],
  links: readonly ExplodeLayoutLink[],
): Map<string, Neighbor[]> {
  const adjacency = new Map<string, Neighbor[]>();
  for (const p of parts) adjacency.set(p.key, []);
  for (const link of links) {
    if (link.a === link.b) continue;
    const a = adjacency.get(link.a);
    const b = adjacency.get(link.b);
    if (!a || !b) continue;
    const axis = unit(link.axis);
    a.push({ key: link.b, axis });
    b.push({ key: link.a, axis });
  }
  return adjacency;
}

/** Connected groups, each in input order, biggest first (ties: input order). */
function components(parts: readonly ExplodeLayoutPart[], adjacency: Map<string, Neighbor[]>): string[][] {
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const p of parts) {
    if (seen.has(p.key)) continue;
    const group: string[] = [];
    const stack = [p.key];
    seen.add(p.key);
    while (stack.length > 0) {
      const k = stack.pop()!;
      group.push(k);
      for (const n of adjacency.get(k) ?? []) {
        if (seen.has(n.key)) continue;
        seen.add(n.key);
        stack.push(n.key);
      }
    }
    groups.push(group);
  }
  const order = new Map(parts.map((p, i) => [p.key, i]));
  for (const g of groups) g.sort((x, y) => order.get(x)! - order.get(y)!);
  return groups
    .map((g, i) => ({ g, i }))
    .sort((x, y) => y.g.length - x.g.length || x.i - y.i)
    .map((x) => x.g);
}

function pickRoot(group: readonly string[], byKey: Map<string, ExplodeLayoutPart>, wanted: string | undefined): string {
  if (wanted !== undefined && group.includes(wanted)) return wanted;
  let best = group[0]!;
  for (const k of group) if (volume(byKey.get(k)!) > volume(byKey.get(best)!) * (1 + 1e-9)) best = k;
  return best;
}

/** Direction a child moves away from its parent. `grandparent` is the
 *  parent's own parent (undefined under a root). */
function childDirection(
  child: ExplodeLayoutPart,
  parent: ExplodeLayoutPart,
  axis: Vec3 | undefined,
  center: Vec3,
  grandparent: ExplodeLayoutPart | undefined,
): Vec3 {
  const away = sub(child.center, parent.center);
  const fromCenter = sub(child.center, center);
  if (axis) {
    const tol = 1e-6 * (1 + length(child.size) + length(parent.size));
    const side = (v: Vec3): Vec3 | undefined => {
      const d = dot(v, axis);
      if (Math.abs(d) <= tol) return undefined;
      return d > 0 ? axis : scale(axis, -1);
    };
    // A child whose centre lies inside the parent's span along the axis (a
    // horn on a servo shaft, a washer on a pin) moves away from the
    // grandparent instead, so a stack opens outward and not back inside.
    const inside = Math.abs(dot(away, axis)) < extentAlong(parent.size, axis) / 2;
    return (inside && grandparent ? side(sub(child.center, grandparent.center)) : undefined)
      ?? side(away)
      ?? side(fromCenter)
      ?? axis;
  }
  return unit(away) ?? unit(fromCenter) ?? UP;
}

interface Step { key: string; part: ExplodeLayoutPart; dir: Vec3; projection: number; extent: number }

function boxesOverlap(a: ExplodeLayoutPart, b: ExplodeLayoutPart): boolean {
  for (let k = 0; k < 3; k++) {
    if (Math.abs(a.center[k]! - b.center[k]!) * 2 >= a.size[k]! + b.size[k]!) return false;
  }
  return true;
}

/**
 * Distance each child moves away from its parent (see the module header).
 * Children that move the same way form a stack along that direction. In
 * parent-relative coordinates along the direction, every level is pushed just
 * past the parent's far face, or the previous level, plus one gap. Siblings at
 * the same height (a screw pattern) share a level unless their boxes overlap
 * (a screw through a servo ear), which splits them onto separate levels.
 */
function stackSteps(parent: ExplodeLayoutPart, children: readonly Step[], gap: number): Map<string, number> {
  const out = new Map<string, number>();
  const groups: Step[][] = [];
  for (const c of children) {
    const g = groups.find((grp) => dot(grp[0]!.dir, c.dir) >= SAME_DIRECTION_DOT);
    if (g) g.push(c); else groups.push([c]);
  }
  const levelTol = Math.max(gap * 0.5, 1e-6);
  for (const g of groups) {
    const lo = (s: Step): number => s.projection - s.extent / 2;
    const sorted = [...g].sort((x, y) => lo(x) - lo(y));
    const levels: Step[][] = [];
    for (const s of sorted) {
      const level = levels[levels.length - 1];
      // Same height: starts close to the level's first part and overlaps it
      // along the direction (parts stacked end to end never share a level).
      const first = level?.[0];
      const joins = level && first
        && lo(s) - lo(first) <= levelTol
        && lo(s) < lo(first) + first.extent - 1e-9
        && level.every((m) => !boxesOverlap(m.part, s.part));
      if (joins) level.push(s); else levels.push([s]);
    }
    let frontier = extentAlong(parent.size, g[0]!.dir) / 2;
    for (const level of levels) {
      // Clear the parent (or the level before) and add one gap, so parts
      // that already sit apart still move.
      const shift = Math.max(0, frontier - Math.min(...level.map(lo))) + gap;
      for (const m of level) out.set(m.key, shift);
      frontier = Math.max(...level.map((m) => lo(m) + m.extent + shift));
    }
  }
  return out;
}

export function explodeLayout(
  parts: readonly ExplodeLayoutPart[],
  links: readonly ExplodeLayoutLink[],
  options: ExplodeLayoutOptions = {},
): ExplodeLayout {
  const byKey = new Map(parts.map((p) => [p.key, p]));
  const offsets = new Map<string, Vec3>();
  const parents = new Map<string, string>();
  for (const p of parts) offsets.set(p.key, ZERO);
  if (parts.length === 0) return { offsets, root: undefined, parents, mode: 'radial' };

  const { center, diagonal } = assemblyCenter(parts);
  const gap = GAP_FRACTION * diagonal;
  const adjacency = buildAdjacency(parts, links);
  const groups = components(parts, adjacency);
  const linked = groups.some((g) => g.length > 1);
  const mainRoot = linked ? pickRoot(groups[0]!, byKey, options.root) : undefined;

  groups.forEach((group, gi) => {
    const root = gi === 0 && mainRoot !== undefined ? mainRoot : pickRoot(group, byKey, options.root);
    const rootPart = byKey.get(root)!;
    // Smaller groups and loose parts move centre-out; the main root stays.
    const rootOffset: Vec3 = root === mainRoot ? ZERO : sub(rootPart.center, center);
    offsets.set(root, rootOffset);

    const visited = new Set([root]);
    const queue = [root];
    while (queue.length > 0) {
      const parentKey = queue.shift()!;
      const parent = byKey.get(parentKey)!;
      const steps: Step[] = [];
      for (const n of adjacency.get(parentKey) ?? []) {
        if (visited.has(n.key)) continue;
        visited.add(n.key);
        const child = byKey.get(n.key)!;
        const grandKey = parents.get(parentKey);
        const dir = childDirection(child, parent, n.axis, center, grandKey === undefined ? undefined : byKey.get(grandKey));
        steps.push({
          key: n.key,
          part: child,
          dir,
          projection: dot(sub(child.center, parent.center), dir),
          extent: extentAlong(child.size, dir),
        });
        parents.set(n.key, parentKey);
        queue.push(n.key);
      }
      const distances = stackSteps(parent, steps, gap);
      const parentOffset = offsets.get(parentKey)!;
      for (const s of steps) offsets.set(s.key, add(parentOffset, scale(s.dir, distances.get(s.key)!)));
    }
  });

  return { offsets, root: mainRoot, parents, mode: linked ? 'mates' : 'radial' };
}

/** Offset of a part at `factor` (0 = assembled). */
export function offsetAt(layout: ExplodeLayout, key: string, factor: number): Vec3 {
  const o = layout.offsets.get(key) ?? ZERO;
  const f = Number.isFinite(factor) ? Math.max(0, factor) : 0;
  // `+ 0` turns -0 into 0.
  return [o[0] * f + 0, o[1] * f + 0, o[2] * f + 0];
}
