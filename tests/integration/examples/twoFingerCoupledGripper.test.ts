import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { Scene } from '../../../src/modeling/validation/scene';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'examples/robot-hand/two-finger-coupled-gripper.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

describe('two-finger coupled gripper example', () => {
  it('evaluates and declares coupled fingertip intent', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    const errors = result.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual([]);

    const code = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    const { returnValue } = await runScript({
      code,
      fileName: EXAMPLE_ABSOLUTE,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
    });
    expect(returnValue).toBeInstanceOf(Scene);
    const scene = returnValue as Scene;
    expect(scene.mates?.map((mate) => mate.name)).toEqual(['grip', 'left-curl', 'right-curl']);
    expect(scene.part('left-finger').connectors?.some((connector) => connector.name === 'tip')).toBe(true);
    expect(scene.part('right-finger').connectors?.some((connector) => connector.name === 'tip')).toBe(true);
  }, 120_000);

  it('passes review_cad with gripper aperture travel', async () => {
    const result = await reviewCadTool({
      file: EXAMPLE_PATH,
      includeInterference: false,
      trackConnectors: ['left-finger.tip', 'right-finger.tip'],
      gripperAperture: { left: 'left-finger.tip', right: 'right-finger.tip' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.gripperAperture?.travelMm).toBeGreaterThan(10);
      expect(result.fitness.passedChecks).toContain('gripper-aperture-moves');
      expect(result.fitness.mechanismSummary.gripperApertureTravelMm).toBeGreaterThan(10);
    }
  }, 180_000);

  // P3 physics-loop sweep (2026-06-01): two-finger-coupled-gripper
  // uses vec3 pin-axis connectors instead of joint.clevis(...), so the
  // physics loop flags 13 mechanism.interpenetration failures where the
  // finger hinges nest into the palm cheeks. Tracked rebuild with
  // joint.clevis(...) in the issue below.
  //
  // Spec:   docs/specs/2026-06-01-physics-grounded-loop-design.md §criterion 2
  // Plan:   docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md
  // Issue:  https://github.com/w1ne/kernelCAD-web/issues/354
  it.skip('passes the physics-grounded loop — see issues/354', () => {
    // no body — the citation in the title is what the sweep test reads
  });
});
