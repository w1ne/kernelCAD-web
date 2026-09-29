// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState, type JSX } from 'react';
import { Check, ChevronDown, Copy, RotateCcw, Wrench } from 'lucide-react';
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';
import type { GenerateEvent } from '../../funnel/lib/generateClient';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { ProgressSteps } from '../../ui/ProgressSteps';
import {
    attachedNote,
    failureView,
    logLines,
    runSteps,
    runTitle,
    serverElapsedMs,
    slowRunNote,
    type LogLine,
} from '../agentRunModel';
import { copyPrompt } from '../tabs/checks/draftRepair';
import type { GenerationResolution } from '../hooks/useGenerationReview';

/** Wall time since the run started, ticking once a second while it runs. */
function useRunClock(running: boolean): number {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!running) return;
        const start = Date.now();
        const tick = () => setElapsed(Date.now() - start);
        const first = window.setTimeout(tick, 0);
        const id = window.setInterval(tick, 1000);
        return () => {
            window.clearTimeout(first);
            window.clearInterval(id);
        };
    }, [running]);
    return elapsed;
}

const TONE_CLASS: Record<LogLine['tone'], string> = {
    info: 'text-fg-2',
    ok: 'text-ok',
    retry: 'text-warn',
    error: 'text-danger',
};

/** The raw run log: collapsed by default; follows new lines until the user scrolls up. */
function RunLog({ events }: { events: readonly GenerateEvent[] }): JSX.Element | null {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const stick = useRef(true);
    const lines = logLines(events);

    useEffect(() => {
        const el = box.current;
        if (open && el && stick.current) el.scrollTop = el.scrollHeight;
    }, [open, lines.length]);

    if (lines.length === 0) return null;
    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="focus-ring flex w-full items-center gap-1 px-3 py-1.5 text-left text-2xs font-medium text-fg-3 hover:text-fg max-md:min-h-touch"
                data-testid="agent-run-log-toggle"
            >
                <ChevronDown className={cx('size-3.5 transition-transform duration-80', !open && '-rotate-90')} strokeWidth={1.75} aria-hidden="true" />
                {open ? 'Hide log' : `Show log (${lines.length})`}
            </button>
            {open && (
                <div
                    ref={box}
                    role="log"
                    aria-label="Agent log"
                    tabIndex={0}
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        stick.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
                    }}
                    className="focus-ring max-h-40 overflow-y-auto px-3 pb-2 font-mono text-code"
                    data-testid="agent-run-log"
                >
                    {lines.map((line, i) => (
                        <div key={i} className={cx('flex gap-2', TONE_CLASS[line.tone])}>
                            <span className="w-8 shrink-0 tabular-nums text-fg-3">{line.time ?? ''}</span>
                            <span className="min-w-0 break-words">{line.text}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * The run card: the steps with elapsed time and a stop button while it runs,
 * the step it failed in when it did not finish, and the raw log.
 */
export function RunProgress({
    phase,
    events,
    onCancel,
}: {
    phase: GenerationPhase;
    events: readonly GenerateEvent[];
    onCancel: () => void;
}): JSX.Element | null {
    const running = phase.state === 'running';
    const clock = useRunClock(running);
    if (phase.state !== 'running' && phase.state !== 'error') return null;
    const elapsedMs = Math.max(clock, serverElapsedMs(events));
    const slow = running ? slowRunNote(elapsedMs) : null;
    const attached = attachedNote(events);
    return (
        <ProgressSteps
            title={runTitle(phase)}
            steps={runSteps(events, phase)}
            elapsedMs={elapsedMs}
            onCancel={running ? onCancel : undefined}
            cancelLabel="Stop the run"
            live={running}
            data-testid="agent-run-progress"
        >
            {(slow || attached) && (
                <p className="px-3 py-2 text-2xs text-fg-2" role="status">
                    {attached}{attached && slow ? ' ' : ''}{slow}
                </p>
            )}
            <RunLog events={events} />
        </ProgressSteps>
    );
}

type CopyState = 'idle' | 'copied' | 'failed';

/** A failed run: what happened, the full error on request, and the next actions. */
function GenerationFailure({
    phase,
    onRetry,
    onRepair,
    ownAgentPrompt,
}: {
    phase: Extract<GenerationPhase, { state: 'error' }>;
    onRetry?: () => void;
    onRepair?: (message: string) => void;
    ownAgentPrompt?: (failure: { title: string; detail: string }) => string;
}): JSX.Element {
    const view = failureView(phase);
    const [copy, setCopy] = useState<CopyState>('idle');
    const copyForAgent = async () => {
        if (!ownAgentPrompt) return;
        setCopy((await copyPrompt(ownAgentPrompt(view))) ? 'copied' : 'failed');
    };
    const tone = phase.code === 'cancelled' ? 'border-border bg-surface-2' : 'border-danger/40 bg-danger-soft';
    return (
        <div role="alert" className={cx('flex flex-col gap-2 rounded-panel border p-3', tone)} data-testid="agent-failure">
            <p className={cx('text-ui font-medium', phase.code === 'cancelled' ? 'text-fg' : 'text-danger')}>{view.title}</p>
            <p className="text-ui text-fg-2">{view.body}</p>
            {view.detail && phase.code !== 'cancelled' && (
                <details className="group text-2xs text-fg-2">
                    <summary className="focus-ring cursor-pointer select-none font-medium text-fg-3 hover:text-fg">Details</summary>
                    <p className="mt-1 whitespace-pre-wrap break-words font-mono text-code text-fg-2" data-testid="agent-failure-detail">{view.detail}</p>
                    {phase.generationId && (
                        <p className="mt-1 font-mono text-code text-fg-3">Run id: <span className="select-all">{phase.generationId}</span></p>
                    )}
                </details>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
                {view.repair && onRepair && (
                    <Button variant="agent" size="sm" onClick={() => onRepair(view.detail)}
                        leadingIcon={<Wrench className="size-3.5" strokeWidth={1.75} aria-hidden="true" />}>
                        Repair automatically
                    </Button>
                )}
                {view.retry && onRetry && (
                    <Button variant={view.repair ? 'secondary' : 'agent'} size="sm" onClick={onRetry}
                        leadingIcon={<RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden="true" />}>
                        Try again
                    </Button>
                )}
                {ownAgentPrompt && (
                    <Button variant="ghost" size="sm" onClick={() => void copyForAgent()}
                        leadingIcon={copy === 'copied'
                            ? <Check className="size-3.5 text-ok" strokeWidth={1.75} aria-hidden="true" />
                            : <Copy className="size-3.5" strokeWidth={1.75} aria-hidden="true" />}>
                        {copy === 'copied' ? 'Copied' : 'Copy to your agent'}
                    </Button>
                )}
            </div>
            <p className="text-2xs text-fg-3" aria-live="polite">
                {copy === 'copied' && <>Paste it into your own agent with the kernelCAD MCP server. <a className="text-accent underline-offset-2 hover:underline" href="/connect">How to connect</a></>}
                {copy === 'failed' && 'Could not copy. Select the prompt text and copy it by hand.'}
            </p>
        </div>
    );
}

/**
 * What happened to the last run: the failure card with its next actions,
 * or a one-line confirmation after the proposal was accepted or discarded.
 */
export function GenerationStatus({
    phase,
    reviewing,
    resolution,
    applied = false,
    onRetry,
    onRepair,
    ownAgentPrompt,
}: {
    phase: GenerationPhase;
    reviewing: boolean;
    resolution: GenerationResolution | null;
    /** The staged proposal was approved into the editor. */
    applied?: boolean;
    onRetry?: () => void;
    onRepair?: (message: string) => void;
    ownAgentPrompt?: (failure: { title: string; detail: string }) => string;
}) {
    return (
        <>
            {phase.state === 'done' && !reviewing && resolution?.action === 'staged' && (
                <p className="flex items-start gap-1.5 text-ui text-ok" aria-live="polite" data-testid="agent-resolution">
                    <Check className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    <span className="min-w-0 break-words">
                        {applied
                            ? <>Applied — {phase.artifact.title}. Undo reverts it.</>
                            : <>Staged for review — {phase.artifact.title}. Approve it in the review card on the model.</>}
                    </span>
                </p>
            )}
            {phase.state === 'done' && !reviewing && resolution?.action === 'discarded' && (
                <p className="text-ui text-fg-3 break-words" aria-live="polite" data-testid="agent-resolution">
                    Discarded — {phase.artifact.title}
                </p>
            )}
            {phase.state === 'error' && (
                <GenerationFailure phase={phase} onRetry={onRetry} onRepair={onRepair} ownAgentPrompt={ownAgentPrompt} />
            )}
        </>
    );
}
