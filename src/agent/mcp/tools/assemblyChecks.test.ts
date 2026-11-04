// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./validateAssembly', () => ({ validateAssemblyTool: vi.fn() }));
vi.mock('./checkAssemblyPath', () => ({ checkAssemblyPathTool: vi.fn() }));

import { assemblyChecksTool, partitionAssemblyFindings } from './assemblyChecks';
import { checkAssemblyPathTool } from './checkAssemblyPath';
import { validateAssemblyTool } from './validateAssembly';

const validate = vi.mocked(validateAssemblyTool);
const pathCheck = vi.mocked(checkAssemblyPathTool);

function cleanReview(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 'solved',
    diagnostics: [],
    blocking: [],
    repairMode: 'none',
    partCount: 2,
    jointCount: 1,
    scope: 'static',
    ...overrides,
  };
}

describe('partitionAssemblyFindings', () => {
  it('buckets interference, floating, joint, and stability codes', () => {
    const buckets = partitionAssemblyFindings([
      { code: 'assembly.interference.overlap', message: "Part 'lid' overlaps 'base'", hint: 'separate them', severity: 'error' },
      { code: 'mechanism.interpenetration', message: 'bodies occupy the same volume', severity: 'error' },
      { code: 'assembly.contact.tolerance-exceeded', message: 'contact budget exceeded', severity: 'warn' },
      { code: 'assembly.part.floating', message: "disconnected body 'bolt'", severity: 'error' },
      { code: 'mechanism.orphan-part', message: "Part 'washer' has no mate", severity: 'error' },
      { code: 'assembly.mechanical.part-disconnected', message: "Part 'arm' contains 2 disconnected solids", severity: 'error' },
      { code: 'assembly.structure.unstructured-bodies', message: 'loose bodies', severity: 'info' },
      { code: 'mechanism.disconnect', message: 'kinematic disconnect', severity: 'error' },
      { code: 'assembly.joint-topology.missing-limit', message: 'hinge has no limit', severity: 'error' },
      { code: 'assembly.pose.out-of-limits', message: 'past the declared limit', severity: 'warn' },
      { code: 'assembly.transmission.path-disconnected', message: 'drive path has a gap', severity: 'error' },
      { code: 'assembly.mechanical.intent.shaft-not-on-axis', message: 'shaft is off axis', severity: 'error' },
      { code: 'assembly.joint.static-hold.exceeded', message: 'shoulder cannot hold', severity: 'error' },
      { code: 'assembly.joint.static-hold.margin-low', message: 'margin is thin', severity: 'warn' },
      { code: 'mechanism.unstable-under-gravity', message: 'required torque is not finite', severity: 'error' },
      { code: 'mechanism.drops-on-release', message: 'the arm drops', severity: 'error' },
      { code: 'assembly.clearance.violated', message: 'air gap is short', severity: 'error' },
    ]);

    expect(buckets.interference.map((finding) => finding.code)).toEqual([
      'assembly.interference.overlap',
      'mechanism.interpenetration',
      'assembly.contact.tolerance-exceeded',
    ]);
    expect(buckets.interference[0]).toMatchObject({
      hint: 'separate them',
      severity: 'error',
      parts: ['lid', 'base'],
    });
    expect(buckets.floating.map((finding) => finding.code)).toEqual([
      'assembly.part.floating',
      'mechanism.orphan-part',
      'assembly.mechanical.part-disconnected',
      'assembly.structure.unstructured-bodies',
      'mechanism.disconnect',
    ]);
    expect(buckets.joints.map((finding) => finding.code)).toEqual([
      'assembly.joint-topology.missing-limit',
      'assembly.pose.out-of-limits',
      'assembly.transmission.path-disconnected',
      'assembly.mechanical.intent.shaft-not-on-axis',
    ]);
    expect(buckets.stability.map((finding) => finding.code)).toEqual([
      'assembly.joint.static-hold.exceeded',
      'assembly.joint.static-hold.margin-low',
      'mechanism.unstable-under-gravity',
      'mechanism.drops-on-release',
    ]);
    expect(buckets.interference.some((finding) => finding.code === 'assembly.clearance.violated')).toBe(false);
    expect(buckets.joints.some((finding) => finding.code === 'assembly.clearance.violated')).toBe(false);
  });
});

