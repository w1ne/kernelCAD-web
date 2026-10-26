// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { explodeViewTool } from './explodeView';

describe('explode_view', () => {
  it('derives positions and order from explicit parts and assembly_order', () => {
    const result = explodeViewTool({
      parts: [
        { name: 'U1', center: [40, 20, 5], size: [54.4, 27.9, 10] },
        { name: 'U2', center: [70, 20, 2.5], size: [20, 10, 5] },
      ],
      assembly_order: ['U2', 'U1'],
    });
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

  it('uses explicit ordering', () => {
    const result = explodeViewTool({
      parts: [{ name: 'a', center: [0, 0, 0], size: [1, 1, 1] }, { name: 'b', center: [0, 0, 0], size: [1, 1, 1] }],
      assembly_order: ['b', 'a'],
    });
    expect(result.order).toEqual(['b', 'a']);
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
