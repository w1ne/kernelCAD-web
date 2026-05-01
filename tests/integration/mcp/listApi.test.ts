// tests/integration/mcp/listApi.test.ts
import { describe, it, expect } from 'vitest';
import { listApiTool } from '../../../src/mcp/tools/listApi';

describe('list_api MCP tool', () => {
  it('returns globals including box, path, selectEdges, helix', async () => {
    const r = await listApiTool({});
    expect(r.ok).toBe(true);
    const globalNames = r.globals!.map(g => g.name);
    expect(globalNames).toContain('box');
    expect(globalNames).toContain('cylinder');
    expect(globalNames).toContain('sphere');
    expect(globalNames).toContain('path');
    expect(globalNames).toContain('selectEdges');
    expect(globalNames).toContain('selectEdge');
    expect(globalNames).toContain('helix');
    expect(globalNames).toContain('param');
  });

  it('returns shapeMethods including fillet, chamfer, shell, lower, translate', async () => {
    const r = await listApiTool({});
    const methodNames = r.shapeMethods!.map(m => m.name);
    expect(methodNames).toContain('fillet');
    expect(methodNames).toContain('chamfer');
    expect(methodNames).toContain('shell');
    expect(methodNames).toContain('lower');
    expect(methodNames).toContain('translate');
  });

  it('returns sketchMethods including extrude, revolve, sweep', async () => {
    const r = await listApiTool({});
    const sketchMethodNames = r.sketchMethods!.map(m => m.name);
    expect(sketchMethodNames).toContain('extrude');
    expect(sketchMethodNames).toContain('revolve');
    expect(sketchMethodNames).toContain('sweep');
  });

  it('returns edgeQueryKeys and faceQueryKeys', async () => {
    const r = await listApiTool({});
    expect(r.edgeQueryKeys).toContain('atZ');
    expect(r.edgeQueryKeys).toContain('parallel');
    expect(r.edgeQueryKeys).toContain('convex');
    expect(r.faceQueryKeys).toContain('atZ');
    expect(r.faceQueryKeys).toContain('parallelTo');
    expect(r.faceQueryKeys).toContain('inPlane');
  });
});
