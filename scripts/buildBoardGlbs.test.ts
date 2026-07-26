// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/buildBoardGlbs.test.ts
//
// Guards the board-catalog CONSISTENCY rule: every board serves glbUrl, plus
// stepUrl unless its STEP genuinely exceeded the served-size limit.
//
// This rule previously held for some boards and not others — authored boards lost
// their STEP unconditionally while url-sourced ones kept it — which silently broke
// `lib.fetchPart` for every authored board. Nothing tested it, so nothing caught
// it. These tests exercise the guard itself, not a proxy for it.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assertBoardConsistency,
  removeDeployedStep,
  MAX_SERVED_STEP_BYTES,
  type BoardGlbResult,
} from './buildBoardGlbs';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'kc-board-test-'));
  mkdirSync(join(dir, 'v1', 'parts'), { recursive: true });
  mkdirSync(join(dir, 'step'), { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function writeRecord(id: string, rec: Record<string, unknown>): void {
  writeFileSync(join(dir, 'v1', 'parts', `${id}.json`), JSON.stringify(rec));
}
function result(id: string, removedStep: boolean): BoardGlbResult {
  return {
    id,
    glbBytes: 1000,
    materials: 4,
    glbUrl: `https://example.test/glb/${id}.glb`,
    patchedRecord: true,
    removedStep,
  };
}
/** Write a STEP of an exact byte length. */
function writeStep(id: string, bytes: number): void {
  writeFileSync(join(dir, 'step', `${id}.step`), Buffer.alloc(bytes, 0x41));
}

describe('removeDeployedStep', () => {
  it('KEEPS a STEP that fits under the served-size limit', () => {
    writeStep('esp32-c3-supermini-board', 4096);
    const removed = removeDeployedStep(dir, 'esp32-c3-supermini-board');
    expect(removed).toBe(false);
    expect(existsSync(join(dir, 'step', 'esp32-c3-supermini-board.step'))).toBe(true);
  });

  it('drops a STEP that exceeds the served-size limit', () => {
    writeStep('huge-board', MAX_SERVED_STEP_BYTES + 1);
    const removed = removeDeployedStep(dir, 'huge-board');
    expect(removed).toBe(true);
    expect(existsSync(join(dir, 'step', 'huge-board.step'))).toBe(false);
  });

  it('reports nothing removed when there is no STEP at all', () => {
    expect(removeDeployedStep(dir, 'absent-board')).toBe(false);
  });
});

describe('assertBoardConsistency', () => {
  it('accepts a board serving BOTH stepUrl and glbUrl', () => {
    writeRecord('a-board', { stepUrl: 's', glbUrl: 'g' });
    expect(() => assertBoardConsistency(dir, [result('a-board', false)])).not.toThrow();
  });

  it('accepts a GLB-only board whose STEP was genuinely dropped', () => {
    writeRecord('big-board', { glbUrl: 'g' });
    expect(() => assertBoardConsistency(dir, [result('big-board', true)])).not.toThrow();
  });

  it('REJECTS the regression: STEP kept on disk but stepUrl missing from the record', () => {
    // Exactly the state that made every authored board unusable from a .kcad.ts.
    writeRecord('a-board', { glbUrl: 'g' });
    expect(() => assertBoardConsistency(dir, [result('a-board', false)])).toThrow(
      /STEP kept on disk but record has no stepUrl/,
    );
  });

  it('rejects a record advertising a stepUrl whose STEP was removed', () => {
    writeRecord('big-board', { stepUrl: 's', glbUrl: 'g' });
    expect(() => assertBoardConsistency(dir, [result('big-board', true)])).toThrow(
      /still advertises stepUrl/,
    );
  });

  it('rejects a board with no glbUrl', () => {
    writeRecord('a-board', { stepUrl: 's' });
    expect(() => assertBoardConsistency(dir, [result('a-board', false)])).toThrow(/missing glbUrl/);
  });

  it('reports every offending board, not just the first', () => {
    writeRecord('one-board', { glbUrl: 'g' });
    writeRecord('two-board', { stepUrl: 's' });
    expect(() =>
      assertBoardConsistency(dir, [result('one-board', false), result('two-board', false)]),
    ).toThrow(/one-board[\s\S]*two-board/);
  });

  it('tolerates a board with no GLB when it was deliberately skipped for size', () => {
    const manifest = {
      baseModelUrl: '', license: 'MIT', attribution: '',
      parts: [{ id: 'heavy-board', name: 'H', family: 'Board', mpn: 'x' }],
    };
    // No result for heavy-board (it produced no GLB), but it's in skippedOversize.
    expect(() =>
      assertBoardConsistency(dir, [], manifest, new Set(['heavy-board'])),
    ).not.toThrow();
  });

  it('still REJECTS a board that produced no GLB and was NOT skipped', () => {
    const manifest = {
      baseModelUrl: '', license: 'MIT', attribution: '',
      parts: [{ id: 'heavy-board', name: 'H', family: 'Board', mpn: 'x' }],
    };
    expect(() => assertBoardConsistency(dir, [], manifest, new Set())).toThrow(
      /heavy-board: board produced no GLB/,
    );
  });
});
