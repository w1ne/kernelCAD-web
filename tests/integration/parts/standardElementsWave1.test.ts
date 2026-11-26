// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

const EXAMPLE = 'examples/parts/standard-elements-wave1.kcad.ts';

describe('standard mechanical element slide assembly', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('builds five library elements with clean diagnostics and a real prismatic mate', async () => {
    const result = await evaluateScriptTool({ file: EXAMPLE });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.parts).toEqual({ count: 5, names: ['frame', 'rail', 'carriage', 't-nut', 'pulley'] });
    expect(result.mechanism).toBe('real');
    expect(result.mechanismSummary?.verdict).toBe('real');
  }, 180_000);

  it('sweeps the carriage through its declared 80 mm travel without diagnostics or clashes', async () => {
    const review = await reviewCadTool({ file: EXAMPLE, includeInterference: true,
      includePoseEnvelope: true, trackConnectors: ['carriage.top-mount'] });
    expect(review.ok, JSON.stringify(review.diagnostics)).toBe(true);
    expect(review.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(review.mechanismSummary?.verdict).toBe('real');
    expect(review.poseEnvelope?.diagnostics).toEqual([]);
    expect(review.poseEnvelope?.interferencePairs).toEqual([]);
    expect(review.poseEnvelope?.samples.map((sample) => sample.name)).toEqual([
      'current', 'slide:min', 'slide:max',
    ]);
    const poses = review.poseEnvelope?.connectorPoses.filter((pose) => pose.ref === 'carriage.top-mount') ?? [];
    const min = poses.find((pose) => pose.sampleName === 'slide:min')?.world;
    const max = poses.find((pose) => pose.sampleName === 'slide:max')?.world;
    expect(min).toBeDefined();
    expect(max).toBeDefined();
    expect(Math.abs((max?.[0] ?? 0) - (min?.[0] ?? 0))).toBeCloseTo(80, 5);
  }, 240_000);
});
