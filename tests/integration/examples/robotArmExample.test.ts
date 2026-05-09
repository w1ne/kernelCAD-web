import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'examples/robot-arm/desktop-3axis.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

describe('robot arm example', () => {
  it('evaluates a body-tree-posed robot arm composed from generic primitives', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics).toEqual([]);

    const records = result.model?.records ?? [];
    const parts = records.filter((record) => record.kind === 'assemblyPart');
    const joints = records.filter((record) => record.kind === 'assemblyJoint');

    // 5 parts: base, shoulder, elbow, wrist, tool.
    expect(parts.length).toBe(5);
    // 4 joints: 3 revolute (base-yaw, shoulder-pitch, elbow-pitch) + 1 fixed (wrist-tool).
    expect(joints.length).toBe(4);

    const revolutes = joints.filter(
      (j) => (j.metadata as { jointKind?: string })?.jointKind === 'revolute',
    );
    const fixedJoints = joints.filter(
      (j) => (j.metadata as { jointKind?: string })?.jointKind === 'fixed',
    );
    expect(revolutes.length).toBe(3);
    expect(fixedJoints.length).toBe(1);

    // solvedModel() returns the unioned posed Shape via SolvedKinematics.toShape();
    // the last record is the boolean-union scene root, not an assemblyModel feature.
    expect(records.at(-1)?.kind).toBe('boolean');
  });

  it('does not reference the removed robotArmKit global', () => {
    const source = readFileSync(EXAMPLE_ABSOLUTE, 'utf8');
    expect(source).not.toMatch(/\brobotArmKit\b/);
  });
});
