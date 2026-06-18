// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach } from 'vitest';
import { CommandManager } from './CommandManager';
import { Command, type CommandContext } from './Command';

// Mock Command Implementation
class MockCommand extends Command {
    private newContent: string;

    constructor(newContent: string) {
        super();
        this.newContent = newContent;
    }

    get label() { return "Mock"; }

    execute(context: CommandContext) {
        this.previousCode = context.code;
        context.setCode(this.newContent);
    }
}

describe('CommandManager', () => {
    let code = 'initial';
    const setCode = (c: string) => { code = c; };
    const getContext = () => ({ code, setCode });

    let manager: CommandManager;

    beforeEach(() => {
        code = 'initial';
        manager = new CommandManager(getContext);
    });

    it('should execute command', () => {
        const cmd = new MockCommand('modified');
        manager.execute(cmd);
        expect(code).toBe('modified');
        expect(manager.canUndo).toBe(true);
    });

    it('should undo command', () => {
        const cmd = new MockCommand('modified');
        manager.execute(cmd);

        manager.undo();
        expect(code).toBe('initial');
        expect(manager.canUndo).toBe(false);
        expect(manager.canRedo).toBe(true);
    });

    it('should redo command', () => {
        const cmd = new MockCommand('modified');
        manager.execute(cmd);
        manager.undo();

        manager.redo();
        expect(code).toBe('modified');
    });

    it('should clear redo stack on new execution', () => {
        // Init -> A -> Undo (Back to Init) -> B
        // Should lose A

        manager.execute(new MockCommand('A'));
        manager.undo();
        expect(code).toBe('initial');

        manager.execute(new MockCommand('B'));
        expect(code).toBe('B');
        expect(manager.canRedo).toBe(false); // A is gone

        manager.undo();
        expect(code).toBe('initial'); // Should go back to initial, not A
    });
});
