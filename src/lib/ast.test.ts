import { describe, it, expect } from 'vitest';
import { parseCode, getDeclaredVariablesAST, getSketchVariablesAST, generateCode, insertStatementSimple, insertShape, promoteReturnExpressionAtIndexToVariable, insertStatementsAndReplaceReturnAtIndex } from './ast';

describe('AST - Basic Parsing', () => {
    it('should parse simple code without crashing', () => {
        const code = `const x = 1;`;
        const ast = parseCode(code);
        expect(ast).toBeDefined();
        expect(ast.type).toBe('Program');
    });

    it('should parse standard template', () => {
        const code = `
            export default function main() {
                function drawPart() {
                    const box = makeBox(10);
                    return [box];
                }
                return drawPart();
            }
        `;
        const ast = parseCode(code);
        expect(ast).toBeDefined();
        expect(ast.type).toBe('Program');
    });

    it('should handle top-level return statements', () => {
        const code = `return 42;`;
        expect(() => parseCode(code)).not.toThrow();
    });

    it('should throw on malformed code', () => {
        const code = `const x = ;`; // Syntax error
        expect(() => parseCode(code)).toThrow();
    });
});

describe('AST - Variable Extraction', () => {
    it('should extract const, let, var declarations', () => {
        const code = `
            const box1 = makeBox(10);
            let cylinder = makeCylinder(5);
            var sphere = makeSphere(3);
        `;
        const vars = getDeclaredVariablesAST(code);
        expect(vars.has('box1')).toBe(true);
        expect(vars.has('cylinder')).toBe(true);
        expect(vars.has('sphere')).toBe(true);
    });

    it('should extract function declarations', () => {
        const code = `
            function helper() {}
            const value = 1;
        `;
        const vars = getDeclaredVariablesAST(code);
        expect(vars.has('helper')).toBe(true);
        expect(vars.has('value')).toBe(true);
    });

    it('should handle nested functions', () => {
        const code = `
            function outer() {
                function inner() {}
                const x = 1;
            }
            const y = 2;
        `;
        const vars = getDeclaredVariablesAST(code);
        expect(vars.has('outer')).toBe(true);
        expect(vars.has('inner')).toBe(true);
        expect(vars.has('x')).toBe(true);
        expect(vars.has('y')).toBe(true);
    });

    it('should handle empty code', () => {
        const code = ``;
        const vars = getDeclaredVariablesAST(code);
        expect(vars.size).toBe(0);
    });

    it('should not extract from comments', () => {
        const code = `
            // const commented = 1;
            const real = 2;
        `;
        const vars = getDeclaredVariablesAST(code);
        expect(vars.has('commented')).toBe(false);
        expect(vars.has('real')).toBe(true);
    });

    it('should extract sketch variables', () => {
        const code = `
            const box = replicad.makeBox(10, 10, 10);
            const sketch = new Sketcher('XY').movePointerTo(0, 0).lineTo(10, 0).close();
            const sketch2 = startSketch().rect(0, 0, 10, 10).close();
            const sketch3 = sketchOnFace(box, 0).rect(0, 0, 5, 5).close();
        `;
        const vars = getSketchVariablesAST(code);
        expect(vars).toContain('sketch');
        expect(vars).toContain('sketch2');
        expect(vars).toContain('sketch3');
        expect(vars).not.toContain('box');
    });
});

describe('AST - Code Generation', () => {
    it('should generate code from AST', () => {
        const code = 'const x = 1;';
        const ast = parseCode(code);
        const generated = generateCode(ast);

        expect(generated).toBeDefined();
        expect(typeof generated).toBe('string');
        expect(generated).toContain('const x');
    });

    it('should preserve code structure in round-trip', () => {
        const code = 'const y = 2;';
        const ast1 = parseCode(code);
        const generated = generateCode(ast1);
        const ast2 = parseCode(generated);

        expect(ast2).toBeDefined();
        expect(ast2.type).toBe('Program');
    });

    it('should handle complex functions', () => {
        const code = `
            function drawPart() {
                const x = 1;
                const y = 2;
                return [x, y];
            }
        `;
        const ast = parseCode(code);
        const generated = generateCode(ast);
        expect(generated).toContain('drawPart');
        expect(generated).toContain('return');
    });
});

