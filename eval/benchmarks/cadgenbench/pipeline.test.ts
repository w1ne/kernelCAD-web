// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Pipeline control flow with the kernel stages stubbed: export writes the
// script text as the "STEP", and the pre-check calls a STEP valid unless it
// contains the word OPEN. The kernel stages have their own tests
// (validity.test.ts, the CLI export tests).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MockAgentClient } from '../../agent';
import type { EvaluateResult } from '../../types';
import type { CadGenBenchTask } from './dataset';
import { passthroughScript, runAll, runTask, type PipelineConfig } from './pipeline';
import type { EditPromotionResult } from './editPromotion';
import { readTaskState } from './state';
import { candidatePath } from './submission';
import type { StepValidity } from './validity';

function tasks(root: string): { gen: CadGenBenchTask; edit: CadGenBenchTask } {
  mkdirSync(join(root, 'data/101'), { recursive: true });
  mkdirSync(join(root, 'data/201/renders'), { recursive: true });
  writeFileSync(join(root, 'data/101/input.png'), 'drawing');
  writeFileSync(join(root, 'data/201/input.step'), 'ISO-10303-21; START');
  writeFileSync(join(root, 'data/201/renders/iso.png'), 'render');
  return {
    gen: { id: '101', type: 'generation', dir: join(root, 'data/101'), description: 'Reproduce it.', images: [join(root, 'data/101/input.png')] },
    edit: {
      id: '201',
      type: 'editing',
      dir: join(root, 'data/201'),
      description: 'Drill a 5 mm hole.',
      images: [join(root, 'data/201/renders/iso.png')],
      inputStep: join(root, 'data/201/input.step'),
    },
  };
}

function stubs(counter = { exports: 0, repairs: 0 }): Pick<PipelineConfig, 'exportStep' | 'precheck' | 'repair'> {
  return {
    exportStep: async (script: string, out: string): Promise<EvaluateResult> => {
      counter.exports++;
      const code = readFileSync(script, 'utf8');
      if (code.includes('THROW')) {
        return { ok: false, diagnostics: [{ code: 'cli.script-exception', message: 'ReferenceError: holeRadius is not defined' }] };
      }
      writeFileSync(out, code);
      return { ok: true, diagnostics: [] };
    },
    precheck: async (step: string): Promise<StepValidity> => {
      const open = readFileSync(step, 'utf8').includes('OPEN');
      return {
        valid: !open,
        solidCount: open ? 0 : 1,
        shellCount: 1,
        faceCount: 6,
        brepValid: true,
        watertight: !open,
        meshManifold: !open,
        triangleCount: 12,
        errors: open ? ['BREP not watertight: 1 of 1 shell(s) open'] : [],
      };
    },
    repair: async () => {
      counter.repairs++;
      return false;
    },
  };
}

function cfg(runDir: string, patch: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    runDir,
    agent: null,
    model: 'mock-model',
    skillMd: 'SKILL',
    maxAttempts: 3,
    maxTokens: 1000,
    editFallback: 'none',
    editPromotion: 'off',
    keepInvalid: false,
    ...stubs(),
    ...patch,
  };
}

const reply = (code: string, tokens = 10) => ({ text: '```ts\n' + code + '\n```', tokens_in: tokens, tokens_out: tokens / 2 });

function promo(
  status: EditPromotionResult['status'],
  classification: EditPromotionResult['classification'],
  reason: string,
): EditPromotionResult {
  return {
    status,
    classification,
    reason,
    expectedDirection: 'any',
    volumeDeltaMm3: 0,
    volumeToleranceMm3: 2,
    faceDelta: 0,
    bboxDeltaMm: 0,
    holeCountBefore: 0,
    holeCountAfter: 0,
    holeChangeMm: 0,
  };
}

describe('runTask without an LLM', () => {
  it('records generation as needs_key and writes no candidate', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const s = await runTask(tasks(root).gen, cfg(join(root, 'run')));
    expect(s.status).toBe('needs_key');
    expect(s.error).toMatch(/ANTHROPIC_API_KEY/);
    expect(existsSync(join(root, 'run/tasks/101/prompt.md'))).toBe(true);
    expect(existsSync(candidatePath(join(root, 'run'), '101'))).toBe(false);
    // The folder exists so the zip records the task as missing.
    expect(existsSync(join(root, 'run/submission/101'))).toBe(true);
  });

  it('submits the unchanged input for editing (passthrough through the gate)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const runDir = join(root, 'run');
    const s = await runTask(tasks(root).edit, cfg(runDir));
    expect(s).toMatchObject({ status: 'valid', mode: 'passthrough', precheck: { valid: true } });
    expect(s.fallback).toBeUndefined();
    expect(readFileSync(candidatePath(runDir, '201'), 'utf8')).toBe(passthroughScript());
    expect(readFileSync(join(runDir, 'tasks/201/input.step'), 'utf8')).toBe('ISO-10303-21; START');
  });
});

