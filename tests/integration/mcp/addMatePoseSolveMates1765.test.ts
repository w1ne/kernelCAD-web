// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// issue #1765 — end-to-end: `add_mate` wrote `{ pose: { param: '<Name>' } }`
// into `.kcad.ts`, which (a) failed the Studio TypeScript check because
// `MatePose` is `Editable<number>` / an Euler triple, and (b) made
// `solve_mates` resolve the object to NaN while still reporting
// `ok: true, status: 'solved'`.
//
// These tests cover: the emitted source type-checks against the mate-mate
// signature and solves to the declared param value; a non-finite pose fails
// loudly; a `solve_mates` override outside `limitsMm` / `limitsDeg` is
// rejected with `kinematic.pose.out-of-limits`.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addMateSourceTool } from '../../../src/agent/mcp/tools/addMateSource';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { solveMatesTool } from '../../../src/agent/mcp/tools/solveMates';
import { lazyTs } from '../../../src/shared/runtime/lazyTypescript';

const SLIDE_SEED = [
  "const stroke = param('Stroke', 25, { min: -40, max: 40 });",
  "const railShape = box(80, 20, 20, true);",
  "const carriageShape = box(20, 10, 10, true);",
  "const rig = assembly('stage');",
  "const rail = rig.part('rail', railShape);",
  "const carriage = rig.part('carriage', carriageShape);",
  "rail.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });",
  "carriage.connector('bore', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });",
  'return rig.model();',
].join('\n');

const HINGE_SEED = [
  "const swing = param('Swing', 45, { min: -90, max: 90 });",
  "const baseShape = box(20, 20, 4, true);",
  "const linkShape = box(10, 2, 2, true);",
  "const arm = assembly('hinge');",
  "const base = arm.part('base', baseShape);",
  "const link = arm.part('link', linkShape);",
  "base.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });",
  "link.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });",
  'return arm.model();',
].join('\n');

/** Minimal Studio signature shim: exactly the rule the emitted pose must
 *  satisfy — `MatePose = Editable<number> | [Editable<number> x 3]`. */
const STUDIO_SHIM = [
  'interface ParamRef<T> { readonly __param: T }',
  'type Editable<T> = T | ParamRef<T>;',
  'type MatePose = Editable<number> | [Editable<number>, Editable<number>, Editable<number>];',
  'interface MateOptions { pose?: MatePose; limitsDeg?: [number, number]; limitsMm?: [number, number] }',
  'interface Part { connector(name: string, spec: { type: string; origin: { kind: string; value: [number, number, number] }; axis?: [number, number, number] }): Part }',
  'interface Assembly {',
  '  part(name: string, shape: unknown): Part;',
  '  mate(name: string, a: string, b: string, type: string, opts?: MateOptions): Assembly;',
  '  model(): unknown;',
  '}',
  'declare function param(name: string, defaultValue: number, meta?: { min?: number; max?: number }): ParamRef<number>;',
  'declare function box(x: number, y: number, z: number, center?: boolean): unknown;',
  'declare function assembly(name: string): Assembly;',
].join('\n');

/** Type-check `source` (a `.kcad.ts` body, `return` allowed) against the shim
 *  with the real TypeScript compiler. */
function studioTypeErrors(source: string): string[] {
  const ts = lazyTs;
  const fileName = '/studio/script.ts';
  const options: import('typescript').CompilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    lib: ['lib.es2022.d.ts'],
  };
  const files = new Map([[fileName, `${STUDIO_SHIM}\nfunction __script() {\n${source}\n}\n`]]);
  const defaultHost = ts.createCompilerHost(options);
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (
    name: string,
    languageVersion: import('typescript').ScriptTarget,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean,
  ) => {
    const text = files.get(name);
    if (text !== undefined) return ts.createSourceFile(name, text, languageVersion, true);
    return defaultHost.getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
  };
  host.fileExists = (name: string) => files.has(name) || defaultHost.fileExists(name);
  host.readFile = (name: string) => files.get(name) ?? defaultHost.readFile(name);
  host.writeFile = () => undefined;
  const program = ts.createProgram({ rootNames: [fileName], options, host });
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
}

