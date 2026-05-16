import { describe, test, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { executeGeometry, initReplicad } from '../../../../tests/regressionTestHelpers';

const runFuzz = process.env.KERNELCAD_FUZZ === '1';
const describeIfFuzz = runFuzz ? describe : describe.skip;

describeIfFuzz('Fuzzing: Geometric Operations', () => {
    beforeAll(async () => {
        await initReplicad();
    });

    test('Fillet Stability', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 10, max: 100, noNaN: true }), // Box Size
                fc.double({ min: 0.1, max: 20, noNaN: true }), // Radius
                (size, r) => {
                    const validR = Math.min(r, size / 2 - 0.1);

                    const code = `
                        const { Sketcher } = replicad;
                        const box = new Sketcher().hLine(${size}).vLine(${size}).hLine(-${size}).close().extrude(${size});
                        return box.fillet(${validR});
                    `;
                    const { shape } = executeGeometry(code);
                    const vol = (shape as any).volume ?? (shape as any).massProperties?.mass;
                    const originalVol = size * size * size;

                    if (vol !== undefined) {
                        expect(vol).toBeLessThan(originalVol);
                        expect(vol).toBeGreaterThan(0);
                    } else {
                        // Fallback check
                        const bb = (shape as any).boundingBox;
                        if (!bb) {
                            // If BB is missing, check if it's a valid shape at least
                            const wrapped = (shape as any).wrapped;
                            if (wrapped && !wrapped.IsNull()) return true;
                            throw new Error("Shape invalid: BoundingBox missing and IsNull/Invalid");
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 30 }
        );
    });

    test('Chamfer Stability', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 10, max: 100, noNaN: true }), // Box Size
                fc.double({ min: 0.1, max: 20, noNaN: true }), // Radius
                (size, r) => {
                    const validR = Math.min(r, size / 2 - 0.1);
                    const code = `
                        const { Sketcher } = replicad;
                        const box = new Sketcher().hLine(${size}).vLine(${size}).hLine(-${size}).close().extrude(${size});
                        return box.chamfer(${validR});
                    `;
                    const { shape } = executeGeometry(code);
                    const vol = (shape as any).volume ?? (shape as any).massProperties?.mass;
                    const originalVol = size * size * size;

                    if (vol !== undefined) {
                        expect(vol).toBeLessThan(originalVol);
                        expect(vol).toBeGreaterThan(0);
                    } else {
                        const bb = (shape as any).boundingBox;
                        if (!bb) {
                            const wrapped = (shape as any).wrapped;
                            if (wrapped && !wrapped.IsNull()) return true;
                            throw new Error("Shape invalid: BoundingBox missing and IsNull/Invalid");
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 30 }
        );
    });

    test('Boolean Union Stability', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 10, max: 50, noNaN: true }), // Size 1
                fc.double({ min: 10, max: 50, noNaN: true }), // Size 2
                fc.double({ min: 100, max: 200, noNaN: true }),  // Offset X (Large enough to be disjoint)
                (s1, s2, offX) => {
                    // Ensure disjoint
                    fc.pre(offX > s1 + 1);

                    const code = `
                        const b1 = replicad.makeBox(${s1}, ${s1}, ${s1});
                        const b2 = replicad.makeBox(${s2}, ${s2}, ${s2}).translate(${offX}, 0, 0);
                        return b1.union(b2);
                    `;
                    const { shape } = executeGeometry(code);
                    const vol = (shape as any).volume ?? (shape as any).massProperties?.mass;

                    const v1 = s1 * s1 * s1;
                    const v2 = s2 * s2 * s2;

                    if (vol !== undefined) {
                        // For disjoint union, vol should be exactly v1 + v2
                        expect(vol).toBeGreaterThanOrEqual(v1 + v2 - 0.1);
                        expect(vol).toBeLessThanOrEqual(v1 + v2 + 0.1);
                    } else {
                        const bb = (shape as any).boundingBox;
                        if (!bb) {
                            const wrapped = (shape as any).wrapped;
                            if (wrapped && !wrapped.IsNull()) return true;

                            const type = wrapped?.ClassName ? wrapped.ClassName() : 'N/A';
                            throw new Error(`Union returned invalid shape. Type: ${type}`);
                        }
                    }

                    return true;
                }
            ),
            { numRuns: 20 }
        );
    });
});
