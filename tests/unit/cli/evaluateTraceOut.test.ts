// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `kernelcad evaluate --trace-out <json>` persists the feature trace so a
// later repair pass (or a human reading a CI artifact) can see which script
// line produced which modeling step without re-running the script.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateCommand, evaluateWithEnvelope } from '../../../src/agent/cli/commands/evaluate';

const SCRIPT = [
  'const base = box(40, 30, 20);',
  "const bored = base.hole('top', { u: 0, v: 0, diameter: 6, depth: 25 });",
  'return bored.fillet(1);',
].join('\n');

let workDir: string | undefined;

async function scriptFile(): Promise<string> {
  workDir = await mkdtemp(join(tmpdir(), 'kcad-trace-'));
  const file = join(workDir, 'model.kcad.ts');
  await writeFile(file, SCRIPT, 'utf8');
  return file;
}

describe('kernelcad evaluate --trace-out', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  afterEach(async () => {
    if (workDir !== undefined) await rm(workDir, { recursive: true, force: true });
    workDir = undefined;
  });

  it('omits the trace unless it was asked for', async () => {
    const file = await scriptFile();
    const result = await evaluateWithEnvelope({ file });
    expect(result.exitCode).toBe(0);
    expect(result.trace).toBeUndefined();
  }, 120000);

  it('returns a trace entry per feature when asked', async () => {
    const file = await scriptFile();
    const result = await evaluateWithEnvelope({ file, trace: true });
    expect(result.trace?.map(entry => entry.feature_id)).toEqual([
      'box_1', 'hole_1', 'fillet_1',
    ]);
    const hole = result.trace?.find(entry => entry.feature_id === 'hole_1');
    expect(hole?.location?.line).toBe(2);
    expect(hole?.inputs).toContain('box_1');
    expect(hole?.dependents).toEqual(['fillet_1']);
  }, 120000);

  it('writes the trace to the requested JSON file', async () => {
    const file = await scriptFile();
    const out = join(workDir!, 'trace.json');
    await evaluateCommand().parseAsync([file, '--trace-out', out], { from: 'user' });

    const written = JSON.parse(await readFile(out, 'utf8')) as {
      file: string;
      trace: Array<{ feature_id: string; statementRange?: { startLine: number } }>;
    };
    expect(written.file).toBe(file);
    expect(written.trace.map(entry => entry.feature_id)).toEqual([
      'box_1', 'hole_1', 'fillet_1',
    ]);
    expect(written.trace[2].statementRange?.startLine).toBe(3);
  }, 120000);
});
