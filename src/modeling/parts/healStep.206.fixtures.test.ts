// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStep.206.fixtures.test.ts
//
// Regression for the large-import face-unification stall. The 206 fixture is
// gate-valid at 637 faces; face unification never finished in the OCCT wasm
// build and blocked the CLI export for more than five minutes. Edge-only
// normalization is bounded and must keep the import gate-valid.
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

suite('206 large valid STEP fixture import→export', () => {
  it('normalizes without a face-unification stall and stays gate-valid', async () => {
    const inputPath = join(DATA!, '206', 'input.step');
    const started = Date.now();
    const backend = await importStepCached(readFileSync(inputPath));
    try {
      // Pre-fix this took >300 s in `ShapeUpgrade_UnifySameDomain` and timed
      // out the CLI export. Edge-only normalization is bounded.
      expect(Date.now() - started).toBeLessThan(60_000);
      expect(isStepBackendHealed(backend)).toBe(true);
      expect(backend.volume()).toBeCloseTo(848_188.793, 2);

      const dir = mkdtempSync(join(tmpdir(), 'kcad-heal-206-'));
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
