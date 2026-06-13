import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all three authoring tools — this is a routing layer, so we test that
// `kind` selects the right handler and forwards the remaining params, not the
// tools' own (unchanged) behavior.
vi.mock('./addPathSpline', () => ({ addPathSplineTool: vi.fn(async () => 'spline') }));
vi.mock('./addPathNurbsSegment', () => ({ addPathNurbsSegmentTool: vi.fn(async () => 'nurbs') }));
vi.mock('./addPathHermiteG2', () => ({ addPathHermiteG2Tool: vi.fn(async () => 'hermite') }));

import { addPathSegmentTool, type PathSegmentKind } from './addPathSegment';
import { addPathSplineTool } from './addPathSpline';
import { addPathNurbsSegmentTool } from './addPathNurbsSegment';
import { addPathHermiteG2Tool } from './addPathHermiteG2';

const ROUTES: Array<[PathSegmentKind, ReturnType<typeof vi.fn>, string]> = [
  ['spline', addPathSplineTool as never, 'spline'],
  ['nurbs', addPathNurbsSegmentTool as never, 'nurbs'],
  ['hermite', addPathHermiteG2Tool as never, 'hermite'],
];

describe('add_path_segment dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(ROUTES)('routes kind:%s to its handler and returns its result', async (kind, handler, expected) => {
    const out = await addPathSegmentTool({ kind, code: 'SRC', chain_anchor: 'brow', extra: 7 });
    expect(out).toBe(expected);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('forwards kind-specific params but strips `kind` itself', async () => {
    await addPathSegmentTool({ kind: 'spline', code: 'SRC', chain_anchor: 'brow', points: [[0, 0], [1, 1]] });
    const arg = (addPathSplineTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toEqual({ code: 'SRC', chain_anchor: 'brow', points: [[0, 0], [1, 1]] });
    expect(arg).not.toHaveProperty('kind');
  });

  it('rejects an unknown kind with an actionable error', async () => {
    await expect(addPathSegmentTool({ kind: 'nope' as PathSegmentKind })).rejects.toThrow(/Unknown add_path_segment kind: nope/);
  });

  it('does not cross-call other handlers', async () => {
    await addPathSegmentTool({ kind: 'nurbs', code: 'SRC', chain_anchor: 'brow' });
    expect(addPathNurbsSegmentTool).toHaveBeenCalledTimes(1);
    expect(addPathSplineTool).not.toHaveBeenCalled();
    expect(addPathHermiteG2Tool).not.toHaveBeenCalled();
  });
});
