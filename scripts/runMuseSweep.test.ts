// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { parseSweepArgs } from './runMuseSweep';

describe('parseSweepArgs prompt flags', () => {
  it('defaults to the full preset with cookbook retrieval on', () => {
    const cfg = parseSweepArgs(['--cases', 'stool']);
    expect(cfg.promptPreset).toBe('full');
    expect(cfg.useCookbook).toBe(true);
  });

  it('accepts a preset and --no-cookbook', () => {
    const cfg = parseSweepArgs(['--cases', 'stool', '--prompt-preset', 'v1', '--no-cookbook']);
    expect(cfg.promptPreset).toBe('v1');
    expect(cfg.useCookbook).toBe(false);
  });
});
