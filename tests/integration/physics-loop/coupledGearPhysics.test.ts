// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { buildModel } from '../../../src/modeling/buildModel';
import { bakeAnimationTimeline, selectAnimationMetadata } from '../../../src/modeling/animation/bakeAnimationTimeline';
import { runScript } from '../../../src/composition/runScript';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const MODEL_FILE = resolve(ROOT, 'docs/demos/issue-1321-coupled-gear/coupled-gear.kcad.ts');
const RATIO = -12 / 48;
const DEG_TO_RAD = Math.PI / 180;

async function authoredGearPair(code = readFileSync(MODEL_FILE, 'utf8')): Promise<Assembly> {
  const run = await runScript({
    code,
    fileName: MODEL_FILE,
    scriptDir: dirname(MODEL_FILE),
  });
  const arm = [...(run.session.assemblies as Map<string, Assembly>).values()][0];
  expect(arm, 'authored regression assembly was captured').toBeDefined();
  return arm!;
}

describe('native physics for coupled 12:48 gear motion', () => {
  it('samples the motor input, preserves signed limits, and checks every release step', async () => {
    const arm = await authoredGearPair();
    const setPoses: number[][] = [];
    let integrationObservations = 0;
    let maxIntegrationResidualDeg = 0;
    let exportedXml = '';

    const result = await checkMechanismTruth(arm, {
      physicsCheck: true,
      physicsSessionFactory: async (xml, bodies, joints) => {
        exportedXml = xml;
        const motor = joints.findIndex((joint) => joint.mateName === 'motor-input');
        const rear = joints.findIndex((joint) => joint.mateName === 'rear-drive-output');
        expect(motor).toBeGreaterThanOrEqual(0);
        expect(rear).toBeGreaterThanOrEqual(0);
        const session = await loadMujocoSession(xml, bodies, joints);

        const setPose = session.setPose.bind(session);
        session.setPose = (qpos) => {
          setPoses.push([...qpos]);
          setPose(qpos);
        };
        const step = session.step.bind(session);
        session.step = (seconds, dt, observeQpos) => step(seconds, dt, (qpos, index) => {
          integrationObservations++;
          const motorPosition = qpos[motor] ?? 0;
          const rearPosition = qpos[rear] ?? 0;
          maxIntegrationResidualDeg = Math.max(
            maxIntegrationResidualDeg,
            Math.abs(rearPosition - RATIO * motorPosition) / DEG_TO_RAD,
          );
          observeQpos?.(qpos, index);
        });
        return session;
      },
    });

    expect(result.coverage?.sweep).toBe(true);
    expect(result.coverage?.physics).toBe(true);
    expect(result.coverage?.poses).toBe(4); // rest, -720°, zero crossing, +720°
    expect(exportedXml).toMatch(/<equality>[\s\S]*joint1="rear-drive-output" joint2="motor-input" polycoef="0 -0\.250000 0 0 0"/);

    const hasPose = (motorDeg: number, rearDeg: number) => setPoses.some((qpos) =>
      Math.abs((qpos[0] ?? 0) - motorDeg * DEG_TO_RAD) < 1e-9
      && Math.abs((qpos[1] ?? 0) - rearDeg * DEG_TO_RAD) < 1e-9,
    );
    expect(hasPose(-720, 180), 'negative input drives positive reduced output at both limits').toBe(true);
    expect(hasPose(0, 0), 'zero crossing maps to zero output').toBe(true);
    expect(hasPose(720, -180), 'positive input drives negative reduced output at both limits').toBe(true);
    expect(hasPose(0, -180), 'the driven mate is never independently overridden').toBe(false);
    expect(hasPose(0, 180), 'the driven mate is never independently overridden').toBe(false);

    expect(integrationObservations).toBe(500);
    expect(maxIntegrationResidualDeg).toBeLessThanOrEqual(5);
    expect(result.failures.filter((failure) => failure.code === 'mechanism.coupling-residual')).toEqual([]);
    expect(result.failures.filter((failure) => failure.code === 'mechanism.physics-unsupported')).toEqual([]);
  }, 60_000);

  it('converts small angle samples from declared degrees, not a magnitude heuristic', async () => {
    const code = readFileSync(MODEL_FILE, 'utf8')
      .replace('limitsDeg: [-720, 720],', 'limitsDeg: [-20, 40],')
      .replace('limitsDeg: [-180, 180],', 'limitsDeg: [-10, 5],');
    const arm = await authoredGearPair(code);
    const setPoses: number[][] = [];

    await checkMechanismTruth(arm, {
      physicsCheck: true,
      physicsSessionFactory: async (xml, bodies, joints) => {
        const session = await loadMujocoSession(xml, bodies, joints);
        const setPose = session.setPose.bind(session);
        session.setPose = (qpos) => {
          setPoses.push([...qpos]);
          setPose(qpos);
        };
        return session;
      },
    });

    const hasPose = (motorDeg: number, rearDeg: number) => setPoses.some((qpos) =>
      Math.abs((qpos[0] ?? 0) - motorDeg * DEG_TO_RAD) < 1e-9
      && Math.abs((qpos[1] ?? 0) - rearDeg * DEG_TO_RAD) < 1e-9,
    );
    expect(hasPose(-20, 5)).toBe(true);
    expect(hasPose(0, 0)).toBe(true);
    expect(hasPose(40, -10)).toBe(true);
  }, 60_000);

  it('bakes the authored input animation through the same signed coupling', async () => {
    const model = await buildModel({
      code: readFileSync(MODEL_FILE, 'utf8'),
      fileName: MODEL_FILE,
      scriptDir: dirname(MODEL_FILE),
    });
    expect(model.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const animation = selectAnimationMetadata(model);
    expect(animation?.tracks.map((track) => track.param)).toEqual(['motorDeg']);
    expect(animation?.tracks[0]?.keys.map((key) => key.value)).toEqual([-720, 0, 720]);

    const baked = await bakeAnimationTimeline(model);
    const axle = baked.parts.find((part) => part.name === 'rear-live-axle');
    expect(axle).toBeDefined();
    const angleAt = (timeMs: number): number => {
      const frame = baked.times.reduce((closest, candidate, index) =>
        Math.abs(candidate - timeMs) < Math.abs(baked.times[closest]! - timeMs) ? index : closest, 0);
      const matrix = axle!.matrices[frame]!;
      return Math.atan2(matrix[8]!, matrix[0]!);
    };
    const wrapDegrees = (radians: number): number => {
      const degrees = radians / DEG_TO_RAD;
      return ((degrees + 180) % 360 + 360) % 360 - 180;
    };
    const zeroCrossing = angleAt(2000);
    const beforeCrossing = wrapDegrees(angleAt(1000) - zeroCrossing);
    const afterCrossing = wrapDegrees(angleAt(3000) - zeroCrossing);

    expect(Math.abs(wrapDegrees(zeroCrossing))).toBeLessThan(2);
    // The 30 fps uniform bake does not land exactly on every 1 s probe.
    expect(Math.abs(beforeCrossing - 90)).toBeLessThan(3);
    expect(Math.abs(afterCrossing + 90)).toBeLessThan(3);
  }, 60_000);
});
