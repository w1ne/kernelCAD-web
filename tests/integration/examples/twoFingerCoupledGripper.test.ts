import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { Scene } from '../../../src/modeling/validation/scene';
import { PER_EXAMPLE_TIMEOUT_MS } from '../physics-loop/exampleSweepShared';

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

  it('with interference checks off, its hinges only draw advisory findings', async () => {
    // Evidence (2026-10-11): the geometric hinge-support checks
    // (assembly.joint-axis.unbound, assembly.mechanical.revolute-unsupported,
    // assembly.mechanical.revolute-contact-missing) report nothing for this
    // gripper — each hinge connector lies on palm and finger material and
    // the bodies touch along the axis. Since issue #354 they touch only
    // face-to-face: each finger rests on the palm's top face (no pin, no
    // bore is modelled). What is left is advisory: no declared support
    // intent, no limits on the coupled curls (they inherit grip's 0-40 deg
    // through coupleMates).
    const result = await reviewCadTool({
      file: EXAMPLE_PATH,
      includeInterference: false,
      trackConnectors: ['left-finger.tip', 'right-finger.tip'],
    });

    const advisory = result.diagnostics.filter((d) =>
      d.code === 'assembly.joint-topology.unsupported-axis' || d.code === 'assembly.mate.limit-missing');
    expect(advisory.map((d) => `${d.code}/${d.severity}`).sort()).toEqual([
      'assembly.joint-topology.unsupported-axis/warning',
      'assembly.joint-topology.unsupported-axis/warning',
      'assembly.joint-topology.unsupported-axis/warning',
      'assembly.mate.limit-missing/warning',
      'assembly.mate.limit-missing/warning',
    ]);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  }, 180_000);

  // Issue #354: the finger boxes were centred on their hinge plane and
  // pointed along X, so each finger sat 2.5 mm into the palm and the two
  // fingers crossed each other and the driver hub. Each finger now rests
  // on the palm's top face and points along +Y, so review and the loop
  // must both report clean geometry.
  it('passes the interference check: the fingers rest on the palm (issue #354)', async () => {
    const result = await reviewCadTool({ file: EXAMPLE_PATH, includeInterference: true });
    const overlaps = result.diagnostics.filter((d) => d.code === 'assembly.interference.overlap');
    expect(overlaps).toEqual([]);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  }, 240_000);

  it(
    'examples/robot-hand/two-finger-coupled-gripper.kcad.ts passes the physics-grounded loop',
    async () => {
      const result = await runValidateCli({
        file: EXAMPLE_PATH,
        json: true,
        includeInterference: true,
        epsilon: 0.01,
        physical: false,
        includePhysics: false,
      });

      expect(result.mechanismFailures ?? []).toEqual([]);
      expect(result.mechanism).toBe('real');
    },
    PER_EXAMPLE_TIMEOUT_MS,
  );
});
