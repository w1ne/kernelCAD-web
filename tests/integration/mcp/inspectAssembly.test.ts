import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { callMcpTool, TOOL_REGISTRY } from '../../../src/agent/mcp/toolRegistry';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';

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

  it('reports visible sub-10mm air gaps between solids as disconnected geometry', async () => {
    const result = await inspectAssemblyTool({
      code: `
        const arm = assembly('small broken inventory');
        arm.part('gapped-link',
          box(20, 10, 8, true)
            .union(box(10, 10, 8, true).translate(22, 0, 0))
        );
        return arm.model();
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parts[0]).toMatchObject({
        name: 'gapped-link',
        disconnected: expect.objectContaining({
          componentCount: 2,
        }),
      });
      expect(result.unexplainedGeometry).toEqual([
        expect.objectContaining({
          code: 'assembly.mechanical.part-disconnected',
          partName: 'gapped-link',
        }),
      ]);
    }
  });

  it('reports sub-millimeter clearance gaps inside a single functional part', async () => {
    const result = await inspectAssemblyTool({
      code: `
        const arm = assembly('clearance-gap inventory');
        arm.part('loose-pin-as-one-part',
          box(20, 10, 8, true)
            .union(box(10, 10, 8, true).translate(15.25, 0, 0))
        );
        return arm.model();
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parts[0]).toMatchObject({
        name: 'loose-pin-as-one-part',
        disconnected: expect.objectContaining({
          componentCount: 2,
        }),
      });
      expect(result.unexplainedGeometry).toEqual([
        expect.objectContaining({
          code: 'assembly.mechanical.part-disconnected',
          partName: 'loose-pin-as-one-part',
        }),
      ]);
    }
  });

  it('reports disconnected solids even when their bounding boxes overlap', async () => {
    const result = await inspectAssemblyTool({
      code: `
        const arm = assembly('bbox-overlap inventory');
        const leftPost = box(2, 2, 12, true).translate(-5, 0, 0);
        const rightPost = box(2, 2, 12, true).translate(5, 0, 0);
        const topBridge = box(12, 2, 2, true).translate(0, 0, 5);
        const floatingBlock = box(2, 2, 2, true).translate(0, 0, -4);
        arm.part('bbox-hidden-floater',
          leftPost
            .union(rightPost)
            .union(topBridge)
            .union(floatingBlock)
        );
        return arm.model();
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parts[0]).toMatchObject({
        name: 'bbox-hidden-floater',
        disconnected: expect.objectContaining({
          componentCount: 2,
        }),
      });
      expect(result.unexplainedGeometry).toEqual([
        expect.objectContaining({
          code: 'assembly.mechanical.part-disconnected',
          partName: 'bbox-hidden-floater',
        }),
      ]);
    }
  });

  it('is advertised and dispatchable through the registry', async () => {
    expect(TOOL_REGISTRY.map((entry) => entry.definition.name)).toContain('inspect');

    await expect(callMcpTool('inspect', {
      of: 'assembly',
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
