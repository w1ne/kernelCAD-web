// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { selectBest, type ScoredCandidate } from './bestOfN.js';
import type { GateReport } from './types.js';

const rep = (ok: boolean, oks: boolean[] = [ok]): GateReport => ({
  ok,
  verdicts: oks.map((o, i) => ({ gate: `g${i}`, ok: o, message: o ? 'ok' : 'bad' })),
});
const cand = (overrides: Partial<ScoredCandidate>): ScoredCandidate => ({
  scriptPath: '/tmp/x.ts',
  text: 'x',
  report: rep(true),
  oracleScore: null,
  ...overrides,
});

describe('selectBest', () => {
  it('prefers a gate-passing candidate over a higher-scored failing one', () => {
    const failing = cand({ scriptPath: '/a', report: rep(false, [true, true, false]), oracleScore: 0.99 });
    const passing = cand({ scriptPath: '/b', report: rep(true, [true]), oracleScore: 0.10 });
    expect(selectBest([failing, passing]).scriptPath).toBe('/b');
  });

  it('among gate-passing candidates, higher oracleScore wins', () => {
    const lo = cand({ scriptPath: '/lo', oracleScore: 0.3 });
    const hi = cand({ scriptPath: '/hi', oracleScore: 0.8 });
    expect(selectBest([lo, hi]).scriptPath).toBe('/hi');
  });

  it('among failing candidates, more stagesPassed wins', () => {
    const few = cand({ scriptPath: '/few', report: rep(false, [true, false, false]) });
    const many = cand({ scriptPath: '/many', report: rep(false, [true, true, false]) });
    expect(selectBest([few, many]).scriptPath).toBe('/many');
  });

  it('null oracleScore sorts below any real number', () => {
    const nul = cand({ scriptPath: '/nul', oracleScore: null });
    const zero = cand({ scriptPath: '/zero', oracleScore: 0 });
    expect(selectBest([nul, zero]).scriptPath).toBe('/zero');
  });

  it('breaks exact ties by lowest index (stable)', () => {
    const a = cand({ scriptPath: '/first', oracleScore: 0.5 });
    const b = cand({ scriptPath: '/second', oracleScore: 0.5 });
    expect(selectBest([a, b]).scriptPath).toBe('/first');
  });

  it('throws on empty input', () => {
    expect(() => selectBest([])).toThrow();
  });
});
