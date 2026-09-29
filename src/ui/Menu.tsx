// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type JSX,
    type KeyboardEvent,
    type ReactElement,
    type ReactNode,
    type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { Kbd } from './Kbd';
import { themeOf, type Theme } from './theme';

export interface MenuAction {
    readonly id: string;
    readonly label: string;
    readonly icon?: ReactNode;
    readonly shortcut?: readonly string[];
    readonly danger?: boolean;
    readonly disabled?: boolean;
    readonly onSelect: () => void;
}

export interface MenuSeparator {
    readonly id: string;
    readonly separator: true;
}

export type MenuEntry = MenuAction | MenuSeparator;

/** Props to spread on the element that opens the menu. */
export interface MenuTriggerProps {
    readonly ref: Ref<HTMLButtonElement>;
    readonly id: string;
    readonly 'aria-haspopup': 'menu';
    readonly 'aria-expanded': boolean;
    readonly 'aria-controls': string | undefined;
    readonly onClick: () => void;
    readonly onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

export interface MenuProps {
    readonly items: readonly MenuEntry[];
    /** Render the trigger (usually a Button or IconButton) with these props. */
    readonly trigger: (props: MenuTriggerProps) => ReactElement;
    /** Align the menu with the trigger's start or end edge. */
    readonly align?: 'start' | 'end';
    /** Accessible name when the trigger has none of its own. */
    readonly label?: string;
}

function isAction(e: MenuEntry): e is MenuAction {
    return !('separator' in e);
}

const EDGE = 8;

/**
 * A dropdown menu: arrow keys, Home/End, Enter/Space, Esc returns focus to
 * the trigger, a click outside closes it.
 */
export function Menu({ items, trigger, align = 'start', label }: MenuProps): JSX.Element {
    const baseId = useId();
    const triggerId = `${baseId}-trigger`;
    const menuId = `${baseId}-menu`;
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [focusIndex, setFocusIndex] = useState(0);
    const [theme, setTheme] = useState<Theme>('light');
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const actions = items.filter(isAction);
    const enabled = actions.map((a, i) => (a.disabled ? -1 : i)).filter((i) => i >= 0);

    const openAt = (which: 'first' | 'last'): void => {
        if (enabled.length === 0) return;
        setTheme(themeOf(triggerRef.current));
        setFocusIndex(which === 'first' ? enabled[0] : enabled[enabled.length - 1]);
        setOpen(true);
    };
    const close = (returnFocus: boolean): void => {
        setOpen(false);
        setPos(null);
        if (returnFocus) triggerRef.current?.focus();
    };

    // Position under (or above) the trigger once the menu has a size.
    useLayoutEffect(() => {
        if (!open || !triggerRef.current || !menuRef.current) return;
        const a = triggerRef.current.getBoundingClientRect();
        const m = menuRef.current.getBoundingClientRect();
        let top = a.bottom + 4;
        if (top + m.height > window.innerHeight - EDGE && a.top - 4 - m.height > EDGE) top = a.top - 4 - m.height;
        let left = align === 'end' ? a.right - m.width : a.left;
        left = Math.max(EDGE, Math.min(left, window.innerWidth - m.width - EDGE));
        setPos({ top, left });
    }, [open, align]);

    // Move DOM focus with the active item.
    useEffect(() => {
        if (!open) return;
        menuRef.current?.querySelector<HTMLElement>(`[data-index="${focusIndex}"]`)?.focus();
    }, [open, focusIndex, pos]);

    // Close on a press outside the trigger and the menu.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent): void => {
            const t = e.target as Node;
            if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
            close(false);
        };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open]);

    const move = (delta: 1 | -1): void => {
        const at = enabled.indexOf(focusIndex);
        const next = enabled[(at + delta + enabled.length) % enabled.length];
        setFocusIndex(next);
    };

    const select = (a: MenuAction): void => {
        if (a.disabled) return;
        close(true);
        a.onSelect();
    };

    const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                move(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                move(-1);
                break;
            case 'Home':
                e.preventDefault();
                setFocusIndex(enabled[0]);
                break;
            case 'End':
                e.preventDefault();
                setFocusIndex(enabled[enabled.length - 1]);
                break;
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                close(true);
                break;
            case 'Tab':
                e.preventDefault();
                close(true);
                break;
            case 'Enter':
            case ' ': {
                e.preventDefault();
                const a = actions[focusIndex];
                if (a) select(a);
                break;
            }
            default:
                break;
        }
    };

    const triggerProps: MenuTriggerProps = {
        ref: (el: HTMLButtonElement | null) => {
            triggerRef.current = el;
        },
        id: triggerId,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: () => (open ? close(false) : openAt('first')),
        onKeyDown: (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                openAt('first');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                openAt('last');
            }
        },
    };

    const indexOf = new Map(actions.map((a, i) => [a.id, i]));
    return (
        <>
            {trigger(triggerProps)}
            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        id={menuId}
                        role="menu"
                        aria-labelledby={label ? undefined : triggerId}
                        aria-label={label}
                        data-theme={theme}
                        onKeyDown={onMenuKeyDown}
                        style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
                        className="z-[1000] min-w-[180px] max-w-[320px] animate-pop-in rounded-panel border border-border bg-surface-1 p-1 text-ui text-fg shadow-e2"
                    >
                        {items.map((entry) => {
                            if (!isAction(entry)) {
                                return <div key={entry.id} role="separator" className="my-1 h-px bg-border" />;
                            }
                            const index = indexOf.get(entry.id) ?? -1;
                            return (
                                <div
                                    key={entry.id}
                                    role="menuitem"
                                    tabIndex={-1}
                                    data-index={index}
                                    aria-disabled={entry.disabled || undefined}
                                    onClick={() => select(entry)}
                                    onPointerMove={() => !entry.disabled && index !== focusIndex && setFocusIndex(index)}
                                    className={cx(
                                        'flex h-control-md cursor-default select-none items-center gap-2 rounded-control px-2 outline-none',
                                        'focus:bg-surface-2',
                                        entry.danger ? 'text-danger' : 'text-fg',
                                        entry.disabled && 'cursor-not-allowed opacity-50',
                                    )}
                                >
                                    {entry.icon && (
                                        <span aria-hidden="true" className="inline-flex text-fg-2 [&>svg]:size-4">
                                            {entry.icon}
                                        </span>
                                    )}
                                    <span className="flex-1 truncate">{entry.label}</span>
                                    {entry.shortcut && <Kbd keys={entry.shortcut} />}
                                </div>
                            );
                        })}
                    </div>,
                    document.body,
                )}
        </>
    );
}
