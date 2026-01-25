
/**
 * Simple code analysis helpers for kernelCAD.
 * Uses regex-based parsing to keep things lightweight.
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

/**
 * Finds the best line to insert code.
 * Strategy:
 * 1. Look for 'function drawPart()'.
 * 2. Look for the last 'return' statement inside it.
 * 3. Insert before that return.
 * 4. Fallback: End of script.
 */
export function findInsertionPoint(code: string): number {
    const lines = code.split('\n');
    let drawPartStart = -1;
    let returnLine = -1;

    // 1. Find drawPart
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('function drawPart()')) {
            drawPartStart = i;
            break;
        }
    }

    if (drawPartStart === -1) return lines.length + 1;

    // 2. Find return statement after drawPart
    // We search backwards from the end to find the last return, 
    // assuming it's the main return for drawPart.
    for (let i = lines.length - 1; i > drawPartStart; i--) {
        const line = lines[i].trim();
        // Ignore the return statement that returns the function result itself at the bottom
        if (line.startsWith('return ') && !line.includes('drawPart(')) {
            returnLine = i; // 0-indexed line index
            break;
        }
    }

    if (returnLine !== -1) {
        return returnLine + 1; // Return 1-based line number (insert before this line)
    }

    // Fallback: search for closing brace of function
    for (let i = lines.length - 1; i > drawPartStart; i--) {
        if (lines[i].trim() === '}') {
            return i + 1; // Insert before closing brace
        }
    }

    return lines.length + 1;
}

/**
 * Tries to update the return statement to include the new variable.
 * Supported formats:
 * - return x; -> return [x, newVar];
 * - return [x, y]; -> return [x, y, newVar];
 */
export function updateReturnStatement(code: string, newVar: string): string {
    // Basic regex for `return <something>;`
    // We only touch the specific return inside drawPart if possible, 
    // but globally for now is simple enough if unique.

    const returnRegex = /(return\s+)([^;]+)(;?)/;
    const match = code.match(returnRegex);

    if (!match) return code;

    const [fullMatch, prefix, content, suffix] = match;
    const trimmedContent = content.trim();

    // Context: ignoring if it's "return drawPart();" at the end of file
    if (trimmedContent.includes('drawPart(')) return code;

    let newContent = trimmedContent;

    if (trimmedContent.startsWith('[') && trimmedContent.endsWith(']')) {
        // It's already an array: [x, y] -> [x, y, z]
        const body = trimmedContent.slice(1, -1);
        newContent = `[${body}, ${newVar}]`;
    } else {
        // It's a single item: x -> [x, z]
        newContent = `[${trimmedContent}, ${newVar}]`;
    }

    return code.replace(fullMatch, `${prefix}${newContent}${suffix}`);
}

export interface VariableDefinition {
    name: string;
    type: string;
    line: number; // 1-indexed
}

/**
 * Parses the code to find top-level shape definitions.
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
