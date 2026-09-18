// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** Max stored note length — mirrors the backend NOTE_MAX_LEN cap so the input
 *  can't paste in more than the server will keep. */
const NOTE_MAX_LEN = 280;

/** Preset intent tags. A blob says WHERE; these say WHAT is wrong. Kept short
 *  and ordered roughly by how often they come up reviewing CAD. */
const PRESET_TAGS = [
  'too thick',
  'too thin',
  'missing',
  'wrong angle/position',
  'wrong shape',
] as const;

interface MarkingIntentPanelProps {
  note: string;
  tags: string[];
  onNoteChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
}

/** Intent panel: a one-line note + preset tags so the stroke carries
 *  WHAT is wrong. Unobtrusive (bottom-left), optional, and captures its
 *  own pointer events so interacting with it never paints on the canvas
 *  underneath. */
export function MarkingIntentPanel({
  note,
  tags,
  onNoteChange,
  onToggleTag,
}: MarkingIntentPanelProps) {
  return (
    <div
      data-testid="marking-intent-panel"
      // Stop pointer/wheel events from reaching the painting canvas below.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        borderRadius: 8,
        background: 'rgba(20, 20, 24, 0.82)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        cursor: 'default',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PRESET_TAGS.map((tag) => {
          const active = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              data-testid={`marking-tag-${tag}`}
              aria-pressed={active}
              onClick={() => onToggleTag(tag)}
              style={{
                fontSize: 11,
                lineHeight: 1.2,
                padding: '3px 8px',
                borderRadius: 999,
                cursor: 'pointer',
                border: active
                  ? '1px solid rgba(239, 68, 68, 0.9)'
                  : '1px solid rgba(255,255,255,0.18)',
                background: active ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.06)',
                color: active ? '#fecaca' : 'rgba(255,255,255,0.82)',
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        data-testid="marking-note-input"
        value={note}
        maxLength={NOTE_MAX_LEN}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Add a note: what's wrong? (optional)"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontSize: 12,
          padding: '5px 8px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(255,255,255,0.06)',
          color: '#fff',
          outline: 'none',
        }}
      />
    </div>
  );
}
