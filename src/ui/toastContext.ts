// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createContext, useContext } from 'react';
import type { ToastInput } from './toastModel';

export interface ToastApi {
    /** Show a toast; returns its id. */
    show: (toast: ToastInput) => number;
    dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Toasts from any component under a <ToastProvider>. */
export function useToast(): ToastApi {
    const api = useContext(ToastContext);
    if (!api) throw new Error('useToast() needs a <ToastProvider> above it');
    return api;
}