describe('runTask with an LLM', () => {
  it('asks for code when the model replies with prose instead of exporting prose', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-prose-'));
    const count = {exports:0, repairs:0};
    const agent = new MockAgentClient([{text:'Please provide another view.', tokens_in:1, tokens_out:1}, reply('return box(1,1,1);')]);
    const result = await runTask(tasks(root).gen, cfg(join(root,'run'), {...stubs(count), agent}));
    expect(result.status).toBe('valid');
    expect(count.exports).toBe(1);
    expect(agent.calls[1].messages.at(-1)?.content).toContain('Could not extract a code block');
  });

  it('keeps the valid checkpoint if visual refinement proposes invalid geometry', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-visual-'));
    const runDir = join(root, 'run');
    const agent = new MockAgentClient([reply('return box(1,1,1);'), reply('OPEN')]);
    const s = await runTask(tasks(root).gen, cfg(runDir, { agent, visualReview: true, visualRender: async () => [{ mediaType:'image/png', data:'render' }] }));
    expect(s.status).toBe('valid');
    expect(readFileSync(candidatePath(runDir, '101'), 'utf8')).toBe('return box(1,1,1);');
    expect(agent.calls).toHaveLength(2);
    expect(readFileSync(join(runDir, 'tasks/101/visual-response.md'), 'utf8')).toContain('OPEN');
    expect(existsSync(join(runDir, 'tasks/101/visual-view-1.png'))).toBe(true);
  });

  it('uses a visually revised candidate only after the validity gate passes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-visual-'));
    const runDir = join(root, 'run');
    const agent = new MockAgentClient([reply('return box(1,1,1);'), reply('return box(2,2,2);'), {text:'B', tokens_in:1,tokens_out:1}]);
    const paths: string[] = [];
    const s = await runTask(tasks(root).gen, cfg(runDir, { agent, visualReview: true, visualRender: async path => { paths.push(path); return [{ mediaType:'image/png', data:'render' }]; }, visualComparison: async (a,b) => { paths.push(a,b); return [[{mediaType:'image/png', data:'a'}],[{mediaType:'image/png', data:'b'}]]; } }));
    expect(s.status).toBe('valid');
    expect(readFileSync(candidatePath(runDir, '101'), 'utf8')).toBe('return box(2,2,2);');
    expect(readFileSync(join(runDir, 'tasks/101/model.kcad.ts'), 'utf8')).toBe('return box(2,2,2);');
    expect(readFileSync(join(runDir, 'tasks/101/model.step'), 'utf8')).toBe('return box(2,2,2);');
    expect(readFileSync(join(runDir, 'tasks/101/visual-checkpoint.step'), 'utf8')).toBe('return box(1,1,1);');
    expect(readFileSync(join(runDir, 'tasks/101/visual-comparison.md'), 'utf8')).toBe('B\n');
    expect(existsSync(join(runDir, 'tasks/101/visual-revised-view-1.png'))).toBe(true);
    expect(existsSync(join(runDir, 'tasks/101/visual-comparison-view-1.png'))).toBe(true);
    expect(paths.map(path => basename(path))).toEqual(['model.step', 'model.step', 'visual-review.step']);
    expect(agent.calls[2].messages[0].content).not.toContain('## Output contract');
    expect(agent.calls[2].messages[0].content).toContain('Reproduce it.');
  });
  it('feeds a validity failure back as a repair prompt and accepts the fixed candidate', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const runDir = join(root, 'run');
    const agent = new MockAgentClient([reply('return OPEN;', 100), reply('return box(1, 1, 1);', 60)]);
    const s = await runTask(tasks(root).gen, cfg(runDir, { agent, prices: { inPerMTok: 3, outPerMTok: 15 } }));
    expect(s).toMatchObject({ status: 'valid', mode: 'llm', model: 'mock-model', attempts: 2, tokensIn: 160, tokensOut: 80 });
    expect(s.costUsd).toBeCloseTo((160 * 3 + 80 * 15) / 1e6);
    // The drawing rides on the first user turn only.
    expect(agent.calls[0].messages[0].images).toEqual([{ mediaType: 'image/png', data: Buffer.from('drawing').toString('base64') }]);
    expect(agent.calls[1].messages.slice(1).every((m) => m.images === undefined)).toBe(true);
    const repairTurn = agent.calls[1].messages[2].content;
    expect(repairTurn).toMatch(/cadgenbench\.invalid-brep/);
    expect(repairTurn).toMatch(/BREP not watertight/);
    expect(readFileSync(candidatePath(runDir, '101'), 'utf8')).toBe('return box(1, 1, 1);');
    expect(readFileSync(join(runDir, 'tasks/101/transcript.md'), 'utf8')).toMatch(/# repair prompt/);
  });

  it('keeps an invalid candidate out of the submission unless asked', async () => {
    for (const keepInvalid of [false, true]) {
      const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
      const runDir = join(root, 'run');
      const agent = new MockAgentClient([reply('return OPEN;')]);
      const s = await runTask(tasks(root).gen, cfg(runDir, { agent, maxAttempts: 1, keepInvalid }));
      expect(s.status).toBe('invalid');
      expect(s.precheck?.errors[0]).toMatch(/not watertight/);
      expect(existsSync(candidatePath(runDir, '101'))).toBe(keepInvalid);
    }
  });

  it('runs one deterministic repair when the script does not evaluate, then reports the diagnostic', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const counter = { exports: 0, repairs: 0 };
    const agent = new MockAgentClient([reply('THROW', 5)]);
    const s = await runTask(tasks(root).gen, cfg(join(root, 'run'), { agent, maxAttempts: 1, ...stubs(counter) }));
    expect(counter.repairs).toBe(1);
    expect(s).toMatchObject({ status: 'failed', repaired: true });
    expect(s.error).toMatch(/cli\.script-exception: ReferenceError: holeRadius/);
  });

  it('never silently falls back to the unchanged input after a real edit fails', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const runDir = join(root, 'run');
    const agent = new MockAgentClient([reply('THROW')]);
    const s = await runTask(tasks(root).edit, cfg(runDir, { agent, maxAttempts: 1, editFallback: 'passthrough' }));
    expect(s).toMatchObject({ status: 'failed', mode: 'llm' });
    expect(s.fallback).toBeUndefined();
    expect(s.error).toMatch(/cli\.script-exception/);
    // The editing prompt names the import the script must use.
    expect(agent.calls[0].messages[0].content).toMatch(/lib\.fromSTEP\('\.\/input\.step'\)/);
    expect(existsSync(candidatePath(runDir, '201'))).toBe(false);
  });

  it('feeds a no-op promotion verdict back and accepts the repaired edit', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const runDir = join(root, 'run');
    const agent = new MockAgentClient([reply('return base;'), reply('return edited;')]);
    const s = await runTask(
      tasks(root).edit,
      cfg(runDir, {
        agent,
        maxAttempts: 2,
        editPromotion: async ({ scriptPath }) =>
          readFileSync(scriptPath, 'utf8').includes('base')
            ? promo('failed', 'no-op', 'the exported solid is unchanged')
            : promo('accepted', 'edited', 'real edit'),
      }),
    );
    expect(s).toMatchObject({ status: 'valid', mode: 'llm', attempts: 2 });
    expect(agent.calls[1].messages[2].content).toMatch(/cadgenbench\.edit\.no-op/);
    expect(readFileSync(candidatePath(runDir, '201'), 'utf8')).toBe('return edited;');
  });

  it('rejects a wrong-direction candidate and repairs it', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const runDir = join(root, 'run');
    const agent = new MockAgentClient([reply('return backwards;'), reply('return forwards;')]);
    const s = await runTask(
      tasks(root).edit,
      cfg(runDir, {
        agent,
        maxAttempts: 2,
        editPromotion: async ({ scriptPath }) =>
          readFileSync(scriptPath, 'utf8').includes('backwards')
            ? promo('failed', 'wrong-direction', 'volume moved the wrong way')
            : promo('accepted', 'edited', 'real edit'),
      }),
    );
    expect(s).toMatchObject({ status: 'valid', attempts: 2 });
    expect(agent.calls[1].messages[2].content).toMatch(/cadgenbench\.edit\.wrong-direction/);
    expect(readFileSync(candidatePath(runDir, '201'), 'utf8')).toBe('return forwards;');
  });

  it('submits nothing when every attempt is a no-op', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const runDir = join(root, 'run');
    const agent = new MockAgentClient([reply('return base;')]);
    const s = await runTask(
      tasks(root).edit,
      cfg(runDir, {
        agent,
        maxAttempts: 1,
        editPromotion: async () => promo('failed', 'no-op', 'the exported solid is unchanged'),
      }),
    );
    expect(s).toMatchObject({ status: 'failed', mode: 'llm' });
    expect(s.error).toMatch(/edit promotion.*cadgenbench\.edit\.no-op/);
    expect(existsSync(candidatePath(runDir, '201'))).toBe(false);
  });
});

