import { describe, it, expect } from 'vitest';
import {
  TOOL_REGISTRY,
  TOOLS,
  callMcpTool,
  getToolDefinition,
  type McpToolDefinition,
} from './toolRegistry';

describe('toolRegistry public contract', () => {
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
    const result = await callMcpTool('list_api', {});
    expect(result).toBeDefined();
  });

  it('exports callMcpTool that throws on unknown tool name', async () => {
    await expect(callMcpTool('nonexistent_tool_xyz', {})).rejects.toThrow();
  });

  it('exports getToolDefinition(name) returning the definition or undefined', () => {
    const def = getToolDefinition('list_api');
    expect(def).toBeDefined();
    expect(def?.name).toBe('list_api');
    expect(getToolDefinition('nonexistent_tool_xyz')).toBeUndefined();
  });

  it('type McpToolDefinition is exported', () => {
    const _typeCheck: McpToolDefinition = {
      name: 'x',
      description: 'y',
      inputSchema: { type: 'object', properties: {} },
    };
    expect(_typeCheck.name).toBe('x');
  });
});
