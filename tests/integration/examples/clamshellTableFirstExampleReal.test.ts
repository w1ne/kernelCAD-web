// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/exploded/clamshell-table-first.kcad.ts must pass evaluate_script
// with `ok: true` and `mechanism: 'real'`. It failed with 4 errors: the table
// was linked by no mate (orphan-part), and the hinge limit of -15 degrees
// drove the closed lid through the base and the table (2 interpenetration
// errors and a dof-mismatch at the closed pose). The base is now fastened on
// the table with face contact and the hinge opens from 0 to 135 degrees.
//
// The table is still declared first, so mate-axis explode must keep the lid
// on the base/lid hinge axis (X), not on the table/base mate.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { explodedPoses } from '../../../src/modeling/runtime/explodedPoses';

const FILE = 'examples/exploded/clamshell-table-first.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('clamshell-table-first example', () => {
  it('passes evaluate_script with a real mechanism and no diagnostics', async () => {
    const out = (await callMcpTool('evaluate_script', {
      file: FILE,
      autosave: false,
    } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string; message: string }[];
    };
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 120_000);

  it('mate-axis explode moves the lid along the hinge axis', async () => {
    const run = await runScript({ code: readFileSync(FILE, 'utf8'), fileName: 'clamshell-table-first.kcad.ts' });
    const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, {
      paramTable: run.paramTable,
    });
    const arm = [...run.session.assemblies.values()][0] as Assembly;
    let scene: SceneBackend | undefined;
    for (const shape of r.shapes.values()) if (isSceneBackend(shape)) scene = shape;
    if (!scene) throw new Error('expected a SceneBackend');

    const result = await explodedPoses(arm, { factor: 1, mode: 'mate-axis' }, scene);
    const offset = (name: string) => result.parts.find((p) => p.name === name)?.offset;
    expect(offset('table')).toEqual([0, 0, 0]);
    const base = offset('base')!;
    const lid = offset('lid')!;
    // Relative to the base, the lid moves one lid width (300 mm) along +X only.
    expect(lid[0] - base[0]).toBeCloseTo(300, 5);
    expect(lid[1] - base[1]).toBeCloseTo(0, 5);
    expect(lid[2] - base[2]).toBeCloseTo(0, 5);
  }, 120_000);
});
