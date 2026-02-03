/**
 * Code Generation Context
 * 
 * Unified interface for all code generation operations.
 * Provides a single source of truth for code analysis and variable name generation.
 */

/**
 * Context object passed to all feature generators.
 * Contains parsed code data and helper functions.
 */
export interface CodeGenerationContext {
    /** The raw code string being analyzed */
    code: string;

    /** Set of all declared variable names in the code */
    declaredVariables: Set<string>;

    /** Array of variable names returned by drawPart, with null for anonymous expressions */
    returnedVariables: (string | null)[];

    /** 
     * Generates a unique variable name that doesn't conflict with existing code.
     * Automatically increments counter if base name exists.
     * 
     * @param baseName - The desired base name (e.g., 'sketch', 'box_fused')
     * @returns A unique variable name (e.g., 'sketch1', 'box_fused2')
     */
    generateUniqueName: (baseName: string) => string;

    /**
     * Gets the variable name at a specific index in the return array.
     * Returns null for anonymous expressions.
     * 
     * @param index - The index in the geometries array
     * @returns The variable name or null if anonymous
     */
    getVariableAtIndex: (index: number) => string | null;
}
