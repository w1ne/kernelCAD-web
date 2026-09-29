// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState, type JSX } from 'react';
import { AlertTriangle, Check, Circle, Loader2 } from 'lucide-react';
import { Button, cx } from '../../ui';
import type { GenerateEvent, GenerationPartial } from '../lib/generateClient';
import { formatElapsed } from '../lib/formatElapsed';
import { generationSteps, partialSummary, type ProgressStep } from '../lib/generationProgress';

function StepIcon({ state }: { readonly state: ProgressStep['state'] }): JSX.Element {
  if (state === 'done') return <Check className="size-4 text-ok" strokeWidth={2.25} aria-hidden="true" />;
  if (state === 'current') {
    return <Loader2 className="size-4 animate-spin text-agent-fg motion-reduce:animate-none" strokeWidth={2} aria-hidden="true" />;
  }
  return <Circle className="size-3.5 text-fg-3" strokeWidth={1.75} aria-hidden="true" />;
}

const STATE_LABEL: Record<ProgressStep['state'], string> = { done: 'done', current: 'in progress', pending: 'not started' };

/** Milliseconds since the component mounted (the run started), refreshed every second. */
function useElapsed(): number {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, now - startedAt);
}

export interface GenerationProgressProps {
  readonly events: readonly GenerateEvent[];
}

/**
 * The step list for a running hosted-agent build: done, current (with what it
 * is doing) and pending. Mount it when the run starts; the clock counts from then.
 */
export function GenerationProgress({ events }: GenerationProgressProps): JSX.Element {
  const steps = generationSteps(events);
  const elapsed = useElapsed();
  const current = steps.find((s) => s.state === 'current');
  return (
    <section
      aria-labelledby="gen-progress-title"
      className="mt-6 rounded-panel border border-border bg-surface-1 p-4 text-left shadow-e1 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="gen-progress-title" className="text-body font-semibold text-fg">
          Building your model
        </h2>
        <span className="font-mono text-code text-fg-3 tabular-nums" aria-label={`Elapsed ${formatElapsed(elapsed)}`}>
          {formatElapsed(elapsed)}
        </span>
      </div>
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center">
              <StepIcon state={s.state} />
            </span>
            <span className="min-w-0">
              <span className={cx('text-ui', s.state === 'pending' ? 'text-fg-3' : 'text-fg', s.state === 'current' && 'font-medium')}>
                {s.label}
                <span className="sr-only">, {STATE_LABEL[s.state]}</span>
              </span>
              {s.detail && <span className="block text-ui text-fg-2">{s.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">
        {current ? `${current.label}${current.detail ? `: ${current.detail}` : ''}` : ''}
      </p>
      <p className="mt-3 text-2xs text-fg-3">You can keep this tab in the background; the model opens when it is ready.</p>
    </section>
  );
}

export interface PartialResultProps {
  readonly partial: GenerationPartial;
  readonly onOpen: () => void;
}

/** A run that stopped early but returned a model that builds: say what was not checked, then let the user open it. */
export function PartialResult({ partial, onOpen }: PartialResultProps): JSX.Element {
  return (
    <section role="alert" className="mt-6 rounded-panel border border-warn bg-warn-soft p-4 text-left sm:p-5">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" strokeWidth={1.75} aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-body font-semibold text-fg">Your model is ready, but not fully checked</h2>
          <p className="mt-1 text-ui text-fg-2">{partialSummary(partial)}</p>
          {partial.note && <p className="mt-1 text-ui text-fg-2">{partial.note}</p>}
          <Button variant="primary" size="lg" className="mt-3" onClick={onOpen}>
            Open the model
          </Button>
        </div>
      </div>
    </section>
  );
}
