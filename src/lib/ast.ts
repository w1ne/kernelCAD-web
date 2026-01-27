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
        if (node.type === 'CallExpression') {
            // Try to find the base identifier for method calls, e.g., a.b() -> a
            if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier') {
                return node.callee.object.name;
            }
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

    const statementNode = (statementAst as unknown as { body: acorn.Node[] }).body[0];

    // Extract variable name from the statement (e.g., "const box1 = ...")
    let varName: string | null = null;
    let isSketcher = false;

    const declNode = statementNode as unknown as { type: string; declarations: { id: { type: string; name: string }; init: { type: string; callee?: { object?: { name?: string }; name?: string } } }[] };
    if (declNode.type === 'VariableDeclaration' && declNode.declarations[0]) {
        const declarator = declNode.declarations[0];
        if (declarator.id.type === 'Identifier') {
            varName = declarator.id.name;

            // Detect if this is a Sketcher instance
            // It could be `new Sketcher(...)` or a chain like `new Sketcher(...).lineTo(...)`
            let init: any = declarator.init;
            while (init && init.type === 'CallExpression') {
                init = init.callee?.object || init.callee;
            }

            if (init && init.type === 'NewExpression' &&
                init.callee?.name === 'Sketcher') {
                isSketcher = true;
            }
        }
    }

    let inserted = false;

    walk.simple(astNode, {
        FunctionDeclaration(node: acorn.Node) {
            if (inserted) return;
            const decl = node as unknown as NodeWithId & NodeWithBody;
            if (decl.id && decl.id.name === 'drawPart') {
                const body = (decl.body as { body: acorn.Node[] }).body;
                const returnIndex = body.findIndex((n) => n.type === 'ReturnStatement');

                if (returnIndex !== -1) {
                    // Insert statement before return
                    body.splice(returnIndex, 0, statementNode);

                    // Update return statement if we have a variable name AND it's not a sketcher
                    if (varName && !isSketcher) {
                        const returnStmt = body[returnIndex + 1] as unknown as { type: string; argument: { type: string; elements: unknown[] } };
                        if (returnStmt.type === 'ReturnStatement' && returnStmt.argument) {
                            // Check if return is an array
                            if (returnStmt.argument.type === 'ArrayExpression') {
                                // Add the new variable to the array
                                returnStmt.argument.elements.push({
                                    type: 'Identifier',
                                    name: varName
                                });
                            }
                        }
                    }

                    inserted = true;
                }
            }
        }
    });

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

/**
 * Test function for Phase 2: Variable extraction.
 */
export function testVariableExtraction(): boolean {
    try {
        const testCode = `
            const box1 = makeBox(10);
            let cylinder = makeCylinder(5);
            function helper() {}
        `;

        const vars = getDeclaredVariablesAST(testCode);
        console.log('Variables found:', Array.from(vars));

        const hasBox = vars.has('box1');
        const hasCyl = vars.has('cylinder');
        const hasHelper = vars.has('helper');

        console.log(`✓ box1: ${hasBox}, cylinder: ${hasCyl}, helper: ${hasHelper}`);
        return hasBox && hasCyl && hasHelper;
    } catch (error) {
        console.error('Variable extraction test failed:', error);
        return false;
    }
}

/**
 * Test function for Phase 3: Code generation (round-trip).
 */
export function testCodeGeneration(): boolean {
    try {
        const originalCode = `const x = 1;\nconst y = 2;`;

        console.log('Original code:', originalCode);
        const ast = parseCode(originalCode);
        const generatedCode = generateCode(ast);
        console.log('Generated code:', generatedCode);

        parseCode(generatedCode);

        console.log('✓ Round-trip successful!');
        return true;
    } catch (error) {
        console.error('Code generation test failed:', error);
        return false;
    }
}

/**
 * Test function for Phase 4: Simple insertion.
 */
export function testSimpleInsertion(): boolean {
    try {
        const originalCode = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
        return [box];
    }
    return drawPart();
}`;

        console.log('Original code:', originalCode);
        const newCode = insertStatementSimple(originalCode, 'const cylinder = makeCylinder(5);');
        console.log('Modified code:', newCode);

        const hasCylinder = newCode.includes('const cylinder');
        const hasReturn = newCode.includes('return');
        const cylinderIndex = newCode.indexOf('const cylinder');
        const returnIndex = newCode.indexOf('return [box]');
        const beforeReturn = cylinderIndex < returnIndex;

        console.log(`✓ Has cylinder: ${hasCylinder}, Has return: ${hasReturn}, Before return: ${beforeReturn}`);
        return hasCylinder && hasReturn && beforeReturn;
    } catch (error) {
        console.error('Simple insertion test failed:', error);
        return false;
    }
}

/**
 * Test function for Phase 5: Return statement update.
 */
export function testReturnUpdate(): boolean {
    try {
        const originalCode = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
        return [box];
    }
    return drawPart();
}`;

        console.log('Original code:', originalCode);
        const newCode = insertShape(originalCode, 'const cylinder = makeCylinder(5);');
        console.log('Modified code:', newCode);

        const hasCylinder = newCode.includes('const cylinder');
        const hasUpdatedReturn = newCode.includes('return [box, cylinder]');

        console.log(`✓ Has cylinder: ${hasCylinder}, Updated return: ${hasUpdatedReturn}`);
        return hasCylinder && hasUpdatedReturn;
    } catch (error) {
        console.error('Return update test failed:', error);
        return false;
    }
}
