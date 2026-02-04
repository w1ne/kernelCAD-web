/**
 * AST Engine V2 - Using acorn parser
 * Phase 1: Basic parsing ✅
 * Phase 2: Variable extraction using acorn-walk ✅
 * Phase 3: Code generation using astring ✅
 * Phase 4: Simple insertion ✅
 * Phase 5: Return statement update - add variable to return array
 */

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { generate } from 'astring';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null;
}

function hasType(value: unknown): value is UnknownRecord & { type: string } {
    return isRecord(value) && typeof value.type === 'string';
}

function getProgramBody(ast: acorn.Node): acorn.Node[] {
    const maybe = ast as unknown as { body?: unknown };
    return Array.isArray(maybe.body) ? (maybe.body as acorn.Node[]) : [];
}

type IdentifierNode = acorn.Node & { type: 'Identifier'; name: string };
function isIdentifierNode(node: unknown): node is IdentifierNode {
    return hasType(node) && node.type === 'Identifier' && typeof (node as UnknownRecord).name === 'string';
}

type ReturnStatementNode = acorn.Node & { type: 'ReturnStatement'; argument?: unknown };
function isReturnStatementNode(node: unknown): node is ReturnStatementNode {
    return hasType(node) && node.type === 'ReturnStatement';
}

type ArrayExpressionNode = acorn.Node & { type: 'ArrayExpression'; elements: unknown[] };
function isArrayExpressionNode(node: unknown): node is ArrayExpressionNode {
    return hasType(node) && node.type === 'ArrayExpression' && Array.isArray((node as UnknownRecord).elements);
}

/**
 * Parse JavaScript code into an AST.
 */
export function parseCode(code: string): acorn.Node {
    try {
        return acorn.parse(code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            // Allow return outside function (needed for our template code)
            allowReturnOutsideFunction: true
        });
    } catch (error) {
        if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
            console.error('Parse error:', error);
        }
        throw error;
    }
}

/**
 * Generate JavaScript code from an AST.
 */
export function generateCode(ast: acorn.Node): string {
    try {
        return generate(ast);
    } catch (error) {
        if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
            console.error('Code generation error:', error);
        }
        throw error;
    }
}

interface NodeWithBody extends acorn.Node {
    body: acorn.Node[] | { body: acorn.Node[] };
}

interface NodeWithId extends acorn.Node {
    id: { name: string; type: string };
}

interface VariableDeclarator extends acorn.Node {
    id: { name: string; type: string };
    init: acorn.Node | null;
}

/**
 * Extract all declared variable names from the code using AST traversal.
 */
export function getDeclaredVariablesAST(code: string): Set<string> {
    const astNode = parseCode(code);
    const variables = new Set<string>();

    walk.simple(astNode, {
        VariableDeclarator(node: acorn.Node) {
            const decl = node as unknown as VariableDeclarator;
            if (decl.id.type === 'Identifier') {
                variables.add(decl.id.name);
            }
        },
        FunctionDeclaration(node: acorn.Node) {
            const decl = node as unknown as NodeWithId;
            if (decl.id && decl.id.type === 'Identifier') {
                variables.add(decl.id.name);
            }
        }
    });

    return variables;
}

/**
 * Extract variable names that are initialized as sketches (Sketcher/startSketch/sketchOnFace),
 * including fluent call chains like `new Sketcher(...).lineTo(...).close()` and
 * `startSketch().rect(...).close()`.
 *
 * This is used to populate feature dialogs (extrude/revolve) from the user's code.
 */
