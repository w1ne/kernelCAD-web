// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX, ReactNode } from 'react';
import { cx } from './cx';

export interface EmptyStateProps {
    readonly icon?: ReactNode;
    readonly title: string;
    /** One sentence: what goes here and how to add it. */
    readonly description?: ReactNode;
    /** The one main action, usually a primary <Button>. */
    readonly action?: ReactNode;
    readonly secondaryAction?: ReactNode;
    readonly className?: string;
}

/** Nothing here yet: icon, title, one sentence, a primary and an optional secondary action. */
export function EmptyState({ icon, title, description, action, secondaryAction, className }: EmptyStateProps): JSX.Element {
    return (
        <div className={cx('mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-10 text-center', className)}>
            {icon && (
                <div
                    aria-hidden="true"
                    className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-2 [&>svg]:size-6"
                >
                    {icon}
                </div>
            )}
            <h3 className="text-title text-fg">{title}</h3>
            {description && <p className="text-ui text-fg-2">{description}</p>}
            {(action || secondaryAction) && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                    {action}
                    {secondaryAction}
                </div>
            )}
        </div>
    );
}
