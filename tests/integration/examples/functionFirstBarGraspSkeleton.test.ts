import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { Scene } from '../../../src/modeling/validation/scene';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'tests/fixtures/robot-hand/rejected-function-first-bar-grasp-skeleton.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

/** Max-min distance between two tracked connectors across the sampled poses. */
function trackedDistanceTravelMm(
  poses: ReadonlyArray<{ sampleName: string; ref: string; world: readonly number[] }> | undefined,
  refA: string,
  refB: string,
): number {
  const a = new Map((poses ?? []).filter((p) => p.ref === refA).map((p) => [p.sampleName, p.world]));
  const distances: number[] = [];
  for (const p of poses ?? []) {
    const w = p.ref === refB ? a.get(p.sampleName) : undefined;
    if (w) distances.push(Math.hypot(w[0] - p.world[0], w[1] - p.world[1], w[2] - p.world[2]));
  }
  return distances.length === 0 ? 0 : Math.max(...distances) - Math.min(...distances);
}

describe('function-first bar grasp skeleton example', () => {
  it('evaluates as a minimal mechanism built from bar-contact requirements', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);

    const source = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    expect(source).toContain('bar-grasp');
    expect(source).toContain('target-bar');
    expect(source).toContain('contactTargets');
    expect(source).toContain('jointSupport');
    expect(source).toContain('mechanicalJoint');
    expect(source).toContain('physicalUseCase');

    const { returnValue } = await runScript({
      code: source,
      fileName: EXAMPLE_ABSOLUTE,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
    });

    expect(returnValue).toBeInstanceOf(Scene);
    const scene = returnValue as Scene;
    expect(scene.part('target-bar').connectors?.map((connector) => connector.name)).toEqual(expect.arrayContaining([
      'load-point',
      'thumb-contact',
      'index-contact',
      'middle-contact',
    ]));
    expect(scene.mates?.filter((mate) => mate.type === 'revolute').map((mate) => mate.name)).toEqual([
      'grip',
      'thumb-curl',
      'index-curl',
      'middle-curl',
    ]);
  }, 120_000);

  it('passes review_cad for supported reachable bar contacts', async () => {
    const result = await reviewCadTool({
      file: EXAMPLE_PATH,
      includeInterference: false,
      requirePhysicalUseCase: true,
      physicalUseCaseLevel: 'statics',
      physicalUseCaseSamplesPerMate: 3,
      trackConnectors: ['thumb-finger.tip', 'index-finger.tip', 'middle-finger.tip'],
    });

    expect(result.ok).toBe(true);
    expect(result.fitness?.blockingReasons).toEqual([]);
    expect(result.diagnostics.filter((diagnostic) =>
      diagnostic.severity === 'error'
    )).toEqual([]);
    expect(trackedDistanceTravelMm(result.poseEnvelope?.connectorPoses, 'thumb-finger.tip', 'index-finger.tip')).toBeGreaterThan(8);
    expect(result.physicalUseCaseStaticCertificates).toEqual([
      expect.objectContaining({
        useCaseName: 'bar-grasp',
        heldPart: 'target-bar',
      }),
    ]);
  }, 180_000);

  it('does not present the hand-built bar hinges as structurally certified', async () => {
    const result = await reviewCadTool({
      file: EXAMPLE_PATH,
      includeInterference: false,
      requirePhysicalUseCase: true,
      physicalUseCaseLevel: 'reactions',
      physicalUseCaseSamplesPerMate: 3,
    });

    expect(result.ok).toBe(false);
    expect(result.physicalUseCaseJointReactionCertificates).toEqual([
      expect.objectContaining({ useCaseName: 'bar-grasp' }),
    ]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.physical-use-case.joint-capacity-undeclared',
      }),
      expect.objectContaining({
        code: 'assembly.physical-use-case.joint-structure-input-incomplete',
      }),
    ]));
    expect(result.physicalUseCaseJointStructuralCertificates?.[0].joints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          envelope: expect.objectContaining({ status: 'undeclared' }),
        }),
      ]),
    );
  }, 180_000);
});
