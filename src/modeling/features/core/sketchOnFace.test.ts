import { describe, it, expect } from 'vitest';
import { generateSketchOnFaceCode } from './sketchOnFace.feature';
import { CodeAnalyzer } from '../../../lib/codeGeneration';

describe('SketchOnFaceFeature', () => {
    it('should generate code to sketch on a face', () => {
        const ctx = new CodeAnalyzer('').createContext();
        const code = generateSketchOnFaceCode(ctx, 'myPart', 5, 'sketchFrommyPartFace5');
        // Parametric path derives plane from a face
        expect(code).toContain('myPart.faces[5]');
        expect(code).toContain('replicad.makePlaneFromFace');
        expect(code).toContain('new Sketcher');
        expect(code).toContain('sketchFrommyPartFace5');
    });

    it('should generate correct plane and sketch variable names', () => {
        const ctx = new CodeAnalyzer('').createContext();
        const code = generateSketchOnFaceCode(ctx, 'box', 2, 'boxFaceSketch');
        expect(code).toContain('plane_boxFaceSketch');
        expect(code).toContain('const boxFaceSketch = new Sketcher');
    });

    it('should generate code with explicit X-axis if provided', () => {
        const ctx = new CodeAnalyzer('').createContext();
        const xDir: [number, number, number] = [0, 1, 0];
        const code = generateSketchOnFaceCode(
            ctx,
            null,
            1,
            'sketch1',
            { origin: [0, 0, 0], normal: [0, 0, 1], xDir }
        );
        expect(code).toContain('new replicad.Plane');
        // Check for the array formatting
        expect(code).toContain('[0, 1, 0]');
    });
});
