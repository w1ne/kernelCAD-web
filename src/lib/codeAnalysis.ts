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
    id?: string;
    name: string;
    type: string;
    line: number; // 1-indexed
    detail?: string;
}

export interface HistoryItem extends VariableDefinition {
    id: string;
}

/**
 * Parses the code to find top-level shape definitions for Scene Browser.
 * Heuristics:
 * - Looks for `const varName = ...`
 * - Guesses type based on keywords (makeBox, makeCylinder, fillet, etc.)
 */
function classifyVariable(initSrc: string, init?: { arguments?: unknown[] }): { type: string; detail?: string } {
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

    return { type, detail };
}

/**
 * AST-backed history extraction with stable IDs for UI identity.
 */
export function extractHistoryItems(code: string): HistoryItem[] {
    const items: HistoryItem[] = [];
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
                const { type, detail } = classifyVariable(initSrc, init);
                const start = init?.start ?? line;
                const end = init?.end ?? line;
                items.push({
                    id: `${name}:${line}:${start}:${end}`,
                    name,
                    type,
                    line,
                    detail
                });
            }
        });
    } catch {
        // On syntax errors keep behavior non-throwing.
        return [];
    }

    return items;
}

function resolveReturnedVariableNames(ast: acorn.Node): string[] {
    const namesFromArgument = (arg: unknown): string[] => {
        if (!arg || typeof arg !== 'object') return [];
        const node = arg as { type?: string; elements?: unknown[]; name?: string };
        if (node.type === 'Identifier' && typeof node.name === 'string') return [node.name];
        if (node.type === 'ArrayExpression' && Array.isArray(node.elements)) {
            return node.elements.flatMap((el) => {
                if (!el || typeof el !== 'object') return [];
                const e = el as { type?: string; name?: string };
                return e.type === 'Identifier' && typeof e.name === 'string' ? [e.name] : [];
            });
        }
        return [];
    };

    // Prefer drawPart() return to align with modeling convention.
    let drawPartReturn: string[] = [];
    walk.simple(ast, {
        FunctionDeclaration(node: acorn.Node) {
            if (drawPartReturn.length > 0) return;
            const fn = node as unknown as { id?: { name?: string }; body?: { body?: unknown[] } };
            if (fn.id?.name !== 'drawPart' || !Array.isArray(fn.body?.body)) return;
            for (const stmt of fn.body.body) {
                const r = stmt as { type?: string; argument?: unknown };
                if (r.type === 'ReturnStatement') {
                    drawPartReturn = namesFromArgument(r.argument);
                    break;
                }
            }
        }
    });
    if (drawPartReturn.length > 0) return drawPartReturn;

    const program = ast as unknown as { body?: unknown[] };
    if (!Array.isArray(program.body)) return [];
    for (const stmt of program.body) {
        const r = stmt as { type?: string; argument?: unknown };
        if (r.type === 'ReturnStatement') return namesFromArgument(r.argument);
    }
    return [];
}

/**
 * Returns stable history IDs in return order for geometry selection/outline mapping.
 */
export function extractReturnedHistoryItemIds(code: string): (string | null)[] {
    try {
        const ast = acorn.parse(code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            allowReturnOutsideFunction: true,
            locations: true
        }) as unknown as acorn.Node;

        const historyByName = new Map<string, string>();
        extractHistoryItems(code).forEach((item) => historyByName.set(item.name, item.id));

        return resolveReturnedVariableNames(ast).map((name) => historyByName.get(name) ?? null);
    } catch {
        return [];
    }
}

/**
 * Backward-compatible variable extraction.
 */
export function extractVariables(code: string): VariableDefinition[] {
    const items = extractHistoryItems(code);
    const variables: VariableDefinition[] = items.map(({ name, type, line, detail }) => {
        if (detail !== undefined) return { name, type, line, detail };
        return { name, type, line };
    });
    return variables;
}
