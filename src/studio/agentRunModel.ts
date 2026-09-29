// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The agent pane's logic, kept apart from its components: the step list of
// a run, its log, the failure message and next actions, the prompt a user
// can hand to their own agent, and the size of a proposed change.
import type { GenerationPhase } from '../funnel/hooks/useGeneration';
import type { GenerateEvent } from '../funnel/lib/generateClient';
import type { ProgressStep, StepStatus } from '../ui/ProgressSteps';
import { formatElapsed } from '../ui/progressModel';

/** The run's steps and the server stages (`progress.stage`) that belong to each. */
const RUN_STEPS: ReadonlyArray<{ id: string; label: string; stages: readonly string[] }> = [
    { id: 'plan', label: 'Plan the part', stages: ['planning'] },
    { id: 'write', label: 'Write the script', stages: ['writing_code'] },
    { id: 'check', label: 'Build and check the geometry', stages: ['evaluating', 'fixing'] },
    { id: 'verify', label: 'Verify', stages: ['verifying'] },
];

function stepIndexOf(stage: string): number {
    return RUN_STEPS.findIndex((step) => step.stages.includes(stage));
}

type ProgressEvent = Extract<GenerateEvent, { kind: 'progress' }>;

/** The newest server progress event of each step, by step index. */
function latestProgressByStep(events: readonly GenerateEvent[]): Map<number, ProgressEvent> {
    const byStep = new Map<number, ProgressEvent>();
    for (const e of events) {
        if (e.kind !== 'progress') continue;
        const index = stepIndexOf(e.stage);
        if (index >= 0) byStep.set(index, e);
    }
    return byStep;
}

function progressDetail(e: ProgressEvent | undefined, label: string): string | undefined {
    if (!e) return undefined;
    const parts: string[] = [];
    if (e.message && e.message.toLowerCase() !== label.toLowerCase()) parts.push(e.message);
    if (e.stage === 'fixing' || (e.attempt !== undefined && e.attempt > 1)) {
        parts.push(e.attempt !== undefined ? `attempt ${e.attempt}` : 'fixing');
    }
    return parts.length > 0 ? parts.join(' · ') : undefined;
}

function toolCallCount(events: readonly GenerateEvent[]): number {
    return events.filter((e) => e.kind === 'tool_call').length;
}

/**
 * The step list for a run. Steps before the newest server stage are done,
 * that stage is current, later ones wait. A finished run marks every step
 * done; a partial result marks the step where it stopped and skips the rest;
 * a failed run marks the step it failed in.
 */
export function runSteps(events: readonly GenerateEvent[], phase: GenerationPhase): ProgressStep[] {
    const byStep = latestProgressByStep(events);
    const reached = Math.max(0, ...byStep.keys());
    const tools = toolCallCount(events);

    const statusAt = (index: number): StepStatus => {
        if (phase.state === 'done') {
            if (!phase.partial) return 'done';
            const stopped = stepIndexOf(phase.partial.stage);
            const at = stopped >= 0 ? stopped : RUN_STEPS.length - 1;
            if (index < at) return 'done';
            return index === at ? 'failed' : 'skipped';
        }
        if (index < reached) return 'done';
        if (index > reached) return 'pending';
        if (phase.state === 'error') return phase.code === 'cancelled' ? 'skipped' : 'failed';
        return 'current';
    };

    return RUN_STEPS.map((step, index) => {
        const status = statusAt(index);
        // Only the live or failed step carries a detail line; done steps stay quiet.
        let detail = status === 'current' || status === 'failed' ? progressDetail(byStep.get(index), step.label) : undefined;
        if (status === 'current' && !detail) {
            detail = tools > 0 ? `${tools} tool call${tools === 1 ? '' : 's'}` : index === 0 ? 'Starting…' : undefined;
        }
        if (phase.state === 'done' && phase.partial && status === 'failed') {
            detail = phase.partial.unverified.length > 0
                ? `Not checked: ${phase.partial.unverified.join(', ')}`
                : 'Stopped before this step finished';
        }
        if (phase.state === 'error' && phase.code === 'cancelled' && status === 'skipped') detail = 'Stopped';
        return { id: step.id, label: step.label, status, ...(detail ? { detail } : {}) };
    });
}

/** The card title for a run. */
export function runTitle(phase: GenerationPhase): string {
    switch (phase.state) {
        case 'running':
            return 'Building';
        case 'done':
            return phase.partial ? 'Built, not verified' : 'Built and verified';
        case 'error':
            return phase.code === 'cancelled' ? 'Stopped' : 'Did not finish';
        default:
            return 'Ready';
    }
}

/** The run's elapsed time as the server reports it (0 before any progress). */
export function serverElapsedMs(events: readonly GenerateEvent[]): number {
    let ms = 0;
    for (const e of events) {
        if (e.kind === 'progress' && e.elapsedMs > ms) ms = e.elapsedMs;
    }
    return ms;
}

/** A long run gets an honest note instead of a silent spinner. */
export const SLOW_RUN_MS = 90_000;

export function slowRunNote(elapsedMs: number): string | null {
    if (elapsedMs < SLOW_RUN_MS) return null;
    return 'This is taking longer than usual. Long runs stop at a time limit; you then get the best script so far, if one builds.';
}

/** This request joined a run that was already going (the server said so). */
export function attachedNote(events: readonly GenerateEvent[]): string | null {
    const e = events.find((event) => event.kind === 'attached');
    return e ? 'Joined your earlier run that is still going.' : null;
}

export type LogTone = 'info' | 'ok' | 'retry' | 'error';

