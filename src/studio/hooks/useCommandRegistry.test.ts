// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { useCommandRegistry, useRegisterCommands, groupCommands, Command, globalCommandRegistry } from './useCommandRegistry';
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

describe('command registry batches and groups', () => {
    beforeEach(() => {
        globalCommandRegistry.getAll().forEach(cmd => globalCommandRegistry.unregister(cmd.id));
    });

    it('registers a set with one notification and removes only that set', () => {
        const listener = vi.fn();
        const stop = globalCommandRegistry.subscribe(listener);
        listener.mockClear();
        const a: Command = { id: 'a', label: 'A', action: () => { } };
        const b: Command = { id: 'b', label: 'B', action: () => { } };
        const dispose = globalCommandRegistry.registerAll([a, b]);
        expect(listener).toHaveBeenCalledTimes(1);
        // A later registration under the same id survives the old disposer.
        const a2: Command = { id: 'a', label: 'A2', action: () => { } };
        globalCommandRegistry.register(a2);
        dispose();
        expect(globalCommandRegistry.getAll()).toEqual([a2]);
        stop();
    });

    it('runs enabled commands by id', () => {
        const run = vi.fn();
        globalCommandRegistry.registerAll([
            { id: 'on', label: 'On', action: run },
            { id: 'off', label: 'Off', action: run, disabled: true },
        ]);
        expect(globalCommandRegistry.run('on')).toBe(true);
        expect(globalCommandRegistry.run('off')).toBe(false);
        expect(globalCommandRegistry.run('missing')).toBe(false);
        expect(run).toHaveBeenCalledTimes(1);
    });

    it('keeps a command set registered while mounted', () => {
        const set: Command[] = [{ id: 'mounted', label: 'Mounted', action: () => { } }];
        const { unmount } = renderHook(() => useRegisterCommands(set));
        expect(globalCommandRegistry.getAll().map(c => c.id)).toEqual(['mounted']);
        unmount();
        expect(globalCommandRegistry.getAll()).toEqual([]);
    });

    it('groups by section in palette order, General by default', () => {
        const groups = groupCommands([
            { id: 'e', label: 'Export', section: 'Export', action: () => { } },
            { id: 'g', label: 'No section', action: () => { } },
            { id: 's', label: 'Clear', section: 'Selection', action: () => { } },
        ]);
        expect(groups.map(g => g.section)).toEqual(['Selection', 'General', 'Export']);
    });
});
