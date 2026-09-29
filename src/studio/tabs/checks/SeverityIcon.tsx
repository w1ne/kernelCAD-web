// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { cx } from '../../../ui';

export type SeverityLevel = 'error' | 'warning' | 'info' | 'ok';

const LABEL: Record<SeverityLevel, string> = {
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    ok: 'Passed',
};

/** Severity as shape and colour, with a text label for assistive tech. */
export function SeverityIcon({ severity, className }: { severity: SeverityLevel; className?: string }): JSX.Element {
    const props = { className: 'size-4', strokeWidth: 1.75, 'aria-hidden': true } as const;
    return (
        <span
            role="img"
            aria-label={LABEL[severity]}
            data-severity={severity}
            className={cx(
                'inline-flex shrink-0',
                severity === 'error' && 'text-danger',
                severity === 'warning' && 'text-warn',
                severity === 'info' && 'text-accent',
                severity === 'ok' && 'text-ok',
                className,
            )}
        >
            {severity === 'error' && <CircleX {...props} />}
            {severity === 'warning' && <TriangleAlert {...props} />}
            {severity === 'info' && <Info {...props} />}
            {severity === 'ok' && <CircleCheck {...props} />}
        </span>
    );
}
