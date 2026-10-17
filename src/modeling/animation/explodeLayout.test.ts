// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { explodeLayout, inferContactLinks, offsetAt, type ExplodeLayoutLink, type ExplodeLayoutPart, type Vec3 } from './explodeLayout';

const part = (key: string, center: Vec3, size: Vec3): ExplodeLayoutPart => ({ key, center, size });

/** Box overlap with a little slack, so touching faces do not count. */
function overlapping(parts: readonly ExplodeLayoutPart[], offsets: (k: string) => Vec3): string[] {
  const moved = parts.map((p) => {
    const o = offsets(p.key);
    return { ...p, center: [p.center[0] + o[0], p.center[1] + o[1], p.center[2] + o[2]] as Vec3 };
  });
  const hits: string[] = [];
  for (let i = 0; i < moved.length; i++) {
    for (let j = i + 1; j < moved.length; j++) {
      const a = moved[i]!;
      const b = moved[j]!;
      const sep = [0, 1, 2].some((k) => Math.abs(a.center[k]! - b.center[k]!) * 2 >= a.size[k]! + b.size[k]! - 1e-6);
      if (!sep) hits.push(`${a.key}/${b.key}`);
    }
  }
  return hits;
}

// A plate with a stack of three washers on a pin: plate -> pin -> washers,
// every mate along +Z. The washers touch each other and the plate.
const plate = part('plate', [0, 0, 1], [40, 40, 2]);
const pin = part('pin', [0, 0, 6], [4, 4, 10]);
const w1 = part('washer-1', [0, 0, 2.5], [8, 8, 1]);
const w2 = part('washer-2', [0, 0, 3.5], [8, 8, 1]);
const w3 = part('washer-3', [0, 0, 4.5], [8, 8, 1]);
const stack = [plate, pin, w1, w2, w3];
const Z: Vec3 = [0, 0, 1];
const stackLinks: ExplodeLayoutLink[] = [
  { a: 'plate', b: 'pin', axis: Z },
  { a: 'pin', b: 'washer-1', axis: Z },
  { a: 'pin', b: 'washer-2', axis: Z },
  { a: 'pin', b: 'washer-3', axis: Z },
];

