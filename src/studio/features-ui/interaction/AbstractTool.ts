// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export type ToolState = 'IDLE' | 'ACTIVE' | 'FINISHED';

export abstract class AbstractTool {
    abstract readonly id: string;
    protected state: ToolState = 'IDLE';
    protected onStateChange?: (state: ToolState) => void;

    constructor(onStateChange?: (state: ToolState) => void) {
        this.onStateChange = onStateChange;
    }

    getState(): ToolState {
        return this.state;
    }

    protected setState(newState: ToolState) {
        this.state = newState;
        this.onStateChange?.(newState);
    }

    /**
     * Called when the tool is activated.
     */
    activate() {
        this.setState('IDLE');
    }

    /**
     * Called when the tool is deactivated or Esc is pressed.
     */
    deactivate() {
        this.setState('IDLE');
    }

    /**
     * Primary interaction handlers.
     */
    abstract onMouseDown(event: unknown): void;
    abstract onMouseMove(event: unknown): void;
    abstract onMouseUp(event: unknown): void;

    /**
     * Optional handlers
     */
    onKeyDown(): void { }

    /**
     * Finalize the tool's action.
     */
    protected finish() {
        this.setState('FINISHED');
    }

    /**
     * Reset the tool.
     */
    protected cancel() {
        this.setState('IDLE');
    }
}