describe('runAll resume', () => {
  it('reruns rather than trusting a modified STEP from a valid prior task', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-tamper-'));
    const runDir = join(root, 'run');
    const { gen } = tasks(root);
    const scripts = join(root, 'scripts');
    mkdirSync(scripts);
    writeFileSync(join(scripts, '101.kcad.ts'), 'return box(2, 2, 2);');
    const config = cfg(runDir, { scriptsFrom: scripts });
    await runAll([gen], config, { workers: 1, retryFailed: false });
    writeFileSync(candidatePath(runDir, '101'), 'modified');
    const result = (await runAll([gen], config, { workers: 1, retryFailed: false }))[0];
    expect(result).toMatchObject({ status: 'valid', resumed: false });
    expect(readFileSync(candidatePath(runDir, '101'), 'utf8')).toBe('return box(2, 2, 2);');
  });
  it('reruns a previously valid task when its submission STEP is missing', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-resume-'));
    const runDir = join(root, 'run');
    const { gen } = tasks(root);
    const scripts = join(root, 'scripts');
    mkdirSync(scripts);
    writeFileSync(join(scripts, '101.kcad.ts'), 'return box(2, 2, 2);');
    const config = cfg(runDir, { scriptsFrom: scripts });
    expect((await runAll([gen], config, { workers: 1, retryFailed: false }))[0].status).toBe('valid');
    rmSync(candidatePath(runDir, '101'));
    const rerun = (await runAll([gen], config, { workers: 1, retryFailed: false }))[0];
    expect(rerun).toMatchObject({ status: 'valid', resumed: false });
    expect(existsSync(candidatePath(runDir, '101'))).toBe(true);
  });
  it('does not submit a stale candidate when a replacement attempt fails', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const runDir = join(root, 'run');
    const { gen } = tasks(root);
    const scripts = join(root, 'scripts');
    mkdirSync(scripts);
    writeFileSync(join(scripts, '101.kcad.ts'), 'return box(2, 2, 2);');
    const config = cfg(runDir, { scriptsFrom: scripts });
    expect((await runTask(gen, config)).status).toBe('valid');
    writeFileSync(join(scripts, '101.kcad.ts'), 'THROW');
    expect((await runTask(gen, config)).status).toBe('failed');
    expect(existsSync(candidatePath(runDir, '101'))).toBe(false);
    const archive = join(runDir, 'tasks/101/previous-candidates');
    const archived = readdirSync(archive);
    expect(archived).toHaveLength(1);
    expect(readFileSync(join(archive, archived[0]), 'utf8')).toBe('return box(2, 2, 2);');
  });
  it('skips finished tasks and reruns needs_key once a producer exists', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cgb-pipe-'));
    const runDir = join(root, 'run');
    const { gen, edit } = tasks(root);
    const counter = { exports: 0, repairs: 0 };

    const first = await runAll([gen, edit], cfg(runDir, stubs(counter)), { workers: 2, retryFailed: false });
    expect(first.map((s) => [s.id, s.status, s.resumed])).toEqual([
      ['101', 'needs_key', false],
      ['201', 'valid', false],
    ]);
    expect(counter.exports).toBe(1);
    expect(readTaskState(runDir, '201')?.status).toBe('valid');

    // Same producer: nothing reruns.
    const second = await runAll([gen, edit], cfg(runDir, stubs(counter)), { workers: 2, retryFailed: false });
    expect(second.map((s) => s.resumed)).toEqual([false, true]);
    expect(counter.exports).toBe(1);

    // With pre-written scripts both run: needs_key is not terminal, and the
    // passthrough came from a different producer.
    const scripts = join(root, 'scripts');
    mkdirSync(scripts);
    writeFileSync(join(scripts, '101.kcad.ts'), 'return box(2, 2, 2);');
    writeFileSync(join(scripts, '201.kcad.ts'), passthroughScript());
    const third = await runAll([gen, edit], cfg(runDir, { ...stubs(counter), scriptsFrom: scripts }), { workers: 1, retryFailed: false });
    expect(third.map((s) => [s.status, s.mode, s.resumed])).toEqual([
      ['valid', 'scripts-from', false],
      ['valid', 'scripts-from', false],
    ]);
    expect(counter.exports).toBe(3);
  });
});
