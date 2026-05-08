// eval/portfolio/portfolioAttemptsLog.ts
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { isFailureModeTag, type FailureModeTag } from './failureMode';
import { DIAGNOSTIC_CODES, type DiagnosticCode } from '../../src/diagnostics/codes';

export type PortfolioAttemptStatus = 'built' | 'failed' | 'abandoned';

export interface PortfolioAttempt {
  schemaVersion: 1;
  slug: string;
  attemptN: number;
  status: PortfolioAttemptStatus;
  failureMode: FailureModeTag | null;
  diagnosticCode: DiagnosticCode | null;
  model: string;
  date: string;
  notes: string;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function validate(a: PortfolioAttempt): void {
  if (a.schemaVersion !== 1) throw new Error('portfolioAttempt: schemaVersion must be 1');
  if (!a.slug) throw new Error('portfolioAttempt: slug required');
  if (!Number.isInteger(a.attemptN) || a.attemptN < 1) throw new Error('portfolioAttempt: attemptN must be a positive int');
  if (!['built', 'failed', 'abandoned'].includes(a.status)) throw new Error('portfolioAttempt: bad status');
  if (a.status === 'built' && a.failureMode !== null) throw new Error("portfolioAttempt: status='built' requires failureMode=null");
  if (a.status !== 'built' && a.failureMode === null) throw new Error(`portfolioAttempt: status='${a.status}' requires non-null failureMode`);
  if (a.failureMode !== null && !isFailureModeTag(a.failureMode)) throw new Error(`portfolioAttempt: bad failureMode '${a.failureMode}'`);
  if (a.diagnosticCode !== null && !(DIAGNOSTIC_CODES as readonly string[]).includes(a.diagnosticCode)) {
    throw new Error(`portfolioAttempt: bad diagnosticCode '${a.diagnosticCode}'`);
  }
  if (a.failureMode !== null && a.failureMode.startsWith('diagnostic_')) {
    const expected = a.failureMode.slice('diagnostic_'.length);
    if (a.diagnosticCode !== expected) {
      throw new Error(`portfolioAttempt: failureMode '${a.failureMode}' implies diagnosticCode '${expected}', got '${a.diagnosticCode}'`);
    }
  } else if (a.failureMode !== null && a.diagnosticCode !== null) {
    throw new Error(`portfolioAttempt: non-diagnostic failureMode '${a.failureMode}' requires diagnosticCode=null`);
  }
  if (!ISO_RE.test(a.date)) throw new Error(`portfolioAttempt: date must be ISO 8601 UTC, got '${a.date}'`);
}

export function appendPortfolioAttempt(logPath: string, a: PortfolioAttempt): void {
  validate(a);
  appendFileSync(logPath, JSON.stringify(a) + '\n', 'utf8');
}

export function readPortfolioAttempts(logPath: string): PortfolioAttempt[] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map((line, i) => {
      try { return JSON.parse(line) as PortfolioAttempt; }
      catch (e) { throw new Error(`portfolioAttempt: bad JSON on line ${i + 1}: ${(e as Error).message}`); }
    });
}
