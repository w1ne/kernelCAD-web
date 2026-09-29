// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import {
    cloneElement,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type JSX,
    type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import { Kbd } from './Kbd';
import { themeOf, type Theme } from './theme';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
    readonly label: string;
    /** Shortcut keys shown as <Kbd>, e.g. ['Mod', 'Enter']. */
    readonly shortcut?: readonly string[];
    /** Optional one-line description under the label. */
    readonly description?: string;
    readonly side?: TooltipSide;
    /** Hover delay; keyboard focus shows the tooltip at once. */
    readonly delayMs?: number;
    /**
     * Link the tooltip to the trigger with aria-describedby. Off when the
     * trigger's own accessible name already says the same thing.
     */
    readonly describe?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any element that takes aria props
    readonly children: ReactElement<any>;
}

const GAP = 6;
const EDGE = 8;

interface Placement {
    readonly top: number;
    readonly left: number;
}

function place(anchor: DOMRect, tip: DOMRect, side: TooltipSide): Placement {
    let top: number;
    let left: number;
    switch (side) {
        case 'bottom':
            top = anchor.bottom + GAP;
            left = anchor.left + anchor.width / 2 - tip.width / 2;
            break;
        case 'left':
            top = anchor.top + anchor.height / 2 - tip.height / 2;
            left = anchor.left - GAP - tip.width;
            break;
        case 'right':
            top = anchor.top + anchor.height / 2 - tip.height / 2;
            left = anchor.right + GAP;
            break;
        default:
            top = anchor.top - GAP - tip.height;
            left = anchor.left + anchor.width / 2 - tip.width / 2;
            // Flip below when there is no room above.
            if (top < EDGE) top = anchor.bottom + GAP;
    }
    const maxLeft = window.innerWidth - tip.width - EDGE;
    return { top, left: Math.max(EDGE, Math.min(left, maxLeft)) };
}

/**
 * Label + shortcut + optional description for a control. Shows after
 * `delayMs` on hover and at once on keyboard focus; Esc or a press hides it.
 */
export function Tooltip({
    label,
    shortcut,
    description,
    side = 'top',
    delayMs = 400,
    describe = true,
    children,
}: TooltipProps): JSX.Element {
    const id = useId();
    const anchorRef = useRef<HTMLSpanElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>('light');
    const [pos, setPos] = useState<Placement | null>(null);

    const clear = (): void => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    };
    const show = (): void => {
        clear();
        setTheme(themeOf(anchorRef.current));
        setOpen(true);
    };
    const hide = (): void => {
        clear();
        setOpen(false);
        setPos(null);
    };
    const showLater = (): void => {
        clear();
        timer.current = setTimeout(show, delayMs);
    };

    useEffect(() => clear, []);

    useLayoutEffect(() => {
        if (!open || !anchorRef.current || !tipRef.current) return;
        const anchor = (anchorRef.current.firstElementChild ?? anchorRef.current).getBoundingClientRect();
        setPos(place(anchor, tipRef.current.getBoundingClientRect(), side));
    }, [open, side, label, description]);

    const trigger = cloneElement(children, {
        'aria-describedby': describe && open ? id : children.props['aria-describedby'],
    });

    return (
        <span
            ref={anchorRef}
            className="inline-flex"
            onPointerEnter={showLater}
            onPointerLeave={hide}
            onPointerDown={hide}
            onFocus={(e) => {
                // Keyboard focus only: a mouse click must not pop the tooltip.
                let keyboard = true;
                try {
                    keyboard = (e.target as HTMLElement).matches(':focus-visible');
                } catch {
                    /* selector unsupported: treat as keyboard */
                }
                if (keyboard) show();
            }}
            onBlur={hide}
            onKeyDown={(e) => {
                if (e.key === 'Escape' && open) hide();
            }}
        >
            {trigger}
            {open &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={tipRef}
                        id={id}
                        role="tooltip"
                        data-theme={theme}
                        style={{
                            position: 'fixed',
                            top: pos?.top ?? -9999,
                            left: pos?.left ?? -9999,
                        }}
                        className="pointer-events-none z-[1000] max-w-[280px] animate-pop-in rounded-control border border-border bg-surface-1 px-2 py-1 text-ui text-fg shadow-e2"
                    >
                        <span className="flex items-center gap-2">
                            <span className="font-medium">{label}</span>
                            {shortcut && shortcut.length > 0 && <Kbd keys={shortcut} />}
                        </span>
                        {description && <span className="block text-2xs text-fg-2">{description}</span>}
                    </div>,
                    document.body,
                )}
        </span>
    );
}
