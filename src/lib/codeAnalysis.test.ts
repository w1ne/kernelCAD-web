// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { generateUniqueName, findInsertionPoint, updateReturnStatement, extractVariables } from './codeAnalysis';

describe('codeAnalysis', () => {
    describe('generateUniqueName', () => {
        it('should return base name if not present', () => {
            expect(generateUniqueName('', 'box')).toBe('box');
        });

        it('should return box1 if box exists', () => {
            expect(generateUniqueName('const box = 1;', 'box')).toBe('box1');
        });

        it('should increment correctly', () => {
            const code = `
                const box = 1;
                const box1 = 2;
                const box2 = 3;
            `;
            expect(generateUniqueName(code, 'box')).toBe('box3');
        });
    });

    describe('findInsertionPoint', () => {
        it('should find line before return in drawPart', () => {
            const code = `
function drawPart() {
    const x = 1;
    return x;
}
            `.trim();
            // Line 1: function...
            // Line 2: const x...
            // Line 3: return x;
            // Expect insertion at line 3 (pushing return down)
            // Note: Our helper returns 1-based line number. 
            // In the split array: 
            // 0: function
            // 1: const
            // 2: return
            // findInsertionPoint returns index 2 + 1 = 3? 
            // In the implementation: returns returnLine + 1. 
            // If returnLine is index 2. We return 3. 

            // Wait, inserting AT line 3 means the content at line 3 moves to line 4.
            // So we insert BEFORE the return. Correct.
            expect(findInsertionPoint(code)).toBe(3);
        });

        it('should ignore global return drawPart()', () => {
            const code = `
function drawPart() {
    const x = 1;
    return x;
}

return drawPart();
            `.trim();
            // Should find line 4 (return x), inserts at 4 (before return x)
            expect(findInsertionPoint(code)).toBe(3);
        });

        it('should fallback to end if no return', () => {
            const code = `
function drawPart() {
    const x = 1;
}
            `.trim();
            expect(findInsertionPoint(code)).toBe(3); // Before }
        });
    });

    describe('updateReturnStatement', () => {
        it('should convert single return to array', () => {
            const code = 'return box;';
            expect(updateReturnStatement(code, 'cyl')).toBe('return [box, cyl];');
        });

        it('should append to array return', () => {
            const code = 'return [box, sphere];';
            expect(updateReturnStatement(code, 'cyl')).toBe('return [box, sphere, cyl];');
        });

        it('should ignore return drawPart()', () => {
            const code = 'return drawPart();';
            expect(updateReturnStatement(code, 'cyl')).toBe('return drawPart();');
        });
    });

    describe('extractVariables', () => {
        it('should extract box variable', () => {
            const code = 'const myBox = replicad.makeBox(10, 10, 10);';
            const vars = extractVariables(code);
            expect(vars).toHaveLength(1);
            expect(vars[0]).toEqual({ name: 'myBox', type: 'Box', line: 1 });
        });

        it('should extract multiple variables', () => {
            const code = `
const box = replicad.makeBox(10, 10, 10);
const cyl = replicad.makeCylinder(5, 10);
const res = box.cut(cyl);
            `.trim();
            const vars = extractVariables(code);
            expect(vars).toHaveLength(3);
            expect(vars[0]).toEqual({ name: 'box', type: 'Box', line: 1 });
            expect(vars[1]).toEqual({ name: 'cyl', type: 'Cylinder', line: 2 });
            expect(vars[2]).toEqual({ name: 'res', type: 'Cut', line: 3 });
        });
    });
});
