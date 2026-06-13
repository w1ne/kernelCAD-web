// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock both authoring tools — this is a routing layer, so we test that `kind`
// selects the right handler and forwards the remaining params, not the tools'
// own (unchanged) behavior.
vi.mock('./addNurbsCurve', () => ({ addNurbsCurveTool: vi.fn(async () => 'nurbs') }));
vi.mock('./addHermiteG2', () => ({ addHermiteG2Tool: vi.fn(async () => 'hermite') }));

import { addCurveTool, type CurveKind } from './addCurve';
import { addNurbsCurveTool } from './addNurbsCurve';
import { addHermiteG2Tool } from './addHermiteG2';

const ROUTES: Array<[CurveKind, ReturnType<typeof vi.fn>, string]> = [
  ['nurbs', addNurbsCurveTool as never, 'nurbs'],
  ['hermite', addHermiteG2Tool as never, 'hermite'],
];

describe('add_curve dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(ROUTES)('routes kind:%s to its handler and returns its result', async (kind, handler, expected) => {
    const out = await addCurveTool({ kind, code: 'SRC', extra: 7 });
    expect(out).toBe(expected);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('forwards kind-specific params but strips `kind` itself', async () => {
    await addCurveTool({ kind: 'nurbs', code: 'SRC', controlPoints: [[0, 0, 0], [1, 1, 1]] });
    const arg = (addNurbsCurveTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toEqual({ code: 'SRC', controlPoints: [[0, 0, 0], [1, 1, 1]] });
    expect(arg).not.toHaveProperty('kind');
  });

  it('rejects an unknown kind with an actionable error', async () => {
    await expect(addCurveTool({ kind: 'nope' as CurveKind })).rejects.toThrow(/Unknown add_curve kind: nope/);
  });

  it('does not cross-call the other handler', async () => {
    await addCurveTool({ kind: 'hermite', code: 'SRC' });
    expect(addHermiteG2Tool).toHaveBeenCalledTimes(1);
    expect(addNurbsCurveTool).not.toHaveBeenCalled();
  });
});
