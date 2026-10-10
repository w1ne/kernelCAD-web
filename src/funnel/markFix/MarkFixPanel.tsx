// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** The Mark & fix button and panel drawn over the embed's canvas. */
import { MousePointerClick, X } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../../ui';
import { MAX_NOTE_CHARS, MAX_PICKS, pickLabel, sendBlocker, type EditPick } from './editRequest';

export type SendState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'failed'; message: string };

/** Top row, after Measure and Dimensions. 40 px tall for a thumb. */
export function MarkFixLauncher(props: { disabled: boolean; sent: boolean; onOpen: () => void }) {
  return (
    <div className="absolute left-[100px] top-3 z-20 flex items-center gap-2">
      <button
        type="button"
        data-testid="mark-fix-toggle"
        aria-label="Mark & fix: tap the model to point at what to change"
        title={props.disabled ? 'Available once the model is shown' : 'Tap the model to mark what to change'}
        disabled={props.disabled}
        onClick={props.onOpen}
        className={
          'flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 text-ui font-medium text-fg shadow-lg backdrop-blur transition '
          + 'hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 max-[359px]:[&>span]:sr-only'
        }
      >
        <MousePointerClick size={18} aria-hidden="true" />
        <span>Mark &amp; fix</span>
      </button>
      {props.sent ? (
        <p role="status" data-testid="mark-fix-sent" className="rounded-md bg-surface-1/90 px-2 py-1 text-2xs text-fg-2 shadow">
          Sent to chat
        </p>
      ) : null}
    </div>
  );
}

export function MarkFixPanel(props: {
  picks: readonly EditPick[];
  note: string;
  displayed: boolean;
  send: SendState;
  onNote: (note: string) => void;
  onRemove: (index: number) => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  const noteId = useId();
  const hintId = useId();
  const blocker = sendBlocker({ displayed: props.displayed, picks: props.picks, note: props.note });
  const full = props.picks.length >= MAX_PICKS;
  const hint = props.picks.length === 0
    ? 'Tap the model to drop a pin. Drag still turns the view.'
    : full ? `${MAX_PICKS} pins is the most. Tap a pin to remove it.` : 'Tap more spots, or tap a pin to remove it.';
  return (
    <section
      data-testid="mark-fix-panel"
      aria-label="Mark & fix"
      className="absolute inset-x-2 bottom-2 z-30 mx-auto flex max-w-md flex-col gap-2 rounded-lg border border-border bg-surface-1/95 p-2.5 text-fg shadow-xl backdrop-blur"
      onKeyDown={(e) => { if (e.key === 'Escape') props.onCancel(); }}
    >
      <div className="flex items-start justify-between gap-2">
        <p id={hintId} className="text-ui text-fg-2" aria-live="polite">{hint}</p>
        <button
          type="button"
          aria-label="Cancel Mark & fix"
          onClick={props.onCancel}
          className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-surface-2 hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {props.picks.length > 0 ? (
        <ol className="flex flex-wrap gap-1.5" aria-label="Pins">
          {props.picks.map((pick, i) => (
            <li key={`${i}:${pick.point.join(',')}`}>
              <button
                type="button"
                data-testid="mark-fix-chip"
                aria-label={`Remove pin ${i + 1} (${pickLabel(pick)})`}
                onClick={() => props.onRemove(i)}
                className="flex h-8 max-w-[14rem] items-center gap-1.5 rounded-full border border-border bg-surface-2 pl-1 pr-2.5 text-2xs text-fg hover:border-danger focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-2xs font-semibold text-on-accent">{i + 1}</span>
                <span className="truncate font-mono">{pickLabel(pick)}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      <label htmlFor={noteId} className="sr-only">What should change?</label>
      <textarea
        id={noteId}
        data-testid="mark-fix-note"
        value={props.note}
        maxLength={MAX_NOTE_CHARS}
        rows={2}
        aria-describedby={hintId}
        placeholder="What should change? e.g. make this smoother"
        onChange={(e) => props.onNote(e.target.value)}
        className="w-full resize-none rounded-md border border-border bg-bg px-2.5 py-2 text-base text-fg placeholder:text-fg-3 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {props.send.kind === 'failed' ? (
        <p role="alert" className="text-ui text-danger">{props.send.message}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="lg" onClick={props.onCancel}>Cancel</Button>
        <Button
          variant="primary"
          size="lg"
          data-testid="mark-fix-send"
          disabled={blocker !== null}
          title={blocker ?? undefined}
          loading={props.send.kind === 'sending'}
          onClick={props.onSend}
        >
          Send to chat
        </Button>
      </div>
    </section>
  );
}
