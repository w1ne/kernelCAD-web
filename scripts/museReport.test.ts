// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeReports } from './museReport';

function makeCase(
  root: string,
  name: string,
  sandboxOk: boolean,
  overlapFree: boolean,
  categories?: Record<string, number>,
  phase = 'judged',
) {
  const dir = join(root, 'cases', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'score.json'),
    JSON.stringify({
      gates: { 'evaluates clean': true },
      scored: {},
      gate_pass: true,
      score: 1,
      attempts: 2,
      tokens: { input: 100, output: 20, total: 120 },
      time_ms: 1000,
      metrics: { muse_sandbox_ok: sandboxOk, muse_overlap_free: overlapFree },
    }),
  );
  writeFileSync(
    join(dir, 'state.json'),
    JSON.stringify({ phase, attempts: 2, tokens: { in: 100, out: 20 }, protocol: 'muse-v1', updatedAt: 'x' }),
  );
  if (categories) {
    writeFileSync(
      join(dir, 'judge.json'),
      JSON.stringify({ overall: 0.5, categories, forcedZero: false }),
    );
  }
}

const CATS = {
  assembly_readiness: 1,
  joint_design: 0,
  tolerance: 1,
  functional_adaptation: 1,
  usage_stability: 0,
  manufacturability: 1,
};

describe('writeReports', () => {
  it('writes leaderboard json/csv, summary and protocol', () => {
    const root = mkdtempSync(join(tmpdir(), 'report-'));
    makeCase(root, 'a', true, true, CATS);
    makeCase(root, 'b', false, false, CATS);
    const unevaluated = join(root, 'cases', 'unevaluated');
    mkdirSync(unevaluated, { recursive: true });
    writeFileSync(join(unevaluated, 'state.json'), JSON.stringify({ phase: 'pending' }));
    writeFileSync(
      join(root, 'run.json'),
      JSON.stringify({
        model: 'm+kcad',
        judgeModel: 'judge',
        protocol: 'muse-v1',
        skills: ['kernelcad'],
        workers: 6,
        temperature: 0.2,
      }),
    );

    writeReports(root);

    const row = JSON.parse(readFileSync(join(root, 'leaderboard.json'), 'utf8'));
    expect(row.rows[0].cases).toBe(2);
    expect(row.rows[0].judged).toBe(1);
    expect(row.rows[0].final).toBe(33.33);
    expect(row.rows[0].geom_valid).toBeNull();
    expect(row.validator_status).toBe('unpublished');
    expect(row.evaluated_cases).toBe(2);
    expect(row.infra_cases).toBe(1);
    const summary = readFileSync(join(root, 'summary.md'), 'utf8');
    expect(summary).toContain('Forced-zero');
    expect(summary).toContain('## Excluded cases (infra errors or unevaluated)');
    expect(summary).toContain('- unevaluated');
    expect(readFileSync(join(root, 'protocol.md'), 'utf8')).toContain('validator');
    expect(readFileSync(join(root, 'leaderboard.csv'), 'utf8')).toContain('m+kcad + kernelCAD');
  });

  it('excludes infra cases from denominators and lists them', () => {
    const root = mkdtempSync(join(tmpdir(), 'report-'));
    makeCase(root, 'a', true, true, CATS);
    const bad = join(root, 'cases', 'bad');
    mkdirSync(bad, { recursive: true });
    writeFileSync(
      join(bad, 'state.json'),
      JSON.stringify({ phase: 'infra_error', attempts: 0, tokens: { in: 0, out: 0 }, protocol: 'muse-v1', updatedAt: 'x' }),
    );
    writeFileSync(join(root, 'run.json'), JSON.stringify({ model: 'm+kcad' }));

    writeReports(root);

    const leaderboard = JSON.parse(readFileSync(join(root, 'leaderboard.json'), 'utf8'));
    expect(leaderboard.n_cases).toBe(2);
    expect(leaderboard.evaluated_cases).toBe(1);
    expect(leaderboard.infra_cases).toBe(1);
    expect(leaderboard.rows[0].final).toBe(66.67);
    expect(readFileSync(join(root, 'summary.md'), 'utf8')).toContain('Excluded cases');
    expect(readFileSync(join(root, 'summary.md'), 'utf8')).toContain('- bad');
  });
});
