// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState, useCallback, useEffect } from 'react';

export type CommandId = string;

export interface Command {
    id: CommandId;
    label: string;
    action: () => void;
    section?: 'Navigation' | 'Modeling' | 'View' | 'File' | 'General';
    shortcut?: string; // e.g., 'Cmd+K'
    icon?: React.ReactNode;
}

// Global store pattern (simple event-based for now to avoid complex reducers)
// In a larger app, we might use Zustand or Redux.
// For now, a custom event system works well to decouple generic components.

type CommandRegistryListener = (commands: Command[]) => void;

class CommandRegistry {
    private commands: Map<CommandId, Command> = new Map();
    private listeners: Set<CommandRegistryListener> = new Set();

    register(command: Command) {
        this.commands.set(command.id, command);
        this.notify();
        return () => this.unregister(command.id);
    }

    unregister(id: CommandId) {
        if (this.commands.delete(id)) {
            this.notify();
        }
    }

    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    subscribe(listener: CommandRegistryListener) {
        this.listeners.add(listener);
        listener(this.getAll());
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify() {
        const all = this.getAll();
        this.listeners.forEach(l => l(all));
    }
}

export const globalCommandRegistry = new CommandRegistry();

export function useCommandRegistry() {
    const [commands, setCommands] = useState<Command[]>(() => globalCommandRegistry.getAll());

    useEffect(() => {
        return globalCommandRegistry.subscribe(setCommands);
    }, []);

    const registerCommand = useCallback((command: Command) => {
        return globalCommandRegistry.register(command);
    }, []);

    return {
        commands,
        registerCommand
    };
}
