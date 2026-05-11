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
    // The v0.5 desktop-3axis example has known small part-on-part overlaps
    // (servo/yoke unions where booleans were merged via translation rather
    // than a clean `arm.mate(...)` graph). v0.6 added an interference hard
    // gate to `evaluate` (`KERNELCAD_VALIDATE_DEFAULT=error`); that gate is
    // for new mate-driven authoring (see `desktop-3axis-mates.kcad.ts`).
    // Pin this v0.5 evaluation to warn-mode so the legacy example still
    // exercises the lowering path without the new gate flagging known
    // overlaps. The v0.6 hero (`desktop3axisMates.test.ts`) covers the
    // hard-gate path.
    const prev = process.env.KERNELCAD_VALIDATE_DEFAULT;
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
    let result;
    try {
      result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    } finally {
      if (prev === undefined) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
      else process.env.KERNELCAD_VALIDATE_DEFAULT = prev;
    }

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics).toEqual([]);

    const records = result.model?.records ?? [];
    const parts = records.filter((record) => record.kind === 'assemblyPart');
    const joints = records.filter((record) => record.kind === 'assemblyJoint');

    // 3 revolute joints form the body-tree backbone: base-yaw,
    // shoulder-pitch, elbow-pitch. Decorative items per link (servos,
    // horns, yokes) attach via arm.fixed(...) so they ride along under FK.
    const revolutes = joints.filter(
      (j) => (j.metadata as { jointKind?: string })?.jointKind === 'revolute',
    );
    const fixedJoints = joints.filter(
      (j) => (j.metadata as { jointKind?: string })?.jointKind === 'fixed',
    );
    expect(revolutes.length).toBe(3);
    expect(fixedJoints.length).toBeGreaterThanOrEqual(1);
    // Each revolute spawns at least one child link, plus the base.
    expect(parts.length).toBeGreaterThanOrEqual(revolutes.length + 1);

    // Mechanical detail: the example uses booleans heavily (servo/horn/yoke
    // unions, bay subtracts) and fillets on the visible chamfered edges.
    const booleans = records.filter((r) => r.kind === 'boolean');
    const fillets = records.filter((r) => r.kind === 'fillet');
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
