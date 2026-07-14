// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { evaluateAndBuildScript } from '../../agent/cli/commands/evaluate';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import {
  buildPoseEnvelopeSamples,
  classifySampleStrategy,
  reviewPoseEnvelope,
  validateMatePoseLimits,
} from './poseEnvelope';

const clearanceKernel = vi.hoisted(() => ({ failDistance: false }));
vi.mock('../runtime/brepDistance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../runtime/brepDistance')>();
  return {
    ...actual,
    brepExtremaDistance: (...args: Parameters<typeof actual.brepExtremaDistance>) => {
      if (clearanceKernel.failDistance) throw new Error('injected BRepExtrema failure');
      return actual.brepExtremaDistance(...args);
    },
  };
});

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('rig'), kcad };
}

describe('pose-envelope review helpers', () => {
  it('samples declared scalar mate limits at min and max', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });

    expect(buildPoseEnvelopeSamples(arm)).toEqual([
      { name: 'current', poses: {}, reason: 'capture-time/default mate poses' },
      { name: 'yaw:min', poses: { yaw: -90 }, reason: 'yaw lower limit' },
      { name: 'yaw:max', poses: { yaw: 90 }, reason: 'yaw upper limit' },
    ]);
  });

  it('samples interior points within mate limits when samplesPerMate > 1', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });

    const samples = buildPoseEnvelopeSamples(arm, { samplesPerMate: 4 });
    const hingeSamples = samples.filter((s) => s.name !== 'current');
    const hingeValues = hingeSamples.map((s) => s.poses.hinge as number).sort((a, b) => a - b);

    expect(hingeValues).toHaveLength(4);
    expect(hingeValues[0]).toBe(-90);
    expect(hingeValues[1]).toBeCloseTo(-30, 0);
    expect(hingeValues[2]).toBeCloseTo(30, 0);
    expect(hingeValues[3]).toBe(90);
  });

  it('preserves corner-only sampling when samplesPerMate is 1 or unset', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });

    const defaultNames = buildPoseEnvelopeSamples(arm).map((s) => s.name);
    const oneNames = buildPoseEnvelopeSamples(arm, { samplesPerMate: 1 }).map((s) => s.name);
    expect(defaultNames).toEqual(['current', 'hinge:min', 'hinge:max']);
    expect(oneNames).toEqual(['current', 'hinge:min', 'hinge:max']);
  });

  it('emits only min and max when samplesPerMate is 2 (no interior points)', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });

    const names = buildPoseEnvelopeSamples(arm, { samplesPerMate: 2 }).map((s) => s.name);
    expect(names).toEqual(['current', 'hinge:min', 'hinge:max']);
  });

  it('reports capture-time pose values outside declared limits', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
      pose: 120,
      limitsDeg: [-90, 90],
    });

    const diagnostics = validateMatePoseLimits(arm);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'assembly.pose.out-of-limits',
      severity: 'error',
      mateName: 'yaw',
      pose: 120,
      limits: [-90, 90],
    });
  });

  it('allows solvedModel pose overrides for mate names', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });

    const scene = await arm.solvedModel({ yaw: 45 }, { validate: 'off' });
    const link = scene.part('link');
    const { rotateDeg } = link.worldTransform.decomposeToTranslateAndRotate();
    expect(Math.abs(rotateDeg)).toBeCloseTo(45);
  });

  it('reports connector workspace across sampled mate limits', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(20, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
      .connector('tool', { type: 'frame', origin: { kind: 'vec3', value: [20, 0, 0] } });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [0, 90] });

    const result = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      trackConnectors: ['link.tool'],
    });
    expect(result.connectorWorkspace).toHaveLength(1);
    expect(result.connectorWorkspace[0].ref).toBe('link.tool');
    expect(result.connectorWorkspace[0].travelMm).toBeGreaterThan(20);
    expect(result.connectorPoses.map((p) => p.sampleName)).toEqual(['current', 'yaw:min', 'yaw:max']);
  });

  it('measures articulated mate pairs only when clearance policy enables them', async () => {
    const built = await evaluateAndBuildScript({
      code: `
        const rig = assembly('articulated-clearance');
        rig
          .part('base', box(10, 10, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [5, 0, 0] }, axis: [0, 0, 1] });
        rig
          .part('link', box(10, 10, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [-5.4, 0, 0] }, axis: [0, 0, 1] });
        rig.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });
        return rig.model();
      `,
    });
    const arm = built.model?.session.assemblies.get('articulated-clearance');
    const scene = built.model?.rootShape ?? built.model?.tailShape;
    if (arm === undefined || !isSceneBackend(scene)) throw new Error('expected articulated clearance scene');

    const exempt = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      minClearanceMm: 1,
      loweredScene: scene,
    });
    expect(exempt.clearancePairs).toHaveLength(3);
    expect(exempt.clearancePairs.every((pair) => pair.status === 'mated')).toBe(true);

    const measured = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      minClearanceMm: 1,
      includeArticulatedMateClearance: true,
      loweredScene: scene,
    });
    expect(measured.clearancePairs).toContainEqual(expect.objectContaining({
      sampleName: 'current', a: 'base', b: 'link', status: 'violated', exact: true,
    }));
    expect(measured.diagnostics).toContainEqual(expect.objectContaining({
      code: 'assembly.pose-envelope.clearance-violated', sampleName: 'current', partA: 'base', partB: 'link',
    }));
  });

  it('keeps fastened mate pairs exempt from pose-envelope clearance', async () => {
    const built = await evaluateAndBuildScript({
      code: `
        const rig = assembly('fastened-clearance');
        rig
          .part('base', box(10, 10, 10, true))
          .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        rig
          .part('link', box(10, 10, 10, true))
          .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [-5.4, 0, 0] } });
        rig.mate('fix', 'base.mount', 'link.mount', 'fastened');
        return rig.model();
      `,
    });
    const arm = built.model?.session.assemblies.get('fastened-clearance');
    const scene = built.model?.rootShape ?? built.model?.tailShape;
    if (arm === undefined || !isSceneBackend(scene)) throw new Error('expected fastened clearance scene');

    const result = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      minClearanceMm: 1,
      includeArticulatedMateClearance: true,
      loweredScene: scene,
    });

    expect(result.clearancePairs).toEqual([
      expect.objectContaining({ sampleName: 'current', a: 'base', b: 'link', status: 'mated', exact: false }),
    ]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      'assembly.pose-envelope.clearance-violated',
    );
  });

  it('reports kernel distance failures as unresolved clearance warnings', async () => {
    const built = await evaluateAndBuildScript({
      code: `
        const rig = assembly('unresolved-clearance');
        rig.part('left', box(10, 10, 10, true), { at: [0, 0, 0] });
        rig.part('right', box(10, 10, 10, true), { at: [10.4, 0, 0] });
        return rig.model();
      `,
    });
    const arm = built.model?.session.assemblies.get('unresolved-clearance');
    const scene = built.model?.rootShape ?? built.model?.tailShape;
    if (arm === undefined || !isSceneBackend(scene)) throw new Error('expected unresolved clearance scene');

    clearanceKernel.failDistance = true;
    try {
      const result = await reviewPoseEnvelope(arm, {
        includeInterference: false,
        minClearanceMm: 1,
        loweredScene: scene,
      });
      expect(result.clearancePairs).toEqual([
        expect.objectContaining({ sampleName: 'current', a: 'left', b: 'right', status: 'unknown', exact: false }),
      ]);
      expect(result.diagnostics).toContainEqual(expect.objectContaining({
        code: 'assembly.pose-envelope.clearance-unresolved', severity: 'warning', sampleName: 'current',
      }));
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
        'assembly.pose-envelope.clearance-violated',
      );
    } finally {
      clearanceKernel.failDistance = false;
    }
  });

  it('measures non-exempt clearance pairs exactly at every sampled pose', async () => {
    const built = await evaluateAndBuildScript({
      code: `
        const rig = assembly('exact-clearance-sweep');
        rig
          .part('base', box(10, 10, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        rig
          .part('link', box(10, 10, 10, true).translate(30, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        rig.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });
        return rig.model();
      `,
    });
    const arm = built.model?.session.assemblies.get('exact-clearance-sweep');
    const scene = built.model?.rootShape ?? built.model?.tailShape;
    if (arm === undefined || !isSceneBackend(scene)) throw new Error('expected exact clearance scene');

    const result = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      minClearanceMm: 1,
      includeArticulatedMateClearance: true,
      loweredScene: scene,
    });

    expect(result.clearancePairs.map((pair) => pair.sampleName)).toEqual(['current', 'yaw:min', 'yaw:max']);
    expect(result.clearancePairs.every((pair) => pair.status === 'ok' && pair.exact)).toBe(true);
  });

  it('emits one interference diagnostic for clearance-detected overlap when interference is disabled', async () => {
    const built = await evaluateAndBuildScript({
      code: `
        const rig = assembly('clearance-overlap');
        rig.part('left', box(10, 10, 10, true), { at: [0, 0, 0] });
        rig.part('right', box(10, 10, 10, true), { at: [9, 0, 0] });
        return rig.model();
      `,
    });
    const arm = built.model?.session.assemblies.get('clearance-overlap');
    const scene = built.model?.rootShape ?? built.model?.tailShape;
    if (arm === undefined || !isSceneBackend(scene)) throw new Error('expected clearance overlap scene');

    const clearanceOnly = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      minClearanceMm: 1,
      loweredScene: scene,
    });
    expect(clearanceOnly.clearancePairs).toContainEqual(expect.objectContaining({
      a: 'left', b: 'right', status: 'interfering',
    }));
    expect(clearanceOnly.diagnostics.filter((diagnostic) =>
      diagnostic.code === 'assembly.pose-envelope.interference',
    )).toHaveLength(1);
    expect(clearanceOnly.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      'assembly.pose-envelope.clearance-violated',
    );

    const withInterference = await reviewPoseEnvelope(arm, {
      includeInterference: true,
      minClearanceMm: 1,
      loweredScene: scene,
    });
    expect(withInterference.interferencePairs).toHaveLength(1);
    expect(withInterference.diagnostics.filter((diagnostic) =>
      diagnostic.code === 'assembly.pose-envelope.interference',
    )).toHaveLength(1);
  });

  it('does not silently pass requested clearance without a cached lowered scene', async () => {
    const { arm, kcad } = makeArm();
    arm.part('left', kcad.box(10, 10, 10), { at: [0, 0, 0] });
    arm.part('right', kcad.box(10, 10, 10), { at: [30, 0, 0] });

    const result = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      minClearanceMm: 1,
    });

    expect(result.clearancePairs).toHaveLength(1);
    const [pair] = result.clearancePairs;
    expect(pair.exact || pair.status === 'unknown').toBe(true);
    if (pair.status === 'unknown') {
      expect(result.diagnostics).toContainEqual(expect.objectContaining({
        code: 'assembly.pose-envelope.clearance-unresolved', sampleName: 'current',
      }));
    }
  });

  it('reviewPoseEnvelope honors samplesPerMate and produces interior pose samples', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });

    const defaultResult = await reviewPoseEnvelope(arm, { includeInterference: false });
    expect(defaultResult.samples.map((s) => s.name)).toEqual(['current', 'yaw:min', 'yaw:max']);

    const result = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      samplesPerMate: 4,
    });
    const names = result.samples.map((s) => s.name);
    expect(names).toHaveLength(5);
    expect(names).toContain('yaw:interior-1');
    expect(names).toContain('yaw:interior-2');
    expect(names).toEqual(['current', 'yaw:min', 'yaw:interior-1', 'yaw:interior-2', 'yaw:max']);
  });

  it('produces 2^N combinatorial corner samples when combinatorial=true', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
      .connector('pitch', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
    arm
      .part('link1', kcad.box(5, 5, 5))
      .connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link2', kcad.box(5, 5, 5))
      .connector('pitch', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
    arm.mate('yaw', 'base.yaw', 'link1.yaw', 'revolute', { limitsDeg: [-90, 90] });
    arm.mate('pitch', 'base.pitch', 'link2.pitch', 'revolute', { limitsDeg: [-45, 45] });

    const samples = buildPoseEnvelopeSamples(arm, { combinatorial: true });
    const cornerSamples = samples.filter((s) => s.name.startsWith('corner:'));
    expect(cornerSamples).toHaveLength(4);
    const cornerNames = cornerSamples.map((s) => s.name).sort();
    expect(cornerNames).toEqual(['corner:00', 'corner:01', 'corner:10', 'corner:11']);
    const yawValues = new Set(cornerSamples.map((s) => s.poses.yaw as number));
    const pitchValues = new Set(cornerSamples.map((s) => s.poses.pitch as number));
    expect(yawValues).toEqual(new Set([-90, 90]));
    expect(pitchValues).toEqual(new Set([-45, 45]));
  });

  it('refuses combinatorial sampling above 8 mates with declared limits', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('seg0', kcad.box(5, 5, 5))
      .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    for (let i = 1; i <= 9; i++) {
      arm
        .part(`seg${i}`, kcad.box(5, 5, 5))
        .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
        .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate(`j${i}`, `seg${i - 1}.out`, `seg${i}.in`, 'revolute', { limitsDeg: [-30, 30] });
    }

    expect(() => buildPoseEnvelopeSamples(arm, { combinatorial: true })).toThrowError(
      /combinatorial sampling capped at 8/,
    );
  });

  it('combinatorial sampling coexists with samplesPerMate interior points', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });

    const samples = buildPoseEnvelopeSamples(arm, { samplesPerMate: 4, combinatorial: true });
    const names = samples.map((s) => s.name);
    expect(names).toContain('hinge:interior-1');
    expect(names).toContain('hinge:interior-2');
    expect(names).toContain('corner:0');
    expect(names).toContain('corner:1');
    expect(samples).toHaveLength(7);
  });

  it('diagnoses tracked topology connector origins that cannot be sampled in capture-time workspace review', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('link', kcad.box(20, 5, 5))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('top-center', {
        type: 'frame',
        origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
      });
    arm.mate('fix', 'base.mount', 'link.mount', 'fastened');

    const result = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      trackConnectors: ['link.top-center'],
    });
    expect(result.connectorWorkspace).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'assembly.pose-envelope.connector-unresolved',
      severity: 'warning',
      connectorRef: 'link.top-center',
    }));
  });

  it('classifySampleStrategy returns correct strategy for each sample name pattern', () => {
    expect(classifySampleStrategy('current')).toBe('corner');
    expect(classifySampleStrategy('hinge:min')).toBe('corner');
    expect(classifySampleStrategy('hinge:max')).toBe('corner');
    expect(classifySampleStrategy('yaw:interior-1')).toBe('interior');
    expect(classifySampleStrategy('yaw:interior-42')).toBe('interior');
    expect(classifySampleStrategy('corner:00')).toBe('combinatorial');
    expect(classifySampleStrategy('corner:1101')).toBe('combinatorial');
    expect(classifySampleStrategy(undefined)).toBeUndefined();
    expect(classifySampleStrategy('something-weird')).toBeUndefined();
  });

  it('tags pose-envelope diagnostics with sampleStrategy based on sample name', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
      pose: 120,
      limitsDeg: [-90, 90],
    });

    const result = await reviewPoseEnvelope(arm, { includeInterference: false });
    const outOfLimits = result.diagnostics.filter(
      (d) => d.code === 'assembly.pose.out-of-limits',
    );
    expect(outOfLimits.length).toBeGreaterThan(0);
    for (const diag of outOfLimits) {
      expect(diag.sampleStrategy).toBe('corner');
    }

    // validateMatePoseLimits standalone path also carries sampleStrategy.
    const standalone = validateMatePoseLimits(arm);
    expect(standalone).toHaveLength(1);
    expect(standalone[0].sampleStrategy).toBe('corner');
  });
});
