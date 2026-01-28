import { type LucideIcon } from 'lucide-react';

export interface FeatureContext {
    insertCode: (snippet: string | ((name: string) => string), baseName?: string) => void;
    setActiveDialog: (dialogId: string | null) => void;
    code: string; // Current code for variable name resolution
}

export interface DialogField {
    name: string;
    label: string;
    type: 'number';
    defaultValue: number;
    min?: number;
    max?: number;
    step?: number;
}

export interface Feature {
    id: string;
    label: string;
    icon: LucideIcon;
    description?: string;

    /**
     * If defined, clicking the tool opens a dialog with these fields.
     * When submitted, executes 'execute' with the values.
     */
    parameters?: DialogField[];

    /**
     * The logic to run. 
     * If parameters are defined, 'args' contains the dialog values.
     * If no parameters, 'args' is undefined/empty.
     */
    execute: (context: FeatureContext, args?: Record<string, number>) => void;
}