export function getSketchVariablesAST(code: string): string[] {
    const astNode = parseCode(code);
    const variables: string[] = [];

    const isSketcherCtor = (callee: unknown): boolean => {
        if (!hasType(callee)) return false;
        if (callee.type === 'Identifier' && isRecord(callee) && callee.name === 'Sketcher') return true;
        if (callee.type === 'MemberExpression' && isRecord(callee)) {
            const prop = callee.property;
            return hasType(prop) && prop.type === 'Identifier' && isRecord(prop) && prop.name === 'Sketcher';
        }
        return false;
    };

    const isSketchFactoryCall = (callee: unknown): boolean => {
        if (!hasType(callee) || !isRecord(callee)) return false;
        const sketchFactories = new Set(['startSketch', 'sketchOnFace']);

        if (callee.type === 'Identifier' && typeof callee.name === 'string') {
            return sketchFactories.has(callee.name);
        }

        if (callee.type === 'MemberExpression') {
            const prop = callee.property;
            return hasType(prop) && prop.type === 'Identifier' && isRecord(prop) && typeof prop.name === 'string' && sketchFactories.has(prop.name);
        }

        return false;
    };

    const isSketcherExpr = (expr: unknown): boolean => {
        if (!hasType(expr) || !isRecord(expr)) return false;

        if (expr.type === 'NewExpression') return isSketcherCtor(expr.callee);

        if (expr.type === 'CallExpression') {
            if (isSketchFactoryCall(expr.callee)) return true;

            // Handle fluent chains where the callee is a MemberExpression:
            // e.g. startSketch().lineTo(...) or new Sketcher(...).lineTo(...)
            const callee = expr.callee;
            if (hasType(callee) && callee.type === 'MemberExpression' && isRecord(callee)) {
                return isSketcherExpr(callee.object);
            }
            return false;
        }

        if (expr.type === 'MemberExpression') return isSketcherExpr(expr.object);

        return false;
    };

    walk.simple(astNode, {
        VariableDeclarator(node: acorn.Node) {
            const decl = node as unknown as VariableDeclarator;
            if (decl.id.type !== 'Identifier') return;
            if (!decl.init) return;
            if (!isSketcherExpr(decl.init)) return;
            variables.push(decl.id.name);
        },
    });

    return variables;
}

type ReturnLocation = {
    body: acorn.Node[];
    returnIndex: number;
    returnStmt: ReturnStatementNode;
};

function findReturnLocation(astNode: acorn.Node): ReturnLocation | null {
    let found: ReturnLocation | null = null;

    // 1) Prefer drawPart() if present (matches insertion behavior)
    walk.simple(astNode, {
        FunctionDeclaration(node: acorn.Node) {
            if (found) return;
            const decl = node as unknown as NodeWithId & NodeWithBody;
            if (!decl.id || decl.id.name !== 'drawPart') return;

            const body = (decl.body as { body: acorn.Node[] }).body;
            const returnIndex = body.findIndex((n) => n.type === 'ReturnStatement');
            if (returnIndex === -1) return;

            const returnStmt = body[returnIndex] as unknown;
            if (!isReturnStatementNode(returnStmt)) return;

            found = { body, returnIndex, returnStmt };
        }
    });

    if (found) return found;

    // 2) Fallback to top-level return
    const body = getProgramBody(astNode);
    const returnIndex = body.findIndex((n) => n.type === 'ReturnStatement');
    if (returnIndex === -1) return null;
    const returnStmt = body[returnIndex] as unknown;
    if (!isReturnStatementNode(returnStmt)) return null;

    return { body, returnIndex, returnStmt };
}

function createConstDeclaration(name: string, init: acorn.Node): acorn.Node {
    const statementAst = parseCode(`const ${name} = 0;`) as unknown as { body: acorn.Node[] };
    const decl = statementAst.body[0] as unknown as {
        type: 'VariableDeclaration';
        declarations: Array<{ id: unknown; init: unknown }>;
    };
    decl.declarations[0]!.init = init;
    return statementAst.body[0]!;
}

/**
 * Promotes the return value at a given index to a named variable.
 *
 * Examples:
 * - `return replicad.makeBox(1,1,1)` -> `const part = replicad.makeBox(...); return part;`
 * - `return [replicad.makeBox(...), foo]` -> `const part = replicad.makeBox(...); return [part, foo];`
 */
