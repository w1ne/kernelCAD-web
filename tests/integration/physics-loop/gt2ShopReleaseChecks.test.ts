// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { loadSnippets } from '../../../src/agent/cookbook/index';
import { runReviewPipeline } from '../../../src/agent/review/reviewPipeline';

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('gt2-shop-release-actuator Checks (issue #1772)', () => {
  it('runs physics without closed-loop false positive and passes Checks with 0 errors', async () => {
    const snippet = loadSnippets().find((s) => s.id === 'gt2-shop-release-actuator');
    expect(snippet).toBeDefined();
    const r = await runReviewPipeline({
      code: snippet!.body,
      includeInterference: true,
      includePhysics: true,
    });
    expect(r.ok).toBe(true);
    expect(r.mechanism).toBe('real');
    expect(r.mechanismFailures ?? []).toEqual([]);
    expect(r.mechanismSummary?.checked).toContain('holds under gravity');
    expect(r.mechanismSummary?.checked).toContain('no collisions');
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  }, 120_000);
});
