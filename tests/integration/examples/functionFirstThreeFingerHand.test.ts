import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { Scene } from '../../../src/modeling/validation/scene';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'tests/fixtures/robot-hand/rejected-function-first-three-finger-hand.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

describe('rejected function-first three-finger robot hand fixture', () => {
  it('preserves the grasp requirements while rejecting its no-op palm subtraction', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(1);
    expect(result.evaluation.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'feature.subtractive-noop', severity: 'error' }),
    ]));

    const source = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    expect(source).toContain('power-cylinder');
    expect(source).toContain('contactTargets');
    expect(source).toContain('target-cylinder');
    expect(source).toContain('contact normal');
    expect(source).toContain('normalForceN');
    expect(source).toContain('palmShell');
    expect(source).toContain('thumbSaddle');
    expect(source).toContain('proximalLen');
    expect(source).toContain('distalLen');
    expect(source).toContain('knuckleBoss');

    const { returnValue } = await runScript({
      code: source,
      fileName: EXAMPLE_ABSOLUTE,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
    });

    expect(returnValue).toBeInstanceOf(Scene);
    const scene = returnValue as Scene;
    expect(scene.part('palm').connectors?.some((connector) => connector.name === 'target-mount')).toBe(true);
    expect(scene.part('target-cylinder').connectors?.some((connector) => connector.name === 'mount')).toBe(true);
    expect(scene.part('thumb-finger').connectors?.some((connector) => connector.name === 'tip')).toBe(true);
    expect(scene.part('index-finger').connectors?.some((connector) => connector.name === 'tip')).toBe(true);
    expect(scene.part('middle-finger').connectors?.some((connector) => connector.name === 'tip')).toBe(true);
    expect(scene.mates?.filter((mate) => mate.type === 'fastened').map((mate) => mate.name)).not.toContain('target-fixture');
    expect(scene.mates?.filter((mate) => mate.type === 'revolute').map((mate) => mate.name)).toEqual([
      'grip',
      'thumb-curl',
      'index-curl',
      'middle-curl',
    ]);
  }, 120_000);

  it('keeps the lowering failure blocking in review_cad', async () => {
    const result = await reviewCadTool({
      file: EXAMPLE_PATH,
      includeInterference: true,
      trackConnectors: ['thumb-finger.tip', 'index-finger.tip', 'middle-finger.tip'],
      gripperAperture: { left: 'thumb-finger.tip', right: 'index-finger.tip' },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'feature.subtractive-noop', severity: 'error' }),
    ]));
    expect(result.fitness).toBeUndefined();
  }, 180_000);
});
