import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../capture/captureSession';
import { createApi } from '../../modules/api';
import { buildPoseEnvelopeSamples, reviewPoseEnvelope, validateMatePoseLimits } from './poseEnvelope';

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
});
