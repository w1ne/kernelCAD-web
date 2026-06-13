// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { useCommandRegistry, Command, globalCommandRegistry } from './useCommandRegistry';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useCommandRegistry', () => {
    beforeEach(() => {
        // Clear registry before each test (simulating a fresh start)
        // We'll need to manually clear the map since we don't have a clear method,
        // but unregistering everything works.
        const all = globalCommandRegistry.getAll();
        all.forEach(cmd => globalCommandRegistry.unregister(cmd.id));
    });

    it('should register and unregister a command', () => {
        const { result } = renderHook(() => useCommandRegistry());

        const command: Command = {
            id: 'test-cmd',
            label: 'Test Command',
            action: vi.fn(),
        };

        let unregister: () => void;
        act(() => {
            unregister = result.current.registerCommand(command);
        });

        expect(result.current.commands).toContainEqual(command);

        act(() => {
            unregister();
        });

        expect(result.current.commands).not.toContainEqual(command);
    });

    it('should notify subscribers when registry changes', () => {
        const { result } = renderHook(() => useCommandRegistry());

        const command1: Command = { id: 'c1', label: 'C1', action: () => { } };
        const command2: Command = { id: 'c2', label: 'C2', action: () => { } };

        act(() => {
            result.current.registerCommand(command1);
        });
        expect(result.current.commands).toHaveLength(1);

        act(() => {
            result.current.registerCommand(command2);
        });
        expect(result.current.commands).toHaveLength(2);
    });
});
