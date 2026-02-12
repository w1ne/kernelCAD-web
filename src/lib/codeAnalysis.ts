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
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

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
    const variables: VariableDefinition[] = [];
    try {
        const ast = acorn.parse(code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            allowReturnOutsideFunction: true,
            locations: true
        }) as unknown as acorn.Node;

        walk.simple(ast, {
            VariableDeclarator(node: acorn.Node) {
                const decl = node as unknown as {
                    id?: { type?: string; name?: string };
                    init?: { start?: number; end?: number; type?: string; callee?: unknown; arguments?: unknown[] };
                    loc?: { start?: { line?: number } };
                };
                if (!decl.id || decl.id.type !== 'Identifier' || typeof decl.id.name !== 'string') return;

                const name = decl.id.name;
                const line = decl.loc?.start?.line ?? 1;
                const init = decl.init;
                const initSrc = init && typeof init.start === 'number' && typeof init.end === 'number'
                    ? code.slice(init.start, init.end)
                    : '';

                let type = 'Shape';
                let detail: string | undefined;

                if (initSrc.includes('makeBox')) type = 'Box';
                else if (initSrc.includes('makeCylinder')) type = 'Cylinder';
                else if (initSrc.includes('makeSphere')) type = 'Sphere';
                else if (initSrc.includes('fillet')) type = 'Fillet';
                else if (initSrc.includes('chamfer')) type = 'Chamfer';
                else if (initSrc.includes('cut')) type = 'Cut';
                else if (initSrc.includes('fuse')) type = 'Union';
                else if (initSrc.includes('intersect')) type = 'Intersect';
                else if (initSrc.includes('extrude')) type = 'Extrude';
                else if (initSrc.includes('revolve')) type = 'Revolve';
                else if (initSrc.includes('Sketcher')) {
                    type = 'Sketch';
                    const firstArg = Array.isArray(init?.arguments) ? init.arguments[0] : null;
                    const arg = firstArg as unknown as { type?: string; value?: unknown } | null;
                    if (arg && arg.type === 'Literal' && typeof arg.value === 'string') {
                        detail = arg.value;
                    } else {
                        const planeMatch = initSrc.match(/new Sketcher\(['"](\w+)['"]\)/);
                        if (planeMatch) detail = planeMatch[1];
                    }
                }

                variables.push({ name, type, line, detail });
            }
        });
    } catch {
        // On syntax errors keep behavior non-throwing; return best effort (empty list).
        return [];
    }

    return variables;
}
