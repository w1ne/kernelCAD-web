import { describe, it, expect } from 'vitest';
import { generateFilletCode, generateChamferCode, generateBooleanCode } from './modifiers.feature';
import { CodeAnalyzer } from '../../../lib/codeGeneration';

const createCtx = () => new CodeAnalyzer('').createContext();

describe('ModifiersFeature', () => {
    describe('generateFilletCode', () => {
        it('should generate basic fillet code', () => {
            const code = generateFilletCode(createCtx(), 'box', 5, 'all');
            expect(code).toBe('const box_filleted = box.fillet(5);');
        });

        it('should generate vertical fillet code', () => {
            const code = generateFilletCode(createCtx(), 'shape', 2, 'vertical');
            expect(code).toBe("const shape_filleted = shape.fillet(2, (e) => e.inDirection('Z'));");
        });

        it('should generate horizontal fillet code', () => {
            const code = generateFilletCode(createCtx(), 'myPart', 1.5, 'horizontal');
            expect(code).toBe("const myPart_filleted = myPart.fillet(1.5, (e) => !e.inDirection('Z'));");
        });
    });

    describe('generateChamferCode', () => {
        it('should generate basic chamfer code', () => {
            const code = generateChamferCode(createCtx(), 'box', 2, 'all');
            expect(code).toBe('const box_chamfered = box.chamfer(2);');
        });

        it('should generate vertical chamfer code', () => {
            const code = generateChamferCode(createCtx(), 'shape', 1, 'vertical');
            expect(code).toBe("const shape_chamfered = shape.chamfer(1, (e) => e.inDirection('Z'));");
        });
    });
    describe('generateBooleanCode', () => {
        it('should generate fuse code', () => {
            const code = generateBooleanCode(createCtx(), 's1', 's2', 'fuse');
            expect(code).toBe('const s1_fuse = s1.fuse(s2);');
        });

        it('should generate cut code', () => {
            const code = generateBooleanCode(createCtx(), 'base', 'tool', 'cut');
            expect(code).toBe('const base_cut = base.cut(tool);');
        });

        it('should generate intersect code', () => {
            const code = generateBooleanCode(createCtx(), 'a', 'b', 'intersect');
            expect(code).toBe('const a_intersect = a.intersect(b);');
        });
    });
});
