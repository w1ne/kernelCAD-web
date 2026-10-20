// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { Download, FileUp, Trash2, X } from 'lucide-react';
import { formatDiameter, formatLength } from '../measure/measureMath';
import { serializeMarkupSnapshot } from '../../../markup/markupSnapshot';
import { MARKUP_NOTE_MAX_LENGTH } from '../../../markup/markupLimits';
import { markupStore } from '../../../markup/markupStore';

const FIELD = 'w-full resize-y rounded-control border border-border bg-surface-2 px-2 py-1.5 text-ui text-fg placeholder:text-fg-3 focus-ring';
const ACTION = 'focus-ring inline-flex min-h-control items-center justify-center gap-1 rounded-control px-2 text-ui text-fg-2 hover:bg-surface-3 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

function downloadSnapshot(setError: (error: string) => void): void {
  try {
    const serialized = serializeMarkupSnapshot(markupStore.captureSnapshot());
    const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'studio-markup.snapshot.json';
    link.click();
    URL.revokeObjectURL(url);
    setError('');
  } catch (error) {
    setError(error instanceof Error
      ? `Could not save snapshot: ${error.message}`
      : 'Could not save snapshot JSON. Check the current camera and markup, then try again.');
  }
}

function PanelFeedback({ error, message }: { error: string | null; message: string }) {
  return <>
    {error && <p role="alert" className="mt-3 break-words text-2xs text-danger">{error}</p>}
    {message && <p role="status" className="mt-3 break-words text-2xs text-fg-2">{message}</p>}
  </>;
}

function ClearAllMarkupButton({ disabled, onClear }: { disabled: boolean; onClear: () => void }) {
  return <button type="button" className={`${ACTION} mt-4 w-full border border-border`} disabled={disabled} onClick={onClear}>
    <Trash2 size={14} />Clear all markup
  </button>;
}

export function MarkupPanel() {
  const state = useSyncExternalStore(markupStore.subscribe, markupStore.getSnapshot, markupStore.getSnapshot);
  const picker = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  if (!state.panelOpen) return null;

  async function loadSnapshot(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      markupStore.loadSnapshot(await file.text());
      setSaveError('');
      setMessage('Snapshot loaded. The camera and markup were restored.');
    } catch (error) {
      setSaveError(error instanceof Error ? `Could not load snapshot: ${error.message}` : 'Could not load snapshot JSON.');
    }
    input.value = '';
  }

  return (
    <aside
      aria-label="Markup panel"
      data-testid="markup-panel"
      className="pointer-events-auto absolute right-3 top-14 z-30 flex max-h-[calc(100%-4.5rem)] w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-panel border border-border bg-surface-1 text-fg shadow-e2"
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-ui font-semibold">Markup</h2>
        <button type="button" aria-label="Close markup" className={ACTION} onClick={() => markupStore.closePanel()}><X size={14} /></button>
      </header>
      <div className="min-h-0 overflow-y-auto p-3">
        <p className="mb-2 text-2xs text-fg-2">Write a note, then click a point on the model to anchor it.</p>
        <textarea
          aria-label="New note text"
          data-testid="markup-note-draft"
          className={FIELD}
          rows={2}
          maxLength={MARKUP_NOTE_MAX_LENGTH}
          placeholder="e.g. Keep this mounting face flat"
          value={state.draftText}
          onChange={(event) => markupStore.setDraftText(event.currentTarget.value)}
        />
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            aria-pressed={state.mode === 'note'}
            className={`${ACTION} ${state.mode === 'note' ? 'bg-accent text-on-accent' : 'bg-surface-2'}`}
            onClick={() => markupStore.setMode(state.mode === 'note' ? 'off' : 'note')}
          >
            {state.mode === 'note' ? 'Stop placing notes' : 'Place note'}
          </button>
          <button type="button" className={ACTION} onClick={() => downloadSnapshot(setSaveError)}><Download size={14} />Save JSON</button>
          <button type="button" className={ACTION} onClick={() => picker.current?.click()}><FileUp size={14} />Load JSON</button>
          <input ref={picker} type="file" accept="application/json,.json" aria-label="Choose markup snapshot" className="hidden" onChange={(event) => void loadSnapshot(event)} />
        </div>

        <section className="mt-4" aria-label="Notes">
          <h3 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-3">Notes</h3>
          {state.notes.length === 0 ? <p className="text-2xs text-fg-3">No notes yet.</p> : (
            <ul className="space-y-2">
              {state.notes.map((note, index) => (
                <li key={note.id} className="flex items-start gap-1 rounded-control border border-border bg-surface-2 p-1.5">
                  <textarea aria-label={`Edit note ${index + 1}`} className={`${FIELD} min-h-10`} rows={2} maxLength={MARKUP_NOTE_MAX_LENGTH} value={note.text} onChange={(event) => markupStore.updateNote(note.id, event.currentTarget.value)} onBlur={() => markupStore.commitNote(note.id)} />
                  <button type="button" className={ACTION} aria-label={`Remove note ${index + 1}`} onClick={() => markupStore.removeNote(note.id)}><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4" aria-label="Measurements">
          <h3 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-3">Measurements</h3>
          {state.measurements.length === 0 ? <p className="text-2xs text-fg-3">Use Measure in the toolbar to add a point-to-point measurement.</p> : (
            <ul className="space-y-1">
              {state.measurements.map((measurement) => (
                <li key={measurement.id} className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface-2 px-2 py-1">
                  <span className="text-ui">{measurement.type === 'diameter' ? 'Diameter' : 'Distance'} · {measurement.type === 'diameter' ? formatDiameter(measurement.value) : formatLength(measurement.value)}</span>
                  <button type="button" className={ACTION} aria-label={`Remove measurement ${measurement.id}`} onClick={() => markupStore.removeMeasurement(measurement.id)}><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4" aria-label="Picked topology">
          <h3 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-3">Picked topology</h3>
          {state.topologyRefs.length === 0 ? <p className="text-2xs text-fg-3">No face or edge picked.</p> : (
            <ul className="space-y-1">
              {state.topologyRefs.map((ref) => <li key={`${ref.shapeIndex}:${ref.kind}:${ref.id}`} className="text-2xs text-fg-2">{ref.kind === 'face' ? 'Face' : 'Edge'} {ref.id} · shape {ref.shapeIndex}</li>)}
            </ul>
          )}
        </section>
        <PanelFeedback error={state.error || saveError} message={message} />
        <ClearAllMarkupButton
          disabled={state.notes.length === 0 && state.measurements.length === 0 && state.topologyRefs.length === 0}
          onClear={() => { markupStore.clear(); setMessage('Markup cleared.'); }}
        />
      </div>
    </aside>
  );
}
