// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { cx } from './cx';
import { keyLabel } from './keys';

export interface KbdProps {
    /** Keys in order, e.g. ['Mod', 'K']. 'Mod' shows ⌘ on Apple, Ctrl elsewhere. */
    readonly keys: readonly string[];
    readonly className?: string;
}

/** Keyboard shortcut chips: mono 11 px with a 2 px bottom border. */
export function Kbd({ keys, className }: KbdProps): JSX.Element {
    return (
        <span className={cx('inline-flex items-center gap-0.5', className)}>
            {keys.map((k, i) => (
                <kbd
                    key={`${k}-${i}`}
                    className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[3px] border border-b-2 border-border-strong bg-surface-2 px-1 font-mono text-2xs text-fg-2"
                >
                    {keyLabel(k)}
                </kbd>
            ))}
        </span>
    );
}
