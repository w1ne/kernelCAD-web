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
        } as any);
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

/**
 * Extract all declared variable names from the code using AST traversal.
 */
export function getDeclaredVariablesAST(code: string): Set<string> {
    const ast = parseCode(code);
    const variables = new Set<string>();

    walk.simple(ast, {
        VariableDeclarator(node: any) {
            if (node.id.type === 'Identifier') {
                variables.add(node.id.name);
            }
        },
        FunctionDeclaration(node: any) {
            if (node.id && node.id.type === 'Identifier') {
                variables.add(node.id.name);
            }
        }
    });

    return variables;
}

/**
 * Insert a statement before the return statement in the drawPart function.
 * Phase 4: Simple insertion without modifying the return statement.
 */
export function insertStatementSimple(code: string, statement: string): string {
    const ast = parseCode(code) as any;
    const statementAst = parseCode(statement) as any;

    const statementNode = statementAst.body[0];
    let inserted = false;

    walk.simple(ast, {
        FunctionDeclaration(node: any) {
            if (inserted) return;
            if (node.id && node.id.name === 'drawPart') {
                const body = node.body.body;
                const returnIndex = body.findIndex((n: any) => n.type === 'ReturnStatement');

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

    return generateCode(ast);
}

/**
 * Insert a statement and update the return array to include the new variable.
 * Phase 5: Full insertion with return statement update.
 */
export function insertShape(code: string, statement: string): string {
    const ast = parseCode(code) as any;
    const statementAst = parseCode(statement) as any;

    const statementNode = statementAst.body[0];

    // Extract variable name from the statement (e.g., "const box1 = ...")
    let varName: string | null = null;
    if (statementNode.type === 'VariableDeclaration' && statementNode.declarations[0]) {
        const declarator = statementNode.declarations[0];
        if (declarator.id.type === 'Identifier') {
            varName = declarator.id.name;
        }
    }

    let inserted = false;

    walk.simple(ast, {
        FunctionDeclaration(node: any) {
            if (inserted) return;
            if (node.id && node.id.name === 'drawPart') {
                const body = node.body.body;
                const returnIndex = body.findIndex((n: any) => n.type === 'ReturnStatement');

                if (returnIndex !== -1) {
                    // Insert statement before return
                    body.splice(returnIndex, 0, statementNode);

                    // Update return statement if we have a variable name
                    if (varName) {
                        const returnStmt = body[returnIndex + 1]; // Now shifted by 1
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

    return generateCode(ast);
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
