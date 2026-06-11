// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useSyncExternalStore } from 'react';
import { shellStore, type ShellState } from './shellStore';

/**
 * Read the full shell state. Re-renders on any state change. For finer
 * subscriptions, use the slice hooks in `../hooks/`.
 */
export function useShellStore(): ShellState {
    return useSyncExternalStore(shellStore.subscribe, shellStore.getSnapshot, shellStore.getSnapshot);
}

export { shellStore };
