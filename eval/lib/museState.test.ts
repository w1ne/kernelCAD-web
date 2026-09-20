// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isAtLeast, readState, writeState, type CaseState } from './museState';

const BASE: Omit<CaseState, 'updatedAt'> = {
  phase: 'generated',
  attempts: 2,
  tokens: { in: 100, out: 20 },
  protocol: 'muse-v1',
};

describe('museState', () => {
  it('writes and reads state', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mstate-'));
    const first: CaseState = {
      ...BASE,
      firstFailureCode: 'x',
      generationMs: 42,
      updatedAt: '2026-09-19T00:00:00Z',
    };
    writeState(dir, first);
    expect(readState(dir)).toEqual(first);

    const second: CaseState = {
      ...BASE,
      phase: 'scored',
      updatedAt: '2026-09-19T00:01:00Z',
    };
    writeState(dir, second);
    expect(readState(dir)).toEqual(second);
  });

  it('returns null when no state file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mstate-'));
    expect(readState(dir)).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mstate-'));
    writeFileSync(join(dir, 'state.json'), '{oops');
    expect(readState(dir)).toBeNull();
  });

  it('orders phases and treats infra_error as never at-target', () => {
    expect(isAtLeast('judged', 'scored')).toBe(true);
    expect(isAtLeast('generated', 'scored')).toBe(false);
    expect(isAtLeast('pending', 'generated')).toBe(false);
    expect(isAtLeast('infra_error', 'pending')).toBe(false);
    expect(isAtLeast('scored', 'scored')).toBe(true);
    expect(isAtLeast('judged', 'infra_error')).toBe(false);
  });
});
