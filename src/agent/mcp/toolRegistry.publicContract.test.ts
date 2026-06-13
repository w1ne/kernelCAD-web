// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
  TOOL_REGISTRY,
  TOOLS,
  callMcpTool,
  getToolDefinition,
  runClosedLoop,
  buildRepairPrompt,
  defaultBuildRepairPrompt,
  type McpToolDefinition,
} from './toolRegistry';

describe('toolRegistry public contract', () => {
  // 'lookup_api' is a stable, always-registered tool used as a contract anchor below.
  // If you rename or remove it, update the references in this file.
  it('exports TOOL_REGISTRY as a non-empty array of entries with definition+handler', () => {
    expect(Array.isArray(TOOL_REGISTRY)).toBe(true);
    expect(TOOL_REGISTRY.length).toBeGreaterThan(0);
    for (const entry of TOOL_REGISTRY) {
      expect(typeof entry.definition.name).toBe('string');
      expect(typeof entry.definition.description).toBe('string');
      expect(entry.definition.inputSchema.type).toBe('object');
      expect(typeof entry.handler).toBe('function');
    }
  });

  it('exports TOOLS as a flat definitions array matching TOOL_REGISTRY length', () => {
    expect(TOOLS.length).toBe(TOOL_REGISTRY.length);
    for (let i = 0; i < TOOLS.length; i++) {
      expect(TOOLS[i].name).toBe(TOOL_REGISTRY[i].definition.name);
    }
  });

  it('exports callMcpTool that dispatches by name and returns a result', async () => {
    const result = await callMcpTool('lookup_api', {});
    expect(result).toBeDefined();
  });

  it('exports callMcpTool that throws on unknown tool name', async () => {
    await expect(callMcpTool('nonexistent_tool_xyz', {})).rejects.toThrow();
  });

  it('exports getToolDefinition(name) returning the definition or undefined', () => {
    const def = getToolDefinition('lookup_api');
    expect(def).toBeDefined();
    expect(def?.name).toBe('lookup_api');
    expect(getToolDefinition('nonexistent_tool_xyz')).toBeUndefined();
  });

  it('type McpToolDefinition is exported and compatible with getToolDefinition return', () => {
    // Assignment compiles only if McpToolDefinition matches the returned shape.
    const def: McpToolDefinition | undefined = getToolDefinition('lookup_api');
    expect(def).toBeDefined();
  });

  it('exposes the closed-loop seam the hosted server consumes', () => {
    // The kernelCAD-server orchestrator imports these from this public entry.
    // Keep them exported so the hosted generation loop can repair with the
    // typed, root-cause-first prompt instead of the generic fallback.
    expect(typeof runClosedLoop).toBe('function');
    expect(typeof buildRepairPrompt).toBe('function');
    expect(typeof defaultBuildRepairPrompt).toBe('function');
  });

  it('the rich buildRepairPrompt differs from the generic fallback for a typed verdict', () => {
    const verdicts = [
      {
        gate: 'interference',
        ok: false,
        code: 'mechanism.interpenetration',
        message: 'Parts overlap.',
        margin: 42,
        locus: 'shade∩beam',
      },
    ];
    const rich = buildRepairPrompt(verdicts);
    const generic = defaultBuildRepairPrompt(verdicts);
    expect(rich).not.toBe(generic);
    // Rich prompt carries the numeric margin + topological locus as evidence.
    expect(rich).toContain('42');
    expect(rich).toContain('shade∩beam');
  });
});
