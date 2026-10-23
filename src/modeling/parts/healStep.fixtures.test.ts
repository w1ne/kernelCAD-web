// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStep.fixtures.test.ts
//
// Fixture-backed regression for the import→export repair of the two
// CADGenBench STEP files that carry one unorientable face each (202, 240).
//
// The benchmark data is external to this repository, so the test is skipped
// unless KCAD_CADGENBENCH_DATA points at its data directory. The official
// gate is optional too: set KCAD_CADGENBENCH_GATE to sanity_check_submission.py
// and KCAD_CADGENBENCH_PYTHON to the interpreter that can import cadgenbench.
// When both are set this test runs the exact benchmark gate on the exported
// bytes, not a kernelCAD-only approximation.

import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { importStepCached, isStepBackendHealed } from './stepParseCache';

const DATA = process.env.KCAD_CADGENBENCH_DATA;
const GATE = process.env.KCAD_CADGENBENCH_GATE;
const PYTHON = process.env.KCAD_CADGENBENCH_PYTHON ?? 'python3';

const CASES = [
  // Input solid volume measured with the benchmark's OCP before the repair.
  { id: '202', inputVolumeMm3: 4_381_850.2164, maxRelativeVolumeChange: 0.001 },
  { id: '240', inputVolumeMm3: 99_414.8556, maxRelativeVolumeChange: 0.001 },
] as const;

const suite = DATA ? describe : describe.skip;

suite('unorientable-face STEP fixtures import→export', () => {
  for (const { id, inputVolumeMm3, maxRelativeVolumeChange } of CASES) {
    it(`${id}: heals the face and passes the official gate after export`, async () => {
      const inputPath = join(DATA!, id, 'input.step');
      const backend = await importStepCached(readFileSync(inputPath));
      try {
        expect(isStepBackendHealed(backend)).toBe(true);
        const volume = backend.volume();
        expect(volume).toBeGreaterThan(0);

        // The repair must be local: it may rebuild a degenerate face, but it
        // must not trade the bad face for a missing or changed body.
        expect(Math.abs(volume - inputVolumeMm3) / inputVolumeMm3).toBeLessThan(
          maxRelativeVolumeChange,
        );

        const dir = mkdtempSync(join(tmpdir(), `kcad-heal-${id}-`));
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
  }
});
