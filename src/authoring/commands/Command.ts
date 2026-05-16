export interface CommandContext {
    code: string;
    setCode: (code: string) => void;
}

export abstract class Command {
    protected previousCode: string | null = null;

    /**
     * Executes the command.
     * Must save 'context.code' to 'this.previousCode' before making changes.
     */
    abstract execute(context: CommandContext): Promise<void> | void;

    /**
     * Reverts the command by restoring previousCode.
     * Can be overridden for more granular undo.
     */
    undo(context: CommandContext): void {
        if (this.previousCode !== null) {
            context.setCode(this.previousCode);
        } else {
            console.warn("Command: Cannot undo, previousCode is null");
        }
    }

    /**
     * Optional label for the UI (e.g. "Undo Create Box")
     */
    abstract get label(): string;
}
