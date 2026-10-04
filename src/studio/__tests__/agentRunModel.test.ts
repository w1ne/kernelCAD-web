// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';
import type { GenerateEvent } from '../../funnel/lib/generateClient';
import {
    attachedNote,
    changeSize,
    failureView,
    logLines,
    ownAgentPrompt,
    repairPrompt,
    runSteps,
    runTitle,
    serverElapsedMs,
    slowRunNote,
} from '../agentRunModel';

const RUNNING: GenerationPhase = { state: 'running', lastEvent: { kind: 'status', phase: 'running' } };
const progress = (stage: string, message: string, elapsedMs: number, attempt?: number): GenerateEvent =>
    ({ kind: 'progress', stage, message, elapsedMs, ...(attempt !== undefined ? { attempt } : {}) });
const statuses = (phase: GenerationPhase, events: GenerateEvent[]) => runSteps(events, phase).map((s) => s.status);

describe('runSteps', () => {
    it('starts on the first step before the server reports a stage', () => {
        const steps = runSteps([], RUNNING);
        expect(steps.map((s) => s.status)).toEqual(['current', 'pending', 'pending', 'pending']);
        expect(steps[0].detail).toBe('Starting…');
    });

    it('marks earlier steps done and the newest stage current, with its message and attempt', () => {
        const events = [
            progress('planning', 'Planning the part', 1000),
            progress('writing_code', 'Writing the script', 8000),
            progress('fixing', 'Fixing the script', 60_000, 2),
        ];
        const steps = runSteps(events, RUNNING);
        expect(steps.map((s) => s.status)).toEqual(['done', 'done', 'current', 'pending']);
        expect(steps[2].detail).toBe('Fixing the script · attempt 2');
        // Done steps stay quiet.
        expect(steps[0].detail).toBeUndefined();
    });

    it('counts tool calls on the current step when the server sends no stage message', () => {
        const events: GenerateEvent[] = [
            { kind: 'tool_call', name: 'lookup_api', args: {} },
            { kind: 'tool_call', name: 'evaluate_script', args: {} },
        ];
        expect(runSteps(events, RUNNING)[0].detail).toBe('2 tool calls');
    });

    it('marks the step a run failed in', () => {
        const phase: GenerationPhase = { state: 'error', code: 'timeout', message: 'too slow' };
        expect(statuses(phase, [progress('evaluating', 'Building', 10_000)])).toEqual(['done', 'done', 'failed', 'pending']);
    });

    it('marks a stopped run as skipped, not failed', () => {
        const phase: GenerationPhase = { state: 'error', code: 'cancelled', message: 'Stopped.' };
        const steps = runSteps([progress('writing_code', 'Writing', 5000)], phase);
        expect(steps.map((s) => s.status)).toEqual(['done', 'skipped', 'pending', 'pending']);
        expect(steps[1].detail).toBe('Stopped');
    });

    it('shows a partial result as stopped at its stage, with the checks that did not run', () => {
        const phase: GenerationPhase = {
            state: 'done', generationId: 'g', anonId: 'a',
            artifact: { title: 'T', code: 'x', parameters: [], suggestions: [] },
            partial: { reason: 'timeout', stage: 'evaluating', unverified: ['interference', 'volume'], note: 'n' },
        };
        const steps = runSteps([], phase);
        expect(steps.map((s) => s.status)).toEqual(['done', 'done', 'failed', 'skipped']);
        expect(steps[2].detail).toBe('Not checked: interference, volume');
        expect(runTitle(phase)).toBe('Built, not verified');
    });

    it('marks every step done for a verified result', () => {
        const phase: GenerationPhase = {
            state: 'done', generationId: 'g', anonId: 'a',
            artifact: { title: 'T', code: 'x', parameters: [], suggestions: [] },
        };
        expect(statuses(phase, [])).toEqual(['done', 'done', 'done', 'done']);
        expect(runTitle(phase)).toBe('Built and verified');
    });
});