export interface LogLine {
    readonly time?: string;
    readonly text: string;
    readonly tone: LogTone;
}

/** The raw run log: every streamed event as one line. */
export function logLines(events: readonly GenerateEvent[]): LogLine[] {
    const lines: LogLine[] = [];
    for (const e of events) {
        switch (e.kind) {
            case 'status':
                lines.push({ text: e.phase === 'tool_calling' ? 'Using tools' : 'Thinking', tone: 'info' });
                break;
            case 'progress':
                lines.push({
                    time: formatElapsed(e.elapsedMs),
                    text: e.attempt !== undefined && e.attempt > 1 ? `${e.message} (attempt ${e.attempt})` : e.message,
                    tone: e.stage === 'fixing' ? 'retry' : 'info',
                });
                break;
            case 'attached':
                lines.push({ text: e.message || 'Joined a run already in progress', tone: 'info' });
                break;
            case 'tool_call':
                lines.push({ text: `→ ${e.name}`, tone: 'info' });
                break;
            case 'tool_result':
                lines.push({ text: `${e.ok ? '✓' : '✗'} ${e.name}`, tone: e.ok ? 'ok' : 'retry' });
                break;
            case 'done':
                lines.push({ time: formatElapsed(e.durationMs), text: e.partial ? 'Done, not verified' : 'Done', tone: 'ok' });
                break;
            case 'error':
                lines.push({ text: `Error (${e.code}): ${e.message}`, tone: 'error' });
                break;
            default:
                break;
        }
    }
    return lines;
}

type ErrorPhase = Extract<GenerationPhase, { state: 'error' }>;

export interface FailureView {
    readonly title: string;
    /** What happened and what to do, in one or two sentences. */
    readonly body: string;
    /** The server's full message, for the Details expander. */
    readonly detail: string;
    /** Send the same request again. */
    readonly retry: boolean;
    /** Send the error back to the agent so it can fix its script. */
    readonly repair: boolean;
}

/** What a failed run means for the user, and the actions that can help. */
export function failureView(phase: ErrorPhase): FailureView {
    const detail = phase.message.trim();
    const base = { detail, retry: true, repair: false };
    switch (phase.code) {
        case 'cancelled':
            return { ...base, title: 'You stopped the run', body: 'Nothing changed in your model. Send it again when you are ready.' };
        case 'rate_limited':
            return { ...base, title: 'Agent limit reached', body: 'Wait a minute and try again, or give the prompt to your own agent.' };
        case 'timeout':
            return {
                ...base,
                repair: detail.length > 0,
                title: 'The run hit the time limit',
                body: 'Large parts can need more time than a hosted run has. Repair sends the last error back to the agent; your own agent can take longer.',
            };
        case 'gate_failed':
        case 'eval_failed':
            return {
                ...base,
                repair: true,
                title: 'The script did not pass the checks',
                body: 'The agent wrote a script, but it did not build or failed a check. Repair sends the error back to the agent.',
            };
        case 'llm_failed':
            return { ...base, title: 'The AI service failed', body: 'This is usually temporary. Try again.' };
        case 'network':
        case 'no_body':
        case 'stream_closed':
            return {
                ...base,
                title: 'Lost the connection to the agent',
                body: 'The run can still be going on the server. Try again: the same request joins that run instead of starting over.',
            };
        default:
            if (/^http_5\d\d$/.test(phase.code)) {
                return { ...base, title: 'The agent service had an error', body: 'Try again in a moment.' };
            }
            return { ...base, title: 'The agent stopped', body: 'Try again, or give the prompt to your own agent.' };
    }
}

/** The follow-up prompt for "Repair": the request plus the error to fix. */
export function repairPrompt(promptText: string, errorMessage: string): string {
    return `${promptText.trim()}\n\nThe previous attempt failed with this error:\n${errorMessage.trim()}\nFix the cause so the script builds and passes the checks.`;
}

/**
 * A prompt for the user's own agent (kernelCAD over MCP): the request, the
 * target, why the hosted run stopped, and the script to start from.
 */
export function ownAgentPrompt(input: {
    promptText: string;
    targetId: string | null;
    code: string;
    failure?: { title: string; detail: string } | null;
}): string {
    const parts = [
        'Use the kernelCAD MCP tools to build this: write the script, evaluate it, and verify it before you answer.',
        '',
        input.promptText.trim(),
    ];
    if (input.targetId) parts.push('', `Change only the feature "${input.targetId}".`);
    if (input.failure) {
        const why = input.failure.detail ? `${input.failure.title}: ${input.failure.detail}` : input.failure.title;
        parts.push('', `The hosted Studio agent did not finish (${why}).`);
    }
    const code = input.code.trim();
    if (code) {
        parts.push('', 'Start from this kernelCAD script:', '```ts', code, '```');
    } else {
        parts.push('', 'Start from an empty model.');
    }
    return parts.join('\n');
}

/** Lines added and removed between two scripts (blank lines ignored). */
export function changeSize(from: string, to: string): { added: number; removed: number } {
    const count = (text: string) => {
        const map = new Map<string, number>();
        for (const line of text.split('\n')) {
            const key = line.trim();
            if (key) map.set(key, (map.get(key) ?? 0) + 1);
        }
        return map;
    };
    const before = count(from);
    const after = count(to);
    let added = 0;
    let removed = 0;
    for (const [line, n] of after) added += Math.max(0, n - (before.get(line) ?? 0));
    for (const [line, n] of before) removed += Math.max(0, n - (after.get(line) ?? 0));
    return { added, removed };
}
