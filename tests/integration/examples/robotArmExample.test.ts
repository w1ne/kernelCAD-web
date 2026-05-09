import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'examples/robot-arm/desktop-3axis.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

describe('robot arm example', () => {
  it('evaluates a self-contained robot arm composed from generic primitives', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics).toEqual([]);

    const records = result.model?.records ?? [];
    const parts = records.filter((record) => record.kind === 'assemblyPart');
    const joints = records.filter((record) => record.kind === 'assemblyJoint');

    // 5 named parts: base-plate, shoulder-column, elbow-arm, wrist-arm,
    // tool-placeholder.
    expect(parts.length).toBe(5);
    // Single revolute joint at the base. solve() in this slice handles only
    // single-joint chains; the shoulder/elbow articulation is baked into
    // each part's geometry at construction time (vertical shoulder column,
    // forward-reaching elbow + wrist), and base-yaw spins the whole bent
    // arm about Z.
    expect(joints.length).toBe(1);

    // Mechanical-detail features the rewrite adds beyond bare `box + holes`:
    //   - hole/holes: pivot bores + screw mounts on every plate.
    //   - boolean: rib unions + bay-pocket subtracts (≥3 expected:
    //     basePlate bay subtract, shoulderColumn bay subtract, shoulder rib
    //     union, elbow rib union, plus the booleans solve() emits to compose
    //     posed parts into a single returned shape).
    //   - fillet: at least 2 plates carry an all-edges fillet.
    const holes = records.filter((r) => r.kind === 'hole' || r.kind === 'holes');
    const booleans = records.filter((r) => r.kind === 'boolean');
    const fillets = records.filter((r) => r.kind === 'fillet');
    expect(holes.length).toBeGreaterThanOrEqual(5);
    expect(booleans.length).toBeGreaterThanOrEqual(4);
    expect(fillets.length).toBeGreaterThanOrEqual(2);

    // arm.solve() composes joint-pose rotations + a part union on top of
    // each originalShape, so the tail record is a boolean (the unioned
    // solved model), not assemblyModel. The five assemblyPart records still
    // sit in the record stream; the last record is the solve composition.
    expect(records.at(-1)?.kind).toBe('boolean');
  });

  it('does not reference the removed robotArmKit global', () => {
    const source = readFileSync(EXAMPLE_ABSOLUTE, 'utf8');
    expect(source).not.toMatch(/\brobotArmKit\b/);
  });
});
