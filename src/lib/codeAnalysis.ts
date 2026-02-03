/**
 * Code analysis utilities for kernelCAD.
 * Note: Most code manipulation now uses AST (see ast.ts).
 * This module contains only the utilities still needed for UI/analysis.
 */

export interface InsertionContext {
    variableName: string;
    code: string;
    line?: number; // Line to insert at (1-indexed)
}

import { getDeclaredVariablesAST } from './ast';

/**
 * Generates a unique variable name to avoid collisions.
 * e.g., if 'box' exists, returns 'box1', then 'box2'.
 */
export function generateUniqueName(code: string, baseName: string): string {
    const existing = getDeclaredVariablesAST(code);
    if (!existing.has(baseName)) return baseName;

    let counter = 1;
    while (existing.has(`${baseName}${counter}`)) {
        counter++;
    }
    return `${baseName}${counter}`;
}

export interface VariableDefinition {
    name: string;
    type: string;
    line: number; // 1-indexed
    detail?: string;
}

/**
 * Parses the code to find top-level shape definitions for Scene Browser.
 * Heuristics:
 * - Looks for `const varName = ...`
 * - Guesses type based on keywords (makeBox, makeCylinder, fillet, etc.)
 */
export function extractVariables(code: string): VariableDefinition[] {
    const lines = code.split('\n');
    const variables: VariableDefinition[] = [];

    lines.forEach((lineContent, index) => {
        const line = lineContent.trim();
        // Match `const name = ...`
        const match = line.match(/^const\s+(\w+)\s*=/);
        if (match) {
            const name = match[1];
            let type = 'Shape'; // Default
            let detail: string | undefined;

            // Simple keyword matching for type guessing
            if (line.includes('makeBox')) type = 'Box';
            else if (line.includes('makeCylinder')) type = 'Cylinder';
            else if (line.includes('makeSphere')) type = 'Sphere';
            else if (line.includes('fillet')) type = 'Fillet';
            else if (line.includes('chamfer')) type = 'Chamfer';
            else if (line.includes('cut')) type = 'Cut';
            else if (line.includes('fuse')) type = 'Union';
            else if (line.includes('extrude')) type = 'Extrude';
            else if (line.includes('Sketcher')) {
                type = 'Sketch';
                const planeMatch = line.match(/new Sketcher\(['"](\w+)['"]\)/);
                if (planeMatch) detail = planeMatch[1];
            }

            variables.push({
                name,
                type,
                line: index + 1,
                detail
            });
        }
    });

    return variables;
}
