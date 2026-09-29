// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState, type FormEvent, type JSX, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '../../ui';

export interface PromptBoxProps {
  onSubmit: (prompt: string) => void;
  /** Blocks typing and sending (agent unavailable, or a run in progress). */
  disabled?: boolean;
  /** A run is in progress: the send button shows a spinner. */
  busy?: boolean;
  examples?: string[];
  initialValue?: string;
  /** An action next to the send button, e.g. "Sign in" for signed-out visitors. */
  secondaryAction?: ReactNode;
}

const DEFAULT_EXAMPLES = [
  '60x40x5 mm bracket with 4 M3 mounting holes',
  'Hex-cap bolt M8x30',
  'L-bracket 100x60x2 mm, 90° fold along x=50',
];

export function PromptBox({
  onSubmit,
  disabled,
  busy = false,
  examples = DEFAULT_EXAMPLES,
  initialValue = '',
  secondaryAction,
}: PromptBoxProps): JSX.Element {
  const [value, setValue] = useState(initialValue);
  const blocked = disabled || busy;

  function send(): void {
    const trimmed = value.trim();
    if (!trimmed || blocked) return;
    onSubmit(trimmed);
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    send();
  }

  // ⌘/Ctrl+Enter sends; plain Enter makes a new line.
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl text-left" autoComplete="off">
      <div className="rounded-sheet border border-border-strong bg-surface-1 shadow-e1 focus-within:border-accent focus-within:shadow-[0_0_0_1px_var(--kc-accent)]">
        <label htmlFor="prompt" className="sr-only">
          Describe the part
        </label>
        <textarea
          id="prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={blocked}
          placeholder="Describe the part you want, with sizes if you know them…"
          autoComplete="off"
          className="block w-full resize-none rounded-t-sheet bg-transparent px-4 pb-2 pt-4 font-sans text-body text-fg placeholder:text-fg-3 focus:outline-none disabled:cursor-not-allowed disabled:text-fg-2"
        />
        <div className="flex flex-wrap items-center justify-end gap-2 px-3 pb-3">
          {secondaryAction}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            disabled={disabled || !value.trim()}
            className="min-h-touch sm:min-h-0"
            trailingIcon={<ArrowUp className="size-4" strokeWidth={2} aria-hidden="true" />}
          >
            Create
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Examples">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setValue(ex)}
            disabled={blocked}
            className="focus-ring inline-flex min-h-touch items-center rounded-full border border-border bg-surface-1 px-3 text-ui text-fg-2 transition-colors duration-80 hover:border-border-strong hover:text-fg disabled:opacity-50 sm:min-h-control-md"
          >
            {ex}
          </button>
        ))}
      </div>
    </form>
  );
}
