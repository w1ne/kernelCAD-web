// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { runScript } from '../../../src/modeling/runtime/runScript';

const sourcePath = resolve(import.meta.dirname, '../../../catalog/kits/industrial-plant/electrical-control-cabinet.kcad.ts');

describe('industrial-plant/electrical-control-cabinet materials', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('uses the same steel finish on both cabinet doors', async () => {
    const { records, paramTable } = await runScript({
      code: readFileSync(sourcePath, 'utf8'),
      fileName: sourcePath,
      scriptDir: dirname(sourcePath),
    });
    const last = records.at(-1);
    expect(last).toBeDefined();

    const recompute = await new RecomputeEngine(new OcctLowerer()).run(records, { paramTable });
    expect(recompute.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const shape = recompute.shapes.get(last!.id);
    expect(isSceneBackend(shape)).toBe(true);
    const colors = new Map((shape as SceneBackend).parts.map((part) => [part.name, part.color]));

    expect(colors.get('door-0')).toBe('#687a83');
    expect(colors.get('door-1')).toBe('#687a83');
    expect(colors.get('plinth')).toBe('#dfa746');
    expect(colors.get('vent-slot-0')).toBe('#dfa746');
  }, 120_000);
});
