import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const EXAMPLE_PATH = 'examples/robot-hand/generic-articulated-digit.kcad.ts';

describe('generic articulated digit candidate', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('proves one connected three-joint digit clears its sampled envelope', async () => {
    const source = readFileSync(EXAMPLE_PATH, 'utf8');

    expect(source.match(/joint\.articulatedDigit\s*\(/g) ?? []).toHaveLength(1);
    expect(source.match(/\b(?:arm|hand)\.part\(['"]palm['"]/g) ?? []).toHaveLength(1);
    expect(source).toMatch(/connector\(['"]index-mount['"]/);
    expect(source).toMatch(/const closeDeg = param\(['"]closeDeg['"], 0, \{ min: 0, max: 30 \}\);/);
    expect(source).toMatch(/name:\s*['"]mcp['"][\s\S]*limitsDeg:\s*\[0,\s*30\]/);
    expect(source).toMatch(/name:\s*['"]dip['"][\s\S]*limitsDeg:\s*\[0,\s*15\]/);
    expect(source).toContain("dfmSpec({ minWall: 1.2, minClearance: 0.8, includeArticulatedMates: true });");
    expect(source).toContain("'index-mcp': closeDeg.multiply(1)");
    expect(source).toContain("'index-pip': closeDeg.multiply(0.75)");
    expect(source).toContain("'index-dip': closeDeg.multiply(0.5)");
    expect(source).toMatch(/return arm\.solvedModel\(\{[\s\S]*'index-mcp'[\s\S]*'index-pip'[\s\S]*'index-dip'[\s\S]*\}, \{ validate: 'error' \}\);/);
    for (const forbidden of ['tendon', 'actuator', 'mechanicalJoint', 'physicalUseCase', 'ignore', 'dynamics', 'load', 'payload']) {
      expect(source.toLowerCase()).not.toContain(forbidden);
    }

    const maximumCloseSource = source.replace(
      "param('closeDeg', 0,",
      "param('closeDeg', 30,",
    );
    expect(maximumCloseSource).not.toBe(source);
    const maximumClose = await evaluateAndBuildScript({ code: maximumCloseSource });
    expect.soft(maximumClose.evaluation.exitCode).toBe(0);
    expect.soft(
      maximumClose.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    ).toEqual([]);
    expect(source).toMatch(/name:\s*['"]pip['"][\s\S]*limitsDeg:\s*\[0,\s*23\]/);

    const evaluated = await evaluateAndBuildScript({ file: EXAMPLE_PATH });
    expect(evaluated.evaluation.exitCode).toBe(0);
    expect(evaluated.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);

    const reviewed = await reviewCadTool({
      file: EXAMPLE_PATH,
      includeInterference: true,
      includePoseEnvelope: true,
      includePhysics: false,
      samplesPerMate: 3,
      designGoal: 'Prove one generic three-joint robot digit is structurally connected and clears its sampled motion envelope.',
      trackConnectors: ['index-distal.tip-frame'],
    });
    expect(reviewed.ok).toBe(true);
    expect(reviewed.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(reviewed.fitness?.functional).toBe(true);
    expect(reviewed.fitness?.blockingReasons ?? []).toEqual([]);
    expect(reviewed.physicalUseCaseStaticCertificates).toEqual([]);
    expect(reviewed.physicalUseCaseJointReactionCertificates).toEqual([]);
    expect(reviewed.physicalUseCaseJointStructuralCertificates).toEqual([]);
    expect(reviewed.poseEnvelope?.diagnostics).toEqual([]);
    expect(reviewed.poseEnvelope?.interferencePairs).toEqual([]);
    const clearancePairs = reviewed.poseEnvelope?.clearancePairs ?? [];
    expect(clearancePairs.some((pair) => pair.status === 'violated')).toBe(false);
    expect(clearancePairs.some((pair) => pair.status === 'unknown')).toBe(false);

    const inspected = await inspectAssemblyTool({ file: EXAMPLE_PATH });
    expect(inspected.ok).toBe(true);
    if (inspected.ok) {
      expect(inspected.unexplainedGeometry).toEqual([]);
      expect(inspected.parts.map((part) => part.disconnected)).toEqual(
        Array(inspected.parts.length).fill(undefined),
      );
    }

    const interference = await checkInterference({
      fileName: EXAMPLE_PATH,
      code: source,
      ignorePairs: new Set(),
    });
    expect(interference.pairs).toEqual([]);
    expect(interference.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  }, 240_000);
});
