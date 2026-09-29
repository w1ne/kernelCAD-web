// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useRef, type JSX, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from './cx';
import { Menu } from './Menu';
import { panelId, splitTabs, tabId, type TabItem } from './tabsModel';

export type { TabItem } from './tabsModel';

export interface TabsProps {
    /** Stable id; TabPanel uses the same value in `tabsId`. */
    readonly id: string;
    /** Accessible name of the tab list. */
    readonly label: string;
    readonly items: readonly TabItem[];
    readonly value: string;
    readonly onChange: (id: string) => void;
    /** Show at most this many tabs; the rest go to a "More" menu. */
    readonly maxVisible?: number;
    readonly className?: string;
}

/**
 * Underline tabs with a roving tabindex: arrow keys, Home and End move and
 * select. Unavailable tabs are hidden; extra tabs go to a "More" menu.
 */
export function Tabs({ id, label, items, value, onChange, maxVisible, className }: TabsProps): JSX.Element {
    const listRef = useRef<HTMLDivElement>(null);
    const { shown, overflow } = splitTabs(items, value, maxVisible);

    const focusTab = (tid: string): void => {
        onChange(tid);
        listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(tabId(id, tid))}`)?.focus();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
        const at = shown.findIndex((t) => t.id === value);
        let next = -1;
        if (e.key === 'ArrowRight') next = (at + 1) % shown.length;
        else if (e.key === 'ArrowLeft') next = (at - 1 + shown.length) % shown.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = shown.length - 1;
        if (next < 0 || !(e.target as HTMLElement).matches('[role="tab"]')) return;
        e.preventDefault();
        focusTab(shown[next].id);
    };

    const selectedShown = shown.some((t) => t.id === value);

    return (
        <div className={cx('flex items-end gap-1 border-b border-border', className)}>
            <div ref={listRef} role="tablist" aria-label={label} className="flex min-w-0 items-end gap-1" onKeyDown={onKeyDown}>
                {shown.map((t, i) => {
                    const selected = t.id === value;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            id={tabId(id, t.id)}
                            aria-selected={selected}
                            aria-controls={panelId(id, t.id)}
                            tabIndex={selected || (!selectedShown && i === 0) ? 0 : -1}
                            onClick={() => onChange(t.id)}
                            className={cx(
                                'focus-ring relative inline-flex h-control-md items-center gap-1.5 whitespace-nowrap rounded-t-control px-3 text-xs font-medium transition-colors duration-80',
                                selected
                                    ? 'text-fg after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent'
                                    : 'text-fg-2 hover:text-fg',
                            )}
                        >
                            {t.label}
                            {typeof t.count === 'number' && (
                                <span className="rounded-full bg-surface-2 px-1.5 text-2xs text-fg-2">{t.count}</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {overflow.length > 0 && (
                <Menu
                    align="end"
                    items={overflow.map((t) => ({ id: t.id, label: t.label, onSelect: () => focusTab(t.id) }))}
                    trigger={(p) => (
                        <button
                            {...p}
                            type="button"
                            className="focus-ring inline-flex h-control-md items-center gap-1 rounded-t-control px-2 text-xs font-medium text-fg-2 hover:text-fg"
                        >
                            More
                            <ChevronDown className="size-3.5" aria-hidden="true" />
                        </button>
                    )}
                />
            )}
        </div>
    );
}

export interface TabPanelProps {
    readonly tabsId: string;
    readonly id: string;
    /** The selected tab id; the panel renders only when it matches. */
    readonly value: string;
    readonly className?: string;
    readonly children?: ReactNode;
}

/** The content of one tab, linked to its tab for assistive tech. */
export function TabPanel({ tabsId, id, value, className, children }: TabPanelProps): JSX.Element | null {
    if (id !== value) return null;
    return (
        <div role="tabpanel" id={panelId(tabsId, id)} aria-labelledby={tabId(tabsId, id)} tabIndex={0} className={cx('focus-ring', className)}>
            {children}
        </div>
    );
}
