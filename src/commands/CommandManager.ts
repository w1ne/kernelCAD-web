import { type Command, type CommandContext } from './Command';

export class CommandManager {
    private history: Command[] = [];
    private index = -1;
    private contextProvider: () => CommandContext;

    constructor(contextProvider: () => CommandContext) {
        this.contextProvider = contextProvider;
    }

    setContextProvider(contextProvider: () => CommandContext): void {
        this.contextProvider = contextProvider;
    }

    execute(command: Command): void {
        // Remove any future (redo) commands
        if (this.index < this.history.length - 1) {
            this.history = this.history.slice(0, this.index + 1);
        }

        // Execute
        const context = this.contextProvider();
        command.execute(context);

        // Push to history
        this.history.push(command);
        this.index++;
    }

    undo(): void {
        if (!this.canUndo) return;

        const command = this.history[this.index];
        const context = this.contextProvider();
        command.undo(context);

        this.index--;
    }

    redo(): void {
        if (!this.canRedo) return;

        this.index++;
        const command = this.history[this.index];
        const context = this.contextProvider();
        command.execute(context);
    }

    get canUndo(): boolean {
        return this.index >= 0;
    }

    get canRedo(): boolean {
        return this.index < this.history.length - 1;
    }

    clear(): void {
        this.history = [];
        this.index = -1;
    }
}
