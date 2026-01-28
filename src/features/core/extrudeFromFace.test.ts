import { describe, it, expect } from 'vitest';
import { generateExtrudeFromFaceCode } from './extrudeFromFace.feature';

describe('ExtrudeFromFace Code Generation', () => {
    it('should generate code to extrude from a face with unique variable names', () => {
        const code = generateExtrudeFromFaceCode('myPart', 3, 20);
        // Check that it uses sketchOnFace and extrude
        expect(code).toContain('myPart.sketchOnFace(3)');
        expect(code).toContain('.extrude(20)');
        expect(code).toContain('myPart.fuse(');
        // Variable names should include timestamp for uniqueness
        expect(code).toMatch(/myPart_extrudeFace3_\d+/);
    });
});
