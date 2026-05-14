import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { callMcpTool, TOOL_REGISTRY } from '../../../src/mcp/toolRegistry';
import { inspectAssemblyTool } from '../../../src/mcp/tools/inspectAssembly';

describe('inspect_assembly MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports disconnected part geometry as explicit review facts', async () => {
    const result = await inspectAssemblyTool({
      code: `
        const arm = assembly('broken inventory');
        arm.part('floating-blocks',
          box(20, 10, 8, true)
            .union(box(8, 8, 8, true).translate(55, 0, 0))
        );
        return arm.model();
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assembly).toBe('broken inventory');
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]).toMatchObject({
        name: 'floating-blocks',
        disconnected: expect.objectContaining({
          componentCount: 2,
        }),
      });
      expect(result.reviewFacts).toEqual([
        expect.objectContaining({
          code: 'assembly.mechanical.part-disconnected',
          severity: 'warning',
          partName: 'floating-blocks',
        }),
      ]);
      expect(result.unexplainedGeometry).toEqual([
        expect.objectContaining({
          code: 'assembly.mechanical.part-disconnected',
          partName: 'floating-blocks',
        }),
      ]);
      expect(result.nextActionPrompt).toMatch(/floating-blocks/);
      expect(result.nextActionPrompt).toMatch(/explain or repair/);
    }
  });

  it('is advertised and dispatchable through the registry', async () => {
    expect(TOOL_REGISTRY.map((entry) => entry.definition.name)).toContain('inspect_assembly');

    await expect(callMcpTool('inspect_assembly', {
      code: `
        const arm = assembly('registry inspect');
        arm.part('base', box(10, 10, 4, true));
        return arm.model();
      `,
    })).resolves.toMatchObject({
      ok: true,
      assembly: 'registry inspect',
      parts: [expect.objectContaining({ name: 'base' })],
    });
  });
});
