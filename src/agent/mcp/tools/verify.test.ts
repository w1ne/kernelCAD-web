// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all eight verifiers — this is a routing layer, so we test that `check`
// selects the right handler and forwards the remaining params, not the
// verifiers' own (unchanged) behavior.
vi.mock('./checkAssemblyPath', () => ({ checkAssemblyPathTool: vi.fn(async () => 'assembly-path') }));
vi.mock('./validateAssembly', () => ({ validateAssemblyTool: vi.fn(async () => 'assembly') }));
vi.mock('./validateUrdf', () => ({ validateUrdfTool: vi.fn(async () => 'urdf') }));
vi.mock('./dfmCheck', () => ({ dfmCheckTool: vi.fn(async () => 'dfm') }));
vi.mock('./checkSweptCollision', () => ({ checkSweptCollisionTool: vi.fn(async () => 'swept') }));
vi.mock('./checkReachable', () => ({ checkReachableTool: vi.fn(async () => 'reachable') }));
vi.mock('./checkMountingHoleConsistency', () => ({ checkMountingHoleConsistencyTool: vi.fn(async () => 'mounting') }));
vi.mock('./checkLoadCapacity', () => ({ checkLoadCapacityTool: vi.fn(async () => 'load') }));
vi.mock('./checkStaticHold', () => ({ checkStaticHoldTool: vi.fn(async () => 'static-hold') }));
vi.mock('./checkFastenerInstallation', () => ({ checkFastenerInstallationTool: vi.fn(async () => 'fastener-installation') }));
vi.mock('./checkEdgeRadius', () => ({ checkEdgeRadiusTool: vi.fn(async () => 'edge-radius') }));
vi.mock('./checkBodyLikeness', () => ({ checkBodyLikenessTool: vi.fn(async () => 'body-likeness') }));
vi.mock('./checkGeometryQuality', () => ({ checkGeometryQualityTool: vi.fn(async () => 'geometry-quality') }));

import { checkAssemblyPathTool } from './checkAssemblyPath';
import { verifyTool, type VerifyCheck } from './verify';
import { validateAssemblyTool } from './validateAssembly';
import { validateUrdfTool } from './validateUrdf';
import { dfmCheckTool } from './dfmCheck';
import { checkSweptCollisionTool } from './checkSweptCollision';
import { checkReachableTool } from './checkReachable';
import { checkMountingHoleConsistencyTool } from './checkMountingHoleConsistency';
import { checkLoadCapacityTool } from './checkLoadCapacity';
import { checkStaticHoldTool } from './checkStaticHold';
import { checkEdgeRadiusTool } from './checkEdgeRadius';
import { checkBodyLikenessTool } from './checkBodyLikeness';
import { checkFastenerInstallationTool } from './checkFastenerInstallation';
import { checkGeometryQualityTool } from './checkGeometryQuality';

const ROUTES: Array<[VerifyCheck, ReturnType<typeof vi.fn>, string]> = [
  ['assembly-path', checkAssemblyPathTool as never, 'assembly-path'],
  ['assembly', validateAssemblyTool as never, 'assembly'],
  ['urdf', validateUrdfTool as never, 'urdf'],
  ['dfm', dfmCheckTool as never, 'dfm'],
  ['swept-collision', checkSweptCollisionTool as never, 'swept'],
  ['reachable', checkReachableTool as never, 'reachable'],
  ['mounting-holes', checkMountingHoleConsistencyTool as never, 'mounting'],
  ['load-capacity', checkLoadCapacityTool as never, 'load'],
  ['static-hold', checkStaticHoldTool as never, 'static-hold'],
  ['fastener-installation', checkFastenerInstallationTool as never, 'fastener-installation'],
  ['edge-radius', checkEdgeRadiusTool as never, 'edge-radius'],
  ['body-likeness', checkBodyLikenessTool as never, 'body-likeness'],
  ['geometry-quality', checkGeometryQualityTool as never, 'geometry-quality'],
];

describe('verify dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(ROUTES)('routes check:%s to its verifier and returns its result', async (check, handler, expected) => {
    const out = await verifyTool({ check, code: 'SRC', extra: 7 });
    expect(out).toBe(expected);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('forwards check-specific params but strips `check` itself', async () => {
    await verifyTool({ check: 'reachable', code: 'SRC', tip_link: 'hand', extra: 7 });
    const arg = (checkReachableTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toEqual({ code: 'SRC', tip_link: 'hand', extra: 7 });
    expect(arg).not.toHaveProperty('check');
  });

  it('forwards explicit fastener stations and tolerances unchanged', async () => {
    const params = { code: 'SRC', fasteners: [{ part: 'screw', against: ['plate'], engagementPart: 'nut', minEngagementMm: 2, maxProtrusionMm: 1 }], toleranceMm: .02, angleToleranceDeg: .5 };
    await verifyTool({ check: 'fastener-installation', ...params });
    expect(checkFastenerInstallationTool).toHaveBeenCalledWith(params);
  });

  it('forwards body thresholds and asserted symmetry plane unchanged', async () => {
    const params = { file: 'part.kcad.ts', feature_id: 'body', tiny_face_relative: 0.001, asserted_plane: { origin: [0,0,0], normal: [1,0,0] } };
    await verifyTool({ check: 'geometry-quality', ...params });
    expect(checkGeometryQualityTool).toHaveBeenCalledWith(params);
    expect(checkFastenerInstallationTool).not.toHaveBeenCalled();
  });

  it('rejects supplier-specific checks while retaining generic DFM', async () => {
    await expect(verifyTool({ check: 'dfm-preflight' as VerifyCheck })).rejects.toThrow(/Unknown verify check/);
    await expect(verifyTool({ check: 'dfm', code: 'SRC' })).resolves.toBe('dfm');
  });

  it('throws an actionable error on an unknown check', async () => {
    await expect(verifyTool({ check: 'nope' as VerifyCheck })).rejects.toThrow(/Unknown verify check: nope/);
  });

  it('does not cross-call other verifiers', async () => {
    await verifyTool({ check: 'dfm', code: 'SRC' });
    expect(dfmCheckTool).toHaveBeenCalledTimes(1);
    expect(validateAssemblyTool).not.toHaveBeenCalled();
    expect(checkLoadCapacityTool).not.toHaveBeenCalled();
  });
});
