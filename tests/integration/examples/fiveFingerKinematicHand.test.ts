import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { reviewJointTopology } from '../../../src/modeling/mates/jointTopology';
import {
  reviewPhysicalUseCases,
  reviewPhysicalUseCasesWithReachability,
} from '../../../src/modeling/mates/physicalUseCase';

const EXAMPLE_PATH = 'tests/fixtures/robot-hand/rejected-five-finger-kinematic-hand.kcad.ts';

describe('rejected five-finger kinematic hand fixture', () => {
  it('keeps visible proportions in a reference-landmark evidence layer', () => {
    const source = readFileSync(EXAMPLE_PATH, 'utf8');

    expect(source).toContain('const referenceLandmarks =');
    expect(source).toContain('referenceLandmarks.fingers.forEach(addFinger)');
    expect(source).toContain('referenceLandmarks.actuatorWindows');
    expect(source).toContain('referenceLandmarks.tendons');
    expect(source).toContain('referenceLandmarks.screws');
    expect(source).toContain('angleDeg: 38');
    expect(source).not.toContain('].forEach(addFinger)');
  });

  it('rejects interference certification when a palm subtraction removes no material', async () => {
    const result = await checkInterference({
      fileName: EXAMPLE_PATH,
      code: readFileSync(EXAMPLE_PATH, 'utf8'),
    });
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'feature.subtractive-noop', severity: 'error' }),
    ]));
  }, 120_000);

  it('captures five-finger clevis and support intent while keeping lowering rejected', async () => {
    const source = readFileSync(EXAMPLE_PATH, 'utf8');

    expect(source.match(/=\s*joint\.clevis\s*\(/g)?.length ?? 0).toBe(3);
    expect(source.match(/maxLoad:\s*\{\s*torque:/g)?.length ?? 0).toBe(3);
    expect(source).toMatch(/validate:\s*'error'/);
    expect(source).toMatch(/externalLoads:/);
    expect(source).not.toMatch(/\bignore\s*:/);
    expect(source).not.toContain("exposure: 'concealed'");
    expect(source).not.toMatch(/\btype\s+\w+/);
    expect(source).not.toMatch(/\bas\s+FingerSpec\b/);
    expect(source).toContain('const mcpZ = spec.mcpZ === undefined ? BASE_Z : spec.mcpZ');
    expect(source).toContain('pivotParent: [spec.x, HINGE_Y, mcpZ]');
    expect(source).toContain('axis: [1, 0, 0]');
    expect(source).toContain('const straightPipPivot = [0, 0, proxRoot + proxLen + PIP_PIVOT_OVERHANG]');
    expect(source).toContain('const straightDipPivot = [0, 0, midRoot + midLen + DIP_PIVOT_OVERHANG]');
    expect(source).toContain("const straightTipFrame = [0, 0, dipStyle.knuckleR + 15 + distalLen]");
    expect(source).toContain('pointAlong(spec.angleDeg');
    expect(source).toContain('distalStructuralLink');
    expect(source).toContain('contactPadOverlap');
    expect(source).toContain("hand.part('grasp-cylinder'");
    expect(source).toContain("hand.physicalUseCase('power-cylinder-grasp'");
    expect(source).toContain("hand.mechanicalJoint(`${spec.name}-mcp-drive`");
    expect(source).toContain('normalForceN');
    expect(source).not.toMatch(/\bspec\.baseZ\b/);
    for (const finger of ['little', 'ring', 'middle', 'index', 'thumb']) {
      expect(source).toContain(`name: '${finger}'`);
      expect(source).toContain(`'${finger}-proximal'`);
      expect(source).toContain(`'${finger}-middle'`);
      expect(source).toContain(`'${finger}-distal'`);
    }

    const evaluated = await evaluateAndBuildScript({ file: EXAMPLE_PATH, code: source });

    expect(evaluated.evaluation.exitCode).toBe(1);
    expect(evaluated.evaluation.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'feature.subtractive-noop', severity: 'error' }),
    ]));
    const assembly = evaluated.model?.session.assemblies.get('front-facing-five-finger-robot-hand');
    expect(assembly).toBeTruthy();
    expect(assembly?.__parts().map((part) => part.name)).toEqual([
      'palm-root',
      'little-proximal', 'little-middle', 'little-distal',
      'ring-proximal', 'ring-middle', 'ring-distal',
      'middle-proximal', 'middle-middle', 'middle-distal',
      'index-proximal', 'index-middle', 'index-distal',
      'thumb-proximal', 'thumb-middle', 'thumb-distal',
      'middle-mcp-servo',
      'index-mcp-servo',
      'thumb-mcp-servo',
      'grasp-cylinder',
    ]);
    expect(assembly?.__mates().filter((mate) => mate.type === 'revolute')).toHaveLength(15);
    expect(assembly?.__mates().filter((mate) => mate.type === 'fastened')).toHaveLength(3);
    expect(assembly?.__mechanicalJointIntents().map((intent) => intent.name)).toEqual([
      'middle-mcp-drive',
      'index-mcp-drive',
      'thumb-mcp-drive',
    ]);
    expect(assembly?.__physicalUseCases()[0]?.actuatorLimits.map((limit) => limit.mate)).toEqual([
      'thumb-mcp',
      'index-mcp',
      'middle-mcp',
    ]);
    const physicalUseCaseReview = reviewPhysicalUseCases(assembly!, { requirePhysicalUseCase: true });
    expect(physicalUseCaseReview.checkedUseCaseCount).toBe(1);
    const unsupportedActuators = physicalUseCaseReview.diagnostics.filter((diagnostic) =>
      diagnostic.code === 'assembly.physical-use-case.actuator-support-missing',
    );
    expect(unsupportedActuators).toEqual([]);
    const closed = await evaluateAndBuildScript({
      file: EXAMPLE_PATH,
      code: source.replace("param('closeDeg', 22,", "param('closeDeg', 32,"),
    });

    expect(closed.evaluation.exitCode).toBe(1);
    expect(closed.evaluation.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'feature.subtractive-noop', severity: 'error' }),
    ]));
  }, 240_000);

  it('rejects the current hand on physical use case reachability', async () => {
    const evaluated = await evaluateAndBuildScript({
      file: EXAMPLE_PATH,
      code: readFileSync(EXAMPLE_PATH, 'utf8'),
    });
    const assembly = evaluated.model?.session.assemblies.get('front-facing-five-finger-robot-hand');
    expect(assembly).toBeTruthy();

    const result = await reviewPhysicalUseCasesWithReachability(assembly!, {
      requirePhysicalUseCase: true,
      includeReachability: true,
      reachabilitySamplesPerMate: 3,
    });

    const unreachableContacts = result.diagnostics.filter((diagnostic) =>
      diagnostic.code === 'assembly.physical-use-case.contact-unreachable'
    );
    expect(unreachableContacts.map((diagnostic) =>
      'contactA' in diagnostic ? diagnostic.contactA : ''
    )).toEqual([
      'grasp-cylinder.thumb-contact',
      'grasp-cylinder.index-contact',
      'grasp-cylinder.middle-contact',
    ]);
  }, 240_000);

  it('keeps topology support declarations complete while reachability remains blocking', async () => {
    const evaluated = await evaluateAndBuildScript({
      file: EXAMPLE_PATH,
      code: readFileSync(EXAMPLE_PATH, 'utf8'),
    });
    const assembly = evaluated.model?.session.assemblies.get('front-facing-five-finger-robot-hand');
    expect(assembly).toBeTruthy();
    if (assembly === undefined) throw new Error('front-facing-five-finger-robot-hand assembly was not captured');

    const topologyReview = reviewJointTopology(assembly);

    expect(topologyReview.diagnostics).toEqual([]);
  }, 240_000);

  it('preserves the original front-facing visual intent markers', async () => {
    const source = readFileSync(EXAMPLE_PATH, 'utf8');

    expect(source).toMatch(/actuator window/i);
    expect(source).toMatch(/tendon/i);
    expect(source).toMatch(/wrist block/i);
    expect(source).toMatch(/angled thumb/i);
    expect(source).toContain('const referenceLandmarks =');
    expect(source).toContain('referenceLandmarks.fingers.forEach(addFinger)');
    expect(source).toContain('referenceLandmarks.actuatorWindows');
    expect(source).toContain('referenceLandmarks.tendons');
    expect(source).toContain('referenceLandmarks.screws');
    expect(source).toContain('angleDeg: 38');
    expect(source).not.toContain('].forEach(addFinger)');
    expect(source).not.toContain('return parts');
    expect(source).not.toContain('parts.push');
    expect(source).not.toContain('addPart(');
    expect(source).not.toContain("exposure: 'concealed'");
  });
});
