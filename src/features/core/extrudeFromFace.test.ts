import { describe, it, expect } from 'vitest';
import { generateExtrudeFromFaceCode } from './extrudeFromFace.feature';

describe('ExtrudeFromFaceFeature', () => {
    it('should generate code to extrude a face and fuse it', () => {
        const code = generateExtrudeFromFaceCode('myPart', 3, 20);

        expect(code).toContain('const myPart_face3_sketch = myPart.sketchOnFace(3);');
        expect(code).toContain('const myPart_face3_extrude = myPart_face3_sketch.extrude(20);');
        expect(code).toContain('const myPart_fused = myPart.fuse(myPart_face3_extrude);');
    });
});
