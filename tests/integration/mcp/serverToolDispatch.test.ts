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
    expect(names).toContain('design_loop');

    await expect(callMcpTool('list_api', {})).resolves.toMatchObject({
      globals: expect.any(Array),
      shapeMethods: expect.any(Array),
    });
  });

  it('dispatches assembly inspection through the advertised registry', async () => {
    await expect(callMcpTool('list_assemblies', {
      code: `
        const hinge = assembly('registry hinge');
        hinge.part('leafA', box(20, 8, 2));
        hinge.part('leafB', box(20, 8, 2), { at: [20, 0, 0] });
        return hinge.model();
      `,
    })).resolves.toMatchObject({
      assemblies: [
        {
          name: 'registry hinge',
          parts: [
            expect.objectContaining({ name: 'leafA' }),
            expect.objectContaining({ name: 'leafB' }),
          ],
          models: [expect.objectContaining({ partIds: expect.any(Array) })],
        },
      ],
    });
  });

  it('keeps unknown tool errors explicit', async () => {
    await expect(callMcpTool('missing_tool', {})).rejects.toThrow('Unknown tool: missing_tool');
  });
});
