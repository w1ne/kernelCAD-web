// tests/unit/diagnostics/invalidArgsMessages.test.ts
//
// One case per `feature.invalid-args` message family that the 2026-10-03 usage
// triage named as high traffic. Each case asserts the four parts an authoring
// agent needs in order to fix the call without guessing:
//
//   1. the argument path            (so it knows WHICH argument)
//   2. the received value           (so it can see what it actually sent)
//   3. the requirement              (range / units / allowed set / relation)
//   4. an inline example            (so one retry is enough)
//
// The scripts here go through `runScript`, i.e. the same path `evaluate_script`
// uses, so these are the strings a real agent sees.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { isKernelError } from '../../../src/shared/intent/kernelError';
import type { KernelError } from '../../../src/shared/intent/kernelError';

async function raise(code: string): Promise<KernelError> {
  let caught: unknown;
  try {
    await runScript({ code, fileName: 'test.kcad.ts' });
  } catch (e) {
    caught = e;
  }
  if (!isKernelError(caught)) {
    throw new Error(`expected a KernelError, got ${String(caught)}`);
  }
  return caught;
}

interface Family {
  /** Message-family name. */
  name: string;
  code: string;
  /** The argument path the message must name. */
  path: string;
  /** The received value as the message should print it. */
  got: string;
  /** Substrings of the requirement — range, units, allowed set, relation. */
  requires: string[];
  /** A substring of the inline example. */
  example: string;
}

