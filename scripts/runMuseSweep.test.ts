// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { buildSweepPrompt } from '../eval/lib/sweepPrompt';
import { parseSweepArgs, resolvePromptPlan } from './runMuseSweep';

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

  it('rejects an unknown preset', () => {
    expect(() => parseSweepArgs(['--cases', 'stool', '--prompt-preset', 'nope'])).toThrow(
      /unknown prompt preset/,
    );
  });

  it('rejects --skills with a compact preset', () => {
    expect(() =>
      parseSweepArgs(['--cases', 'stool', '--prompt-preset', 'v1', '--skills', 'kernelcad']),
    ).toThrow(/--skills only applies/);
  });

  it('parses tool-loop flags', () => {
    const cfg = parseSweepArgs(['--cases', 'stool', '--tool-loop', '--tool-max-calls', '5']);
    expect(cfg.toolLoop).toBe(true);
    expect(cfg.toolMaxCalls).toBe(5);
    expect(parseSweepArgs(['--cases', 'stool']).toolLoop).toBe(false);
  });
});

describe('resolvePromptPlan', () => {
  it('reports compact preset provenance and matches the builder bytes', () => {
    const cfg = parseSweepArgs(['--cases', 'stool', '--prompt-preset', 'v1']);
    const plan = resolvePromptPlan(cfg);
    expect(plan.preset).toBe('v1');
    expect(plan.skills).toEqual(['kernelcad', 'kernelcad-authoring', 'kernelcad-assemblies']);
    expect(plan.skills).not.toContain('kernelcad-parts');
    expect(plan.promptBytes).toBe(buildSweepPrompt({ preset: 'v1' }).bytes);
  });

  it('keeps --skills for the full preset', () => {
    const cfg = parseSweepArgs(['--cases', 'stool', '--skills', 'kernelcad,kernelcad-authoring']);
    const plan = resolvePromptPlan(cfg);
    expect(plan.preset).toBe('full');
    expect(plan.skills).toEqual(['kernelcad', 'kernelcad-authoring']);
  });
});
