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
        console.error('Parse error:', error);
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
        console.error('Code generation error:', error);
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
 * Extract the list of variable names returned by the drawPart function.
 * This is used to map shape indices from the viewer back to variable names.
 */
export function getReturnedVariables(code: string): string[] {
    const astNode = parseCode(code);
    const returnedVars: string[] = [];

    const processReturnArgument = (arg: any) => {
        if (arg.type === 'ArrayExpression') {
            arg.elements.forEach((el: any) => {
                const name = resolveVariableName(el);
                if (name) returnedVars.push(name);
            });
        } else {
            const name = resolveVariableName(arg);
            if (name) returnedVars.push(name);
        }
    };

    const resolveVariableName = (node: any): string | null => {
        if (!node) return null;
        if (node.type === 'Identifier') return node.name;
        // Strict: We only want the variable if it IS the variable.
        // If it's a function call (filleted.cut()), the return is not 'filleted'.
        // So we interpret CallExpressions as anonymous/null.
        if (node.type === 'CallExpression') {
            return null;
        }
        return null;
    };

    // 1. Check top-level return
    const topLevelReturn = (astNode as any).body.find((n: any) => n.type === 'ReturnStatement');
    if (topLevelReturn && topLevelReturn.argument) {
        processReturnArgument(topLevelReturn.argument);
    }

    // 2. If no top-level return found, check drawPart function
    if (returnedVars.length === 0) {
        walk.simple(astNode, {
            FunctionDeclaration(node: acorn.Node) {
                const decl = node as unknown as NodeWithId & NodeWithBody;
                if (decl.id && decl.id.name === 'drawPart') {
                    const body = (decl.body as { body: acorn.Node[] }).body;
                    const returnStmt = body.find((n) => n.type === 'ReturnStatement') as any;

                    if (returnStmt && returnStmt.argument) {
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
        const body = (astNode as any).body;
        const returnIndex = body.findIndex((n: any) => n.type === 'ReturnStatement');
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
        const declNode = node as unknown as { type: string; declarations: { id: { type: string; name: string }; init: { type: string; callee?: { object?: { name?: string }; name?: string } } }[] };
        if (declNode.type === 'VariableDeclaration' && declNode.declarations[0]) {
            const declarator = declNode.declarations[0];
            if (declarator.id.type === 'Identifier') {
                varName = declarator.id.name;
            }
        }
    });

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
                    // Insert ALL statements before return
                    body.splice(returnIndex, 0, ...statementNodes);

                    // Update return statement if we have a variable name
                    if (varName) {
                        const returnStmt = body[returnIndex + statementNodes.length] as any;
                        if (returnStmt.type === 'ReturnStatement' && returnStmt.argument) {
                            // Check if return is an array
                            if (returnStmt.argument.type === 'ArrayExpression') {
                                // Add the new variable to the array
                                returnStmt.argument.elements.push({
                                    type: 'Identifier',
                                    name: varName
                                });
                            } else {
                                // Convert to array return: return [oldValue, newVar]
                                const oldArgument = returnStmt.argument;
                                returnStmt.argument = {
                                    type: 'ArrayExpression',
                                    elements: [
                                        oldArgument,
                                        {
                                            type: 'Identifier',
                                            name: varName
                                        }
                                    ]
                                };
                            }
                        }
                    }

                    inserted = true;
                }
            }
        }
    });

    // 2. Fallback to top-level return
    if (!inserted) {
        const body = (astNode as any).body;
        const returnIndex = body.findIndex((n: any) => n.type === 'ReturnStatement');

        if (returnIndex !== -1) {
            body.splice(returnIndex, 0, ...statementNodes);

            if (varName) {
                const returnStmt = body[returnIndex + statementNodes.length] as any;
                if (returnStmt.type === 'ReturnStatement' && returnStmt.argument) {
                    if (returnStmt.argument.type === 'ArrayExpression') {
                        returnStmt.argument.elements.push({
                            type: 'Identifier',
                            name: varName
                        });
                    } else {
                        // Convert to array
                        const oldArgument = returnStmt.argument;
                        returnStmt.argument = {
                            type: 'ArrayExpression',
                            elements: [
                                oldArgument,
                                {
                                    type: 'Identifier',
                                    name: varName
                                }
                            ]
                        };
                    }
                }
            }
            inserted = true;
        }
    }

    if (!inserted) {
        throw new Error('Could not find drawPart function or return statement');
    }

    return generateCode(astNode);
}

/**
 * Test function to verify parsing works.
 */
export function testParse(): boolean {
    try {
        const testCode = `
            export default function main() {
                function drawPart() {
                    const box = makeBox(10);
                    return [box];
                }
                return drawPart();
            }
        `;

        const ast = parseCode(testCode);
        console.log('Parse successful! AST:', ast);
        return true;
    } catch (error) {
        console.error('Parse test failed:', error);
        return false;
    }
}
