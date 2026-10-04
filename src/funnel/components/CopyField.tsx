// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState, type JSX } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, cx } from '../../ui';

export interface CopyFieldProps {
  /** The text to show and copy. */
  readonly value: string;
  /** Accessible name of the copy button ("Copy MCP URL"). */
  readonly copyLabel: string;
  /** A small caption above the field. */
  readonly caption?: string;
  /** Wrap long text (prompts); single-line values stay mono and scroll. */
  readonly multiline?: boolean;
  /** Called after a successful copy (e.g. to start the connection check). */
  readonly onCopied?: () => void;
  readonly className?: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * A value with a copy button: the MCP URL, an install command, a starter
 * prompt. When the clipboard is blocked, the text is selected so the user
 * can copy it by hand, and the button says so.
 */
export function CopyField({ value, copyLabel, caption, multiline, onCopied, className }: CopyFieldProps): JSX.Element {
  const [state, setState] = useState<CopyState>('idle');
  const textRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const selectText = (): void => {
    const el = textRef.current;
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!el || !sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const copy = async (): Promise<void> => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
      onCopied?.();
    } catch {
      selectText();
      setState('failed');
    }
    timer.current = setTimeout(() => setState('idle'), 2500);
  };

  return (
    <div className={className}>
      {caption && <p className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-fg-3">{caption}</p>}
      <div
        className={cx(
          'flex gap-2 rounded-panel border border-border-strong bg-surface-1 py-1.5 pl-3 pr-1.5',
          multiline ? 'items-end' : 'items-center',
        )}
      >
        <div
          ref={textRef}
          translate="no"
          className={cx(
            'min-w-0 flex-1 py-1 text-fg',
            multiline
              ? 'text-body whitespace-pre-wrap'
              : 'break-all font-mono text-code-lg',
          )}
        >
          {value}
        </div>
        <Button
          size="md"
          variant={state === 'copied' ? 'ghost' : 'secondary'}
          onClick={() => void copy()}
          aria-label={copyLabel}
          className="shrink-0 min-h-touch sm:min-h-0"
          leadingIcon={
            state === 'copied' ? (
              <Check className="size-4 text-ok" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Copy className="size-4" strokeWidth={1.75} aria-hidden="true" />
            )
          }
        >
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy by hand' : 'Copy'}
        </Button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'copied' ? 'Copied to the clipboard' : state === 'failed' ? 'Copy blocked. The text is selected; copy it by hand.' : ''}
      </span>
    </div>
  );
}
