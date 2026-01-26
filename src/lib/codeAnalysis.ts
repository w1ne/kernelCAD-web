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

/**
 * Generates a unique variable name to avoid collisions.
 * e.g., if 'box' exists, returns 'box1', then 'box2'.
 */
export function generateUniqueName(code: string, baseName: string): string {
    const regex = new RegExp(`\\b${baseName}(\\d*)\\b`, 'g');
    const matches = code.match(regex) || [];

    if (matches.length === 0) return baseName;

    let maxIndex = 0;
    let hasBase = false;

    matches.forEach(m => {
        if (m === baseName) {
            hasBase = true;
        } else {
            const num = parseInt(m.replace(baseName, ''), 10);
            if (!isNaN(num) && num > maxIndex) {
                maxIndex = num;
            }
        }
    });

    if (!hasBase) return baseName;
    return `${baseName}${maxIndex + 1}`;
}

export interface VariableDefinition {
    name: string;
    type: string;
    line: number; // 1-indexed
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

            // Simple keyword matching for type guessing
            if (line.includes('makeBox')) type = 'Box';
            else if (line.includes('makeCylinder')) type = 'Cylinder';
            else if (line.includes('makeSphere')) type = 'Sphere';
            else if (line.includes('fillet')) type = 'Fillet';
            else if (line.includes('chamfer')) type = 'Chamfer';
            else if (line.includes('cut')) type = 'Cut';
            else if (line.includes('fuse')) type = 'Union';
            else if (line.includes('Sketcher')) type = 'Sketch';

            variables.push({
                name,
                type,
                line: index + 1
            });
        }
    });

    return variables;
}
