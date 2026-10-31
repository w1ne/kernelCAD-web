// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStep.250.fixtures.test.ts
//
// Regression for the 250 fixture: a BRepCheck-valid import with one toroidal
// sliver face (two 0.0188 mm edges sharing both vertices) that every mesher
// turns into an edge shared by four triangles. The import must drop the sliver
// and stay one solid with the same volume, so a passthrough export passes the
// manifold gate.
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

suite('250 sliver-face STEP fixture import→export', () => {
  it('drops the sliver face without moving the solid', async () => {
    const backend = await importStepCached(readFileSync(join(DATA!, '250', 'input.step')));
    try {
      expect(isStepBackendHealed(backend)).toBe(true);
      expect(backend.getReplicadShape().faces.length).toBe(641);
      const dir = mkdtempSync(join(tmpdir(), 'kcad-heal-250-'));
      try {
        const outputPath = join(dir, 'output.step');
        writeFileSync(outputPath, Buffer.from(await backend.exportSTEPAsync()));
        if (GATE) {
          const gate = spawnSync(PYTHON, [GATE, outputPath], { encoding: 'utf8', timeout: 120_000 });
          expect(gate.status, `${gate.stdout}\n${gate.stderr}`).toBe(0);
          expect(JSON.parse(gate.stdout.trim().split('\n').pop()!).valid, gate.stdout).toBe(true);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    } finally {
      backend.dispose();
    }
  }, 300_000);
});
