// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { MessageSquare } from 'lucide-react';
import { CORNER_TOP } from '../cornerControls';

export function MarkupButton({ active, onToggle, docked = false, left = 'left-14' }: { active: boolean; onToggle: () => void; docked?: boolean; left?: string }) {
  return (
    <button
      type="button"
      data-testid="markup-toggle"
      aria-label="Markup"
      aria-pressed={active}
      title="Markup notes and measurements"
      onClick={onToggle}
      style={docked ? undefined : CORNER_TOP}
      className={
        (docked
          ? 'inline-flex size-10 items-center justify-center rounded-md border shadow-lg backdrop-blur '
          : `absolute ${left} z-20 flex h-9 w-9 items-center justify-center rounded-md border shadow-lg backdrop-blur `) +
        'transition focus:outline-none focus:ring-2 focus:ring-accent ' +
        (active
          ? 'border-accent bg-accent text-on-accent'
          : 'border-border bg-surface-1 text-fg hover:bg-surface-2')
      }
    >
      <MessageSquare size={docked ? 20 : 18} aria-hidden="true" />
    </button>
  );
}
