import { describe, it, expect } from 'vitest';
import { generateFilletCode, generateChamferCode, generateBooleanCode } from './modifiers.feature';

describe('ModifiersFeature', () => {
    describe('generateFilletCode', () => {
        it('should generate basic fillet code', () => {
            const code = generateFilletCode('box', 5, 'all');
            expect(code).toBe('\nconst box_filleted = box.fillet(5);');
        });

        it('should generate vertical fillet code', () => {
            const code = generateFilletCode('shape', 2, 'vertical');
            expect(code).toBe("\nconst shape_filleted = shape.fillet(2, (e) => e.inDirection('Z'));");
        });

        it('should generate horizontal fillet code', () => {
            const code = generateFilletCode('myPart', 1.5, 'horizontal');
            expect(code).toBe("\nconst myPart_filleted = myPart.fillet(1.5, (e) => !e.inDirection('Z'));");
        });
    });

    describe('generateChamferCode', () => {
        it('should generate basic chamfer code', () => {
            const code = generateChamferCode('box', 2, 'all');
            expect(code).toBe('\nconst box_chamfered = box.chamfer(2);');
        });

        it('should generate vertical chamfer code', () => {
            const code = generateChamferCode('shape', 1, 'vertical');
            expect(code).toBe("\nconst shape_chamfered = shape.chamfer(1, (e) => e.inDirection('Z'));");
        });
    });
    describe('generateBooleanCode', () => {
        it('should generate fuse code', () => {
            const code = generateBooleanCode('s1', 's2', 'fuse');
            expect(code).toBe('\nconst s1_fuse = s1.fuse(s2);');
        });

        it('should generate cut code', () => {
            const code = generateBooleanCode('base', 'tool', 'cut');
            expect(code).toBe('\nconst base_cut = base.cut(tool);');
        });

        it('should generate intersect code', () => {
            const code = generateBooleanCode('a', 'b', 'intersect');
            expect(code).toBe('\nconst a_intersect = a.intersect(b);');
        });
    });
});

