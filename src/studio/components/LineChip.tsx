// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';

/** Hover chip that opens the call line. Hidden until the row is hovered or
 *  the chip itself is focused, so a normal click on the row only selects. */
export function LineChip({ line, onReveal }: { line: number; onReveal: () => void }): JSX.Element {
    return (
        <button
            type="button"
            data-testid="line-chip"
            aria-label={`Show line ${line} in code`}
            title={`Show line ${line} in code`}
            onClick={(event) => {
                event.stopPropagation();
                onReveal();
            }}
            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-2xs text-fg-3 opacity-0 hover:bg-surface-2 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
        >
            {`line ${line}`}
        </button>
    );
}
