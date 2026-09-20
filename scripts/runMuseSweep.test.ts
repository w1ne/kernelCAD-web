// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { buildSweepPrompt } from '../eval/lib/sweepPrompt';
import type { AgentClient } from '../eval/types';
import { asToolChatClient, parseSweepArgs, resolvePromptPlan, resumeMismatch } from './runMuseSweep';

describe('parseSweepArgs prompt flags', () => {
  it('defaults to the full preset with cookbook retrieval on and the tool loop', () => {
    const cfg = parseSweepArgs(['--cases', 'stool']);
    expect(cfg.promptPreset).toBe('full');
    expect(cfg.useCookbook).toBe(true);
    expect(cfg.toolLoop).toBe(true);
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

  it('parses tool-loop flags and the repair-loop escape hatch', () => {
    const cfg = parseSweepArgs(['--cases', 'stool', '--tool-loop', '--tool-max-calls', '5']);
    expect(cfg.toolLoop).toBe(true);
    expect(cfg.toolMaxCalls).toBe(5);
    expect(parseSweepArgs(['--cases', 'stool', '--repair-loop']).toolLoop).toBe(false);
    expect(() => parseSweepArgs(['--cases', 'stool', '--tool-loop', '--repair-loop'])).toThrow(
      /mutually exclusive/,
    );
  });

  it('rejects --tool-max-calls with the repair loop', () => {
    expect(() =>
      parseSweepArgs(['--cases', 'stool', '--repair-loop', '--tool-max-calls', '5']),
    ).toThrow(/--tool-max-calls only applies to the tool loop/);
  });
});

describe('resumeMismatch', () => {
  const priorControl = { promptPreset: 'full', cookbook: true, toolLoop: false, toolMaxCalls: 8 };
  const cfgControl = { promptPreset: 'full', useCookbook: true, toolLoop: false, toolMaxCalls: 8 };

  it('normalizes legacy run.json that predates the tool-loop fields', () => {
    expect(resumeMismatch({}, cfgControl)).toBeNull();
  });

  it('detects a tool-loop mismatch', () => {
    const mismatch = resumeMismatch({}, { ...cfgControl, toolLoop: true });
    expect(mismatch).not.toBeNull();
    expect(mismatch).toContain('toolLoop=false/true');
  });

  it('returns null when the prior config matches', () => {
    expect(resumeMismatch(priorControl, cfgControl)).toBeNull();
  });

  it('ignores toolMaxCalls drift on control runs', () => {
    expect(
      resumeMismatch({ ...priorControl, toolMaxCalls: 3 }, { ...cfgControl, toolMaxCalls: 99 }),
    ).toBeNull();
  });

  it('flags toolMaxCalls drift on tool runs', () => {
    const cfgTool = { ...cfgControl, toolLoop: true, toolMaxCalls: 5 };
    const priorTool = { ...priorControl, toolLoop: true, toolMaxCalls: 8 };
    expect(resumeMismatch(priorTool, cfgTool)).toContain('toolMaxCalls=8/5');
  });
});

describe('asToolChatClient', () => {
  it('throws when the agent lacks chatWithTools', () => {
    const agent = {} as AgentClient;
    expect(() => asToolChatClient(agent)).toThrow(/chatWithTools/);
  });

  it('returns the same object when chatWithTools is present', () => {
    const agent = {
      generate: async () => ({ text: '', tokens_in: 0, tokens_out: 0 }),
      chatWithTools: async () => ({
        text: '',
        toolCalls: [],
        finishReason: 'stop',
        tokensIn: 0,
        tokensOut: 0,
      }),
    } as unknown as AgentClient;
    expect(asToolChatClient(agent)).toBe(agent);
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
