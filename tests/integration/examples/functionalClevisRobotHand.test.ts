import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

const EXAMPLE_PATH = 'examples/robot-hand/functional-clevis-robot-hand.kcad.ts';

describe('functional clevis robot hand example', () => {
  it('builds from physical clevis joints and passes the mechanism review gate', async () => {
    const source = readFileSync(EXAMPLE_PATH, 'utf8');

    expect(source.match(/joint\.clevis\s*\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(source.match(/maxLoad:\s*\{\s*torque:/g)?.length ?? 0).toBe(3);
    expect(source).toMatch(/validate:\s*'error'/);
    expect(source).toMatch(/externalLoads:/);
    expect(source).not.toMatch(/\bignore\s*:/);

    const evaluated = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(evaluated.evaluation.exitCode).toBe(0);
    expect(evaluated.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);

    const reviewed = await reviewCadTool({
      file: EXAMPLE_PATH,
      includeInterference: true,
      includePoseEnvelope: true,
      epsilonMm3: 0.01,
      samplesPerMate: 1,
      designGoal:
        'Build a robot hand through the functional CAD workflow: physical clevis joints first, visual styling second.',
      preserveInterfaces: [
        'closeDeg',
        'palm',
        'index MCP/PIP/DIP mates',
        'index fingertip frame',
      ],
      trackConnectors: ['index-distal.tip-frame'],
    });

    expect(reviewed.ok).toBe(true);
    expect(reviewed.fitness?.functional).toBe(true);
    expect(reviewed.fitness?.blockingReasons ?? []).toEqual([]);
    expect(
      reviewed.diagnostics.some((diagnostic) => diagnostic.code === 'assembly.mechanical.revolute-unsupported'),
    ).toBe(false);
    expect(
      reviewed.diagnostics.some((diagnostic) => diagnostic.code === 'assembly.mechanical.revolute-contact-missing'),
    ).toBe(false);
  }, 240_000);

  it('does not contain disconnected finger-link solids', async () => {
    const inspected = await inspectAssemblyTool({ file: EXAMPLE_PATH });

    expect(inspected.ok).toBe(true);
    if (inspected.ok) {
      expect(inspected.unexplainedGeometry).toEqual([]);
      expect(inspected.parts.map((part) => [part.name, part.disconnected])).toEqual([
        ['palm', undefined],
        ['index-proximal', undefined],
        ['index-middle', undefined],
        ['index-distal', undefined],
      ]);
    }
  }, 120_000);

  it('rejects the same finger when a declared joint torque capacity is too low', async () => {
    const source = readFileSync(EXAMPLE_PATH, 'utf8');
    const overloaded = source.replace('maxLoad: { torque: 0.35 }', 'maxLoad: { torque: 0.05 }');

    const evaluated = await evaluateAndBuildScript({ code: overloaded });

    expect(evaluated.evaluation.exitCode).toBe(1);
    expect(evaluated.evaluation.diagnostics.some((diagnostic) =>
      diagnostic.code === 'feature.invalid-args' &&
      diagnostic.message.includes('exceeds maxLoad.torque')
    )).toBe(true);
  }, 120_000);
});
