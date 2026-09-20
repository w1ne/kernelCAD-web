// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

import { getDeclaredVariablesAST, parseCode } from './ast';
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

/** Ordered shape markers: first match wins, mirroring the historical
 *  if/else chain (e.g. an initializer mentioning both `makeBox` and
 *  `Sketcher` classifies as Box). */
const SHAPE_TYPE_MARKERS: ReadonlyArray<readonly [string, string]> = [
    ['makeBox', 'Box'],
    ['makeCylinder', 'Cylinder'],
    ['makeSphere', 'Sphere'],
    ['fillet', 'Fillet'],
    ['chamfer', 'Chamfer'],
    ['cut', 'Cut'],
    ['fuse', 'Union'],
    ['intersect', 'Intersect'],
    ['extrude', 'Extrude'],
    ['revolve', 'Revolve'],
    ['Sketcher', 'Sketch'],
];

function shapeTypeFor(initSrc: string): string {
    const match = SHAPE_TYPE_MARKERS.find(([marker]) => initSrc.includes(marker));
    return match ? match[1] : 'Shape';
}

function sketchDetail(initSrc: string, init?: { arguments?: unknown[] }): string | undefined {
    const firstArg = Array.isArray(init?.arguments) ? init.arguments[0] : null;
    const arg = firstArg as unknown as { type?: string; value?: unknown } | null;
    if (arg && arg.type === 'Literal' && typeof arg.value === 'string') {
        return arg.value;
    }
    const planeMatch = initSrc.match(/new Sketcher\(['"](\w+)['"]\)/);
    return planeMatch ? planeMatch[1] : undefined;
}

/**
 * Parses the code to find top-level shape definitions for Scene Browser.
 * Heuristics:
 * - Looks for `const varName = ...`
 * - Guesses type based on keywords (makeBox, makeCylinder, fillet, etc.)
 */
function classifyVariable(initSrc: string, init?: { arguments?: unknown[] }): { type: string; detail?: string } {
    const type = shapeTypeFor(initSrc);
    const detail = type === 'Sketch' ? sketchDetail(initSrc, init) : undefined;

    return { type, detail };
}

/**
 * AST-backed history extraction with stable IDs for UI identity.
 */
export function extractHistoryItems(code: string): HistoryItem[] {
    const items: HistoryItem[] = [];
    try {
        const ast = parseCode(code);

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