describe('assemblyChecksTool', () => {
  beforeEach(() => {
    validate.mockReset();
    pathCheck.mockReset();
  });

  it('runs all four checks by default and fails only on error-severity findings', async () => {
    validate.mockResolvedValue(cleanReview({
      ok: false,
      diagnostics: [
        { code: 'assembly.interference.overlap', message: 'overlap', hint: 'move', severity: 'error' },
        { code: 'assembly.part.floating', message: "body 'a'", hint: 'mate it', severity: 'warn' },
      ],
    }) as never);
    pathCheck.mockResolvedValue({
      ok: false,
      source: 'local',
      sequence: {
        steps: [],
        unknown: [],
        needsHold: [{ part: 'lid', status: 'needs-hold', reason: 'no-contact', supports: ['base'], centerOfMass: [0, 0, 0] }],
      },
    } as never);

    const result = await assemblyChecksTool({ code: 'return 1;' });

    expect(validate).toHaveBeenCalledWith({ file: undefined, code: 'return 1;', assembly: undefined });
    expect(pathCheck).toHaveBeenCalledWith({
      file: undefined,
      code: 'return 1;',
      assembly: undefined,
      sequence: true,
      stability: true,
    });
    expect(result.ok).toBe(false);
    expect(result.checks.interference).toMatchObject({ ok: false, findings: [{ code: 'assembly.interference.overlap', severity: 'error' }] });
    expect(result.checks.floating?.ok).toBe(true);
    expect(result.checks.joints?.ok).toBe(true);
    expect(result.checks.stability?.ok).toBe(false);
    expect(result.checks.stability?.findings[0]).toMatchObject({
      code: 'assembly.stability.needs-hold',
      severity: 'error',
      parts: ['lid', 'base'],
    });
    expect(result.summary).toContain('interference: failed');
    expect(result.summary).toContain('stability: failed');
  });

  it('fails a check when the static review blocks on a non-error finding', async () => {
    validate.mockResolvedValue(cleanReview({
      ok: false,
      diagnostics: [
        { code: 'assembly.mechanical.intent.shaft-not-on-axis', message: 'shaft is off axis', hint: 'align', severity: 'warn' },
      ],
      blocking: [{ code: 'assembly.mechanical.intent.shaft-not-on-axis', message: 'shaft is off axis', hint: 'align' }],
    }) as never);

    const result = await assemblyChecksTool({ checks: ['joints'] });

    expect(pathCheck).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.checks.joints).toMatchObject({
      ok: false,
      findings: [{ code: 'assembly.mechanical.intent.shaft-not-on-axis', severity: 'warn' }],
    });
    expect(result.checks.joints?.summary).toMatch(/1 blocking/);
  });

  it('runs only the requested checks and skips the path gate otherwise', async () => {
    validate.mockResolvedValue(cleanReview() as never);

    const result = await assemblyChecksTool({ file: 'model.kcad.ts', checks: ['joints'] });

    expect(pathCheck).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      checks: { joints: { ok: true, findings: [] } },
    });
    expect(result.checks.interference).toBeUndefined();
    expect(validate).toHaveBeenCalledWith({ file: 'model.kcad.ts', code: undefined, assembly: undefined });
  });

  it('keeps stability ok and records a scope note when the path gate cannot run', async () => {
    validate.mockResolvedValue(cleanReview({ jointCount: 0 }) as never);
    pathCheck.mockResolvedValue({
      ok: false,
      source: 'local',
      error: 'assembly-path requires exactly one assembly, or an explicit assembly name.',
      errorCode: 'feature.invalid-args',
    });

    const result = await assemblyChecksTool({ checks: ['stability'], assembly: 'arm' });

    expect(result.ok).toBe(true);
    expect(result.checks.stability?.ok).toBe(true);
    expect(result.checks.stability?.findings).toEqual([]);
    expect(result.checks.stability?.summary).toMatch(/Support check skipped/);
    expect(result.checks.stability?.summary).toMatch(/no joints/);
    expect(result.checks.stability?.summary).toMatch(/Not a physics simulation/);
  });

  it('rejects an unknown check without calling the review gates', async () => {
    const result = await assemblyChecksTool({ checks: ['physics'] });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('feature.invalid-args');
    expect(result.summary).toMatch(/Unknown assembly checks: physics/);
    expect(validate).not.toHaveBeenCalled();
    expect(pathCheck).not.toHaveBeenCalled();
  });

  it('reports a review failure on every selected check', async () => {
    validate.mockResolvedValue({
      ok: false,
      error: 'No assembly captured by the script.',
      errorCode: 'feature.invalid-args',
      errorHint: 'evaluate a script that calls assembly(...)',
    });

    const result = await assemblyChecksTool({ checks: ['interference', 'floating'] });

    expect(pathCheck).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.checks.interference?.summary).toMatch(/Not run/);
    expect(result.checks.floating?.ok).toBe(false);
    expect(result.errorHint).toMatch(/assembly/);
  });
});
