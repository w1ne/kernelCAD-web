// tests/unit/eval/portfolioAttemptsLog.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  appendPortfolioAttempt,
  readPortfolioAttempts,
  type PortfolioAttempt,
} from '../../../eval/portfolio/portfolioAttemptsLog';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'pa-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('portfolioAttemptsLog', () => {
  it('appends and reads a built attempt', () => {
    const log = join(dir, 'attempts.jsonl');
    const a: PortfolioAttempt = {
      schemaVersion: 1,
      slug: 'stepper-motor-bracket',
      attemptN: 1,
      status: 'built',
      failureMode: null,
      diagnosticCode: null,
      model: 'claude-opus-4-7',
      date: '2026-05-08T12:00:00Z',
      notes: 'first attempt — clean revolve + holes',
    };
    appendPortfolioAttempt(log, a);
    expect(readPortfolioAttempts(log)).toEqual([a]);
  });

  it('appends multiple lines preserving order', () => {
    const log = join(dir, 'attempts.jsonl');
    const a1: PortfolioAttempt = { schemaVersion: 1, slug: 's', attemptN: 1, status: 'failed', failureMode: 'diagnostic_feature.kernel-failed', diagnosticCode: 'feature.kernel-failed', model: 'm', date: '2026-05-08T12:00:00Z', notes: '' };
    const a2: PortfolioAttempt = { ...a1, attemptN: 2, status: 'built', failureMode: null, diagnosticCode: null };
    appendPortfolioAttempt(log, a1);
    appendPortfolioAttempt(log, a2);
    expect(readPortfolioAttempts(log).map(a => a.attemptN)).toEqual([1, 2]);
  });

  it('rejects bad failure mode at write time', () => {
    const log = join(dir, 'attempts.jsonl');
    const bad = { schemaVersion: 1, slug: 's', attemptN: 1, status: 'failed', failureMode: 'wat', diagnosticCode: null, model: 'm', date: '2026-05-08T12:00:00Z', notes: '' };
    expect(() => appendPortfolioAttempt(log, bad as PortfolioAttempt)).toThrow(/failureMode/);
  });

  it('rejects status=built with non-null failureMode', () => {
    const log = join(dir, 'attempts.jsonl');
    const bad = { schemaVersion: 1, slug: 's', attemptN: 1, status: 'built', failureMode: 'tool_gap', diagnosticCode: null, model: 'm', date: '2026-05-08T12:00:00Z', notes: '' };
    expect(() => appendPortfolioAttempt(log, bad as unknown as PortfolioAttempt)).toThrow(/built.*failureMode/);
  });

  it('rejects mismatched diagnostic-tag and diagnosticCode', () => {
    const log = join(dir, 'attempts.jsonl');
    const bad = { schemaVersion: 1, slug: 's', attemptN: 1, status: 'failed', failureMode: 'diagnostic_feature.kernel-failed', diagnosticCode: 'cli.invalid-args', model: 'm', date: '2026-05-08T12:00:00Z', notes: '' };
    expect(() => appendPortfolioAttempt(log, bad as PortfolioAttempt)).toThrow(/implies diagnosticCode/);
  });

  it('rejects non-diagnostic failureMode with non-null diagnosticCode', () => {
    const log = join(dir, 'attempts.jsonl');
    const bad = { schemaVersion: 1, slug: 's', attemptN: 1, status: 'failed', failureMode: 'tool_gap', diagnosticCode: 'feature.kernel-failed', model: 'm', date: '2026-05-08T12:00:00Z', notes: '' };
    expect(() => appendPortfolioAttempt(log, bad as PortfolioAttempt)).toThrow(/non-diagnostic failureMode/);
  });
});
