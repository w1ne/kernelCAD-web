// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/corpusExpertSuite.ts
//
// Shared harness for the "expert solutions score 100%" corpus suites
// (corpus-v0.2*.test.ts, corpus-v0.3*.test.ts). Extracted so the corpus
// can be split across several test files for CI shard balance without
// duplicating the runner/scoring scaffolding. Each test file calls
// `defineExpertCorpusSuite` with its slice of the task list; the
// assertions and runner inputs are identical to the original single-file
// suites.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from './runner';
import { MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';

export interface CorpusTask {
  id: string;
  dir: string;
}

export function defineExpertCorpusSuite(opts: {
  /** describe(...) title — kept identical across split files of one corpus. */
  describeTitle: string;
  /** mkdtemp prefix, e.g. 'eval-corpus-v0.3-'. */
  tmpPrefix: string;
  /** runTask startedAt marker, e.g. 'CORPUS-V03'. */
  startedAt: string;
  tasks: ReadonlyArray<CorpusTask>;
}): void {
  let kernelcadAvailable = false;
  let runsDir: string;

  beforeAll(async () => {
    kernelcadAvailable = await isKernelcadAvailable();
    // In CI we must fail loudly rather than silently skip — a green build with
    // zero corpus coverage is worse than a red one. Local dev still gets the skip.
    if (!kernelcadAvailable && process.env.CI) {
      throw new Error(
        'kernelcad CLI not available in CI. Set KERNELCAD_BIN=./dist/cli/index.js after `npm run build:cli`, or `npm link`.',
      );
    }
  });

  beforeEach(() => {
    runsDir = mkdtempSync(join(tmpdir(), opts.tmpPrefix));
  });

  describe(opts.describeTitle, () => {
    for (const t of opts.tasks) {
      it(`${t.id} — expert solution scores 100%`, async (ctx) => {
        if (!kernelcadAvailable) return ctx.skip();

        const expertScript = readFileSync(join(t.dir, 'solution-expert.kcad.ts'), 'utf8');
        const client = new MockAgentClient([
          {
            text: 'Here is the part:\n```typescript\n' + expertScript + '\n```',
            tokens_in: 4000,
            tokens_out: 200,
          },
        ]);

        const result = await runTask({
          taskDir: t.dir,
          runDir: runsDir,
          agent: client,
          model: 'mock-model',
          skillMd: 'fake skill content',
          startedAt: opts.startedAt,
        });

        expect(result.score).not.toBeNull();
        expect(result.score!.gate_pass).toBe(true);
        expect(result.score!.score).toBe(1);
        expect(result.score!.attempts).toBe(1);
      }, 60000);
    }
  });
}