describe('AST - Simple Insertion', () => {
    it('should insert statement before return', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
        return [box];
    }
    return drawPart();
}`;

        const newCode = insertStatementSimple(code, 'const cylinder = makeCylinder(5);');

        expect(newCode).toContain('const cylinder');
        expect(newCode).toContain('return [box]');

        const cylinderIndex = newCode.indexOf('const cylinder');
        const returnIndex = newCode.indexOf('return [box]');
        expect(cylinderIndex).toBeLessThan(returnIndex);
    });

    it('should handle multiple existing statements', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
        const sphere = makeSphere(5);
        return [box, sphere];
    }
    return drawPart();
}`;

        const newCode = insertStatementSimple(code, 'const cylinder = makeCylinder(3);');
        expect(newCode).toContain('const box');
        expect(newCode).toContain('const sphere');
        expect(newCode).toContain('const cylinder');
    });

    it('should throw if no drawPart function found', () => {
        const code = `
            function other() {
                return [];
            }
        `;
        expect(() => insertStatementSimple(code, 'const x = 1;')).toThrow('Could not find drawPart');
    });

    it('should throw if no return statement found', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
    }
    return drawPart();
}`;
        expect(() => insertStatementSimple(code, 'const x = 1;')).toThrow('Could not find drawPart function or return statement');
    });
});

describe('AST - Return Statement Update', () => {
    it('should insert and update empty return array', () => {
        const code = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'const box = makeBox(10);');

        expect(newCode).toContain('const box');
        expect(newCode).toContain('return [box]');
    });

    it('should append to existing return array', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
        return [box];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'const cylinder = makeCylinder(5);');

        expect(newCode).toContain('const cylinder');
        expect(newCode).toContain('return [box, cylinder]');
    });

    it('should handle multiple items in return array', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
        const sphere = makeSphere(5);
        return [box, sphere];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'const cylinder = makeCylinder(3);');

        expect(newCode).toContain('return [box, sphere, cylinder]');
    });

    it('should extract variable name correctly', () => {
        const code = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'const myCustomName = makeBox(20);');
        expect(newCode).toContain('return [myCustomName]');
    });

    it('should work with let declarations', () => {
        const code = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'let box = makeBox(10);');
        expect(newCode).toContain('return [box]');
    });

    it('should NOT add Sketcher variables to the return array', () => {
        const code = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, "const sketch1 = new Sketcher('XY').movePointerTo([0, 0]).lineTo([10, 10]).close();");

        expect(newCode).toContain('const sketch1 = new Sketcher');
        expect(newCode).toContain('return []');
        expect(newCode).not.toContain('return [sketch1]');
    });
});

describe('AST - Return Rewrites', () => {
    it('should promote a top-level return expression to a variable', () => {
        const code = `
const x = 1;
return replicad.makeBox(10, 10, 10);
        `;
        const next = promoteReturnExpressionAtIndexToVariable(code, 0, 'box1');
        expect(next).toContain('const box1');
        expect(next).toContain('return box1');
        expect(next).not.toContain('return replicad.makeBox');
    });

    it('should insert statements and replace an element in return array', () => {
        const code = `
const a = replicad.makeBox(10, 10, 10);
const b = replicad.makeBox(5, 5, 5);
return [a, b];
        `;
        const next = insertStatementsAndReplaceReturnAtIndex(code, 'const c = a.fuse(b);', 0, 'c');
        expect(next).toContain('const c');
        expect(next).toContain('return [c, b]');
    });
});

describe('AST - Edge Cases', () => {
    it('should handle code with comments', () => {
        const code = `
export default function main() {
    function drawPart() {
        // Comment here
        const box = makeBox(10);
        return [box];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'const cylinder = makeCylinder(5);');
        expect(newCode).toContain('const cylinder');
        expect(newCode).toContain('return [box, cylinder]');
    });

    it('should handle complex expressions', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = makeBox(10 + 5 * 2);
        return [box];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'const cylinder = makeCylinder(Math.PI * 2);');
        expect(newCode).toContain('const cylinder');
    });

    it('should preserve indentation style', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
        return [box];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'const cylinder = makeCylinder(5);');
        // Should be parseable
        expect(() => parseCode(newCode)).not.toThrow();
    });
});
