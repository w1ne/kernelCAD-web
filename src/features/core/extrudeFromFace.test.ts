import { describe, it, expect } from 'vitest';
import { generateExtrudeFromFaceCode } from './extrudeFromFace.feature';

describe('ExtrudeFromFace Code Generation', () => {
    it('should generate code to extrude from a face with unique variable names', () => {
        const code = generateExtrudeFromFaceCode('myPart', 3, 20);
        // Check that it uses sketchOnFace helper function and extrude
        expect(code).toContain('sketchOnFace(myPart, 3)');
        expect(code).toContain('extrude(');
        expect(code).toContain('20)');
        expect(code).toContain('myPart.fuse(');
        // Variable names should include unique suffix (alphanumeric from CodeBuilder/timestamp)
        expect(code).toMatch(/myPart_sketch_3_[a-z0-9]+/);
    });

    it('should generate correct extrusion chain', () => {
        const code = generateExtrudeFromFaceCode('box', 0, 10);
        // Should create sketch, extrude it, then fuse with original
        expect(code).toContain('sketchOnFace(box, 0)');
        expect(code).toContain('_fused');
    });

    it('should handle negative extrusion distance', () => {
        const code = generateExtrudeFromFaceCode('part', 2, -15);
        expect(code).toContain('-15)');
    });
});
