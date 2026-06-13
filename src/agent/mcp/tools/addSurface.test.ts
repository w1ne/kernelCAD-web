import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock both authoring tools — this is a routing layer, so we test that `kind`
// selects the right handler and forwards the remaining params, not the tools'
// own (unchanged) behavior.
vi.mock('./addNurbsSurface', () => ({ addNurbsSurfaceTool: vi.fn(async () => 'nurbs') }));
vi.mock('./addSurfaceFromBoundary', () => ({ addSurfaceFromBoundaryTool: vi.fn(async () => 'boundary') }));

import { addSurfaceTool, type SurfaceKind } from './addSurface';
import { addNurbsSurfaceTool } from './addNurbsSurface';
import { addSurfaceFromBoundaryTool } from './addSurfaceFromBoundary';

const ROUTES: Array<[SurfaceKind, ReturnType<typeof vi.fn>, string]> = [
  ['nurbs', addNurbsSurfaceTool as never, 'nurbs'],
  ['boundary', addSurfaceFromBoundaryTool as never, 'boundary'],
];

describe('add_surface dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(ROUTES)('routes kind:%s to its handler and returns its result', async (kind, handler, expected) => {
    const out = await addSurfaceTool({ kind, code: 'SRC', extra: 7 });
    expect(out).toBe(expected);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('forwards kind-specific params but strips `kind` itself', async () => {
    await addSurfaceTool({ kind: 'boundary', code: 'SRC', curve_bindings: ['a', 'b', 'c', 'd'] });
    const arg = (addSurfaceFromBoundaryTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toEqual({ code: 'SRC', curve_bindings: ['a', 'b', 'c', 'd'] });
    expect(arg).not.toHaveProperty('kind');
  });

  it('rejects an unknown kind with an actionable error', async () => {
    await expect(addSurfaceTool({ kind: 'nope' as SurfaceKind })).rejects.toThrow(/Unknown add_surface kind: nope/);
  });

  it('does not cross-call the other handler', async () => {
    await addSurfaceTool({ kind: 'nurbs', code: 'SRC' });
    expect(addNurbsSurfaceTool).toHaveBeenCalledTimes(1);
    expect(addSurfaceFromBoundaryTool).not.toHaveBeenCalled();
  });
});
