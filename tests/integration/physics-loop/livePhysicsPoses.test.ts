// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Real-part proof for live physics playback poses and honest closed-loop status.
// The compact supported arm is the shipped tree-shaped 4-DOF example. The
// scissor jack is the shipped closed loop. Each case stays under 60 seconds.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { runScript } from '../../../src/composition/runScript';
import { assemblyToMjcf } from '../../../src/modeling/runtime/mjcfExport';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { summarizeMechanism } from '../../../src/modeling/runtime/mechanismVerdict';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession';
import type { MujocoBodyMatrix } from '../../../src/modeling/runtime/mujocoSessionCore';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ARM_FILE = resolve(ROOT, 'examples/robot-arm/compact-supported-arm.kcad.ts');
const SCISSOR_FILE = resolve(
  ROOT,
  'src/agent/skills/kernelcad-kinematic/cookbook/04-scissor-jack-swept.kcad.ts',
);

const PHYSICS_FAILURE = new Set([
  'mechanism.unstable-under-gravity',
  'mechanism.drops-on-release',
]);

async function probeFile(file: string, code = readFileSync(file, 'utf8')) {
  const run = await runScript({ code, fileName: file, scriptDir: dirname(file) });
  const arm = [...(run.session.assemblies as Map<string, Assembly>).values()][0];
  expect(arm, 'script captured an assembly').toBeDefined();
  const result = await checkMechanismTruth(arm!, {
    physicsCheck: true,
    physicsSessionFactory: loadMujocoSession,
  });
  return { arm: arm!, result, summary: summarizeMechanism(result) };
}

function placed(matrix: MujocoBodyMatrix, point: readonly [number, number, number]): [number, number, number] {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

describe('live physics poses on real mechanisms', () => {
  it('does not add a physics failure on the tree-shaped 4-DOF arm, and a step poses the forearm', async () => {
    const { arm, result, summary } = await probeFile(ARM_FILE);
    const messages = result.failures.map((failure) => `${failure.severity} ${failure.code}: ${failure.message}`);
    const physicsErrors = result.failures.filter((failure) =>
      PHYSICS_FAILURE.has(failure.code) && failure.severity === 'error');
    expect(physicsErrors, messages.join('\n')).toEqual([]);
    expect(result.failures.map((failure) => failure.code), summary.statement).not.toContain('mechanism.physics-unsupported');
    expect(result.failures.map((failure) => failure.code)).not.toContain('mechanism.orphan-part');
    expect(result.coverage?.physics, summary.statement).toBe(true);

    const exported = await assemblyToMjcf(arm);
    const session = await loadMujocoSession(exported.mjcf, exported.bodyOrder, exported.jointOrder);
    try {
      expect(session.nq).toBe(exported.jointOrder.length);
      const shoulder = exported.jointOrder.findIndex((joint) => joint.mateName === 'shoulder-pitch');
      expect(shoulder).toBeGreaterThanOrEqual(0);
      session.forward();
      const restPoses = session.bodyPosesNow();
      expect([...restPoses.keys()]).toEqual([...exported.bodyOrder]);
      const restForearm = restPoses.get('forearm-link')!.matrix;
      expect(restForearm[15]).toBe(1);
      const restTip = placed(restForearm, [80, 0, 0]);

      const qpos = Array.from(session.getQpos());
      qpos[shoulder] = (qpos[shoulder] ?? 0) + 0.6;
      session.setPose(qpos);
      session.forward();
      const movedTip = placed(session.bodyPosesNow().get('forearm-link')!.matrix, [80, 0, 0]);
      const travel = Math.hypot(movedTip[0] - restTip[0], movedTip[1] - restTip[1], movedTip[2] - restTip[2]);
      expect(travel).toBeGreaterThan(5);

      const stepped = session.step(0.02, 0.002);
      expect(stepped.bodyPoses.get('upper-link')?.matrix).toHaveLength(16);
      expect(stepped.xpos.get('upper-link')).toHaveLength(3);
    } finally {
      session.dispose();
    }
  }, 60_000);

  it('surfaces a missing required mate on the 4-DOF arm', async () => {
    const code = readFileSync(ARM_FILE, 'utf8').replace(/arm\.mate\('shoulder-pitch',[\s\S]*?\);\n/, '');
    expect(code).not.toContain("arm.mate('shoulder-pitch'");
    const { result } = await probeFile(ARM_FILE, code);
    expect(result.mechanism).toBe('broken');
    const orphan = result.failures.find((failure) => failure.code === 'mechanism.orphan-part');
    expect(orphan?.severity).toBe('error');
    expect(orphan?.message).toContain('upper-link');
  }, 60_000);

  it('keeps the scissor-jack closed loop unverified instead of physics-failed', async () => {
    const { result, summary } = await probeFile(SCISSOR_FILE);
    const messages = result.failures.map((failure) => `${failure.severity} ${failure.code}: ${failure.message}`);
    expect(result.mechanism, messages.join('\n')).toBe('unverified');
    expect(result.coverage?.physics).toBe(false);
    expect(result.failures.filter((failure) => failure.severity === 'error'), messages.join('\n')).toEqual([]);
    expect(result.failures).toContainEqual(expect.objectContaining({
      code: 'mechanism.physics-unsupported',
      severity: 'warn',
    }));
    expect(summary.maxLevel).toBe('warning');
    expect(summary.statement).toMatch(/closed-loop mate graphs are unsupported/);
    expect(summary.statement).toMatch(/Do not call this mechanism working/);
    expect(summary.statement).not.toMatch(/Mechanism broken/);
    expect(summary.verdict).not.toBe('real');
  }, 60_000);
});
