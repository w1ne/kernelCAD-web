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

    // Mechanical detail: the example builds recessed bays via .subtract(box),
    // a structural rib unioned to the shoulder, a top-running rib unioned to
    // the elbow, and a posed scene root from solvedModel(). At least five
    // hole records (4 mounting screws + base pivot + shoulder pivots +
    // elbow + wrist pivots), several boolean records (rib unions, bay
    // subtracts, tool union — the FK union now lives in the lowerer's
    // `solvedAssembly` case rather than as boolean records), and at least
    // two fillets (basePlate, elbow, wrist).
    const holes = records.filter((r) => r.kind === 'hole' || r.kind === 'holes');
    const booleans = records.filter((r) => r.kind === 'boolean');
    const fillets = records.filter((r) => r.kind === 'fillet');
    expect(holes.length).toBeGreaterThanOrEqual(5);
    expect(booleans.length).toBeGreaterThanOrEqual(5);
    expect(fillets.length).toBeGreaterThanOrEqual(2);

    // solvedModel() now emits a `solvedAssembly` feature record that the
    // lowerer resolves via forwardKinematics + per-part transform + union.
    // The last record is therefore `solvedAssembly`, not `boolean`.
    expect(records.at(-1)?.kind).toBe('solvedAssembly');
  });

  it('does not reference the removed robotArmKit global', () => {
    const source = readFileSync(EXAMPLE_ABSOLUTE, 'utf8');
    expect(source).not.toMatch(/\brobotArmKit\b/);
  });
});
