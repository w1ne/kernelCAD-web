// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { isValidCandidate, renderSummaryMarkdown, summarize } from './report';
import { isFinished, readTaskState, writeTaskState, type TaskState } from './state';
import { buildSubmissionZip, candidatePath, hasCandidate, listZipEntries, taskSubmissionDir } from './submission';

const META = {
  submitter_name: 'tester',
  submission_name: 'kernelCAD (test)',
  agent_url: null,
  notes: null,
  agree_to_publish: false,
};

function runWith(candidates: Record<string, string>, emptyDirs: string[] = []): string {
  const runDir = mkdtempSync(join(tmpdir(), 'cgb-run-'));
  for (const [id, body] of Object.entries(candidates)) {
    mkdirSync(taskSubmissionDir(runDir, id), { recursive: true });
    writeFileSync(candidatePath(runDir, id), body);
  }
  for (const id of emptyDirs) mkdirSync(taskSubmissionDir(runDir, id), { recursive: true });
  return runDir;
}

describe('submission layout and zip', () => {
  it('writes meta.json, one folder per task, and output.step only where a candidate exists', () => {
    const runDir = runWith({ '101': 'STEP-101', '201': 'STEP-201' }, ['102']);
    // A zero-byte candidate is not a candidate.
    writeFileSync(candidatePath(runDir, '102'), '');
    expect(hasCandidate(runDir, '102')).toBe(false);

    const zipPath = join(runDir, 'submission.zip');
    const report = buildSubmissionZip(runDir, ['201', '101', '102'], META, zipPath);
    expect(report).toEqual({ zipPath, tasks: 3, withCandidate: 2, missing: ['102'] });
    expect(listZipEntries(zipPath)).toEqual([
      '101/',
      '101/output.step',
      '102/',
      '201/',
      '201/output.step',
      'meta.json',
    ]);
    const files = unzipSync(new Uint8Array(readFileSync(zipPath)));
    expect(strFromU8(files['201/output.step'])).toBe('STEP-201');
    const meta = JSON.parse(strFromU8(files['meta.json']));
    expect(Object.keys(meta).sort()).toEqual(['agent_url', 'agree_to_publish', 'notes', 'submission_name', 'submitter_name']);
    expect(meta.agree_to_publish).toBe(false);
  });

  it('refuses notes over the 500-character contract limit', () => {
    const runDir = runWith({});
    expect(() => buildSubmissionZip(runDir, [], { ...META, notes: 'x'.repeat(501) }, join(runDir, 'z.zip'))).toThrow(/500/);
  });
});

function state(id: string, patch: Partial<TaskState> = {}): TaskState {
  return {
    id,
    type: 'generation',
    status: 'valid',
    mode: 'llm',
    attempts: 1,
    repaired: false,
    tokensIn: 100,
    tokensOut: 50,
    costUsd: null,
    wallMs: 1000,
    updatedAt: '2026-01-01T00:00:00Z',
    ...patch,
  };
}

describe('resume state', () => {
  it('round-trips atomically and treats a corrupt file as no progress', () => {
    const runDir = mkdtempSync(join(tmpdir(), 'cgb-state-'));
    writeTaskState(runDir, state('101'));
    expect(readTaskState(runDir, '101')?.status).toBe('valid');
    expect(readTaskState(runDir, '999')).toBeNull();
    writeFileSync(join(runDir, 'tasks', '101', 'state.json'), '{ half');
    expect(readTaskState(runDir, '101')).toBeNull();
  });

  it('skips terminal tasks, reruns environment failures and other producers', () => {
    expect(isFinished(null)).toBe(false);
    expect(isFinished(state('1'))).toBe(true);
    expect(isFinished(state('1', { status: 'invalid' }))).toBe(true);
    expect(isFinished(state('1', { status: 'failed' }), { retryFailed: true })).toBe(false);
    expect(isFinished(state('1', { status: 'valid' }), { retryFailed: true })).toBe(true);
    expect(isFinished(state('1', { status: 'needs_key' }))).toBe(false);
    expect(isFinished(state('1', { status: 'infra_error' }))).toBe(false);
    // A no-LLM passthrough does not count as done for an LLM run.
    expect(isFinished(state('1', { mode: 'passthrough' }), { mode: 'llm' })).toBe(false);
    expect(isFinished(state('1', { mode: 'llm', fallback: 'passthrough' }), { mode: 'llm' })).toBe(true);
  });
});

describe('summary', () => {
  it('counts valid per type, prefers the official verdict, and never claims a local score', () => {
    const states = [
      state('101', { costUsd: 0.5 }),
      state('102', { status: 'failed', error: 'no script | extracted' }),
      state('201', { type: 'editing', official: { valid: false, detail: 'Face: BRepCheck_UnorientableShape' } }),
      state('202', { type: 'editing', mode: 'passthrough', official: { valid: true, detail: 'pass' } }),
    ];
    expect(isValidCandidate(states[2])).toBe(false);
    const sum = summarize(states);
    expect(sum.byType).toEqual({ generation: { tasks: 2, valid: 1 }, editing: { tasks: 2, valid: 1 } });
    expect(sum.precheckValid).toBe(3);
    expect(sum.officialValid).toBe(1);
    expect(sum.tokensIn).toBe(400);
    expect(sum.costUsd).toBe(0.5);
    expect(sum.localScore).toBeNull();
    const md = renderSummaryMarkdown(states, { run: 'r' });
    expect(md).toContain('Valid: 2/4 (generation 1/2, editing 1/2)');
    expect(md).toContain('Local score: n/a');
    // Cell text cannot break the table.
    expect(md).toContain('failed: no script / extracted');
  });
});
