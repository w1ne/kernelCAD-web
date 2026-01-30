import { describe, it, expect } from 'vitest';
import { generateSketchOnFaceCode } from './sketchOnFace.feature';

describe('SketchOnFaceFeature', () => {
    it('should generate code to sketch on a face', () => {
        const code = generateSketchOnFaceCode('myPart', 5, 'sketchFrommyPartFace5');
        // New code generation pattern uses Plane and Sketcher
        expect(code).toContain('new replicad.Plane');
        expect(code).toContain('myPart.faces[5]');
        expect(code).toContain('new Sketcher');
        expect(code).toContain('sketchFrommyPartFace5');
    });

    it('should generate correct plane and sketch variable names', () => {
        const code = generateSketchOnFaceCode('box', 2, 'boxFaceSketch');
        expect(code).toContain('plane_boxFaceSketch');
        expect(code).toContain('const boxFaceSketch = new Sketcher');
    });
});
