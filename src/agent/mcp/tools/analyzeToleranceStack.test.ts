// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { analyzeToleranceStackTool } from './analyzeToleranceStack';
import type { StackResult } from '../../../shared/tol/stackup';

function ok(result: StackResult) {
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

const HOLE = { id: 'hole', nominalMm: 10, upperMm: 0.1, lowerMm: -0.1, sense: '+' as const };
const SHAFT = { id: 'shaft', nominalMm: 9.8, upperMm: 0.05, lowerMm: -0.05, sense: '-' as const };

describe('analyze_tolerance_stack', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('stacks an explicit gap and refuses a contributor with no tolerance', async () => {
    const result = ok(await analyzeToleranceStackTool({
      contributors: [HOLE, SHAFT],
      requirement: { kind: 'gap', minMm: 0.07 },
    }));
    expect(result.nominalMm).toBeCloseTo(0.2, 9);
    expect(result.worstCase.minMm).toBeCloseTo(0.05, 9);
    expect(result.worstCase.maxMm).toBeCloseTo(0.35, 9);
    expect(result.rss.minMm).toBeGreaterThan(result.worstCase.minMm);
    expect(result.rss.maxMm).toBeLessThan(result.worstCase.maxMm);
    expect(result.requirement).toMatchObject({ worstCase: 'fail', rss: 'pass', pass: false });

    const missing = await analyzeToleranceStackTool({
      contributors: [{ id: 'hole', nominalMm: 10, sense: '+' }],
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.errorCode).toBe('cli.invalid-args');
    expect(missing.error).toMatch(/ISO 2768/);
  });

  it('passes a requirement both bands satisfy', async () => {
    const result = ok(await analyzeToleranceStackTool({
      contributors: [HOLE, SHAFT],
      requirement: { kind: 'clearance', minMm: 0.04, maxMm: 0.4 },
    }));
    expect(result.requirement).toMatchObject({ worstCase: 'pass', rss: 'pass', pass: true });
  });

  it('refuses contributors combined with a script chain', async () => {
    const result = await analyzeToleranceStackTool({
      contributors: [HOLE],
      code: 'return box(1, 1, 1);',
      chain: ['slot'],
    });
    expect(result).toMatchObject({ ok: false, errorCode: 'cli.invalid-args' });
  });

  it('measures declared dimensions and a chain tolerance override', async () => {
    const code = `
      return box(20, 10, 5)
        .dimension({ id: 'slot', kind: 'linear', from: [0, 0, 0], to: [10, 0, 0], tol: { upper: 0.2, lower: 0 } })
        .dimension({ id: 'tab', kind: 'linear', from: [0, 0, 0], to: [9.8, 0, 0], tol: { upper: 0, lower: -0.1 } });
    `;
    const result = ok(await analyzeToleranceStackTool({
      code,
      chain: [{ id: 'slot', sense: '+' }, { id: 'tab', sense: '-' }],
    }));
    expect(result.nominalMm).toBeCloseTo(0.2, 6);
    expect(result.worstCase.minMm).toBeCloseTo(0.2, 6);
    expect(result.worstCase.maxMm).toBeCloseTo(0.5, 6);
    expect(result.rss.centerMm).toBeCloseTo(0.35, 6);
    expect(result.rss.sigmaEquivalent).toBe(3);

    const override = ok(await analyzeToleranceStackTool({
      code: `return box(10, 10, 10).dimension({ id: 'len', kind: 'linear', from: [0, 0, 0], to: [10, 0, 0] });`,
      chain: [{ id: 'len', tol: 0.1 }],
    }));
    expect(override.nominalMm).toBeCloseTo(10, 6);
    expect(override.worstCase).toMatchObject({ minMm: expect.closeTo(9.9, 6), maxMm: expect.closeTo(10.1, 6) });
  });

  it('refuses a declared dimension that has no tolerance', async () => {
    const result = await analyzeToleranceStackTool({
      code: `return box(10, 10, 10).dimension({ id: 'len', kind: 'linear', from: [0, 0, 0], to: [10, 0, 0] });`,
      chain: ['len'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe('cli.invalid-args');
    expect(result.error).toMatch(/len/);
    expect(result.error).toMatch(/ISO 2768/);
    expect(result.disclaimer).toMatch(/not a full GD&T/i);
  });
});
