// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Command, type CommandContext } from '../Command';

/**
 * Replace the whole source with a planned rewrite (an applied direct edit).
 * One command = one undo step: undo restores the exact `fromCode` the edit was
 * planned against, redo re-applies `toCode`. `onApplied` runs after each
 * execute/undo/redo with the source now in the editor, so persistence follows
 * the undo stack.
 */
export class ReplaceSourceCommand extends Command {
    private readonly fromCode: string;
    private readonly toCode: string;
    private readonly labelString: string;
    private readonly onApplied?: (code: string) => void;

    constructor(fromCode: string, toCode: string, labelString: string, onApplied?: (code: string) => void) {
        super();
        this.fromCode = fromCode;
        this.toCode = toCode;
        this.labelString = labelString;
        this.onApplied = onApplied;
    }

    get label() { return this.labelString; }

    execute(context: CommandContext) {
        this.previousCode = this.fromCode;
        context.setCode(this.toCode);
        this.onApplied?.(this.toCode);
    }

    undo(context: CommandContext) {
        context.setCode(this.fromCode);
        this.onApplied?.(this.fromCode);
    }
}
