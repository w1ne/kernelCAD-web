import { describe, it, expect } from 'vitest';
import { generateExtrudeFromFaceCode } from './extrudeFromFace.feature';
import { CodeAnalyzer } from '../../lib/codeGeneration';

describe('ExtrudeFromFace Code Generation', () => {
    it('should generate code to extrude from a face with unique variable names', () => {
        const ctx = new CodeAnalyzer('').createContext();
        const code = generateExtrudeFromFaceCode(ctx, 'myPart', 3, 20);
        expect(code).toContain('myPart.faces[3]');
        expect(code).toContain('extrude(');
        expect(code).toContain('20');
        expect(code).toContain('myPart.fuse(');
        expect(code).toContain('const myPart_face_3');
    });

    it('should generate correct extrusion chain', () => {
        const ctx = new CodeAnalyzer('').createContext();
        const code = generateExtrudeFromFaceCode(ctx, 'box', 0, 10);
        expect(code).toContain('box.faces[0]');
        expect(code).toContain('_fused');
    });

    it('should handle negative extrusion distance', () => {
        const ctx = new CodeAnalyzer('').createContext();
        const code = generateExtrudeFromFaceCode(ctx, 'part', 2, -15);
        expect(code).toContain('-15');
    });
});
