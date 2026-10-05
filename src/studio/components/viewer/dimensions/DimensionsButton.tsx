// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { RulerDimensionLine } from 'lucide-react';

export const LEGACY_DIMENSIONS_HINT = 'Detailed dimensions appear after the model is republished.';

/** Viewer toolbar toggle for the dimensions overlay, next to Measure. When
 *  the model predates dimensions (only its bounding box is known), a one-line
 *  hint sits under the button while dimensions are shown. */
export function DimensionsButton({ on, onToggle, legacy }: { on: boolean; onToggle: () => void; legacy: boolean }) {
    return (
        <>
            <button
                type="button"
                data-testid="dimensions-toggle"
                aria-label="Dimensions"
                aria-pressed={on}
                title={on ? 'Hide dimensions' : 'Show dimensions'}
                onClick={onToggle}
                className={
                    'absolute left-14 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-md border shadow-lg backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ' +
                    (on
                        ? 'border-amber-300 bg-amber-400 text-neutral-950'
                        : 'border-white/20 bg-neutral-950/85 text-white hover:bg-neutral-800')
                }
            >
                <RulerDimensionLine size={18} aria-hidden="true" />
            </button>
            {on && legacy ? (
                <p
                    data-testid="dimensions-legacy-hint"
                    className="pointer-events-none absolute left-3 top-14 z-20 rounded-md bg-neutral-950/80 px-2 py-1 text-2xs text-neutral-200 shadow"
                >
                    {LEGACY_DIMENSIONS_HINT}
                </p>
            ) : null}
        </>
    );
}
