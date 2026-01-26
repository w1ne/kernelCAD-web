/**
 * AST Engine (Regex-based for browser stability)
 */

import { generateUniqueName as regexGenerateUniqueName, findInsertionPoint, updateReturnStatement } from './codeAnalysis';

export function getDeclaredVariables(code: string): Set<string> {
    // Basic regex to find variable names
    const names = new Set<string>();
    const matches = code.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/g);
    for (const match of matches) {
        names.add(match[1]);
    }
    return names;
}

export function generateUniqueName(baseName: string, existingNames: Set<string>): string {
    let name = baseName;
    let counter = 1;
    while (existingNames.has(name)) {
        name = `${baseName}${counter}`;
        counter++;
    }
    return name;
}

/**
 * Inserts a statement and updates the return array using regex.
 */
export function insertShape(code: string, statementCode: string): string {
    // Extract var name from statementCode (e.g. "const box1 = ...")
    const varMatch = statementCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/);
    const varName = varMatch ? varMatch[1] : null;

    // 1. Find insertion point
    const insertLine = findInsertionPoint(code);
    const lines = code.split('\n');

    // 2. Insert the statement
    lines.splice(insertLine - 1, 0, statementCode);

    let newCode = lines.join('\n');

    // 3. Update return statement if we found a variable name
    if (varName) {
        const returnMatch = newCode.match(/return\s+\[([^\]]*)\]/);
        if (returnMatch) {
            const originalReturn = returnMatch[0];
            const updatedReturn = updateReturnStatement(originalReturn, varName);
            newCode = newCode.replace(originalReturn, updatedReturn);
        }
    }

    return newCode;
}