export function promoteReturnExpressionAtIndexToVariable(code: string, index: number, varName: string): string {
    const astNode = parseCode(code);
    const loc = findReturnLocation(astNode);
    if (!loc) throw new Error('Could not find drawPart function or return statement');

    const returnStmt = loc.returnStmt;
    if (!returnStmt.argument) throw new Error('Return statement has no argument');

    const insertBeforeReturn = (initNode: acorn.Node) => {
        loc.body.splice(loc.returnIndex, 0, createConstDeclaration(varName, initNode));
    };

    if (isArrayExpressionNode(returnStmt.argument)) {
        const el = returnStmt.argument.elements[index] as unknown;
        if (!el || !hasType(el)) throw new Error(`Return array has no element at index ${index}`);
        if (isIdentifierNode(el)) return generateCode(astNode);

        // Move the element into a const declaration and replace with identifier
        insertBeforeReturn(el as unknown as acorn.Node);
        returnStmt.argument.elements[index] = { type: 'Identifier', name: varName };
        return generateCode(astNode);
    }

    if (index !== 0) throw new Error(`Cannot promote non-array return at index ${index}`);

    const arg = returnStmt.argument as unknown;
    if (isIdentifierNode(arg)) return generateCode(astNode);

    insertBeforeReturn(arg as unknown as acorn.Node);
    (returnStmt as unknown as { argument: unknown }).argument = { type: 'Identifier', name: varName };
    return generateCode(astNode);
}

/**
 * Inserts statements before the active return statement and replaces the returned element
 * at `index` with the identifier `replacementName`.
 */
export function insertStatementsAndReplaceReturnAtIndex(
    code: string,
    statements: string,
    index: number,
    replacementName: string,
): string {
    const astNode = parseCode(code);
    const loc = findReturnLocation(astNode);
    if (!loc) throw new Error('Could not find drawPart function or return statement');

    const statementNodes = (parseCode(statements) as unknown as { body: acorn.Node[] }).body;
    loc.body.splice(loc.returnIndex, 0, ...statementNodes);

    const returnStmt = loc.returnStmt;
    if (!returnStmt.argument) throw new Error('Return statement has no argument');

    if (isArrayExpressionNode(returnStmt.argument)) {
        if (index < 0 || index >= returnStmt.argument.elements.length) {
            throw new Error(`Return array has no element at index ${index}`);
        }
        returnStmt.argument.elements[index] = { type: 'Identifier', name: replacementName };
        return generateCode(astNode);
    }

    if (index !== 0) throw new Error(`Cannot replace non-array return at index ${index}`);
    (returnStmt as unknown as { argument: unknown }).argument = { type: 'Identifier', name: replacementName };
    return generateCode(astNode);
}

/**
 * Extract the list of variable names returned by the drawPart function.
 * This is used to map shape indices from the viewer back to variable names.
 */
/**
 * Resolve a variable name from an AST node, handling chained calls.
 */
/**
 * Resolve a variable name from an AST node.
 * STICT MODE: Only returns a name if the node is a direct Identifier.
 * This prevents expressions like "box.cut(tool)" from resolving to "box",
 * which would cause sketches to be attached to the wrong parent shape.
 */
export function resolveVariableName(node: unknown): string | null {
    if (!node) return null;
    if (isIdentifierNode(node)) {
        return node.name === 'replicad' ? null : node.name;
    }
    // We intentionally return null for CallExpression and MemberExpression
    // to strictly identify "Variables" vs "Expressions".
    // This forces anonymous shapes to use "detached sketches" (Path B)
    // rather than incorrectly attaching to the base object (Path A).
    return null;
}

/**
 * Extract the list of variable names returned by the drawPart function.
 * This is used to map shape indices from the viewer back to variable names.
 * Returns (string | null)[] to preserve the index alignment with the viewer.
 */
