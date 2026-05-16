import { getDeclaredVariablesAST, getReturnedVariables } from './ast';
import type { CodeGenerationContext } from './CodeGenerationContext';

/**
 * Code Analyzer Service
 * 
 * Centralized service for parsing and analyzing code.
 * Provides caching to avoid redundant AST parsing.
 * Creates CodeGenerationContext instances for feature generators.
 */
export class CodeAnalyzer {
    private code: string;
    private declaredVars: Set<string> | null = null;
    private returnedVars: (string | null)[] | null = null;
    private generatedNames: Set<string> = new Set();

    constructor(code: string) {
        this.code = code;
    }

    /**
     * Updates the code and resets the analysis cache.
     * Note: Does NOT reset generatedNames, as those are session-specific
     * to avoid collisions before the code is actually updated in the editor.
     */
    updateCode(newCode: string) {
        if (this.code === newCode) return;
        this.code = newCode;
        this.declaredVars = null;
        this.returnedVars = null;
    }

    /**
     * Gets all declared variables in the code.
     * Results are cached after first call.
     */
    getDeclaredVariables(): Set<string> {
        if (!this.declaredVars) {
            this.declaredVars = getDeclaredVariablesAST(this.code);
        }
        return this.declaredVars;
    }

    /**
     * Gets the array of returned variables, with null for anonymous expressions.
     * Results are cached after first call.
     */
    getReturnedVariables(): (string | null)[] {
        if (!this.returnedVars) {
            this.returnedVars = getReturnedVariables(this.code);
        }
        return this.returnedVars;
    }

    /**
     * Generates a unique variable name that doesn't conflict with existing code
     * or previously generated names in this session.
     * 
     * @param baseName - The desired base name
     * @returns A unique variable name
     */
    generateUniqueName(baseName: string): string {
        const declared = this.getDeclaredVariables();
        let name = baseName;
        let counter = 1;

        // Check against both existing code and names generated in this session
        while (declared.has(name) || this.generatedNames.has(name)) {
            name = `${baseName}${counter}`;
            counter++;
        }

        // Track this name to prevent collisions within the same generation session
        this.generatedNames.add(name);

        return name;
    }

    /**
     * Gets the variable name at a specific index in the return array.
     * 
     * @param index - The index in the geometries array
     * @returns The variable name or null if anonymous
     */
    getVariableAtIndex(index: number): string | null {
        const vars = this.getReturnedVariables();
        return vars[index] ?? null;
    }

    /**
     * Creates a CodeGenerationContext for use by feature generators.
     * This is the primary public interface of the analyzer.
     */
    createContext(): CodeGenerationContext {
        return {
            code: this.code,
            declaredVariables: this.getDeclaredVariables(),
            returnedVariables: this.getReturnedVariables(),
            generateUniqueName: this.generateUniqueName.bind(this),
            getVariableAtIndex: this.getVariableAtIndex.bind(this)
        };
    }
}
