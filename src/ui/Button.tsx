// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ComponentPropsWithRef, JSX, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonStyles';
import { cx } from './cx';

export type { ButtonSize, ButtonVariant } from './buttonStyles';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
    /** primary: the one main action; agent: agent/AI actions only (copper). */
    readonly variant?: ButtonVariant;
    /** sm 28 px (dense workbench), md 32 px, lg 40 px (public pages). */
    readonly size?: ButtonSize;
    /** Shows a spinner, keeps the width, and blocks clicks. */
    readonly loading?: boolean;
    readonly leadingIcon?: ReactNode;
    readonly trailingIcon?: ReactNode;
}

export function Button({
    variant = 'secondary',
    size = 'md',
    loading = false,
    leadingIcon,
    trailingIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
}: ButtonProps): JSX.Element {
    return (
        <button
            {...rest}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            data-variant={variant}
            className={cx(buttonClass(variant, size), loading && 'disabled:opacity-100', className)}
        >
            <span className={cx('inline-flex items-center gap-1.5', loading && 'invisible')}>
                {leadingIcon}
                {children}
                {trailingIcon}
            </span>
            {loading && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                </span>
            )}
        </button>
    );
}