export function getReturnedVariables(code: string): (string | null)[] {
    const astNode = parseCode(code);
    const returnedVars: (string | null)[] = [];

    const processReturnArgument = (arg: unknown) => {
        if (isArrayExpressionNode(arg)) {
            arg.elements.forEach((el: unknown) => {
                const name = resolveVariableName(el);
                returnedVars.push(name);
            });
        } else {
            const name = resolveVariableName(arg);
            returnedVars.push(name);
        }
    };

    // 1. Check top-level return
    const topLevelReturn = getProgramBody(astNode).find((n) => n.type === 'ReturnStatement') as unknown;
    if (isReturnStatementNode(topLevelReturn) && topLevelReturn.argument) {
        processReturnArgument(topLevelReturn.argument);
    }

    // 2. If no top-level return found, check drawPart function
    if (returnedVars.length === 0) {
        walk.simple(astNode, {
            FunctionDeclaration(node: acorn.Node) {
                const decl = node as unknown as NodeWithId & NodeWithBody;
                if (decl.id && decl.id.name === 'drawPart') {
                    const body = (decl.body as { body: acorn.Node[] }).body;
                    const returnStmt = body.find((n) => n.type === 'ReturnStatement') as unknown;

                    if (isReturnStatementNode(returnStmt) && returnStmt.argument) {
                        processReturnArgument(returnStmt.argument);
                    }
                }
            }
        });
    }

    return returnedVars;
}

/**
 * Insert a statement before the return statement in the drawPart function.
 * Phase 4: Simple insertion without modifying the return statement.
 */
export function insertStatementSimple(code: string, statement: string): string {
    const astNode = parseCode(code);
    const statementAst = parseCode(statement);

    const statementNode = (statementAst as unknown as { body: acorn.Node[] }).body[0];
    let inserted = false;

    // 1. Try Function drawPart
    walk.simple(astNode, {
        FunctionDeclaration(node: acorn.Node) {
            if (inserted) return;
            const decl = node as unknown as NodeWithId & NodeWithBody;
            if (decl.id && decl.id.name === 'drawPart') {
                const body = (decl.body as { body: acorn.Node[] }).body;
                const returnIndex = body.findIndex((n) => n.type === 'ReturnStatement');

                if (returnIndex !== -1) {
                    body.splice(returnIndex, 0, statementNode);
                    inserted = true;
                }
            }
        }
    });

    // 2. Fallback to top-level return
    if (!inserted) {
        const body = getProgramBody(astNode);
        const returnIndex = body.findIndex((n) => n.type === 'ReturnStatement');
        if (returnIndex !== -1) {
            body.splice(returnIndex, 0, statementNode);
            inserted = true;
        }
    }

    if (!inserted) {
        throw new Error('Could not find drawPart function or return statement');
    }

    return generateCode(astNode);
}

/**
 * Insert a statement and update the return array to include the new variable.
 * Phase 5: Full insertion with return statement update.
 */