describe('explodeLayout', () => {
  it('moves nothing at factor 0 and keeps the root fixed', () => {
    const layout = explodeLayout(stack, stackLinks);
    expect(layout.root).toBe('plate');
    expect(layout.mode).toBe('mates');
    for (const p of stack) expect(offsetAt(layout, p.key, 0)).toEqual([0, 0, 0]);
    expect(layout.offsets.get('plate')).toEqual([0, 0, 0]);
  });

  it('spreads a mated stack along the mate axis, nearest part first', () => {
    const layout = explodeLayout(stack, stackLinks);
    const z = (k: string) => layout.offsets.get(k)!;
    for (const k of ['pin', 'washer-1', 'washer-2', 'washer-3']) {
      expect(Math.abs(z(k)[0])).toBeLessThan(1e-9);
      expect(Math.abs(z(k)[1])).toBeLessThan(1e-9);
      expect(z(k)[2]).toBeGreaterThan(0);
    }
    // Washers move with the pin (hierarchy) and then further, in stack order.
    expect(z('washer-1')[2]).toBeGreaterThan(z('pin')[2]);
    expect(z('washer-2')[2]).toBeGreaterThan(z('washer-1')[2]);
    expect(z('washer-3')[2]).toBeGreaterThan(z('washer-2')[2]);
  });

  it('separates every part of the stack at factor 1', () => {
    const layout = explodeLayout(stack, stackLinks);
    expect(overlapping(stack, (k) => offsetAt(layout, k, 1))).toEqual([]);
  });

  it('negative control: the same overlap check fails on the assembled stack and on a rigid shift', () => {
    expect(overlapping(stack, () => [0, 0, 0]).length).toBeGreaterThan(0);
    // Moving everything by one vector is not an explode: still overlapping.
    expect(overlapping(stack, () => [0, 0, 50]).length).toBeGreaterThan(0);
  });

  it('moves a child that sits under its parent down the axis', () => {
    const nut = part('nut', [0, 0, -1], [6, 6, 2]);
    const layout = explodeLayout([plate, nut], [{ a: 'plate', b: 'nut', axis: Z }]);
    expect(layout.offsets.get('nut')![2]).toBeLessThan(0);
  });

  it('uses the axis line, not the centre line, when a mate axis is known', () => {
    // The child is off to the side in X but mated along Z: it moves in Z only.
    const side = part('side', [15, 0, 4], [4, 4, 4]);
    const layout = explodeLayout([plate, side], [{ a: 'plate', b: 'side', axis: [0, 0, -1] }]);
    const o = layout.offsets.get('side')!;
    expect(o[0]).toBeCloseTo(0, 9);
    expect(o[2]).toBeGreaterThan(0);
  });

  it('moves along the centre line when no axis is given', () => {
    const side = part('side', [30, 0, 1], [4, 4, 2]);
    const layout = explodeLayout([plate, side], [{ a: 'plate', b: 'side' }]);
    const o = layout.offsets.get('side')!;
    expect(o[0]).toBeGreaterThan(0);
    expect(o[1]).toBeCloseTo(0, 9);
    expect(o[2]).toBeCloseTo(0, 9);
  });

  it('keeps a screw pattern on one level but splits overlapping siblings', () => {
    const screws = [part('s1', [-10, 0, -2], [2, 2, 4]), part('s2', [10, 0, -2], [2, 2, 4])];
    const ear = part('ear', [10, 0, -2], [6, 6, 1]); // the s2 screw passes through it
    const parts = [plate, ...screws, ear];
    const links = ['s1', 's2', 'ear'].map((k) => ({ a: 'plate', b: k, axis: Z }));
    const layout = explodeLayout(parts, links);
    expect(layout.offsets.get('s1')).toEqual(layout.offsets.get('s2'));
    expect(layout.offsets.get('ear')).not.toEqual(layout.offsets.get('s2'));
    expect(overlapping(parts, (k) => offsetAt(layout, k, 1))).toEqual([]);
  });

  it('honours an explicit root', () => {
    const layout = explodeLayout(stack, stackLinks, { root: 'pin' });
    expect(layout.root).toBe('pin');
    expect(layout.offsets.get('pin')).toEqual([0, 0, 0]);
    expect(layout.offsets.get('plate')![2]).toBeLessThan(0);
  });

  it('falls back to centre-out radial when there are no links', () => {
    const a = part('a', [-10, 0, 0], [2, 2, 2]);
    const b = part('b', [10, 0, 0], [2, 2, 2]);
    const c = part('c', [0, 0, 0], [2, 2, 2]);
    const layout = explodeLayout([a, b, c], []);
    expect(layout.mode).toBe('radial');
    expect(layout.root).toBeUndefined();
    expect(layout.offsets.get('a')).toEqual([-10, 0, 0]);
    expect(layout.offsets.get('b')).toEqual([10, 0, 0]);
    expect(layout.offsets.get('c')).toEqual([0, 0, 0]);
  });

  it('moves unlinked parts of a mated assembly centre-out', () => {
    const loose = part('loose', [40, 0, 1], [4, 4, 2]);
    const layout = explodeLayout([...stack, loose], stackLinks);
    expect(layout.root).toBe('plate');
    expect(layout.offsets.get('loose')![0]).toBeGreaterThan(0);
  });

  it('is deterministic and linear in the factor', () => {
    const a = explodeLayout(stack, stackLinks);
    const b = explodeLayout(stack, stackLinks);
    expect([...a.offsets]).toEqual([...b.offsets]);
    const full = offsetAt(a, 'washer-3', 1);
    const half = offsetAt(a, 'washer-3', 0.5);
    expect(half[2]).toBeCloseTo(full[2] / 2, 12);
    expect(offsetAt(a, 'washer-3', -1)).toEqual([0, 0, 0]);
    expect(offsetAt(a, 'washer-3', Number.NaN)).toEqual([0, 0, 0]);
  });

  it('ignores links to unknown parts and self links', () => {
    const layout = explodeLayout([plate, pin], [{ a: 'plate', b: 'ghost' }, { a: 'pin', b: 'pin' }]);
    expect(layout.mode).toBe('radial');
    expect(explodeLayout([], []).offsets.size).toBe(0);
  });
});

describe('inferContactLinks', () => {
  it('links a touching stack along the axis it separates on, as a tree', () => {
    const links = inferContactLinks(stack);
    // One link per part except the root: a spanning tree, no cycles.
    expect(links).toHaveLength(stack.length - 1);
    for (const l of links) expect(l.axis).toEqual([0, 0, 1]);
    const layout = explodeLayout(stack, links);
    expect(layout.root).toBe('plate');
    for (const k of ['pin', 'washer-1', 'washer-2', 'washer-3']) expect(layout.offsets.get(k)![2]).toBeGreaterThan(0);
    // Inferred links are a guess: a washer can hang off the plate while its
    // neighbour hangs off the pin. The stack still opens up a lot.
    const before = overlapping(stack, () => [0, 0, 0]).length;
    expect(overlapping(stack, (k) => offsetAt(layout, k, 1)).length).toBeLessThan(before / 2);
  });

  it('leaves parts that touch nothing unlinked', () => {
    const far = part('far', [500, 0, 0], [2, 2, 2]);
    const links = inferContactLinks([plate, far]);
    expect(links).toEqual([]);
  });

  it('negative control: without links the stack does not open', () => {
    // Radial alone moves the coaxial washers along the same line from the
    // centre; the overlap check must see that they still collide.
    const radial = explodeLayout(stack, []);
    expect(overlapping(stack, (k) => offsetAt(radial, k, 1)).length).toBeGreaterThan(0);
  });
});

