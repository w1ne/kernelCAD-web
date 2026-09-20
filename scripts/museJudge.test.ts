// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { EventEmitter } from 'node:events';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { judgeCase, mapJudgePayload } from './museJudge';

function fakeSpawn(payload: Record<string, unknown>, outPath: string) {
  return ((_cmd: string, _args: string[]) => {
    const child = new EventEmitter() as unknown as {
      stdout: EventEmitter;
      stderr: EventEmitter;
      on: EventEmitter['on'];
      emit: EventEmitter['emit'];
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    setImmediate(() => {
      writeFileSync(outPath, JSON.stringify(payload, null, 2));
      child.stdout.emit('data', `${JSON.stringify(payload)}\n`);
      child.emit('close', 0);
    });
    return child;
  }) as unknown as typeof import('node:child_process').spawn;
}

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

  it('maps a real wrapper payload from the spawn stdout into judge.json', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-'));
    const outPath = join(dir, 'judge.json');
    const payload = {
      overall: 0.5,
      categories: {},
      summary: 'half',
      items: [
        { category_en: 'Assembly Readiness', score: 1 },
        { category_en: 'Joint Design', score: 0 },
        { category_en: 'Tolerance', score: 1 },
        { category_en: 'Functional Adaptation', score: 1 },
        { category_en: 'Usage Stability', score: 0 },
        { category_en: 'Manufacturability', score: 1 },
      ],
    };
    const result = await judgeCase(
      {
        caseName: 'stool',
        datasetCaseDir: '/nonexistent',
        candidatePng: '/nonexistent/render.png',
        outPath,
        museRoot: '/nonexistent',
        pythonBin: 'python3',
        baseUrl: 'https://example.invalid',
        model: 'judge',
      },
      true,
      fakeSpawn(payload, outPath),
    );
    expect(result.forcedZero).toBe(false);
    expect(result.overall).toBe(0.5);
    expect(result.categories.assembly_readiness).toBe(1);
    expect(result.categories.joint_design).toBe(0);
    const written = JSON.parse(
      (await import('node:fs')).readFileSync(outPath, 'utf8'),
    ) as { raw?: { items?: unknown[] } };
    expect(written.raw?.items).toHaveLength(6);
  });
});
