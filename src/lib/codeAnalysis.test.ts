// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { generateUniqueName, extractVariables } from './codeAnalysis';

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

    // Tests for removed functions:
    // - findInsertionPoint: replaced by AST insertStatementSimple()
    // - updateReturnStatement: replaced by AST insertShape()

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
