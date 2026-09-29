// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'agent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
    'relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-sans font-medium select-none transition-colors duration-80 focus-ring disabled:cursor-not-allowed';

const SIZE: Record<ButtonSize, string> = {
    sm: 'h-control-sm px-2.5 text-ui',
    md: 'h-control-md px-3 text-ui',
    lg: 'h-control-lg px-4 text-body',
};

const VARIANT: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-on-accent enabled:hover:bg-accent-hover disabled:opacity-50',
    secondary:
        'bg-surface-1 text-fg border border-border-strong enabled:hover:bg-surface-2 enabled:active:bg-surface-3 disabled:opacity-50',
    ghost: 'bg-transparent text-fg-2 aria-pressed:bg-surface-3 aria-pressed:text-fg enabled:hover:bg-surface-2 enabled:hover:text-fg enabled:active:bg-surface-3 disabled:opacity-50',
    danger: 'bg-danger text-on-danger enabled:hover:bg-danger-hover disabled:opacity-50',
    agent: 'bg-agent text-on-agent enabled:hover:bg-agent-hover disabled:opacity-50',
};

/** Colour, shape and focus classes of a variant, without the size. */
export function buttonLook(variant: ButtonVariant = 'secondary'): string {
    return cx(BASE, VARIANT[variant]);
}

/** Class names for a button look, for links and triggers that are not a <Button>. */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md'): string {
    return cx(buttonLook(variant), SIZE[size]);
}
