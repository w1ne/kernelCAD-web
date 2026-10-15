// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { explodeViewTool } from './explodeView';

const drawbotHandoff = JSON.parse(readFileSync(new URL('../../../../tests/fixtures/argon/handoff-drawbot.json', import.meta.url), 'utf8')) as NonNullable<Parameters<typeof explodeViewTool>[0]['handoff']>;

describe('explode_view', () => {
  it('derives positions and order from the LabWired handoff shape', () => {
    const result = explodeViewTool({ handoff: {
      parts: [
        { ref: 'U1', position_mm: { value: [40, 20, 0] }, bbox_mm: { value: [54.4, 27.9, 10] } },
        { ref: 'U2', position_mm: { value: [70, 20, 0] }, bbox_mm: { value: [20, 10, 5] } },
      ],
      assembly: { order: ['U2', 'U1'] },
    } });
    expect(result.order).toEqual(['U2', 'U1']);
    expect(result.tracks).toHaveLength(2);
    expect(result.reverseTracks.map((track) => track.part)).toEqual(['U1', 'U2']);
    expect(result.reverseTracks[0]?.keys[0]).toMatchObject({ atMs: 0, value: 1 });
    expect(result.tracks[1]?.offset[2]).toBeGreaterThan(0);
    expect(result.playback).toContain('animationView');
    expect(result.param_declarations).toContain(`param("U2", 0, { min: 0, max: 1`);
    expect(result.param_declarations).toContain('const explodeParam1 =');
    expect(result.script_fragment).toContain('animationView({ name:');
    expect(result.script_fragment).toContain('"param": "U2"');
    expect(result.animation_tracks).toHaveLength(2);
    expect(result.reverse_animation_tracks).toHaveLength(2);
    expect(result.part_transforms[0]?.expression).toContain('existingShape.translate(explodeParam1.multiply(');
  });

  it('uses explicit ordering before handoff ordering', () => {
    const result = explodeViewTool({
      parts: [{ name: 'a', center: [0, 0, 0], size: [1, 1, 1] }, { name: 'b', center: [0, 0, 0], size: [1, 1, 1] }],
      assembly_order: ['b', 'a'], handoff: { assembly_order: ['a', 'b'] },
    });
    expect(result.order).toEqual(['b', 'a']);
  });

  it('plans the checked-in LabWired Argon handoff in declaration order when assembly order is absent', () => {
    const result = explodeViewTool({ handoff: drawbotHandoff });
    expect(result.order).toEqual(['A1', 'A2', 'A3', 'M3']);
    expect(result.tracks).toHaveLength(4);
    expect(result.cameraPlan.keyframes).toHaveLength(2);
    expect(result.warnings).toEqual(['Skipped handoff part(s) without usable position or bbox: M1, M2, J1.']);
    // LabWired encodes XY placement plus physical.bbox_mm as a raw array.
    // The planner turns the board-surface placement into the bbox center.
    expect(result.cameraPlan.target).toEqual([27.95, 30.77, 8.125]);
    expect(result.tracks.find((track) => track.part === 'A2')?.offset).toEqual([0, 0, 14.375]);
  });

  it('uses half bbox height only for XY-only handoff placements', () => {
    const result = explodeViewTool({ handoff: { parts: [
      { ref: 'xy', position_mm: { value: [4, 7] }, physical: { bbox_mm: [2, 4, 6] } },
      { ref: 'xyz', position_mm: { value: [8, 9, 12] }, physical: { bbox_mm: [2, 4, 6] } },
    ] } });
    expect(result.cameraPlan.target).toEqual([6, 8, 10.5]);
  });

  it('skips handoff parts with non-finite positions or invalid bbox dimensions', () => {
    const result = explodeViewTool({ handoff: { parts: [
      { ref: 'valid', position_mm: { value: [1, 2] }, physical: { bbox_mm: [2, 3, 4] } },
      { ref: 'one-coordinate-position', position_mm: { value: [1] }, physical: { bbox_mm: [2, 3, 4] } },
      { ref: 'nan-position', position_mm: { value: [Number.NaN, 2] }, physical: { bbox_mm: [2, 3, 4] } },
      { ref: 'infinite-position', position_mm: { value: [1, Number.POSITIVE_INFINITY] }, physical: { bbox_mm: [2, 3, 4] } },
      { ref: 'zero-size', position_mm: { value: [1, 2] }, physical: { bbox_mm: [2, 0, 4] } },
      { ref: 'infinite-size', position_mm: { value: [1, 2] }, physical: { bbox_mm: [2, 3, Number.POSITIVE_INFINITY] } },
    ] } });

    expect(result.order).toEqual(['valid']);
    expect(result.warnings).toEqual(['Skipped handoff part(s) without usable position or bbox: one-coordinate-position, nan-position, infinite-position, zero-size, infinite-size.']);
  });

  it('supports radial offsets with a camera framing plan', () => {
    const result = explodeViewTool({ parts: [
      { name: 'left', center: [-5, 0, 0], size: [2, 2, 2] },
      { name: 'right', center: [5, 0, 0], size: [2, 2, 2] },
    ], mode: 'radial' });
    expect(result.tracks[0]?.offset[0]).toBeLessThan(0);
    expect(result.tracks[1]?.offset[0]).toBeGreaterThan(0);
    expect(result.cameraPlan.distance).toBeGreaterThan(0);
  });

  it('redistributes short durations so every part interval is positive and unique', () => {
    const parts = Array.from({ length: 501 }, (_, index) => ({
      name: `part-${index}`,
      center: [index, 0, 0] as [number, number, number],
      size: [1, 1, 1] as [number, number, number],
    }));
    const result = explodeViewTool({ parts, duration_ms: 500 });
    const endTimes = result.tracks.map((track) => track.keys.at(-1)!.atMs);
    expect(new Set(endTimes).size).toBe(parts.length);
    expect(endTimes.every((end, index) => end > (index === 0 ? 0 : endTimes[index - 1]!))).toBe(true);
    expect(endTimes.at(-1)).toBe(501);
    expect(result.durationMs).toBe(501);
  });
});
