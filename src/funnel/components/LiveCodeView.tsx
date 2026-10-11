// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useLayoutEffect, useRef, type JSX } from 'react';
import { cx } from '../../ui/cx';
import { liveCodeHeading, type LiveCode } from '../lib/liveCode';

export interface LiveCodeViewProps {
  readonly live: LiveCode;
  readonly className?: string;
}

/**
 * The script as the agent writes it: a read-only, lightweight <pre> (no
 * Monaco) that follows the newest line until the user scrolls up. Jumps
 * rather than animates, so it is the same with reduced motion; the caret
 * blink stops there too. Not a live region: screen readers would read every
 * chunk, so the step list keeps the announcements.
 */
export function LiveCodeView({ live, className }: LiveCodeViewProps): JSX.Element {
  const box = useRef<HTMLPreElement>(null);
  const stick = useRef(true);

  // A new attempt starts at the top again and follows from there.
  useLayoutEffect(() => {
    stick.current = true;
  }, [live.attempt]);

  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [live.code]);

  return (
    <section aria-label="Script being written" className={cx('flex min-w-0 flex-col', className)} data-testid="live-code">
      <p className="flex items-center gap-1.5 px-3 py-1.5 text-2xs font-medium text-fg-3" data-testid="live-code-heading">
        <span className={live.attempt > 1 && !live.final ? 'text-warn' : undefined}>{liveCodeHeading(live)}</span>
        <span className="tabular-nums">· {lineCount(live.code)} lines</span>
      </p>
      <pre
        ref={box}
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
        }}
        className="focus-ring mx-3 mb-2 max-h-56 overflow-auto whitespace-pre rounded-control border border-border bg-surface-2 p-2 font-mono text-code text-fg-2 max-md:max-h-36"
        data-testid="live-code-text"
      >
        {live.code}
        {!live.final && (
          <span aria-hidden="true" className="ml-px inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] animate-pulse bg-agent motion-reduce:animate-none" />
        )}
      </pre>
    </section>
  );
}

function lineCount(code: string): number {
  if (!code) return 0;
  let n = 1;
  for (let i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) n++;
  return n;
}
