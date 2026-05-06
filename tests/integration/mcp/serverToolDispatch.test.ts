import { describe, expect, it } from 'vitest';
import { TOOLS } from '../../../src/mcp/server';
import { callMcpTool, TOOL_REGISTRY } from '../../../src/mcp/toolRegistry';

describe('MCP server tool registry', () => {
  it('derives the advertised TOOLS array from the executable registry', () => {
    expect(TOOLS).toBeDefined();
    expect(TOOLS).toEqual(TOOL_REGISTRY.map(entry => entry.definition));
    expect(TOOLS.length).toBeGreaterThanOrEqual(21);
  });

  it('has one unique executable handler per advertised tool name', async () => {
    const names = TOOL_REGISTRY.map(entry => entry.definition.name);
    expect(new Set(names).size).toBe(names.length);

    await expect(callMcpTool('list_api', {})).resolves.toMatchObject({
      globals: expect.any(Array),
      shapeMethods: expect.any(Array),
    });
  });

  it('keeps unknown tool errors explicit', async () => {
    await expect(callMcpTool('missing_tool', {})).rejects.toThrow('Unknown tool: missing_tool');
  });
});
