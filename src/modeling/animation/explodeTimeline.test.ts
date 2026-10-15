// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { buildExplodeTimeline, resolveExplodeOrder } from './explodeTimeline';

const parts = [
  { name: 'base', center: [0, 0, 0] as [number, number, number], size: [20, 10, 2] as [number, number, number] },
  { name: 'board', center: [0, 0, 3] as [number, number, number], size: [10, 8, 3] as [number, number, number] },
  { name: 'cover', center: [0, 0, 8] as [number, number, number], size: [20, 10, 2] as [number, number, number] },
];

describe('explode timeline', () => {
  it('prioritizes explicit order, appends omitted parts and warns on unknown refs', () => {
    expect(resolveExplodeOrder(parts, ['cover', 'missing']).order).toEqual(['cover', 'base', 'board']);
    expect(resolveExplodeOrder(parts, ['cover', 'missing']).warnings).toEqual([
      'Ignored unknown assembly-order part(s): missing.',
      "Part 'base' was not ordered; appended in declaration order.",
      "Part 'board' was not ordered; appended in declaration order.",
    ]);
  });

  it('builds reverse assembly tracks along a normalized requested axis', () => {
    const timeline = buildExplodeTimeline(parts, { order: ['base', 'board', 'cover'], axis: [0, 0, 2], durationMs: 2400 });
    expect(timeline.tracks.map((track) => track.param)).toEqual(['base', 'board', 'cover']);
    expect(timeline.tracks.map((track) => track.offset)).toEqual([[0, 0, 0], [0, 0, 3.125], [0, 0, 6.25]]);
    expect(timeline.tracks[1]?.keys).toEqual([
      { atMs: 0, value: 0, ease: 'easeInOut' },
      { atMs: 800, value: 0, ease: 'step' },
      { atMs: 1600, value: 1, ease: 'easeInOut' },
    ]);
  });

  it('reverses each staged track in time and carries easing onto the reversed segment', () => {
    const timeline = buildExplodeTimeline(parts, { order: ['base', 'board', 'cover'], durationMs: 2400 });
    const forwardBoard = timeline.tracks.find((track) => track.part === 'board')!;
    const reverseBoard = timeline.reverseTracks.find((track) => track.part === 'board')!;
    expect(timeline.reverseTracks.map((track) => track.part)).toEqual(['cover', 'board', 'base']);
    expect(reverseBoard.offset).toEqual(forwardBoard.offset);
    expect(reverseBoard.keys.map((key) => key.atMs)).toEqual([0, 800, 1600]);
    expect(reverseBoard.keys.map((key) => key.value)).toEqual([1, 1, 0]);
    const reverseCover = timeline.reverseTracks.find((track) => track.part === 'cover')!;
    expect(reverseCover.keys.map((key) => key.atMs)).toEqual([0, 1600, 2400]);
    expect(reverseBoard.keys.map((key) => key.ease)).toEqual(['easeInOut', 'easeInOut', 'step']);
  });

  it('rejects invalid direction, spacing and duration', () => {
    expect(() => buildExplodeTimeline([])).toThrow(/at least one part/);
    expect(() => resolveExplodeOrder([])).toThrow(/at least one part/);
    expect(() => buildExplodeTimeline(parts, { axis: [0, 0, 0] })).toThrow(/nonzero/);
    expect(() => buildExplodeTimeline(parts, { spacing: 0 })).toThrow(/positive/);
    expect(() => buildExplodeTimeline(parts, { durationMs: 10 })).toThrow(/duration_ms/);
    expect(() => buildExplodeTimeline([{ ...parts[0]!, size: [1, 0, 1] }])).toThrow(/size must be finite and positive/);
  });

  it('returns outward radial offsets and deterministic camera framing', () => {
    const radial = buildExplodeTimeline([
      { name: 'left', center: [-5, 0, 0], size: [2, 2, 2] },
      { name: 'right', center: [5, 0, 0], size: [2, 2, 2] },
    ], { mode: 'radial' });
    expect(radial.tracks[0]?.offset[0]).toBeLessThan(0);
    expect(radial.tracks[1]?.offset[0]).toBeGreaterThan(0);
    expect(radial.tracks.map((track) => track.offset[0])).toEqual([-2.5, 5]);
    expect(radial.cameraPlan.keyframes.map((frame) => frame.atMs)).toEqual([0, radial.durationMs]);
    expect(radial.cameraPlan.distance).toBeGreaterThan(0);
  });

  it('spaces each radial part from its own extent and order index', () => {
    const radial = buildExplodeTimeline([
      { name: 'small', center: [-5, 0, 0], size: [2, 2, 2] },
      { name: 'large', center: [5, 0, 0], size: [4, 4, 4] },
    ], { mode: 'radial' });

    expect(radial.tracks.map((track) => track.offset[0])).toEqual([-2.5, 10]);
  });

  it('gives centroid parts deterministic radial directions and handles a single part', () => {
    const centered = buildExplodeTimeline([
      { name: 'left', center: [-5, 0, 0], size: [2, 2, 2] },
      { name: 'center', center: [0, 0, 0], size: [2, 2, 2] },
      { name: 'right', center: [5, 0, 0], size: [2, 2, 2] },
      { name: 'opposite', center: [0, 0, 0], size: [2, 2, 2] },
    ], { mode: 'radial' });
    expect(centered.tracks[1]?.offset[0]).toBeCloseTo(0);
    expect(centered.tracks[1]?.offset[1]).toBeCloseTo(5);
    expect(centered.tracks[1]?.offset[2]).toBe(0);

    const radial = buildExplodeTimeline([
      { name: 'only', center: [4, 7, 9], size: [2, 4, 6] },
    ], { mode: 'radial', axis: [1, 2, 3] });

    const offset = radial.tracks[0]!.offset;
    const offsetLength = Math.hypot(...offset);
    expect(offsetLength).toBeGreaterThan(0);
    expect(offset[0] / offsetLength).toBeCloseTo(1 / Math.sqrt(14));
    expect(offset[1] / offsetLength).toBeCloseTo(2 / Math.sqrt(14));
    expect(offset[2] / offsetLength).toBeCloseTo(3 / Math.sqrt(14));
  });

  it('assembles parts sequentially from the declared order', () => {
    const timeline = buildExplodeTimeline(parts, { order: ['base', 'board', 'cover'], durationMs: 2400 });
    expect(timeline.tracks.map((track) => track.keys)).toEqual([
      [{ atMs: 0, value: 0, ease: 'easeInOut' }, { atMs: 800, value: 1, ease: 'easeInOut' }],
      [{ atMs: 0, value: 0, ease: 'easeInOut' }, { atMs: 800, value: 0, ease: 'step' }, { atMs: 1600, value: 1, ease: 'easeInOut' }],
      [{ atMs: 0, value: 0, ease: 'easeInOut' }, { atMs: 1600, value: 0, ease: 'step' }, { atMs: 2400, value: 1, ease: 'easeInOut' }],
    ]);
    expect(timeline.reverseTracks.map((track) => track.keys.map((key) => key.value))).toEqual([[1, 1, 0], [1, 1, 0], [1, 0]]);
  });

  it('spaces adjacent axis parts by both projected extents', () => {
    const timeline = buildExplodeTimeline([
      { name: 'first', center: [0, 0, 0], size: [10, 10, 10] },
      { name: 'second', center: [0, 0, 0], size: [10, 10, 10] },
    ]);
    expect(timeline.tracks[1]?.offset).toEqual([0, 0, 12.5]);
    expect(timeline.tracks[1]!.offset[2] - timeline.tracks[0]!.offset[2]).toBeGreaterThanOrEqual(10);
  });
});
