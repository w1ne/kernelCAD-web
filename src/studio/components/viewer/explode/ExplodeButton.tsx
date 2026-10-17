// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Boxes } from 'lucide-react';
import { CORNER_BELOW_TOP, CORNER_TOP } from '../cornerControls';
import type { ExplodedView } from './useExplodedView';
import { PHONE_QUERY, useIsNarrow } from '../../../hooks/useIsNarrow';

/** Viewer toolbar toggle for the exploded view, with the explode-distance
 *  slider under it while it is on. `left` is the button's Tailwind left class,
 *  so it sits after whichever corner buttons the viewer shows. */
export function ExplodeButton({ view, left, docked = false }: { view: ExplodedView; left: string; docked?: boolean }) {
    const pct = Math.round(view.amount * 100);
    // On a phone the toolbar is one row; the slider drops below it as its
    // own full-width strip instead of widening the row.
    const phone = useIsNarrow(PHONE_QUERY);
    const dockedPanel = phone
        ? 'absolute inset-x-0 top-full mt-1 flex h-touch items-center gap-3 rounded-panel border border-border bg-surface-1/95 px-3 text-2xs text-fg-2 shadow-e1 backdrop-blur-sm'
        : 'flex items-center gap-2 px-1 text-2xs text-fg-2';
    return (
        <>
            <button
                type="button"
                data-testid="explode-toggle"
                data-explode-mode={view.mode}
                aria-label="Exploded view"
                aria-pressed={view.on}
                title={view.on ? 'Collapse the exploded view' : 'Exploded view'}
                onClick={view.toggle}
                style={docked ? undefined : CORNER_TOP}
                className={
                    (docked
                        ? 'inline-flex size-10 items-center justify-center rounded-md border shadow-lg backdrop-blur '
                        : `absolute ${left} z-20 flex h-9 w-9 items-center justify-center rounded-md border shadow-lg backdrop-blur `) +
                    'transition focus:outline-none focus:ring-2 focus:ring-accent ' +
                    (view.on
                        ? 'border-warn bg-warn text-on-accent'
                        : 'border-border bg-surface-1 text-fg hover:bg-surface-2')
                }
            >
                <Boxes size={docked ? 20 : 18} aria-hidden="true" />
            </button>
            {view.on ? (
                <label
                    data-testid="explode-slider-panel"
                    style={docked ? undefined : CORNER_BELOW_TOP}
                    className={docked
                        ? dockedPanel
                        : `absolute ${left} z-20 flex items-center gap-2 rounded-md border border-border bg-surface-1 px-2 py-1 text-2xs text-fg-2 shadow-lg backdrop-blur`}
                >
                    <span>Explode</span>
                    <input
                        type="range"
                        data-testid="explode-slider"
                        aria-label="Explode distance"
                        min={0}
                        max={100}
                        step={1}
                        value={pct}
                        onChange={(e) => view.setAmount(Number(e.currentTarget.value) / 100)}
                        className={docked && phone ? 'min-w-0 flex-1 accent-accent' : 'w-28 accent-accent'}
                    />
                    <span className="w-8 text-right tabular-nums">{pct}%</span>
                </label>
            ) : null}
        </>
    );
}
