// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * The Mark controls in the viewer's top toolbar row, next to Measure and
 * Dimensions: a pencil toggle and, while there are marks, tiny Undo and
 * Clear icons. No text, no hint, no panel: nothing is drawn over the model.
 * Touch targets grow to 44 px on coarse pointers.
 */
import { Pencil, Trash2, Undo2 } from 'lucide-react';

const ICON_BUTTON =
  'flex h-9 w-9 pointer-coarse:h-11 pointer-coarse:w-11 shrink-0 items-center justify-center rounded-md border shadow-lg backdrop-blur transition '
  + 'focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50';
const IDLE = 'border-border bg-surface-1 text-fg hover:bg-surface-2';

export function MarkToolbar(props: {
  active: boolean;
  count: number;
  disabled: boolean;
  onToggle: () => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  const { active, count, disabled } = props;
  return (
    <div
      data-testid="mark-toolbar"
      data-active={active ? 'true' : 'false'}
      data-count={count}
      className="absolute left-[100px] top-3 z-20 flex items-center gap-1"
    >
      <button
        type="button"
        data-testid="mark-toggle"
        aria-label="Mark: paint on the model, then say what to change in the chat"
        aria-pressed={active}
        title={disabled ? 'Available once the model is shown' : 'Mark (paint on the model)'}
        disabled={disabled}
        onClick={props.onToggle}
        className={`${ICON_BUTTON} ${active ? 'border-accent bg-accent text-on-accent' : IDLE}`}
      >
        <Pencil size={18} aria-hidden="true" />
      </button>
      {count > 0 ? (
        <>
          <button
            type="button"
            data-testid="mark-undo"
            aria-label="Undo last mark"
            title="Undo last mark"
            onClick={props.onUndo}
            className={`${ICON_BUTTON} ${IDLE}`}
          >
            <Undo2 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="mark-clear"
            aria-label="Clear all marks"
            title="Clear all marks"
            onClick={props.onClear}
            className={`${ICON_BUTTON} ${IDLE}`}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}
