// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync } from 'node:fs';
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
  it('writes and reads a state atomically', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mstate-'));
    writeState(dir, { ...BASE, updatedAt: '2026-09-19T00:00:00Z' });
    const out = readState(dir);
    expect(out).toEqual({ ...BASE, updatedAt: '2026-09-19T00:00:00Z' });
  });

  it('returns null when no state file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mstate-'));
    expect(readState(dir)).toBeNull();
  });

  it('orders phases and treats infra_error as never at-target', () => {
    expect(isAtLeast('judged', 'scored')).toBe(true);
    expect(isAtLeast('generated', 'scored')).toBe(false);
    expect(isAtLeast('pending', 'generated')).toBe(false);
    expect(isAtLeast('infra_error', 'pending')).toBe(false);
  });
});