describe('run notes and log', () => {
    it('takes the newest server elapsed time', () => {
        expect(serverElapsedMs([progress('planning', 'p', 1200), progress('writing_code', 'w', 9000)])).toBe(9000);
        expect(serverElapsedMs([])).toBe(0);
    });

    it('explains a long run only after 90 s', () => {
        expect(slowRunNote(89_000)).toBeNull();
        expect(slowRunNote(90_000)).toMatch(/longer than usual/);
    });

    it('says when a request joined a run already in progress', () => {
        expect(attachedNote([{ kind: 'attached', message: 'x' }])).toMatch(/Joined your earlier run/);
        expect(attachedNote([])).toBeNull();
    });

    it('turns every streamed event into one log line', () => {
        const lines = logLines([
            { kind: 'status', phase: 'tool_calling' },
            progress('fixing', 'Fixing the script', 65_000, 2),
            { kind: 'tool_call', name: 'evaluate_script', args: {} },
            { kind: 'tool_result', name: 'evaluate_script', ok: false },
            { kind: 'error', code: 'timeout', message: 'too slow', generationId: 'g' },
        ]);
        expect(lines).toEqual([
            { text: 'Using tools', tone: 'info' },
            { time: '1:05', text: 'Fixing the script (attempt 2)', tone: 'retry' },
            { text: '→ evaluate_script', tone: 'info' },
            { text: '✗ evaluate_script', tone: 'retry' },
            { text: 'Error (timeout): too slow', tone: 'error' },
        ]);
    });
});

describe('failureView', () => {
    const err = (code: string, message = 'boom'): Extract<GenerationPhase, { state: 'error' }> => ({ state: 'error', code, message });

    it('offers Repair for a time-out or a failed check, and Retry for everything', () => {
        expect(failureView(err('timeout'))).toMatchObject({ title: 'The run hit the time limit', repair: true, retry: true });
        expect(failureView(err('gate_failed'))).toMatchObject({ repair: true });
        expect(failureView(err('eval_failed'))).toMatchObject({ repair: true });
        expect(failureView(err('llm_failed'))).toMatchObject({ title: 'The AI service failed', repair: false, retry: true });
        expect(failureView(err('rate_limited'))).toMatchObject({ title: 'Agent limit reached', repair: false });
    });

    it('explains a lost connection honestly: the run can still be going', () => {
        for (const code of ['network', 'no_body', 'stream_closed']) {
            expect(failureView(err(code)).body).toMatch(/still be going/);
        }
    });

    it('keeps the full server message for Details', () => {
        const long = 'x'.repeat(500);
        expect(failureView(err('timeout', long)).detail).toBe(long);
    });

    it('does not offer Repair for a time-out without an error message', () => {
        expect(failureView(err('timeout', '')).repair).toBe(false);
    });

    it('tells a stopped run apart from a failure', () => {
        expect(failureView(err('cancelled', 'Stopped.')).title).toBe('You stopped the run');
        expect(failureView(err('http_503')).title).toBe('The agent service had an error');
        expect(failureView(err('http_400')).title).toBe('The agent stopped');
    });
});

describe('prompts', () => {
    it('Repair sends the request with the error to fix', () => {
        const text = repairPrompt(' a bracket ', ' cut() failed ');
        expect(text).toBe('a bracket\n\nThe previous attempt failed with this error:\ncut() failed\nFix the cause so the script builds and passes the checks.');
    });

    it('the own-agent prompt carries the request, target, failure and script', () => {
        const text = ownAgentPrompt({
            promptText: 'add a snap-fit lid',
            targetId: 'lid',
            code: 'return box(1);',
            failure: { title: 'The run hit the time limit', detail: 'after 240 s' },
        });
        expect(text).toContain('kernelCAD MCP tools');
        expect(text).toContain('add a snap-fit lid');
        expect(text).toContain('Change only the feature "lid".');
        expect(text).toContain('The hosted Studio agent did not finish (The run hit the time limit: after 240 s).');
        expect(text).toContain('```ts\nreturn box(1);\n```');
    });

    it('the own-agent prompt starts from an empty model when there is no script', () => {
        const text = ownAgentPrompt({ promptText: 'a gear', targetId: null, code: '  ', failure: null });
        expect(text).toContain('Start from an empty model.');
        expect(text).not.toContain('Change only');
        expect(text).not.toContain('did not finish');
    });
});

describe('changeSize', () => {
    it('counts added and removed lines, ignoring blank lines and moved lines', () => {
        expect(changeSize('a\nb\n\nc', 'a\nc\nd\ne')).toEqual({ added: 2, removed: 1 });
        expect(changeSize('', 'a\nb')).toEqual({ added: 2, removed: 0 });
        expect(changeSize('x\nx', 'x')).toEqual({ added: 0, removed: 1 });
    });
});
