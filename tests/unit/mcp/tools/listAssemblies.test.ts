import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../../src/backends/occt/occtBackend';
import { listAssembliesTool } from '../../../../src/mcp/tools/listAssemblies';

describe('listAssembliesTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('lists assembly parts, connectors, fixed connections, joints, and models from inline code', async () => {
    const result = await listAssembliesTool({
      code: `
        const arm = assembly('inspection arm');
        const base = arm.part('base', box(30, 30, 8), {
          at: [0, 0, 0],
          connectors: {
            shoulder: { origin: [15, 15, 8], axis: [0, 0, 1] },
          },
        });
        const link = arm.part('link', box(80, 10, 6), {
          connectors: {
            root: { origin: [0, 5, 3], axis: [0, 0, 1] },
            wrist: { origin: [80, 5, 3], axis: [0, 0, 1] },
          },
          connect: {
            connector: 'root',
            to: base.connector('shoulder'),
            name: 'shoulder-fixed',
          },
        });
        arm.revolute('shoulder', base, link, {
          axis: [0, 0, 1],
          origin: [15, 15, 8],
          limitsDeg: [-90, 90],
        });
        return arm.model();
      `,
    });

    expect(result.ok).toBeUndefined();
    expect(result.assemblies).toHaveLength(1);

    const assembly = result.assemblies[0];
    expect(assembly.name).toBe('inspection arm');
    expect(assembly.parts.map(part => part.name)).toEqual(['base', 'link']);
    expect(assembly.parts[0]).toMatchObject({
      name: 'base',
      shapeId: expect.stringMatching(/^box_/),
      at: [0, 0, 0],
      connectors: {
        shoulder: { origin: [15, 15, 8], axis: [0, 0, 1] },
      },
    });
    expect(assembly.parts[1]).toMatchObject({
      name: 'link',
      shapeId: expect.stringMatching(/^box_/),
      at: [15, 10, 5],
      connectors: {
        root: { origin: [0, 5, 3], axis: [0, 0, 1] },
        wrist: { origin: [80, 5, 3], axis: [0, 0, 1] },
      },
      placedBy: {
        connector: 'root',
        to: {
          partId: assembly.parts[0].id,
          partName: 'base',
          connector: 'shoulder',
        },
      },
    });
    expect(assembly.connections).toEqual([
      expect.objectContaining({
        name: 'shoulder-fixed',
        kind: 'fixed',
        partIds: { a: assembly.parts[0].id, b: assembly.parts[1].id },
        a: expect.objectContaining({ partName: 'base', connector: 'shoulder' }),
        b: expect.objectContaining({ partName: 'link', connector: 'root' }),
      }),
    ]);
    expect(assembly.joints).toEqual([
      expect.objectContaining({
        name: 'shoulder',
        kind: 'revolute',
        partIds: { a: assembly.parts[0].id, b: assembly.parts[1].id },
        axis: [0, 0, 1],
        origin: [15, 15, 8],
        limitsDeg: [-90, 90],
      }),
    ]);
    expect(assembly.models).toEqual([
      expect.objectContaining({
        partIds: [assembly.parts[0].id, assembly.parts[1].id],
      }),
    ]);
  });

  it('returns an empty assembly list when the script has no assembly records', async () => {
    const result = await listAssembliesTool({ code: `return box(10, 10, 10);` });

    expect(result).toEqual({ assemblies: [] });
  });

  it('returns structured diagnostics when the script fails', async () => {
    const result = await listAssembliesTool({ code: `throw new Error('boom');` });

    expect(result).toMatchObject({
      ok: false,
      assemblies: [],
      error: 'boom',
      errorCode: 'cli.script-exception',
    });
  });
});
