// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export type ToastTone = 'success' | 'info' | 'error';

export interface ToastAction {
    readonly label: string;
    readonly onClick: () => void;
}

export interface ToastInput {
    readonly tone?: ToastTone;
    readonly title: string;
    readonly description?: string;
    /** At most one action button ("Undo", "Retry"). */
    readonly action?: ToastAction;
}

export interface ToastItem extends ToastInput {
    readonly id: number;
    readonly tone: ToastTone;
}

/** Success leaves after 2 s, info after 4 s; an error stays until dismissed. */
export function toastDuration(tone: ToastTone): number | null {
    if (tone === 'success') return 2000;
    if (tone === 'info') return 4000;
    return null;
}

/** Most toasts on screen at once; the oldest leaves first. */
export const MAX_TOASTS = 3;

export function pushToast(list: readonly ToastItem[], item: ToastItem): ToastItem[] {
    return [...list, item].slice(-MAX_TOASTS);
}

export function dropToast(list: readonly ToastItem[], id: number): ToastItem[] {
    return list.filter((t) => t.id !== id);
}
