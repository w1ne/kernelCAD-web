import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all sixteen readers — this is a routing layer.
vi.mock('./inspectAssembly', () => ({ inspectAssemblyTool: vi.fn(async () => 'assembly') }));
vi.mock('./inspectRobot', () => ({ inspectRobotTool: vi.fn(async () => 'robot') }));
vi.mock('./inspectStep', () => ({ inspectStepTool: vi.fn(async () => 'step') }));
vi.mock('./getShapeInfo', () => ({ getShapeInfoTool: vi.fn(async () => 'shape') }));
vi.mock('./listFeatures', () => ({ listFeaturesTool: vi.fn(async () => 'features') }));
vi.mock('./listAssemblies', () => ({ listAssembliesTool: vi.fn(async () => 'assemblies') }));
vi.mock('./listTopology', () => ({ listTopologyTool: vi.fn(async () => 'topology') }));
vi.mock('./listEdges', () => ({ listEdgesTool: vi.fn(async () => 'edges') }));
vi.mock('./getEdgesOf', () => ({ getEdgesOfTool: vi.fn(async () => 'face-edges') }));
vi.mock('./listFaces', () => ({ listFacesTool: vi.fn(async () => 'faces') }));
vi.mock('./listFaceLabels', () => ({ listFaceLabelsTool: vi.fn(async () => 'face-labels') }));
vi.mock('./listMates', () => ({ listMatesTool: vi.fn(async () => 'mates') }));
vi.mock('./constraints', () => ({ listConstraintsTool: vi.fn(async () => 'constraints') }));
vi.mock('./listPartStats', () => ({ listPartStatsTool: vi.fn(async () => 'part-stats') }));
vi.mock('./getBendTable', () => ({ getBendTableTool: vi.fn(async () => 'bend-table') }));
vi.mock('./paramsList', () => ({ paramsListTool: vi.fn(async () => 'params') }));
vi.mock('./listPartCategories', () => ({ listPartCategoriesTool: vi.fn(async () => 'part-categories') }));
vi.mock('./listPartFamilies', () => ({ listPartFamiliesTool: vi.fn(async () => 'part-families') }));

import { inspectTool, type InspectOf } from './inspect';
import { inspectAssemblyTool } from './inspectAssembly';
import { listFacesTool } from './listFaces';
import { getEdgesOfTool } from './getEdgesOf';

// of → expected sentinel returned by the mocked reader
const SUBJECTS: InspectOf[] = [
  'assembly', 'robot', 'step', 'shape', 'features', 'assemblies', 'topology',
  'edges', 'face-edges', 'faces', 'face-labels', 'mates', 'constraints',
  'part-stats', 'bend-table', 'params', 'part-categories', 'part-families',
];

describe('inspect dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(SUBJECTS)("routes of:'%s' to its reader and returns its result", async (of) => {
    const out = await inspectTool({ of, code: 'SRC' });
    expect(out).toBe(of); // each mock returns its subject name
  });

  it('forwards subject-specific params but strips `of`', async () => {
    await inspectTool({ of: 'face-edges', code: 'SRC', face_name: 'top' });
    const arg = (getEdgesOfTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toEqual({ code: 'SRC', face_name: 'top' });
    expect(arg).not.toHaveProperty('of');
  });

  it('does not cross-call other readers', async () => {
    await inspectTool({ of: 'faces', code: 'SRC' });
    expect(listFacesTool).toHaveBeenCalledTimes(1);
    expect(inspectAssemblyTool).not.toHaveBeenCalled();
  });

  it('rejects an unknown subject with an actionable error', async () => {
    await expect(inspectTool({ of: 'nope' as InspectOf })).rejects.toThrow(/Unknown inspect subject: nope/);
  });
});
