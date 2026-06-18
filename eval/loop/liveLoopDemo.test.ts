// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// LIVE end-to-end integration test: drives the REAL closed loop against the
// REAL OCCT CLI (no mocks). A scripted "author" emits a broken model (two
// overlapping parts) then a fixed one; everything else — evaluate, interference
// detection, the typed margin/locus feedback, and convergence — is real.
//
// This is the regression that unit tests (which mocked the oracle) could not
// catch: it proves the loop builds → catches a real BREP interference with
// typed evidence → repairs → passes on real geometry. Requires the CLI build
// (`npm run build:cli`), like the other eval oracle integration tests.
import { describe, it, expect } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runClosedLoop } from '../../src/agent/loop/closedLoop';
import { buildRepairPrompt } from '../../src/agent/loop/repairPrompt';
import type { GateVerdict } from '../../src/agent/loop/types';
import { createWebGateRunner } from './webGateRunner';

const BROKEN = `
const a = assembly('overlap-demo');
a.part('blockA', box(40, 40, 20), { at: [0, 0, 0] });
a.part('blockB', box(40, 40, 20), { at: [20, 0, 0] });
return a.model();
`.trim();

const FIXED = `
const a = assembly('overlap-demo');
a.part('blockA', box(40, 40, 20), { at: [0, 0, 0] });
a.part('blockB', box(40, 40, 20), { at: [50, 0, 0] });
return a.model();
`.trim();

describe('LIVE closed loop on real OCCT', () => {
  it('builds broken → real gate catches interference with typed margin/locus → repairs → passes', async () => {
    const scriptPath = join(tmpdir(), 'liveloop.kcad.ts');
    const drafts = [BROKEN, FIXED];
    let i = 0;
    let firstFailVerdict: GateVerdict | undefined;

    const result = await runClosedLoop({
      prompt: 'two non-overlapping blocks',
      gateRunner: createWebGateRunner(),
      buildRepairPrompt,
      maxAttempts: 3,
      extractScript: (t) => t,
      writeScript: async (code) => {
        await writeFile(scriptPath, code);
        return scriptPath;
      },
      generate: async () => ({ text: drafts[Math.min(i++, drafts.length - 1)], tokensIn: 0, tokensOut: 0 }),
      onEvent: (e) => {
        if (e.type === 'gate_report' && !e.report.ok && !firstFailVerdict) {
          firstFailVerdict = e.report.verdicts.find((v) => v.gate === 'interference' && !v.ok);
        }
      },
    });

    // The loop converged on real geometry: broken first, repaired second.
    expect(result.status).toBe('passed');
    expect(result.attempts).toBe(2);

    // The typed feedback is real (this is what the mocked unit tests missed):
    // the interference verdict from the real CLI carries a numeric margin and a
    // topological locus, not a generic "Interference detected." string.
    expect(firstFailVerdict).toBeDefined();
    expect(firstFailVerdict!.locus).toBe('blockA∩blockB');
    expect(firstFailVerdict!.margin).toBeGreaterThan(15000);
    expect(firstFailVerdict!.code).toBe('interference.overlap');
  }, 120000);
});
