// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// "Continue in chat" on /p/<slug>: the prompt that takes this project back
// into the visitor's own agent, a copy button, and links that open a chat
// with the prompt filled in.
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button, cx } from '../../ui';
import { chatLinks, resumePrompt } from './-projectPageModel';

type CopyState = 'idle' | 'copied' | 'failed';

/** Copy text to the clipboard; the state resets after two seconds. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCopyText(): { state: CopyState; copy: (text: string) => void } {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = useCallback((text: string) => {
    const done = (next: CopyState) => {
      setState(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState('idle'), 2000);
    };
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      done('failed');
      return;
    }
    navigator.clipboard.writeText(text).then(() => done('copied'), () => done('failed'));
  }, []);
  return { state, copy };
}

export interface ResumePromptProps {
  slug: string;
  title: string;
}

export function ResumePrompt({ slug, title }: ResumePromptProps): JSX.Element {
  const prompt = resumePrompt(slug, title);
  const { state, copy } = useCopyText();
  return (
    <div className="flex flex-col gap-3" data-testid="resume-prompt">
      <p
        className="select-all break-words rounded-control border border-border bg-surface-2 px-3 py-2 font-mono text-code text-fg-2"
        data-testid="resume-prompt-text"
      >
        {prompt}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          variant="secondary"
          size="md"
          onClick={() => copy(prompt)}
          leadingIcon={state === 'copied'
            ? <Check className="size-4 text-ok" strokeWidth={1.75} aria-hidden="true" />
            : <Copy className="size-4" strokeWidth={1.75} aria-hidden="true" />}
          data-testid="resume-prompt-copy"
          className="max-md:h-touch"
        >
          {state === 'copied' ? 'Copied' : 'Copy prompt'}
        </Button>
        <span className="flex items-center gap-1 text-ui text-fg-3">
          or open
          {chatLinks(prompt).map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${link.label} with this prompt`}
              className={cx(
                'focus-ring inline-flex h-control-md items-center gap-0.5 rounded-control px-1.5 text-ui font-medium text-accent hover:bg-surface-2 hover:text-accent-hover max-md:h-touch',
              )}
            >
              {link.label}
              <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            </a>
          ))}
        </span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {state === 'copied' ? 'Prompt copied' : state === 'failed' ? 'Could not copy. Select the prompt and copy it.' : ''}
      </p>
      {state === 'failed' && (
        <p className="text-2xs text-danger">Could not copy. Select the prompt above and copy it.</p>
      )}
    </div>
  );
}
