import { type LucideIcon, type LucideProps } from 'lucide-react';
import { type CodeGenerationContext } from '../../shared/codeGeneration/index';
import { z } from 'zod';

export interface HeadlessContext {
    insertCode: (snippet: string | ((name: string) => string), baseName?: string) => void;
    mutateCode: (transform: (prev: string) => string, mutationName: string) => void;
    code: string; // Current code for variable name resolution
}

export interface FeatureContext extends HeadlessContext {
    setActiveDialog: (dialogId: string | null) => void;
    openPanel: (id: string) => void;
    closePanel: (id: string) => void;
    codeContext: CodeGenerationContext;
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

export interface HeadlessFeature<TArgs = unknown> {
    id: string;
    label: string;
    description?: string;
    /**
     * Zod schema for validation.
     * If present, 'execute' args will be validated against this.
     */
    schema?: z.ZodType<TArgs>;
    shortcut?: string; // Keyboard shortcut e.g. 'e', 'mod+s'

    /**
     * purely headless execution logic.
     * Should NOT rely on UI callbacks like setActiveDialog.
     */
    execute: (context: FeatureContext, args?: TArgs) => void;
}

export interface UIFeature<TArgs = unknown> extends HeadlessFeature<TArgs> {
    icon: LucideIcon | React.FC<LucideProps>;

    /**
     * If defined, clicking the tool opens a dialog with these fields.
     * When submitted, executes 'execute' with the values.
     * @deprecated Use 'schema' for defining inputs, UI should generate form from schema.
     */
    parameters?: DialogField[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Feature<TArgs = any> = UIFeature<TArgs>;
