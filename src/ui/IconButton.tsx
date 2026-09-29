// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ComponentPropsWithRef, JSX, ReactNode } from 'react';
import { buttonLook, type ButtonVariant } from './buttonStyles';
import { cx } from './cx';
import { Tooltip, type TooltipSide } from './Tooltip';

export type IconButtonSize = 'sm' | 'md' | 'lg' | 'touch';

export interface IconButtonProps
    extends Omit<ComponentPropsWithRef<'button'>, 'aria-label' | 'children'> {
    /** Accessible name and tooltip label. Required: an icon has no text. */
    readonly label: string;
    readonly icon: ReactNode;
    /** Shortcut keys, shown in the tooltip and exposed as aria-keyshortcuts. */
    readonly shortcut?: readonly string[];
    /** One-line tooltip description. */
    readonly description?: string;
    readonly variant?: ButtonVariant;
    /** sm 28, md 32, lg 40, touch 44 px square. */
    readonly size?: IconButtonSize;
    /** Toggle state; sets aria-pressed when given. */
    readonly pressed?: boolean;
    readonly tooltipSide?: TooltipSide;
}

const SQUARE: Record<IconButtonSize, string> = {
    sm: 'size-control-sm',
    md: 'size-control-md',
    lg: 'size-control-lg',
    touch: 'size-touch',
};

/** Icon-only button; always has a tooltip with its label and shortcut. */
export function IconButton({
    label,
    icon,
    shortcut,
    description,
    variant = 'ghost',
    size = 'md',
    pressed,
    tooltipSide,
    className,
    type = 'button',
    ...rest
}: IconButtonProps): JSX.Element {
    return (
        <Tooltip label={label} shortcut={shortcut} description={description} side={tooltipSide} describe={!!description}>
            <button
                {...rest}
                type={type}
                aria-label={label}
                aria-pressed={pressed}
                aria-keyshortcuts={shortcut && shortcut.length > 0 ? shortcut.join('+').replace('Mod', 'Meta') : undefined}
                className={cx(buttonLook(variant), SQUARE[size], className)}
            >
                <span aria-hidden="true" className="inline-flex">
                    {icon}
                </span>
            </button>
        </Tooltip>
    );
}
