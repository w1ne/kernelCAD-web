// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/kinematic/collision-shapes.kcad.ts is the worked example for
// `part.collision([...])` and the body of cookbook snippet
// `part-collision-convex-pieces`, so it must pass evaluate_script with
// `ok: true` and `mechanism: 'real'`. It failed with 6 errors: the post hinge
// was 44 mm from any base material, the post-to-link connector was 3 mm outside
// the post, and the link tip went through the plate at the lower mate limit.
// The base now has a hinge ear; ear, post and link lap in adjacent X slabs with
// each pivot on the shared face; the limits keep the tip above the plate.
// The example must also still show what it teaches: with one hull the physics
// export reports the link touching the base; with the declared pieces it does
// not.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { assemblyToMjcf } from '../../../src/modeling/runtime/mjcfExport';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const EXAMPLE = 'examples/kinematic/collision-shapes.kcad.ts';
const SNIPPET = 'cookbook/snippets/part-collision-convex-pieces.md';
const DECLARE_PIECES = '\n  .collision([plate, rodA, rodB, ear])';

async function exampleMjcf(code: string): Promise<string> {
  await initOcct();
  const absPath = resolve(EXAMPLE);
  const run = await runScript({ code, fileName: EXAMPLE, scriptDir: dirname(absPath) });
  const arms = Array.from(run.session.assemblies.values()) as readonly Assembly[];
  expect(arms).toHaveLength(1);
  return (await assemblyToMjcf(arms[0])).mjcf;
}

/** Statements only: the header comment differs between the two files. */
const statements = (text: string): string => text.slice(text.indexOf('const plate = '), text.indexOf('return arm.solvedModel({});'));

describe('collision-shapes example passes evaluate_script', () => {
  it('is ok with a real mechanism and no diagnostics', async () => {
    const out = (await callMcpTool('evaluate_script', { file: EXAMPLE, autosave: false } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string; message: string }[];
    };
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 120_000);

  it('the cookbook snippet carries the same statements as the example', () => {
    const example = statements(readFileSync(EXAMPLE, 'utf8'));
    expect(example).toContain(DECLARE_PIECES);
    expect(statements(readFileSync(SNIPPET, 'utf8'))).toBe(example);
  });

  it('exports one collision geom per declared base piece', async () => {
    const mjcf = await exampleMjcf(readFileSync(EXAMPLE, 'utf8'));
    expect(mjcf.match(/<geom type="mesh" mesh="part-base__c\d"/g)).toHaveLength(4);
    expect(mjcf).not.toMatch(/<mesh name="part-base"/);
  }, 120_000);
});

describe.skipIf(!process.env.KCAD_SLOW)('collision-shapes example in MuJoCo', () => {
  it('one base hull contacts the link between the rods; the declared pieces do not', async () => {
    const require_ = createRequire(import.meta.url);
    const pkgDir = dirname(require_.resolve('@mujoco/mujoco'));
    const wasmBinary = await readFile(join(pkgDir, 'mujoco.wasm'));
    const loadMujoco = (await import('@mujoco/mujoco')).default;
    const mujoco = (await loadMujoco({
      wasmBinary,
      locateFile: (path: string) => join(pkgDir, path),
      print: () => undefined,
      printErr: () => undefined,
    })) as unknown as {
      MjModel: { from_xml_string: (s: string) => { delete: () => void } };
      MjData: new (m: unknown) => { ncon: number; delete: () => void };
      mj_forward: (m: unknown, d: unknown) => void;
    };
    const ncon = async (code: string): Promise<number> => {
      const model = mujoco.MjModel.from_xml_string(await exampleMjcf(code));
      const data = new mujoco.MjData(model);
      try {
        mujoco.mj_forward(model, data);
        return Number(data.ncon);
      } finally {
        data.delete();
        model.delete();
      }
    };
    const code = readFileSync(EXAMPLE, 'utf8');
    expect(await ncon(code.replace(DECLARE_PIECES, ''))).toBeGreaterThan(0);
    expect(await ncon(code)).toBe(0);
  }, 240_000);
});