export function insertShape(code: string, statement: string): string {
    const astNode = parseCode(code);
    const statementAst = parseCode(statement);

    const statementNodes = (statementAst as unknown as { body: acorn.Node[] }).body;

    // Extract variable name from the statements - use the LAST declared variable
    let varName: string | null = null;

    statementNodes.forEach(node => {
        if (!hasType(node) || node.type !== 'VariableDeclaration') return;
        const declarations = (node as unknown as { declarations?: unknown }).declarations;
        if (!Array.isArray(declarations) || declarations.length === 0) return;
        const declarator = declarations[0] as unknown;
        if (!isRecord(declarator) || !isRecord(declarator.id)) return;
        if (declarator.id.type !== 'Identifier' || typeof declarator.id.name !== 'string') return;

        const init = declarator.init;
        const isSketcherInit = (() => {
            const isSketcherCtor = (callee: unknown): boolean => {
                if (!hasType(callee)) return false;
                if (callee.type === 'Identifier' && isRecord(callee) && callee.name === 'Sketcher') return true;
                if (callee.type === 'MemberExpression' && isRecord(callee)) {
                    const prop = callee.property;
                    return hasType(prop) && prop.type === 'Identifier' && isRecord(prop) && prop.name === 'Sketcher';
                }
                return false;
            };

            const isSketcherExpr = (expr: unknown): boolean => {
                if (!hasType(expr) || !isRecord(expr)) return false;

                if (expr.type === 'NewExpression') return isSketcherCtor(expr.callee);

                // Handle fluent chains like: new Sketcher('XY').movePointerTo(...).lineTo(...).close()
                if (expr.type === 'CallExpression') {
                    const callee = expr.callee;
                    if (hasType(callee) && callee.type === 'MemberExpression' && isRecord(callee)) {
                        return isSketcherExpr(callee.object);
                    }
                    return false;
                }

                if (expr.type === 'MemberExpression') return isSketcherExpr(expr.object);

                return false;
            };

            return isSketcherExpr(init);
        })();

        // Prefer the last non-sketch variable for return-updates.
        if (!isSketcherInit) {
            varName = declarator.id.name;
        }
    });

    let inserted = false;

    // Helper to find and replace or insert at the end of body
    const processBody = (body: acorn.Node[]) => {
        const returnIndex = body.findIndex((n) => n.type === 'ReturnStatement');

        // Check if we can replace an existing declaration
        if (varName) {
            const existingIndex = body.findIndex(node => {
                if (!hasType(node) || node.type !== 'VariableDeclaration') return false;
                const declarations = (node as unknown as { declarations?: unknown }).declarations;
                if (!Array.isArray(declarations) || declarations.length === 0) return false;
                const declarator = declarations[0] as unknown;
                if (!isRecord(declarator) || !isRecord(declarator.id)) return false;
                return declarator.id.type === 'Identifier' && declarator.id.name === varName;
            });

            if (existingIndex !== -1) {
                // If it was already in the body, we replace it.
                // If we are replacing multiple statements (like plane + sketch), we need to be careful
                // For now, we just replace the single declaration.
                body.splice(existingIndex, 1, ...statementNodes);
                inserted = true;
                return;
            }
        }

        if (returnIndex !== -1) {
            // Insert ALL statements before return
            body.splice(returnIndex, 0, ...statementNodes);

            // Update return statement if we have a variable name
            if (varName) {
                const returnStmt = body[returnIndex + statementNodes.length] as unknown;
                if (isReturnStatementNode(returnStmt) && returnStmt.argument) {
                    // Check if return is an array
                    if (isArrayExpressionNode(returnStmt.argument)) {
                        // Add the new variable to the array if NOT already present
                        const exists = returnStmt.argument.elements.some((el: unknown) =>
                            resolveVariableName(el) === varName
                        );
                        if (!exists) {
                            returnStmt.argument.elements.push({
                                type: 'Identifier',
                                name: varName
                            });
                        }
                    } else {
                        // Check if the single return is already this variable
                        const currentArg = returnStmt.argument;
                        const isSameVar = resolveVariableName(currentArg) === varName;

                        if (!isSameVar) {
                            // Convert to array return: return [oldValue, newVar]
                            (returnStmt as unknown as { argument: unknown }).argument = {
                                type: 'ArrayExpression',
                                elements: [
                                    currentArg,
                                    {
                                        type: 'Identifier',
                                        name: varName
                                    }
                                ]
                            };
                        }
                    }
                }
            }
            inserted = true;
        }
    };

    // 1. Try Function drawPart
    walk.simple(astNode, {
        FunctionDeclaration(node: acorn.Node) {
            if (inserted) return;
            const decl = node as unknown as NodeWithId & NodeWithBody;
            if (decl.id && decl.id.name === 'drawPart') {
                const body = (decl.body as { body: acorn.Node[] }).body;
                processBody(body);
            }
        }
    });

    // 2. Fallback to top-level return
    if (!inserted) {
        processBody(getProgramBody(astNode));
    }

    if (!inserted) {
        throw new Error('Could not find drawPart function or return statement');
    }

    return generateCode(astNode);
}
