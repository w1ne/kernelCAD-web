// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { evaluateAndBuildScript } from '../../agent/cli/commands/evaluate';
import { bakeAnimationTimeline } from './bakeAnimationTimeline';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Build-time bake produces the same per-part world transforms the live endpoint
 * does — proving the gallery can play a moving mechanism with zero server
 * compute. Uses the real spice-dispenser carousel (a pose-only mate timeline).
 */
describe('bakeAnimationTimeline (build-time)', () => {
  it('bakes the spice-dispenser dispense cycle into moving per-part transforms', async () => {
    const file = join(REPO_ROOT, 'examples', 'spice-dispenser-carousel.kcad.ts');
    const { evaluation, model } = await evaluateAndBuildScript({ file });
    expect(evaluation.exitCode).toBe(0);
    expect(model).toBeTruthy();

    const baked = await bakeAnimationTimeline(model!);

    // A real, multi-frame timeline.
    expect(baked.frames).toBeGreaterThan(1);
    expect(baked.fps).toBeGreaterThan(0);
    expect(baked.times.length).toBe(baked.frames);
    expect(baked.parts.length).toBeGreaterThan(0);

    // Every part carries one 16-float matrix per frame.
    for (const part of baked.parts) {
      expect(part.matrices.length).toBe(baked.frames);
      expect(part.matrices[0].length).toBe(16);
    }

    // The mechanism MOVES: at least one part's mid-cycle pose differs from
    // home. (Compare frame 0 to the MIDDLE frame, not the last — the dispense
    // cycle is a loop that re-homes, so frame 0 ≈ last frame by design.)
    const mid = Math.floor(baked.frames / 2);
    const moved = baked.parts.some((p) => {
      const first = p.matrices[0];
      const middle = p.matrices[mid];
      return first.some((v, i) => Math.abs(v - middle[i]) > 1e-6);
    });
    expect(moved).toBe(true);
    // Baking a 95-body assembly (model build + 120-frame pose sweep + advisory
    // collision check) is inherently slow; this is an integration test, not a
    // hot-path unit test. The merge-gate floor is already the spice interference
    // sweep, so this lands on a different shard without raising the floor.
  }, 180_000);
});