const FAMILIES: Array<Family & { script: string }> = [
  {
    name: 'hole: diameter out of range',
    script: `return box(40, 30, 10).hole('top', { u: 10, v: 10, diameter: 0, depth: 'through' });`,
    code: 'feature.invalid-args',
    path: 'opts.diameter',
    got: 'got 0',
    requires: ['> 0', '1000', '(mm)'],
    example: "diameter: 3.4",
  },
  {
    name: 'hole: diameter wrong type',
    script: `return box(40, 30, 10).hole('top', { u: 10, v: 10, diameter: '3.4', depth: 'through' } as any);`,
    code: 'feature.invalid-args',
    path: 'opts.diameter',
    got: '(string)',
    requires: ['> 0', '(mm)'],
    example: "diameter: 3.4",
  },
  {
    name: 'hole: no depth and no upToFace',
    script: `return box(40, 30, 10).hole('top', { u: 10, v: 10, diameter: 3.4 } as any);`,
    code: 'feature.invalid-args',
    path: 'opts.depth',
    got: 'neither depth nor upToFace',
    requires: ['exactly one', 'upToFace'],
    example: "depth: 'through'",
  },
  {
    name: 'hole: negative depth',
    script: `return box(40, 30, 10).hole('top', { u: 10, v: 10, diameter: 3.4, depth: -5 });`,
    code: 'feature.invalid-args',
    path: 'opts.depth',
    got: 'got -5',
    requires: ['> 0', "'through'", '(mm)'],
    example: 'plate.hole(',
  },
  {
    name: 'hole: counterbore narrower than the bore (a relationship)',
    script: `return box(40, 30, 10).hole('top', { u: 10, v: 10, diameter: 5, depth: 'through', counterbore: { diameter: 4, depth: 2 } });`,
    code: 'feature.invalid-args',
    path: 'opts.counterbore.diameter',
    got: 'got 4',
    // Names the relationship AND both values.
    requires: ['counterbore.diameter > opts.diameter', 'opts.diameter is 5'],
    example: 'counterbore: { diameter: 6.5',
  },
  {
    name: 'hole: countersink angle out of range',
    script: `return box(40, 30, 10).hole('top', { u: 10, v: 10, diameter: 3.4, depth: 'through', countersink: { diameter: 6.5, angleDeg: 200 } });`,
    code: 'feature.invalid-args',
    path: 'opts.countersink.angleDeg',
    got: 'got 200',
    requires: ['< 180', '(deg)', '90'],
    example: 'angleDeg: 90',
  },
  {
    name: 'hole: thread pitch above diameter/4 (a relationship)',
    script: `return box(40, 30, 20).hole('top', { u: 10, v: 10, diameter: 6, depth: 12, thread: { pitch: 3 } });`,
    code: 'feature.invalid-args',
    path: 'opts.thread.pitch',
    got: 'got 3',
    requires: ['opts.diameter / 4', 'opts.diameter is 6', '1.5', '(mm)'],
    example: 'thread: { pitch: 1 }',
  },
  {
    name: 'holes: positions entry not a point',
    script: `return box(40, 30, 10).holes('top', { positions: [{ u: 10, v: 10 }, { u: 'x', v: 10 }] as any, diameter: 3.4, depth: 'through' });`,
    code: 'feature.invalid-args',
    path: 'opts.positions[1].u',
    got: '(string)',
    requires: ['finite number', '(mm)'],
    example: 'positions: [{ u: 10, v: 10 }',
  },
  {
    // A bare PathBuilder is auto-closed by `.cutout()`, so the reachable
    // profile failure is the self-intersecting (bowtie) one; it now names the
    // crossing segment pair and where the crossing starts.
    name: 'cutout: self-intersecting profile',
    script: `return box(40, 30, 10).cutout(path().moveTo(0, 0).lineTo(20, 0).lineTo(0, 10).lineTo(20, 10).close(), { face: 'top', depth: 4 });`,
    code: 'feature.invalid-args',
    path: 'profile segment 1 × segment 3',
    got: 'crosses segment 3',
    requires: ['non-self-intersecting', 'one consistent direction', '(mm)'],
    example: '.close()',
  },
  {
    name: 'cutout: depthMode not in the allowed set',
    script: `return box(40, 30, 10).cutout(path().moveTo(0, 0).lineTo(20, 0).lineTo(20, 10).close(), { face: 'top', depth: 4, depthMode: 'middle' as any });`,
    code: 'feature.invalid-args',
    path: 'opts.depthMode',
    got: '"middle"',
    requires: ["'blind'", "'symmetric'"],
    example: "depthMode: 'symmetric'",
  },
  {
    name: 'fillet: zero radius (early check, was an opaque OCCT failure)',
    script: `return box(40, 30, 10).fillet(0);`,
    code: 'feature.invalid-args',
    path: 'radius',
    got: 'got 0',
    requires: ['> 0', '(mm)'],
    example: 'box(40, 30, 10).fillet(2)',
  },
  {
    name: 'chamfer: negative distance (early check)',
    script: `return box(40, 30, 10).chamfer(-1);`,
    code: 'feature.invalid-args',
    path: 'distance',
    got: 'got -1',
    requires: ['> 0', '(mm)'],
    example: 'box(40, 30, 10).chamfer(1)',
  },
  {
    name: 'fillet: continuity not in the allowed set',
    script: `return box(40, 30, 10).fillet(2, 'top', { continuity: 'G3' } as any);`,
    code: 'feature.invalid-args',
    path: 'opts.continuity',
    got: '"G3"',
    requires: ["'G1'", "'G2'"],
    example: "continuity: 'G2'",
  },
  {
    name: 'shell: zero thickness (early check)',
    script: `return box(40, 30, 10).shell(0, { face: 'top' });`,
    code: 'feature.invalid-args',
    path: 'thickness',
    got: 'got 0',
    requires: ['> 0', '(mm)'],
    example: "shell(2, { face: 'top' })",
  },
  {
    name: 'patternLinear: count below 2',
    script: `return box(10, 10, 10).patternLinear({ count: 1, direction: [1, 0, 0], spacing: 20 });`,
    code: 'feature.invalid-args',
    path: 'opts.count',
    got: 'got 1',
    requires: ['integer', 'TOTAL number of instances'],
    example: 'count: 4',
  },
  {
    name: 'patternLinear: zero spacing',
    script: `return box(10, 10, 10).patternLinear({ count: 4, direction: [1, 0, 0], spacing: 0 });`,
    code: 'feature.invalid-args',
    path: 'opts.spacing',
    got: 'got 0',
    requires: ['centre-to-centre', '(mm)'],
    example: 'spacing: 20',
  },
  {
    name: 'patternCircular: zero sweep',
    script: `return box(10, 10, 10).patternCircular({ count: 6, axis: [0, 0, 1], angleDeg: 0 });`,
    code: 'feature.invalid-args',
    path: 'opts.angleDeg',
    got: 'got 0',
    requires: ['TOTAL sweep', '(deg)'],
    example: 'angleDeg: 360',
  },
  {
    name: 'patternGrid: bad axis direction',
    script: `return box(10, 10, 10).patternGrid({ x: { count: 3, direction: [1, 0] as any, spacing: 20 }, y: { count: 2, direction: [0, 1, 0], spacing: 20 } });`,
    code: 'feature.invalid-args',
    path: 'patternGrid.x.direction',
    got: '[1, 0]',
    requires: ['3-element array'],
    example: 'direction: [1, 0, 0]',
  },
  {
    name: 'sheetMetal: thickness not positive',
    script: `return sheetMetal(path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close(), { thickness: 0, kFactor: 0.42 });`,
    code: 'feature.invalid-args',
    path: 'opts.thickness',
    got: 'got 0',
    requires: ['> 0', 'gauge', '(mm)'],
    example: 'thickness: 1.5',
  },
  {
    name: 'sheetMetal: kFactor out of [0, 1]',
    script: `return sheetMetal(path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close(), { thickness: 1.5, kFactor: 42 });`,
    // Narrower pre-existing code; only the text changed.
    code: 'feature.sheetMetal.kfactor-invalid',
    path: 'opts.kFactor',
    got: 'got 42',
    requires: ['[0, 1]', 'FRACTION of thickness', '0.33'],
    example: 'kFactor: 0.42',
  },
  {
    name: 'bend: radius not positive',
    script: `return sheetMetal(path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close(), { thickness: 1.5, kFactor: 0.42 }).bend({ face: 'right' }, 90, 0);`,
    code: 'feature.invalid-args',
    path: 'radius',
    got: 'got 0',
    requires: ['INNER bend radius', '0.5', '(mm)'],
    example: '.bend(',
  },
  {
    name: 'spurGear: tooth count not an integer in range',
    script: `return spurGear({ module: 1, teeth: 4, faceWidth: 6 });`,
    code: 'feature.invalid-args',
    path: 'opts.teeth',
    got: 'got 4',
    requires: ['[6, 400]', 'module'],
    example: 'teeth: 20',
  },
  {
    name: 'spurGear: unknown option',
    script: `return spurGear({ module: 1, teeth: 20, faceWidth: 6, diametralPitch: 24 } as any);`,
    code: 'feature.invalid-args',
    path: 'opts.diametralPitch',
    got: 'unknown option',
    requires: ['module', 'teeth', 'faceWidth'],
    example: 'spurGear({ module: 1',
  },
  {
    name: 'spurGear: backlash above the module (a relationship)',
    script: `return spurGear({ module: 1, teeth: 20, faceWidth: 6, backlash: 2 });`,
    code: 'feature.invalid-args',
    path: 'opts.backlash',
    got: 'got 2',
    requires: ['[0, module)', 'module is 1', '(mm)'],
    example: 'backlash: 0.15',
  },
  {
    name: 'spurGear: bore leaves no rim (a relationship)',
    script: `return spurGear({ module: 1, teeth: 20, faceWidth: 6, bore: 19 });`,
    code: 'feature.invalid-args',
    path: 'opts.bore',
    got: 'got 19',
    requires: ['root diameter', '(mm)'],
    example: 'bore: 5',
  },
  {
    name: 'spurGear: module wrong type',
    script: `return spurGear({ module: '1' as any, teeth: 20, faceWidth: 6 });`,
    code: 'feature.invalid-args',
    path: 'module',
    got: '(string)',
    requires: ['ISO module', '(mm)'],
    example: 'spurGear({ module: 1',
  },
  {
    name: 'extrudePolygon: unknown option',
    script: `return extrudePolygon([[0, 0], [20, 0], [20, 10], [0, 10]], 5, { twist: 15 } as any);`,
    code: 'feature.invalid-args',
    path: 'opts.twist',
    got: 'unknown option',
    requires: ['faceLabels', 'twistAngle'],
    example: 'extrudePolygon([[0, 0]',
  },
  {
    name: 'torus: tube radius not smaller than the ring (a relationship)',
    script: `return torus(10, 20);`,
    code: 'feature.invalid-args',
    path: 'minorR',
    got: 'got 20',
    requires: ['minorR < majorR', 'majorR is 10', '(mm)'],
    example: 'torus(20, 5)',
  },
  {
    name: 'param: default outside the declared range',
    script: `const w = param('w', 50, { min: 1, max: 10 }); return box(w, 10, 10);`,
    code: 'feature.invalid-args',
    path: "param('w') value",
    got: 'got 50',
    requires: ['meta.max = 10'],
    example: "param('w', 10, { min: 1, max: 10 })",
  },
  {
    name: 'param: min greater than max (unsatisfiable declaration)',
    script: `const w = param('w', 5, { min: 10, max: 2 }); return box(w, 10, 10);`,
    code: 'feature.invalid-args',
    path: "param('w') meta.min",
    got: 'got 10',
    requires: ['meta.min ≤ meta.max', 'meta.max is 2', 'no value can satisfy'],
    example: "min: 2, max: 10",
  },
  {
    name: 'param: value not among the declared choices',
    script: `const f = param('finish', 'brushed', { choices: ['matte', 'gloss'] }); return box(10, 10, 10);`,
    code: 'feature.invalid-args',
    path: "param('finish') value",
    got: '"brushed"',
    requires: ['matte', 'gloss'],
    example: "choices: ['matte', 'gloss']",
  },
  {
    // Hit live on prod 2026-10-03 (serverBuild ae9d960e). The old message said
    // "got <unrepresentable>" and guessed an options-object cause.
    name: "param: .value read on a NUMERIC param (always undefined)",
    script: `const plate = param('PlateThickness', 5, { unit: 'mm' }); return box(60, 40, (plate as any).value);`,
    code: 'feature.invalid-args',
    path: 'z',
    // The received value must be named, not hidden behind a placeholder.
    got: 'got undefined (undefined)',
    requires: [
      '`.value` is always undefined',
      'pass the ref',
      '.add(2)',
      'boolean/choice/string',
      '(mm)',
    ],
    example: "param('t', 10, { unit: 'mm' })",
  },
  {
    name: 'box: dimension argument omitted',
    script: `return (box as any)(60, 40);`,
    code: 'feature.invalid-args',
    path: 'z',
    got: 'got undefined (undefined)',
    requires: ['finite number', '(mm)'],
    example: "param('t', 10, { unit: 'mm' })",
  },
  {
    name: 'param: name not a legal identifier',
    script: `const w = param('wall thickness', 3); return box(w, 10, 10);`,
    code: 'feature.invalid-args',
    path: 'name',
    got: 'wall thickness',
    requires: ['start with a letter', '32'],
    example: "param('wallThickness', 3",
  },
];

describe('feature.invalid-args message families are self-correcting', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  for (const f of FAMILIES) {
    it(`${f.name}: names the path, the value, the requirement and an example`, async () => {
      const err = await raise(f.script);
      expect(err.code).toBe(f.code);
      const text = `${err.message}\n${err.hint ?? ''}`;
      expect(text, 'argument path').toContain(f.path);
      expect(text, 'received value').toContain(f.got);
      for (const r of f.requires) {
        expect(text, `requirement: ${r}`).toContain(r);
      }
      expect(text, 'inline example').toContain(f.example);
      // "Example:" marks the copy-pasteable call in every helper-built message.
      expect(err.message).toContain('Example: ');
    });
  }
});
