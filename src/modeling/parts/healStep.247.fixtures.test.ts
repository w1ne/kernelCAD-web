// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStep.247.fixtures.test.ts
//
// Regression for the 247 fixture's large, valid import. The STEP carries 1,026
// same-domain patches; face unification collapses them to 867 faces, which is
// what the 310 mm bore edit was authored against. Without the bounded
// large-import face pass the edit emits 1,027 faces and scores lower.
//
// The benchmark data is external, so this test is skipped unless
// KCAD_CADGENBENCH_DATA points at its data directory. Set KCAD_CADGENBENCH_GATE
// and KCAD_CADGENBENCH_PYTHON to run the official gate on the exported bytes.

import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { importStepCached, isStepBackendHealed } from './stepParseCache';

const DATA = process.env.KCAD_CADGENBENCH_DATA;
const GATE = process.env.KCAD_CADGENBENCH_GATE;
const PYTHON = process.env.KCAD_CADGENBENCH_PYTHON ?? 'python3';

const suite = DATA ? describe : describe.skip;

suite('247 large valid STEP fixture import→export', () => {
  it('collapses same-domain patches without moving the solid', async () => {
    const inputPath = join(DATA!, '247', 'input.step');
    const started = Date.now();
    const backend = await importStepCached(readFileSync(inputPath));
    try {
      expect(Date.now() - started).toBeLessThan(60_000);
      expect(isStepBackendHealed(backend)).toBe(true);
      expect(backend.getReplicadShape().faces.length).toBe(867);
      expect(backend.volume()).toBeCloseTo(51_109_785.21, 0);

      const dir = mkdtempSync(join(tmpdir(), 'kcad-heal-247-'));
      try {
        const outputPath = join(dir, 'output.step');
        writeFileSync(outputPath, Buffer.from(await backend.exportSTEPAsync()));
        if (GATE) {
          const gate = spawnSync(PYTHON, [GATE, outputPath], {
            encoding: 'utf8',
            timeout: 120_000,
          });
          expect(gate.status, `${gate.stdout}\n${gate.stderr}`).toBe(0);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    } finally {
      backend.dispose();
    }
  }, 180_000);
});
