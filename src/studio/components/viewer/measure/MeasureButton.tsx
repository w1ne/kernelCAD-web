// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Ruler } from 'lucide-react';

/** Viewer toolbar toggle for the Measure tool. */
export function MeasureButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      data-testid="measure-toggle"
      aria-label="Measure"
      aria-pressed={active}
      title="Measure (click two points, Esc clears)"
      onClick={onToggle}
      className={
        'absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-md border shadow-lg backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ' +
        (active
          ? 'border-amber-300 bg-amber-400 text-neutral-950'
          : 'border-white/20 bg-neutral-950/85 text-white hover:bg-neutral-800')
      }
    >
      <Ruler size={18} aria-hidden="true" />
    </button>
  );
}
