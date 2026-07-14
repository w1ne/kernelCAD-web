// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it, vi } from 'vitest';
import { evaluateAndBuildScript } from '../../agent/cli/commands/evaluate';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { detectInterferences } from '../runtime/detectInterferences';
import { KernelError } from '../../shared/intent/kernelError';
import { withDefaults } from './clevis';

function makeArm() {
  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('hand');
  arm.part('palm', kc.box(80, 50, 20, true))
    .connector('index-mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [20, 0, 10] },
    });
  return { kc, arm };
}

function digitOptions(overrides: Record<string, unknown> = {}) {
  return {
    name: 'index',
    parentMount: 'palm.index-mount',
    frame: { origin: [20, 0, 10], pinAxis: [0, 0, 1], forward: [1, 0, 0] },
    clearanceMm: 0.8,
    segments: [
      { name: 'proximal', lengthMm: 54, widthMm: 14, depthMm: 12 },
      { name: 'middle', lengthMm: 39, widthMm: 12, depthMm: 11 },
      { name: 'distal', lengthMm: 28, widthMm: 10, depthMm: 10, terminal: true },
    ],
    joints: [
      { name: 'mcp', limitsDeg: [0, 27], style: { knuckleR: 5.4 } },
      { name: 'pip', limitsDeg: [0, 38], style: { knuckleR: 6.4 } },
      { name: 'dip', limitsDeg: [0, 28], style: { knuckleR: 5.2 } },
    ],
    ...overrides,
  };
}

function expectInvalidArgs(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(KernelError);
    expect((error as KernelError).code).toBe('feature.invalid-args');
    return;
  }
  throw new Error('expected joint.articulatedDigit to reject invalid input');
}

