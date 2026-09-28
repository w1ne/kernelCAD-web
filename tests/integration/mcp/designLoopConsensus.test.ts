// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// design_loop consensus: best-of-N selection by geometric agreement over real
// executed candidate scripts. Three near-identical plates agree; a tall
// cylinder is the outlier; a script that throws never produces a solid.

import { beforeAll, describe, expect, it } from 'vitest';
import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';
import {
  executeConsensusCandidate,
  selectScriptsByConsensus,
} from '../../../src/agent/mcp/tools/consensusCandidates';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const PLATE_40 = `return box(40, 20, 6);`;
const PLATE_41 = `return box(41, 20, 6);`;
const PLATE_42 = `return box(42, 20, 6);`;
const OUTLIER = `return cylinder(5, 60);`;
const BROKEN = `throw new Error('candidate crashed');`;

describe('consensus candidates (real geometry)', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('executes a candidate to a mesh and rejects a failing script', async () => {
    const ok = await executeConsensusCandidate({ code: PLATE_40 });
    expect(ok.mesh).not.toBeNull();
    expect(ok.mesh?.indices.length).toBeGreaterThan(0);

    const bad = await executeConsensusCandidate({ code: BROKEN });
    expect(bad.mesh).toBeNull();
    expect(bad.invalidReason).toMatch(/script failed/);
  }, 60_000);

  it('merges every assembly part into one candidate mesh', async () => {
    const single = await executeConsensusCandidate({ code: `return box(10, 10, 10);` });
    const rig = await executeConsensusCandidate({
      code: `
        const a = assembly('rig');
        a.part('base', box(10, 10, 10));
        a.part('lid', box(10, 10, 2).translate(0, 0, 12));
        return a.model();
      `,
    });
    expect(rig.mesh).not.toBeNull();
    expect(rig.mesh!.indices.length).toBeGreaterThan(single.mesh!.indices.length);
    // Every index points at a real vertex after re-basing.
    const vertexCount = rig.mesh!.positions.length / 3;
    expect(Math.max(...rig.mesh!.indices)).toBeLessThan(vertexCount);
  }, 60_000);

  it('selects the middle plate, ranks the cylinder last, drops the broken script', async () => {
    const r = await selectScriptsByConsensus([
      { id: 'p40', code: PLATE_40 },
      { id: 'cyl', code: OUTLIER },
      { id: 'p41', code: PLATE_41 },
      { id: 'broken', code: BROKEN },
      { id: 'p42', code: PLATE_42 },
    ]);
    expect(r.scores[r.chosenIndex as number].id).toBe('p41');
    expect(r.scores[1].rank).toBe(4);
    expect(r.scores[3].status).toBe('dropped');
    expect(r.scores[3].droppedReason).toMatch(/candidate crashed/);
  }, 120_000);
});

describe('design_loop consensus option', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  const attempts = [
    { id: 'p40', code: PLATE_40 },
    { id: 'cyl', code: OUTLIER },
    { id: 'p41', code: PLATE_41 },
    { id: 'p42', code: PLATE_42 },
  ];

  it('reviews every candidate and reports the consensus pick', async () => {
    const result = await designLoopTool({
      goal: 'A 41 x 20 x 6 mm flat mounting plate.',
      attempts,
      requireVisualReview: false,
      consensus: true,
    });
    // stopOnPass is ignored: all four candidates were reviewed.
    expect(result.attempts.map((a) => a.id)).toEqual(['p40', 'cyl', 'p41', 'p42']);
    expect(result.consensus?.chosenAttemptId).toBe('p41');
    expect(result.consensus?.scores[1].rank).toBe(4);
    expect(result.ok).toBe(true);
    expect(result.finalAttemptId).toBe('p41');
    expect(result.nextActionPrompt).toBeUndefined();
  }, 240_000);

  it('is unchanged without the option: first passing attempt, no consensus block', async () => {
    const result = await designLoopTool({
      goal: 'A 41 x 20 x 6 mm flat mounting plate.',
      attempts,
      requireVisualReview: false,
    });
    expect(result.consensus).toBeUndefined();
    expect(result.attempts).toHaveLength(1);
    expect(result.finalAttemptId).toBe('p40');
  }, 240_000);
});