describe('add_mate -> solve_mates pose contract (issue #1765)', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60000);

  it('emits the declared param binding, type-checks, and solves to its value', async () => {
    const edit = await addMateSourceTool({
      code: SLIDE_SEED,
      assembly_binding: 'rig',
      name: 'stage-slide',
      a: 'rail.track',
      b: 'carriage.bore',
      type: 'prismatic',
      pose: { param: 'Stroke' },
      limitsMm: [-40, 40],
    });
    expect(edit.ok).toBe(true);
    const code = (edit as { new_code: string }).new_code;
    expect(code).toContain("pose: stroke");
    expect(code).not.toContain('param:');

    // The emitted script compiles under the Studio mate signature.
    expect(studioTypeErrors(code)).toEqual([]);

    const solved = await solveMatesTool({});
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    expect(solved.status).toBe('solved');
    expect(solved.poses.carriage!.translation[0]).toBeCloseTo(25);
  });

  it('accepts a numeric literal pose and still type-checks', async () => {
    const edit = await addMateSourceTool({
      code: SLIDE_SEED,
      assembly_binding: 'rig',
      name: 'stage-slide',
      a: 'rail.track',
      b: 'carriage.bore',
      type: 'prismatic',
      pose: 12,
    });
    expect(edit.ok).toBe(true);
    const code = (edit as { new_code: string }).new_code;
    expect(code).toContain('pose: 12');
    expect(studioTypeErrors(code)).toEqual([]);
    const solved = await solveMatesTool({});
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    expect(solved.poses.carriage!.translation[0]).toBeCloseTo(12);
  });

  it('rejects a hand-written { param } source pose instead of solving NaN', async () => {
    // Negative control: this is what add_mate used to emit. It must fail
    // loudly — never `ok: true` with NaN / null coordinates.
    const broken = SLIDE_SEED.replace(
      'return rig.model();',
      "rig.mate('stage-slide', 'rail.track', 'carriage.bore', 'prismatic', { pose: { param: 'Stroke' } });\nreturn rig.model();",
    );
    expect(studioTypeErrors(broken).join('\n')).toMatch(/param/);

    const evaluated = await evaluateScriptTool({ code: broken, skipMechanismCheck: true });
    expect(evaluated.ok).toBe(false);
    const badPose = evaluated.diagnostics.find((diagnostic) => /not finite/.test(diagnostic.message));
    expect(badPose?.message).toMatch(/stage-slide/);
    expect(badPose?.message).toMatch(/param/);
  });

  it('rejects a { param } object passed as a solve_mates pose override', async () => {
    const edit = await addMateSourceTool({
      code: SLIDE_SEED,
      assembly_binding: 'rig',
      name: 'stage-slide',
      a: 'rail.track',
      b: 'carriage.bore',
      type: 'prismatic',
      pose: 'Stroke',
      limitsMm: [-40, 40],
    });
    expect(edit.ok).toBe(true);

    // An agent that reads the old add_mate `pose` docs may send the object
    // form as an override. It used to resolve to NaN and still solve.
    const solved = await solveMatesTool({
      poses: { 'stage-slide': { param: 'Stroke' } as unknown as number },
    });
    expect(solved.ok).toBe(false);
    if (solved.ok) return;
    expect(solved.error).toMatch(/finite number/i);
    expect(solved.errorCode).toBe('feature.invalid-args');
    expect(solved.errorHint).toMatch(/not a \.kcad\.ts pose/);
  });

  it('rejects a solve_mates override outside limitsMm', async () => {
    const edit = await addMateSourceTool({
      code: SLIDE_SEED,
      assembly_binding: 'rig',
      name: 'stage-slide',
      a: 'rail.track',
      b: 'carriage.bore',
      type: 'prismatic',
      pose: 'Stroke',
      limitsMm: [-40, 40],
    });
    expect(edit.ok).toBe(true);

    const solved = await solveMatesTool({ poses: { 'stage-slide': 95 } });
    expect(solved.ok).toBe(false);
    if (solved.ok) return;
    expect(solved.errorCode).toBe('kinematic.pose.out-of-limits');
    expect(solved.error).toMatch(/stage-slide/);
    expect(solved.error).toMatch(/\[-40, 40\]/);
    expect(solved.poses).toBeUndefined();
  });

  it('rejects a solve_mates override outside limitsDeg', async () => {
    const edit = await addMateSourceTool({
      code: HINGE_SEED,
      assembly_binding: 'arm',
      name: 'pivot',
      a: 'base.pivot',
      b: 'link.pivot',
      type: 'revolute',
      pose: 'Swing',
      limitsDeg: [-90, 90],
    });
    expect(edit.ok).toBe(true);

    const inside = await solveMatesTool({ poses: { pivot: 60 } });
    expect(inside.ok).toBe(true);

    const outside = await solveMatesTool({ poses: { pivot: 200 } });
    expect(outside.ok).toBe(false);
    if (outside.ok) return;
    expect(outside.errorCode).toBe('kinematic.pose.out-of-limits');
    expect(outside.error).toMatch(/\[-90, 90\]/);
  });
});
