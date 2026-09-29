// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState, useCallback, useEffect, type ReactNode } from 'react';

export type CommandId = string;

/**
 * Palette groups, in display order. `Selection` holds the actions for what
 * the user picked in the viewer, so it comes first.
 */
export const COMMAND_SECTIONS = [
    'Selection',
    'General',
    'Modeling',
    'View',
    'Panels',
    'Export',
    'File',
    'Navigation',
    'Help',
] as const;

export type CommandSection = (typeof COMMAND_SECTIONS)[number];

export interface Command {
    id: CommandId;
    label: string;
    action: () => void;
    section?: CommandSection;
    /** Keys in order, as `Kbd` prints them, e.g. ['Mod', 'K']. */
    shortcut?: readonly string[];
    /** Extra words the palette search matches (synonyms, format names). */
    keywords?: readonly string[];
    /** One short line under the label. */
    description?: string;
    icon?: ReactNode;
    /** Shown but not runnable; `description` says why. */
    disabled?: boolean;
    /** The palette stays open after running it (it changes the palette itself). */
    keepOpen?: boolean;
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

    /** Register several commands with one notification. The returned
     *  function removes exactly these entries (not a later re-registration
     *  under the same id). */
    registerAll(commands: readonly Command[]) {
        for (const command of commands) this.commands.set(command.id, command);
        this.notify();
        return () => {
            let changed = false;
            for (const command of commands) {
                if (this.commands.get(command.id) === command) {
                    this.commands.delete(command.id);
                    changed = true;
                }
            }
            if (changed) this.notify();
        };
    }

    unregister(id: CommandId) {
        if (this.commands.delete(id)) {
            this.notify();
        }
    }

    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    /** Run a registered command by id. Returns false when it is missing or disabled. */
    run(id: CommandId): boolean {
        const command = this.commands.get(id);
        if (!command || command.disabled) return false;
        command.action();
        return true;
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

/** Keep `commands` registered while the caller is mounted. Pass a memoised
 *  array: a new array re-registers the set. */
export function useRegisterCommands(commands: readonly Command[]): void {
    useEffect(() => globalCommandRegistry.registerAll(commands), [commands]);
}

export interface CommandGroup {
    section: CommandSection;
    commands: Command[];
}

/** Commands grouped by section in `COMMAND_SECTIONS` order; registration
 *  order within a section. Commands without a section go to General. */
export function groupCommands(commands: readonly Command[]): CommandGroup[] {
    const bySection = new Map<CommandSection, Command[]>();
    for (const command of commands) {
        const section = command.section ?? 'General';
        const list = bySection.get(section);
        if (list) list.push(command);
        else bySection.set(section, [command]);
    }
    return COMMAND_SECTIONS.flatMap((section) => {
        const list = bySection.get(section);
        return list ? [{ section, commands: list }] : [];
    });
}
