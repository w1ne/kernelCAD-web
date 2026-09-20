// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { judgeCase, mapJudgePayload } from './museJudge';

describe('mapJudgePayload', () => {
  it('maps six categories and computes overall fallback', () => {
    const out = mapJudgePayload({
      overall_score_normalized: 0.5,
      items: [
        { category_en: 'Assembly Readiness', score: 1 },
        { category_en: 'Joint Design', score: 0 },
        { category_en: 'Tolerance', score: 1 },
        { category_en: 'Functional Adaptation', score: 1 },
        { category_en: 'Usage Stability', score: 0 },
        { category_en: 'Manufacturability', score: 1 },
      ],
    });
    expect(out.categories.assembly_readiness).toBe(1);
    expect(out.categories.joint_design).toBe(0);
    expect(out.overall).toBe(0.5);
  });

  it('writes a forced-zero judge.json without spawning the wrapper', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-'));
    const spawn = vi.fn();
    const result = await judgeCase(
      {
        caseName: 'stool',
        datasetCaseDir: '/nonexistent',
        candidatePng: '/nonexistent/render.png',
        outPath: join(dir, 'judge.json'),
        museRoot: '/nonexistent',
        pythonBin: 'python3',
        baseUrl: 'https://example.invalid',
        model: 'judge',
      },
      false,
      spawn as unknown as typeof import('node:child_process').spawn,
    );
    expect(result.forcedZero).toBe(true);
    expect(result.overall).toBe(0);
    expect(spawn).not.toHaveBeenCalled();
  });
});
