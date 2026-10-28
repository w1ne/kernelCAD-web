// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { generationLedgerMismatch } from './generationLedger';

describe('generationLedgerMismatch', () => {
  it('ignores a script that does not state a ledger', () => {
    expect(generationLedgerMismatch('return box(1, 1, 1);', { extentsMm: [1, 1, 1], volumeMm3: 1 })).toBeNull();
  });

  it('accepts extents and volume inside tolerance', () => {
    const script = '// ledger: extents 20 10 5; volume 874\nreturn box(20, 10, 5);';
    expect(generationLedgerMismatch(script, { extentsMm: [20, 10.1, 5], volumeMm3: 880 })).toBeNull();
  });

  it('reports a scale mismatch using the measured solid', () => {
    const script = '// ledger: extents 100 40 20; volume 80000\nreturn box(10, 4, 2);';
    const message = generationLedgerMismatch(script, { extentsMm: [10, 4, 2], volumeMm3: 80 });
    expect(message).toMatch(/100/);
    expect(message).toMatch(/10\.000 × 4\.000 × 2\.000/);
    expect(message).toMatch(/80/);
  });

  it('checks extents when the ledger omits volume', () => {
    const script = '// ledger: extents 30 20 10\nreturn part;';
    expect(generationLedgerMismatch(script, { extentsMm: [30, 20, 10], volumeMm3: 1 })).toBeNull();
    expect(generationLedgerMismatch(script, { extentsMm: [3, 2, 1] })).toMatch(/extents/);
  });

  it('does not fail when the export has no measurements', () => {
    const script = '// ledger: extents 10 10 10; volume 1000';
    expect(generationLedgerMismatch(script, {})).toBeNull();
  });
});
