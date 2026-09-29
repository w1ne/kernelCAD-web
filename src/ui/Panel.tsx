// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useId, type JSX, type ReactNode } from 'react';
import { cx } from './cx';

export type Elevation = 'e0' | 'e1' | 'e2' | 'e3';

export interface PanelProps {
    /** Panel title; also its accessible name. */
    readonly title?: ReactNode;
    /** Controls on the right of the title row. */
    readonly actions?: ReactNode;
    /** e0 flat with a border (default); e1 floating; e2 popover; e3 dialog. */
    readonly elevation?: Elevation;
    /** Remove the body padding (lists, editors). */
    readonly flush?: boolean;
    readonly className?: string;
    readonly children?: ReactNode;
}

const SHADOW: Record<Elevation, string> = {
    e0: '',
    e1: 'shadow-e1',
    e2: 'shadow-e2',
    e3: 'shadow-e3',
};

/** A bordered surface for panels and cards, with an optional title row. */
export function Panel({ title, actions, elevation = 'e0', flush, className, children }: PanelProps): JSX.Element {
    const titleId = useId();
    return (
        <section
            aria-labelledby={title ? titleId : undefined}
            className={cx('rounded-panel border border-border bg-surface-1 text-fg', SHADOW[elevation], className)}
        >
            {(title || actions) && (
                <header className="flex min-h-control-lg items-center justify-between gap-2 border-b border-border px-4 py-1.5">
                    {title && (
                        <h2 id={titleId} className="text-ui font-semibold text-fg">
                            {title}
                        </h2>
                    )}
                    {actions && <div className="flex items-center gap-1">{actions}</div>}
                </header>
            )}
            <div className={flush ? undefined : 'p-4'}>{children}</div>
        </section>
    );
}
