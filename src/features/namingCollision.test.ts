import { describe, it, expect } from 'vitest';
import { generateBooleanCode, generateFilletCode } from './core/modifiers.feature';
import { CodeAnalyzer } from '../lib/codeGeneration';

describe('Naming Collision Regression Suite', () => {
    it('should generate unique names for sequential boolean operations', () => {
        const initialCode = `
const box = new Sketcher().hLine(10).close().extrude(10);
const cyl = replicad.makeCylinder(5, 20);
        const filleted_fuse = box.fuse(cyl);
        `;

        const ctx = new CodeAnalyzer(initialCode).createContext();
        const generatedCode = generateBooleanCode(ctx, 'filleted', 'cyl2', 'fuse');

        // Should produce filleted_fuse1 because filleted_fuse exists
        expect(generatedCode).toContain('const filleted_fuse1 =');
    });

    it('should generate unique names for sequential fillet operations', () => {
        const initialCode = `
const box = new Sketcher().hLine(10).close().extrude(10);
const box_filleted = box.fillet(1);
        `;

        const ctx = new CodeAnalyzer(initialCode).createContext();
        const generatedCode = generateFilletCode(ctx, 'box', 2, 'all');

        // Should produce box_filleted1
        expect(generatedCode).toContain('const box_filleted1 =');
    });
});
