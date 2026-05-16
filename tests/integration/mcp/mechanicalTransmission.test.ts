import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';
import type { Assembly } from '../../../src/capture/assembly';
import { reviewMechanicalTransmission } from '../../../src/lib/mates/mechanicalTransmission';
import { inspectAssemblyTool } from '../../../src/mcp/tools/inspectAssembly';
import { reviewCadTool } from '../../../src/mcp/tools/reviewCad';

const COUPLED_GRIPPER_WITHOUT_TRANSMISSION = `
  const arm = assembly('coupled gripper');
  arm.part('palm',
    box(18, 52, 12, true)
      .union(box(8, 8, 8, true).translate(0, 22, 0))
      .union(box(8, 8, 8, true).translate(0, -22, 0))
      .union(box(12, 10, 8, true).translate(-16, 0, 0))
  )
    .connector('servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [-28, 0, 0] } })
    .connector('grip-axis', { type: 'axis', origin: { kind: 'vec3', value: [-16, 0, 0] }, axis: [0, 0, 1] })
    .connector('left-hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 22, 0] }, axis: [0, 0, 1] })
    .connector('right-hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, -22, 0] }, axis: [0, 0, 1] });
  arm.part('servo', box(18, 14, 12, true).translate(-28, 0, 0))
    .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [-28, 0, 0] } });
  arm.part('driver', box(8, 8, 6, true).translate(-16, 0, 0))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [-16, 0, 0] }, axis: [0, 0, 1] });
  arm.part('left-finger', box(34, 6, 6, true).translate(17, 0, 0))
    .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
    .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [34, 0, 0] } });
  arm.part('right-finger', box(34, 6, 6, true).translate(17, 0, 0))
    .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
    .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [34, 0, 0] } });
  arm.mate('servo-fix', 'palm.servo-mount', 'servo.mount', 'fastened');
  arm.mate('grip', 'palm.grip-axis', 'driver.axis', 'revolute', { limitsDeg: [0, 30] });
  arm.mate('left-curl', 'palm.left-hinge', 'left-finger.hinge', 'revolute');
  arm.mate('right-curl', 'palm.right-hinge', 'right-finger.hinge', 'revolute');
  arm.coupleMates('left-curl', { source: 'grip', ratio: -1 });
  arm.coupleMates('right-curl', { source: 'grip', ratio: 1 });
  return arm.model();
`;

