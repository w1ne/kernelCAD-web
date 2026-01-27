import { describe, it, expect } from 'vitest';
import { generateRevolveCode } from './revolve.feature';

describe('RevolveFeature', () => {
    describe('generateRevolveCode', () => {
        it('should generate correct code for X axis', () => {
            const code = generateRevolveCode('sketch1', 360, 'X');
            expect(code).toContain('const revolved1 = sketch1.revolve(360, [1, 0, 0]);');
        });

        it('should generate correct code for Y axis', () => {
            const code = generateRevolveCode('mySketch', 180, 'Y');
            // 'mySketch'.replace(/sketch/i, '') -> 'my'
            expect(code).toContain('const revolvedmy = mySketch.revolve(180, [0, 1, 0]);');
        });

        it('should generate correct code for Z axis', () => {
            const code = generateRevolveCode('sketch2', 90, 'Z');
            expect(code).toContain('const revolved2 = sketch2.revolve(90, [0, 0, 1]);');
        });

        it('should default to X axis for unknown axis', () => {
            const code = generateRevolveCode('sketch1', 360, 'Unknown');
            expect(code).toContain('const revolved1 = sketch1.revolve(360, [1, 0, 0]);');
        });
    });
});
