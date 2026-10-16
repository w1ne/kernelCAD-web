// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// run_fea on the in-process voxel solver returned the fea.mesh.quality-low
// catalogue hint about a tetrahedral mesh and CalculiX's error estimate
// (neither exists on this path), artifacts: {} and no word on why there was
// no heatmap. The hint is now voxel-specific, artifacts carry the summary
// JSON path, and heatmapSkipped says why no PNGs came back.

import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runFeaTool } from '../../../src/agent/mcp/tools/runFea';

const CANTILEVER = `
const bar = box(100, 20, 5);
bar.feaStudy({ material: 'aluminum-6061', fixed: { atX: 0 }, loads: [{ faces: { atX: 100 }, force: [0, 0, -50] }], meshSize: 2, minSafetyFactor: 2 });
return bar;
`;

describe('run_fea in-process voxel: solver-appropriate output', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('voxel hint, summary artifact and an explained missing heatmap', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-fea-voxel-'));
    try {
      const r = await runFeaTool({ code: CANTILEVER, solver: 'in-process', output_dir: dir, refine: false });
      expect(r.ok).toBe(true);
      expect(r.summary?.solver).toBe('in-process-voxel');
      const q = r.diagnostics?.find((d) => d.code === 'fea.mesh.quality-low');
      expect(q).toBeDefined();
      expect(q!.hint).toMatch(/voxel/);
      expect(q!.hint).not.toMatch(/tetrahedral mesh contains|CalculiX's own/);
      expect(r.artifacts?.summaryPath).toBe(join(dir, 'fea-summary.json'));
      expect(existsSync(r.artifacts!.summaryPath!)).toBe(true);
      expect(r.images).toBeUndefined();
      expect(r.heatmapSkipped).toMatch(/in-process-voxel/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
