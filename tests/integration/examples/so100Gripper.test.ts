// The kernelcad.com hero is examples/robot-arm/so100/so100.kcad.ts.
// The gripper servo used to be rotated about X, so its output shaft
// pointed at -Y while the jaw was placed on +X. Default `kernelcad validate`
// only checks the mate graph, so that pose stayed green. This test checks
// the shaft face and the jaw mount face actually meet.

import { describe, expect, it } from 'vitest';
import { partsScript } from '../../../src/agent/cli/commands/parts';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100.kcad.ts';

function size(bbox: { min: number[]; max: number[] }): number[] {
  return bbox.max.map((value, index) => value - bbox.min[index]);
}

describe('SO-100 gripper seats on its output shaft', () => {
  it('meets the jaw mount face to the gripper servo shaft face', async () => {
    const result = await partsScript({ file: EXAMPLE_PATH });
    expect(result.exitCode).toBe(0);
    const byName = new Map(result.parts.map((part) => [part.name, part.bbox]));
    const servo = byName.get('gripper-servo');
    const jaw = byName.get('gripper-jaw');
    const shoulder = byName.get('shoulder-servo');
    const horn = byName.get('output-horn');
    expect(servo).toBeDefined();
    expect(jaw).toBeDefined();
    expect(shoulder).toBeDefined();
    expect(horn).toBeDefined();
    if (!servo || !jaw || !shoulder || !horn) return;

    const [shaftSpan, widthSpan, standingSpan] = size(servo);
    // Local +Z (the ~40 mm shaft axis) is turned to +X. The ~45 mm body
    // axis stands on the bracket. The old X-rotation put the shaft along Y.
    expect(shaftSpan).toBeGreaterThan(35);
    expect(shaftSpan).toBeLessThan(42);
    expect(widthSpan).toBeLessThan(30);
    expect(standingSpan).toBeGreaterThan(shaftSpan);

    expect(jaw.min[0]).toBeGreaterThan(servo.max[0] - 1);
    expect(jaw.min[0]).toBeLessThan(servo.max[0] + 1);
    expect(jaw.max[1]).toBeGreaterThan(servo.min[1]);
    expect(jaw.min[1]).toBeLessThan(servo.max[1]);
    expect(jaw.max[2]).toBeGreaterThan(servo.min[2]);
    expect(jaw.min[2]).toBeLessThan(servo.max[2]);

    expect(Math.abs(horn.min[2] - shoulder.max[2])).toBeLessThan(0.5);
  }, 180_000);
});
