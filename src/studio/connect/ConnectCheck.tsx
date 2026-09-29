// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState, type JSX, type ReactNode } from 'react';
import { CheckCircle2, Clock, Loader2, LogIn } from 'lucide-react';
import { Button, buttonClass, ErrorState } from '../../ui';
import { formatElapsed } from '../../funnel/lib/formatElapsed';
import type { WatchState } from './firstModelWatch';

/** Date.now(), refreshed every second while `active`, so a clock can tick between polls. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export interface ConnectCheckProps {
  readonly state: WatchState;
  /** When the current watch started (ms since epoch). */
  readonly since: number;
  readonly onRestart: () => void;
  /** Where "Sign in" returns to. */
  readonly signInHref: string;
}

/** Step 3 of /connect: shows the first model the agent saves, as proof the connection works. */
export function ConnectCheck(props: ConnectCheckProps): JSX.Element {
  const now = useNow(props.state.kind === 'watching');
  const waited = Math.max(0, now - props.since);
  return (
    <div aria-live="polite" className="rounded-panel border border-border bg-surface-1 p-4 sm:p-5">
      <ConnectCheckBody {...props} waited={waited} />
    </div>
  );
}

function ConnectCheckBody({ state, waited, onRestart, signInHref }: ConnectCheckProps & { readonly waited: number }): JSX.Element {
  switch (state.kind) {
    case 'signed_out':
      return (
        <Row icon={<LogIn className="size-5 text-fg-2" strokeWidth={1.75} aria-hidden="true" />} title="Sign in to see it land here">
          <p>Use the same account you signed in with in your agent. This page then shows your first saved model.</p>
          <a href={signInHref} className={`${buttonClass('secondary', 'lg')} mt-3 no-underline`}>
            Sign in
          </a>
        </Row>
      );
    case 'watching':
      return (
        <Row
          icon={<Loader2 className="size-5 animate-spin text-accent motion-reduce:animate-none" strokeWidth={1.75} aria-hidden="true" />}
          title="Waiting for your first model…"
          meta={formatElapsed(waited)}
        >
          <p>Run the starter prompt in your agent. When it saves the model, it shows up here.</p>
        </Row>
      );
    case 'found':
      return (
        <Row icon={<CheckCircle2 className="size-5 text-ok" strokeWidth={2} aria-hidden="true" />} title="It works: your agent saved a model">
          <p className="truncate font-medium text-fg">{state.project.title || 'Untitled model'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`/p/${encodeURIComponent(state.project.slug)}`} className={`${buttonClass('primary', 'lg')} no-underline`}>
              Open the model
            </a>
            <a href="/me" className={`${buttonClass('secondary', 'lg')} no-underline`}>
              Your projects
            </a>
          </div>
        </Row>
      );
    case 'timeout':
      return (
        <Row icon={<Clock className="size-5 text-warn" strokeWidth={1.75} aria-hidden="true" />} title="No model yet">
          <p>
            Check that kernelCAD is turned on in the chat and that the agent opened the model in Studio. Only saved models
            show up here.
          </p>
          <Button variant="secondary" size="lg" className="mt-3" onClick={onRestart}>
            Watch again
          </Button>
        </Row>
      );
    case 'error':
      return (
        <ErrorState
          className="py-2"
          title="Could not load your projects"
          description={state.message}
          onRetry={onRestart}
          secondaryAction={
            <a href="/me" className={`${buttonClass('secondary', 'md')} no-underline`}>
              Open your projects
            </a>
          }
        />
      );
  }
}

function Row({ icon, title, meta, children }: { icon: JSX.Element; title: string; meta?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1 text-ui text-fg-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-body font-semibold text-fg">{title}</h3>
          {meta && <span className="font-mono text-code text-fg-3 tabular-nums">{meta}</span>}
        </div>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
