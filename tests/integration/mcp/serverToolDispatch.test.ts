import { describe, expect, it } from 'vitest';
import { TOOLS } from '../../../src/agent/mcp/server';
import { callMcpTool, TOOL_REGISTRY } from '../../../src/agent/mcp/toolRegistry';

describe('MCP server tool registry', () => {
  it('derives the advertised TOOLS array from the executable registry', () => {
    expect(TOOLS).toBeDefined();
    // TOOLS is derived 1:1 from TOOL_REGISTRY in registry order. Each advertised
    // tool carries the same name + inputSchema as its registry definition, plus
    // the centrally-attached behavioral annotations and structured outputSchema
    // (required MCP metadata — never stripped). Assert the derivation: same names
    // in the same order, and each advertised entry is a superset of its registry
    // definition.
    expect(TOOLS.map(tool => tool.name)).toEqual(
      TOOL_REGISTRY.map(entry => entry.definition.name),
    );
    for (const [i, entry] of TOOL_REGISTRY.entries()) {
      expect(TOOLS[i]).toMatchObject(entry.definition);
    }
    expect(TOOLS.length).toBeGreaterThanOrEqual(21);
  });

  it('has one unique executable handler per advertised tool name', async () => {
    const names = TOOL_REGISTRY.map(entry => entry.definition.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('design_loop');

    await expect(callMcpTool('lookup_api', {})).resolves.toMatchObject({
      globals: expect.any(Array),
      shapeMethods: expect.any(Array),
    });
  });

  it('dispatches assembly inspection through the advertised registry', async () => {
    await expect(callMcpTool('inspect', {
      of: 'assemblies',
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
