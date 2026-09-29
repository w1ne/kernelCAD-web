// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { LogIn } from 'lucide-react';
import { Button, buttonClass, ErrorState } from '../../ui';
import { GenerationProgress, PartialResult } from '../../funnel/components/GenerationProgress';
import { PromptBox } from '../../funnel/components/PromptBox';
import { RateLimitedPanel } from '../../funnel/components/RateLimitedPanel';
import { useGeneration } from '../../funnel/hooks/useGeneration';

type GenerationPhase = ReturnType<typeof useGeneration>['phase'];
type GenerationEvents = ReturnType<typeof useGeneration>['events'];

interface GenerateHeroProps {
    readonly agentEnabled: boolean;
    readonly isBusy: boolean;
    readonly initialPrompt: string;
    readonly onSubmit: (prompt: string) => void;
    readonly hasSession: boolean;
    readonly sessionEmail: string | null;
    readonly sessionLoading: boolean;
    readonly phase: GenerationPhase;
    readonly events: GenerationEvents;
    readonly upgradeBusy: boolean;
    readonly onUpgrade: () => void;
    /** Opens the sign-in dialog; the typed prompt is kept. */
    readonly onSignIn: () => void;
    /** Opens a finished model (used when the result is partial and not auto-opened). */
    readonly onOpenResult: () => void;
    /** Re-sends the last prompt after a failure. */
    readonly onRetry: () => void;
}

/** What happened, in plain words, for a failed run. */
function errorTitle(code: string): string {
    if (code === 'network' || code === 'stream_closed') return 'The connection dropped before the model was ready';
    if (code === 'timeout') return 'The build took too long and stopped';
    return 'The model did not build';
}

function GenerateHeroStatus({ phase, events, hasSession, onUpgrade, upgradeBusy, onOpenResult, onRetry }: Pick<
    GenerateHeroProps,
    'phase' | 'events' | 'hasSession' | 'onUpgrade' | 'upgradeBusy' | 'onOpenResult' | 'onRetry'
>): JSX.Element | null {
    if (phase.state === 'running') return <GenerationProgress events={events} />;
    if (phase.state === 'done' && phase.partial) return <PartialResult partial={phase.partial} onOpen={onOpenResult} />;
    if (phase.state !== 'error') return null;
    if (phase.code === 'rate_limited') {
        return <RateLimitedPanel authenticated={hasSession} onUpgrade={onUpgrade} busy={upgradeBusy} />;
    }
    return (
        <div className="mt-6 rounded-panel border border-border bg-surface-1">
            <ErrorState
                title={errorTitle(phase.code)}
                description={
                    <>
                        {phase.message}
                        <span className="mt-2 block">
                            Try again, or give the same description to your own agent.
                        </span>
                    </>
                }
                onRetry={onRetry}
                secondaryAction={
                    <a href="/connect" className={`${buttonClass('secondary', 'md')} no-underline`}>
                        Use your own agent
                    </a>
                }
                errorId={phase.generationId ? `${phase.code} · ${phase.generationId}` : phase.code}
            />
        </div>
    );
}

function SessionLine({ agentEnabled, hasSession, sessionEmail, sessionLoading }: Pick<
    GenerateHeroProps,
    'agentEnabled' | 'hasSession' | 'sessionEmail' | 'sessionLoading'
>): JSX.Element | null {
    if (sessionLoading) return null;
    if (hasSession) {
        return <p className="mt-3 text-ui text-fg-3">Signed in as {sessionEmail ?? 'kernelCAD user'}.</p>;
    }
    // With the built-in agent off, the panel above already offers both ways on.
    if (!agentEnabled) return null;
    return (
        <p className="mt-3 text-ui text-fg-2">
            Sign in to create. What you type is kept.{' '}
            <a href="/connect" className="text-accent underline-offset-2 hover:underline">
                Or connect ChatGPT, Claude or Codex
            </a>
            .
        </p>
    );
}

function AgentUnavailable(): JSX.Element {
    return (
        <div className="mt-4 rounded-panel border border-border bg-surface-1 p-4 text-left sm:p-5">
            <p className="text-body font-semibold text-fg">The built-in agent is off right now</p>
            <p className="mt-1 text-ui text-fg-2">
                Connect your own agent to design models, or open a free example and change it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                <a href="/connect" className={`${buttonClass('primary', 'lg')} no-underline`}>
                    Connect your agent
                </a>
                <a href="/" className={`${buttonClass('secondary', 'lg')} no-underline`}>
                    Try an example
                </a>
            </div>
        </div>
    );
}

function GenerateHero(props: GenerateHeroProps): JSX.Element {
    const { agentEnabled, isBusy, initialPrompt, onSubmit, hasSession, sessionLoading, onSignIn } = props;
    const showSignIn = agentEnabled && !hasSession && !sessionLoading;
    return (
        <header className="mx-auto max-w-2xl pb-16 pt-6 text-center sm:pt-12">
            <h1 lang="en" className="font-serif text-[40px] leading-[1.05] font-medium tracking-tight text-fg [hyphens:auto] sm:text-[64px]">
                Describe your part.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-body text-fg-2 sm:text-title sm:font-normal">
                The agent writes a parametric model, checks that it builds, and opens it for you to change and download.
            </p>

            <div className="mt-8">
                <PromptBox
                    onSubmit={onSubmit}
                    disabled={!agentEnabled}
                    busy={isBusy}
                    initialValue={initialPrompt}
                    secondaryAction={
                        showSignIn ? (
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={onSignIn}
                                className="min-h-touch sm:min-h-0"
                                leadingIcon={<LogIn className="size-4" strokeWidth={1.75} aria-hidden="true" />}
                            >
                                Sign in
                            </Button>
                        ) : undefined
                    }
                />
                {!agentEnabled && <AgentUnavailable />}
                <SessionLine {...props} />
            </div>

            <GenerateHeroStatus {...props} />
        </header>
    );
}

export default GenerateHero;