describe('joint.articulatedDigit', () => {
  it('lowers every generated package and link into one non-empty physical solid', async () => {
    const evaluated = await evaluateAndBuildScript({
      code: `
        const arm = assembly('lowered-digit');
        arm.part('palm', box(20, 50, 20, true).translate(-10, 0, 0))
          .connector('index-mount', {
            type: 'frame',
            origin: { kind: 'vec3', value: [0, 0, 10] },
          });
        joint.articulatedDigit(arm, {
          name: 'index',
          parentMount: 'palm.index-mount',
          frame: { origin: [0, 0, 10], pinAxis: [0, 0, 1], forward: [1, 0, 0] },
          clearanceMm: 0.8,
          segments: [
            { name: 'proximal', lengthMm: 54, widthMm: 14, depthMm: 12 },
            { name: 'middle', lengthMm: 39, widthMm: 12, depthMm: 11 },
            { name: 'distal', lengthMm: 28, widthMm: 10, depthMm: 10, terminal: true },
          ],
          joints: [
            { name: 'mcp', limitsDeg: [0, 27], style: { knuckleR: 5.4, forkGapY: 7.2, pinCapThickness: 3 } },
            { name: 'pip', limitsDeg: [0, 38], style: { knuckleR: 6.4, forkGapY: 8.5, pinCapThickness: 3.5 } },
            { name: 'dip', limitsDeg: [0, 28], style: { knuckleR: 5.2, forkGapY: 6.8, pinCapThickness: 2.9 } },
          ],
        });
        return arm.solvedModel({}, { validate: 'error' });
      `,
    });

    expect(
      evaluated.evaluation.exitCode,
      JSON.stringify(evaluated.evaluation.diagnostics, null, 2),
    ).toBe(0);
    expect(evaluated.evaluation.diagnostics.some((diagnostic) =>
      diagnostic.code === 'feature.subtractive-noop' || diagnostic.code === 'recompute.input.missing',
    )).toBe(false);
    const scene = evaluated.model?.rootShape ?? evaluated.model?.tailShape;
    if (!isSceneBackend(scene)) throw new Error('expected a lowered articulated-digit assembly scene');
    const generatedNames = ['index-base', 'index-proximal', 'index-middle', 'index-distal'];
    const generated = scene.parts.filter((part) => generatedNames.includes(part.name));
    expect(generated).toHaveLength(generatedNames.length);
    for (const part of generated) {
      expect(part.shape.isEmpty()).toBe(false);
      expect(part.shape.volume()).toBeGreaterThan(0);
      expect(part.shape.solidComponents()).toHaveLength(1);
    }
    const interferences = detectInterferences(scene, 0.01, new Set()).pairs.filter((pair) =>
      generatedNames.includes(pair.a) && generatedNames.includes(pair.b),
    );
    expect(interferences).toEqual([]);
    expect(detectInterferences(scene, 0.01, new Set()).pairs).not.toContainEqual(expect.objectContaining({
      a: 'palm',
      b: 'index-base',
    }));
  }, 120_000);

  it('fuses a wide-gap base yoke to its first clevis package outside an exterior palm', async () => {
    const evaluated = await evaluateAndBuildScript({
      code: `
        const arm = assembly('wide-gap-root-digit');
        arm.part('palm', box(20, 60, 40, true).translate(-10, 0, 0))
          .connector('index-mount', {
            type: 'frame',
            origin: { kind: 'vec3', value: [0, 0, 10] },
          });
        joint.articulatedDigit(arm, {
          name: 'index',
          parentMount: 'palm.index-mount',
          frame: { origin: [0, 0, 10], pinAxis: [0, 0, 1], forward: [1, 0, 0] },
          clearanceMm: 0.8,
          segments: [
            { name: 'proximal', lengthMm: 54, widthMm: 14, depthMm: 12 },
            { name: 'middle', lengthMm: 39, widthMm: 12, depthMm: 11 },
            { name: 'distal', lengthMm: 28, widthMm: 10, depthMm: 10, terminal: true },
          ],
          joints: [
            { name: 'mcp', limitsDeg: [0, 27], style: { knuckleR: 5.4, forkGapY: 20, pinCapThickness: 3 } },
            { name: 'pip', limitsDeg: [0, 38], style: { knuckleR: 6.4, forkGapY: 8.5, pinCapThickness: 3.5 } },
            { name: 'dip', limitsDeg: [0, 28], style: { knuckleR: 5.2, forkGapY: 6.8, pinCapThickness: 2.9 } },
          ],
        });
        return arm.solvedModel({}, { validate: 'error' });
      `,
    });

    expect(
      evaluated.evaluation.exitCode,
      JSON.stringify(evaluated.evaluation.diagnostics, null, 2),
    ).toBe(0);
    const scene = evaluated.model?.rootShape ?? evaluated.model?.tailShape;
    if (!isSceneBackend(scene)) throw new Error('expected a lowered articulated-digit assembly scene');
    const generatedNames = ['index-base', 'index-proximal', 'index-middle', 'index-distal'];
    for (const name of generatedNames) {
      const part = scene.parts.find((candidate) => candidate.name === name);
      if (part === undefined) throw new Error(`expected lowered ${name}`);
      expect(part.shape.solidComponents()).toHaveLength(1);
    }
    const restInterferences = detectInterferences(scene, 0.01, new Set()).pairs;
    expect(restInterferences.filter((pair) =>
      generatedNames.includes(pair.a) && generatedNames.includes(pair.b),
    )).toEqual([]);
    expect(restInterferences).not.toContainEqual(expect.objectContaining({
      a: 'palm',
      b: 'index-base',
    }));
  }, 120_000);

  it('keeps the bounded beam outside its outgoing clevis envelope while fusing the fork-root rails', async () => {
    const evaluated = await evaluateAndBuildScript({
      code: `
        const arm = assembly('bounded-corridor-digit');
        arm.part('palm', box(20, 50, 20, true).translate(-10, 0, 0))
          .connector('index-mount', {
            type: 'frame',
            origin: { kind: 'vec3', value: [20, 0, 10] },
          });
        joint.articulatedDigit(arm, {
          name: 'index',
          parentMount: 'palm.index-mount',
          frame: { origin: [20, 0, 10], pinAxis: [0, 0, 1], forward: [1, 0, 0] },
          clearanceMm: 0.8,
          segments: [
            { name: 'proximal', lengthMm: 54, widthMm: 14, depthMm: 24 },
            { name: 'middle', lengthMm: 39, widthMm: 12, depthMm: 11 },
            { name: 'distal', lengthMm: 28, widthMm: 10, depthMm: 10, terminal: true },
          ],
          joints: [
            { name: 'mcp', limitsDeg: [0, 27], style: { knuckleR: 5.4, forkGapY: 7.2, pinCapThickness: 3 } },
            { name: 'pip', limitsDeg: [0, 38], style: { knuckleR: 6.4, forkGapY: 8.5, pinCapThickness: 3.5 } },
            { name: 'dip', limitsDeg: [0, 28], style: { knuckleR: 5.2, forkGapY: 6.8, pinCapThickness: 2.9 } },
          ],
        });
        return arm.solvedModel({}, { validate: 'error' });
      `,
    });

    expect(
      evaluated.evaluation.exitCode,
      JSON.stringify(evaluated.evaluation.diagnostics, null, 2),
    ).toBe(0);
    const scene = evaluated.model?.rootShape ?? evaluated.model?.tailShape;
    if (!isSceneBackend(scene)) throw new Error('expected a lowered articulated-digit assembly scene');
    const proximal = scene.parts.find((part) => part.name === 'index-proximal');
    if (proximal === undefined) throw new Error('expected lowered proximal link');

    const shape = proximal.shape as OcctBackend;
    // PIP pivot is at local X=54 plus the frame's 20 mm X translation. With
    // Rout=6.4 and the resolved fork plate span ending below Z=7, this
    // region is inside the old full-depth beam but outside all required PIP
    // fork, tongue, and pin-cap material.
    const outsideForkEnvelope = OcctBackend.box(1.5, 6, 2, true)
      .translate(68.75, 0, 11);
    expect(shape.clone().intersect(outsideForkEnvelope).isEmpty()).toBe(true);

    // A rail on the outer fork plate remains, and the completed parent is a
    // single solid: the corridor is attached through clevis material rather
    // than a detached collar or material across the tongue pocket.
    const forkRootRail = OcctBackend.box(1.5, 6, 2, true)
      .translate(68.75, 0, 5.5);
    expect(shape.clone().intersect(forkRootRail).isEmpty()).toBe(false);
    expect(shape.solidComponents()).toHaveLength(1);
  }, 120_000);

  it('uses joint.clevis defaults unchanged for omitted style dimensions', () => {
    const { kc, arm } = makeArm();
    const clevis = vi.spyOn(kc.joint, 'clevis');

    kc.joint.articulatedDigit(arm, digitOptions());

    expect(clevis).toHaveBeenNthCalledWith(1, expect.objectContaining({
      style: withDefaults({ knuckleR: 5.4 }),
    }));
  });

  it('lowers omitted clevis dimensions as one solid per generated part', async () => {
    const evaluated = await evaluateAndBuildScript({
      code: `
        const arm = assembly('default-style-digit');
        arm.part('palm', box(20, 50, 20, true).translate(-10, 0, 0))
          .connector('index-mount', {
            type: 'frame',
            origin: { kind: 'vec3', value: [20, 0, 10] },
          });
        joint.articulatedDigit(arm, {
          name: 'index',
          parentMount: 'palm.index-mount',
          frame: { origin: [20, 0, 10], pinAxis: [0, 0, 1], forward: [1, 0, 0] },
          clearanceMm: 0.8,
          segments: [
            { name: 'proximal', lengthMm: 54, widthMm: 14, depthMm: 12 },
            { name: 'middle', lengthMm: 39, widthMm: 12, depthMm: 11 },
            { name: 'distal', lengthMm: 28, widthMm: 10, depthMm: 10, terminal: true },
          ],
          joints: [
            { name: 'mcp', limitsDeg: [0, 27], style: { knuckleR: 5.4 } },
            { name: 'pip', limitsDeg: [0, 38], style: { knuckleR: 6.4 } },
            { name: 'dip', limitsDeg: [0, 28], style: { knuckleR: 5.2 } },
          ],
        });
        return arm.solvedModel({}, { validate: 'warn' });
      `,
    });

    expect(evaluated.evaluation.exitCode, JSON.stringify(evaluated.evaluation.diagnostics, null, 2)).toBe(0);
    expect(evaluated.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const scene = evaluated.model?.rootShape ?? evaluated.model?.tailShape;
    if (!isSceneBackend(scene)) throw new Error('expected a lowered articulated-digit assembly scene');
    for (const name of ['index-base', 'index-proximal', 'index-middle', 'index-distal']) {
      const part = scene.parts.find((candidate) => candidate.name === name);
      if (part === undefined) throw new Error(`expected lowered ${name}`);
      expect(part.shape.solidComponents()).toHaveLength(1);
    }
  }, 120_000);

  it('builds a three-joint digit directly into an existing arm', () => {
    const { kc, arm } = makeArm();

    const result = kc.joint.articulatedDigit(arm, digitOptions());

    expect(result.partNames).toEqual([
      'index-base',
      'index-proximal',
      'index-middle',
      'index-distal',
    ]);
    expect(arm.__mates().filter((mate) => mate.type === 'revolute')).toHaveLength(3);
    expect(arm.__jointSupportIntents()).toHaveLength(3);
    const revolutes = arm.__mates().filter((mate) => mate.type === 'revolute');
    for (const mate of revolutes) {
      expect(mate.capacity?.structure).toEqual(expect.objectContaining({
        kind: 'clevis-double-shear-v1',
        source: 'joint.clevis',
        forkPlateCount: 2,
        pinDiameterMm: expect.any(Number),
        supportSpanMm: expect.any(Number),
      }));
    }
    for (const support of arm.__jointSupportIntents()) {
      expect(support).toEqual(expect.objectContaining({
        mate: expect.stringMatching(/^index-(mcp|pip|dip)$/),
        shaft: expect.stringMatching(/^index-(base|proximal|middle)$/),
        output: expect.stringMatching(/^index-(proximal|middle|distal)$/),
        requiredSupport: expect.objectContaining({
          kind: 'hinge-bracket',
          clearanceMm: 0.8,
          minBearingLengthMm: expect.any(Number),
        }),
      }));
    }
    expect(arm.__parts().find((part) => part.name === 'index-proximal')?.mateConnectors)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'mcp', type: 'axis' }),
        expect.objectContaining({ name: 'pip', type: 'axis' }),
      ]));
    expect(arm.__parts().find((part) => part.name === 'index-distal')?.mateConnectors)
      .toEqual(expect.arrayContaining([expect.objectContaining({ name: 'tip-frame', type: 'frame' })]));
  });

  it.each([
    ['segment and joint count mismatch', digitOptions({ joints: digitOptions().joints.slice(0, 2) })],
    ['nonorthogonal base frame', digitOptions({ frame: { origin: [20, 0, 10], pinAxis: [0, 0, 1], forward: [0, 0, 1] } })],
    ['nonpositive dimensions', digitOptions({ segments: [{ ...digitOptions().segments[0], widthMm: 0 }, ...digitOptions().segments.slice(1)] })],
    ['segment shorter than package keepouts and the structural web', digitOptions({ segments: [{ ...digitOptions().segments[0], lengthMm: 2 }, ...digitOptions().segments.slice(1)] })],
    ['cross-section too narrow to fuse a link to its clevis package', digitOptions({ segments: [{ ...digitOptions().segments[0], widthMm: 1 }, ...digitOptions().segments.slice(1)] })],
    ['cross-section too shallow to fuse a link to its clevis package', digitOptions({ segments: [{ ...digitOptions().segments[0], depthMm: 1 }, ...digitOptions().segments.slice(1)] })],
  ])('rejects %s before adding parts or mates', (_label, opts) => {
    const { kc, arm } = makeArm();
    const partsBefore = arm.__parts().length;
    const matesBefore = arm.__mates().length;

    expectInvalidArgs(() => kc.joint.articulatedDigit(arm, opts));
    expect(arm.__parts()).toHaveLength(partsBefore);
    expect(arm.__mates()).toHaveLength(matesBefore);
  });

  it.each([
    ['a segment colliding with the generated base name', digitOptions({
      segments: [{ ...digitOptions().segments[0], name: 'base' }, ...digitOptions().segments.slice(1)],
    })],
    ['a joint colliding with the generated root-mount mate name', digitOptions({
      joints: [{ ...digitOptions().joints[0], name: 'base-mount' }, ...digitOptions().joints.slice(1)],
    })],
  ])('rejects %s before adding parts or mates', (_label, opts) => {
    const { kc, arm } = makeArm();
    const partsBefore = arm.__parts().length;
    const matesBefore = arm.__mates().length;

    expectInvalidArgs(() => kc.joint.articulatedDigit(arm, opts));
    expect(arm.__parts()).toHaveLength(partsBefore);
    expect(arm.__mates()).toHaveLength(matesBefore);
  });

  it.each([
    ['the first joint colliding with the generated base mount connector', digitOptions({
      joints: [{ ...digitOptions().joints[0], name: 'mount' }, ...digitOptions().joints.slice(1)],
    })],
    ['the terminal joint colliding with the generated tip frame connector', digitOptions({
      joints: [...digitOptions().joints.slice(0, -1), { ...digitOptions().joints.at(-1)!, name: 'tip-frame' }],
    })],
  ])('rejects %s before adding parts or mates', (_label, opts) => {
    const { kc, arm } = makeArm();
    const partsBefore = arm.__parts().length;
    const matesBefore = arm.__mates().length;

    expectInvalidArgs(() => kc.joint.articulatedDigit(arm, opts));
    expect(arm.__parts()).toHaveLength(partsBefore);
    expect(arm.__mates()).toHaveLength(matesBefore);
  });

  it.each([
    ['a null segment', digitOptions({
      segments: [null as unknown as never, ...digitOptions().segments.slice(1)],
    })],
    ['a null joint', digitOptions({
      joints: [null as unknown as never, ...digitOptions().joints.slice(1)],
    })],
  ])('rejects %s with a KernelError before adding parts or mates', (_label, opts) => {
    const { kc, arm } = makeArm();
    const partsBefore = arm.__parts().length;
    const matesBefore = arm.__mates().length;

    expectInvalidArgs(() => kc.joint.articulatedDigit(arm, opts));
    expect(arm.__parts()).toHaveLength(partsBefore);
    expect(arm.__mates()).toHaveLength(matesBefore);
  });

  it('rejects an inadequate fully omitted R=12 clevis style before capture', () => {
    const { kc, arm } = makeArm();
    const partsBefore = arm.__parts().length;
    const matesBefore = arm.__mates().length;
    const opts = digitOptions({
      joints: [
        { name: 'mcp', limitsDeg: [0, 27] },
        { name: 'pip', limitsDeg: [0, 38] },
        { name: 'dip', limitsDeg: [0, 28] },
      ],
      segments: [
        { ...digitOptions().segments[0], depthMm: 10 },
        ...digitOptions().segments.slice(1),
      ],
    });

    expectInvalidArgs(() => kc.joint.articulatedDigit(arm, opts));
    expect(arm.__parts()).toHaveLength(partsBefore);
    expect(arm.__mates()).toHaveLength(matesBefore);
  });

  it('rejects terminal geometry declared before the final segment', () => {
    const { kc, arm } = makeArm();
    const partsBefore = arm.__parts().length;
    const matesBefore = arm.__mates().length;
    const opts = digitOptions({
      segments: [
        { ...digitOptions().segments[0], terminal: true },
        ...digitOptions().segments.slice(1),
      ],
    });

    expectInvalidArgs(() => kc.joint.articulatedDigit(arm, opts));
    expect(arm.__parts()).toHaveLength(partsBefore);
    expect(arm.__mates()).toHaveLength(matesBefore);
  });

  it('maps an arbitrary frame consistently across shapes and connectors', () => {
    const { kc, arm } = makeArm();
    const result = kc.joint.articulatedDigit(arm, digitOptions({
      frame: {
        origin: [7, -3, 11],
        pinAxis: [0, 1, 1],
        forward: [1, 0, 0],
        liftDir: [0, 1, -1],
      },
    }));
    const base = arm.__parts().find((part) => part.name === 'index-base');
    const distal = arm.__parts().find((part) => part.name === 'index-distal');
    const root = base?.mateConnectors.find((connector) => connector.name === 'mount');
    const tip = distal?.mateConnectors.find((connector) => connector.name === 'tip-frame');

    expect(root?.origin).toEqual({ kind: 'vec3', value: [7, -3, 11] });
    expect(base?.mateConnectors.filter((connector) => connector.type === 'axis')
      .every((connector) => connector.axis?.map((value) => Number(value.toFixed(6))).join(',') === '0,0.707107,0.707107')).toBe(true);
    expect(tip?.origin).toEqual(expect.objectContaining({ kind: 'vec3' }));
    if (tip?.origin.kind === 'vec3') {
      expect(tip.origin.value[1]).toBeCloseTo(-3, 6);
      expect(tip.origin.value[2]).toBeCloseTo(11, 6);
      expect(tip.origin.value[0]).toBeGreaterThan(7);
    }
    expect(result.tipFrame).toBe('index-distal.tip-frame');
  });

  it('reports a soft fit failure without changing physical topology', () => {
    const normal = makeArm();
    const constrained = makeArm();
    const baseline = normal.kc.joint.articulatedDigit(normal.arm, digitOptions());
    const fitted = constrained.kc.joint.articulatedDigit(constrained.arm, digitOptions({
      fit: { maxWidthMm: 1, maxDepthMm: 1, terminalPadLengthMm: 1 },
    }));

    expect(fitted.fit.status).toBe('exceeds-envelope');
    expect(fitted.fit.reasons.join(' ')).toMatch(/width|depth|terminal/i);
    expect(constrained.arm.__parts().map((part) => part.name)).toEqual(normal.arm.__parts().map((part) => part.name));
    expect(constrained.arm.__mates().map((mate) => mate.name)).toEqual(normal.arm.__mates().map((mate) => mate.name));
    expect(fitted.partNames).toEqual(baseline.partNames);
  });
});
