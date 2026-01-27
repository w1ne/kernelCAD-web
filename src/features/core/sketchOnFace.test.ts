import { describe, it, expect } from 'vitest';
import { generateSketchOnFaceCode } from './sketchOnFace.feature';

describe('SketchOnFaceFeature', () => {
    it('should generate code to sketch on a face', () => {
        const code = generateSketchOnFaceCode('myPart', 5);
        expect(code).toBe('\nconst sketchFrommyPartFace5 = myPart.sketchOnFace(5);');
    });
});
