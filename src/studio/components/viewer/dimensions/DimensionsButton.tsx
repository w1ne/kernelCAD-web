// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { RulerDimensionLine } from 'lucide-react';
import { CORNER_BELOW_TOP, CORNER_TOP } from '../cornerControls';

export const LEGACY_DIMENSIONS_HINT = 'Detailed dimensions appear after the model is republished.';

/** Viewer toolbar toggle for the dimensions overlay, next to Measure. When
 *  the model predates dimensions (only its bounding box is known), a one-line
 *  hint sits under the button while dimensions are shown. */
export function DimensionsButton({ on, onToggle, legacy, docked = false }: { on: boolean; onToggle: () => void; legacy: boolean; docked?: boolean }) {
    return (
        <>
            <button
                type="button"
                data-testid="dimensions-toggle"
                aria-label="Dimensions"
                aria-pressed={on}
                title={on ? 'Hide dimensions' : legacy ? LEGACY_DIMENSIONS_HINT : 'Show dimensions'}
                onClick={onToggle}
                style={docked ? undefined : CORNER_TOP}
                className={
                    (docked
                        ? 'inline-flex size-10 items-center justify-center rounded-md border shadow-lg backdrop-blur '
                        : 'absolute left-14 z-20 flex h-9 w-9 items-center justify-center rounded-md border shadow-lg backdrop-blur ') +
                    'transition focus:outline-none focus:ring-2 focus:ring-accent ' +
                    (on
                        ? 'border-warn bg-warn text-on-accent'
                        : 'border-border bg-surface-1 text-fg hover:bg-surface-2')
                }
            >
                <RulerDimensionLine size={docked ? 20 : 18} aria-hidden="true" />
            </button>
            {on && legacy && !docked ? (
                <p
                    data-testid="dimensions-legacy-hint"
                    style={CORNER_BELOW_TOP}
                    className="pointer-events-none absolute left-3 z-20 rounded-md bg-surface-1 px-2 py-1 text-2xs text-fg-2 shadow"
                >
                    {LEGACY_DIMENSIONS_HINT}
                </p>
            ) : null}
        </>
    );
}