describe('mechanical transmission review', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('blocks coupled mates with no declared physical transmission path', async () => {
    const result = await reviewCadTool({
      code: COUPLED_GRIPPER_WITHOUT_TRANSMISSION,
      includePoseEnvelope: false,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.transmission.missing-for-coupled-mate',
        drivenMate: 'left-curl',
      }),
      expect.objectContaining({
        code: 'assembly.transmission.missing-for-coupled-mate',
        drivenMate: 'right-curl',
      }),
    ]));
    if (!result.ok) {
      expect(result.fitness?.blockingReasons).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'assembly.transmission.missing-for-coupled-mate' }),
      ]));
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.transmission\.missing-for-coupled-mate/);
    }
  });

  it('reports declared transmissions through inspect_assembly', async () => {
    const result = await inspectAssemblyTool({
      code: `
        ${COUPLED_GRIPPER_WITHOUT_TRANSMISSION.replace(
          'return arm.model();',
          `
            arm.transmission('left-drive-linkage', {
              kind: 'link-rod',
              sourceMate: 'grip',
              drivenMates: ['left-curl'],
              actuator: 'servo',
              input: 'driver',
              output: 'left-finger',
              path: ['driver', 'left-finger'],
            });
            arm.transmission('right-drive-linkage', {
              kind: 'link-rod',
              sourceMate: 'grip',
              drivenMates: ['right-curl'],
              actuator: 'servo',
              input: 'driver',
              output: 'right-finger',
              path: ['driver', 'right-finger'],
            });
            return arm.model();
          `,
        )}
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transmissions).toEqual([
        expect.objectContaining({
          name: 'left-drive-linkage',
          kind: 'link-rod',
          sourceMate: 'grip',
          drivenMates: ['left-curl'],
          path: ['driver', 'left-finger'],
        }),
        expect.objectContaining({
          name: 'right-drive-linkage',
          kind: 'link-rod',
          sourceMate: 'grip',
          drivenMates: ['right-curl'],
          path: ['driver', 'right-finger'],
        }),
      ]);
    }
  });

  it('blocks declared transmission paths whose parts do not touch as a load path', async () => {
    const result = await reviewCadTool({
      code: `
        ${COUPLED_GRIPPER_WITHOUT_TRANSMISSION.replace(
          'return arm.model();',
          `
            arm.part('floating-link', box(8, 4, 4, true).translate(120, 120, 0));
            arm.transmission('left-drive-linkage', {
              kind: 'link-rod',
              sourceMate: 'grip',
              drivenMates: ['left-curl'],
              actuator: 'servo',
              input: 'driver',
              output: 'left-finger',
              path: ['driver', 'floating-link', 'left-finger'],
            });
            arm.transmission('right-drive-linkage', {
              kind: 'link-rod',
              sourceMate: 'grip',
              drivenMates: ['right-curl'],
              actuator: 'servo',
              input: 'driver',
              output: 'right-finger',
              path: ['driver', 'right-finger'],
            });
            return arm.model();
          `,
        )}
      `,
      includePoseEnvelope: false,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.transmission.path-disconnected',
        transmissionName: 'left-drive-linkage',
        fromPartName: 'driver',
        toPartName: 'floating-link',
      }),
    ]));
    if (!result.ok) {
      expect(result.fitness?.blockingReasons).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'assembly.transmission.path-disconnected' }),
      ]));
    }
  });

  it('blocks small air gaps between consecutive transmission path parts', async () => {
    const { model } = await evaluateAndBuildScript({
      code: `
        const arm = assembly('gapped transmission');
        arm.part('base', box(10, 10, 4, true))
          .connector('drive-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('swing-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driver', box(6, 6, 4, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('follower', box(10, 10, 4, true).translate(14, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [14, 0, 0] }, axis: [0, 0, 1] });
        arm.part('air-link', box(10, 10, 4, true).translate(14, 0, 0));
        arm.mate('drive', 'base.drive-axis', 'driver.axis', 'revolute');
        arm.mate('swing', 'base.swing-axis', 'follower.axis', 'revolute');
        arm.coupleMates('swing', { source: 'drive', ratio: 1 });
        arm.transmission('air-gap-drive', {
          kind: 'link-rod',
          sourceMate: 'drive',
          drivenMates: ['swing'],
          input: 'driver',
          output: 'follower',
          path: ['base', 'air-link', 'follower'],
        });
        return arm.model();
      `,
    });
    const arm = model?.session.assemblies.get('gapped transmission') as Assembly | undefined;

    expect(arm).toBeDefined();
    const result = await reviewMechanicalTransmission(arm!);

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.transmission.path-disconnected',
        transmissionName: 'air-gap-drive',
        fromPartName: 'base',
        toPartName: 'air-link',
        gapMm: 4,
      }),
    ]));
  });

  it('blocks overlapping bounding boxes when the actual transmission surfaces do not touch', async () => {
    const { model } = await evaluateAndBuildScript({
      code: `
        const arm = assembly('bbox false contact transmission');
        arm.part('base', box(20, 20, 4, true))
          .connector('drive-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('swing-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driver', cylinder(8, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('offset-link', cylinder(8, 5).translate(10, 10, 0));
        arm.part('follower', cylinder(8, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('drive', 'base.drive-axis', 'driver.axis', 'revolute');
        arm.mate('swing', 'base.swing-axis', 'follower.axis', 'revolute');
        arm.coupleMates('swing', { source: 'drive', ratio: 1 });
        arm.transmission('bbox-false-contact-drive', {
          kind: 'link-rod',
          sourceMate: 'drive',
          drivenMates: ['swing'],
          input: 'driver',
          output: 'follower',
          path: ['driver', 'offset-link', 'follower'],
        });
        return arm.model();
      `,
    });
    const arm = model?.session.assemblies.get('bbox false contact transmission') as Assembly | undefined;

    expect(arm).toBeDefined();
    const result = await reviewMechanicalTransmission(arm!);

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.transmission.path-disconnected',
        transmissionName: 'bbox-false-contact-drive',
        fromPartName: 'driver',
        toPartName: 'offset-link',
      }),
    ]));
  });

  it('blocks transmission paths that separate at a pose-envelope sample', async () => {
    const { model } = await evaluateAndBuildScript({
      code: `
        const arm = assembly('separating transmission');
        arm.part('base',
          box(20, 20, 6, true)
            .union(box(6, 6, 6, true).translate(30, 0, 0))
        )
          .connector('drive-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('swing-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driver', box(8, 8, 4, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('follower',
          box(8, 8, 4, true)
            .translate(30, 0, 0)
        )
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('drive', 'base.drive-axis', 'driver.axis', 'revolute', { pose: 0, limitsDeg: [0, 45] });
        arm.mate('swing', 'base.swing-axis', 'follower.axis', 'revolute', { pose: 0, limitsDeg: [0, 90] });
        arm.coupleMates('swing', { source: 'drive', ratio: 1 });
        arm.transmission('swing-drive', {
          kind: 'link-rod',
          sourceMate: 'drive',
          drivenMates: ['swing'],
          input: 'driver',
          output: 'follower',
          path: ['base', 'follower'],
        });
        return arm.model();
      `,
    });
    const arm = model?.session.assemblies.get('separating transmission') as Assembly | undefined;

    expect(arm).toBeDefined();
    const result = await reviewMechanicalTransmission(arm!, { includePoseEnvelope: true });

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.transmission.path-disconnected',
        transmissionName: 'swing-drive',
        fromPartName: 'base',
        toPartName: 'follower',
        sampleName: 'swing:max',
      }),
    ]));
  });
});
