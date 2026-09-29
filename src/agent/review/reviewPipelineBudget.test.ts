// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// review_cad on a small assembly must not re-lower the whole record chain
// per part or re-measure the same interference several times (that is what
// timed a 2-gear review out), and must return a partial result naming the
// skipped stages when its time budget is spent.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct, OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { runReviewPipeline } from './reviewPipeline';

// Two touching parts with booleans (so a lower is not free) and no mates.
const CODE = `
const a = assembly('pair');
a.part('left', box(20, 20, 10).subtract(cylinder(12, 3).translate(10, 10, -1)));
a.part('right', box(20, 20, 10).subtract(cylinder(12, 3).translate(10, 10, -1)).translate(19.5, 0, 0));
return a.model();
`;

beforeAll(async () => {
  await initOcct();
}, 60_000);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('review_cad cost on a small assembly', () => {
  it('lowers the record chain at most twice and measures the pair at most twice (was 7 and 4)', async () => {
    const runs = vi.spyOn(RecomputeEngine.prototype, 'run');
    const volumes = vi.spyOn(OcctBackend.prototype, 'intersectionVolume');
    const r = await runReviewPipeline({ code: CODE, includeInterference: true, includePhysics: true });
    expect(r.rawInterferencePairs?.map((p) => [p.a, p.b])).toEqual([['left', 'right']]);
    // evaluate + the pose-envelope scene; every per-part `.lower()` and the
    // mechanism sweep reuse them.
    expect(runs.mock.calls.length).toBeLessThanOrEqual(2);
    expect(volumes.mock.calls.length).toBeLessThanOrEqual(2);
    expect(r.stageTimingsMs?.['evaluate-source']).toBeGreaterThanOrEqual(0);
    expect(r.stageTimingsMs?.['mechanism-truth']).toBeGreaterThanOrEqual(0);
    expect(r.skippedStages).toBeUndefined();
  }, 180_000);

  it('a spent time budget skips the heavy stages and says so', async () => {
    const r = await runReviewPipeline({ code: CODE, includeInterference: true, timeBudgetMs: 0 });
    expect(r.skippedStages?.map((s) => s.stage)).toEqual(['pose-envelope', 'physical-use-case', 'mechanism-truth']);
    expect(r.skippedStages?.[0].reason).toMatch(/time budget spent/);
    expect(r.mechanism).toBe('unverified');
    expect(r.poseEnvelope).toBeUndefined();
    // The cheap stages still ran and are reported.
    expect(r.rawInterferencePairs?.length).toBe(1);
    expect(r.stageTimingsMs?.['mechanical-review']).toBeGreaterThanOrEqual(0);
  }, 180_000);
});
