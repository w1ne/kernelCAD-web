// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Ruler } from 'lucide-react';
import { CORNER_TOP } from '../cornerControls';

/** Viewer toolbar toggle for the Measure tool. */
export function MeasureButton({ active, onToggle, docked = false }: { active: boolean; onToggle: () => void; docked?: boolean }) {
  return (
    <button
      type="button"
      data-testid="measure-toggle"
      aria-label="Measure"
      aria-pressed={active}
      title="Measure (click two points; Esc clears the current pick)"
      onClick={onToggle}
      style={docked ? undefined : CORNER_TOP}
      className={
        (docked
          ? 'inline-flex size-10 items-center justify-center rounded-md border shadow-lg backdrop-blur '
          : 'absolute left-3 z-20 flex h-9 w-9 items-center justify-center rounded-md border shadow-lg backdrop-blur ') +
        'transition focus:outline-none focus:ring-2 focus:ring-accent ' +
        (active
          ? 'border-warn bg-warn text-on-accent'
          : 'border-border bg-surface-1 text-fg hover:bg-surface-2')
      }
    >
      <Ruler size={docked ? 20 : 18} aria-hidden="true" />
    </button>
  );
}
