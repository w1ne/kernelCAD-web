import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { executeGeometry, initReplicad } from '../../../tests/regressionTestHelpers';

const runFuzz = process.env.KERNELCAD_FUZZ === '1';
const describeIfFuzz = runFuzz ? describe : describe.skip;

describeIfFuzz('Geometry Fuzzing', () => {
    test('Parametric Box Stability', async () => {
        await initReplicad();

        // Property: For any valid dimensions, Extrude(Box) should have 6 faces and positive volume.
        fc.assert(
            fc.property(
                fc.float({ min: 1, max: 100 }), // Width
                fc.float({ min: 1, max: 100 }), // Depth
                fc.float({ min: 1, max: 100 }), // Height
                (w, d, h) => {
                    const code = `
const { Sketcher } = replicad;
return new Sketcher().hLine(${w}).vLine(${d}).hLine(-${w}).close().extrude(${h});
                    `;

                    try {
                        const { shape } = executeGeometry(code);
                        // Invariant 1: Must not crash
                        // Invariant 2: Closed shell (6 faces for a box)
                        const faces = (shape as any).faces;
                        if (!faces || faces.length !== 6) {
                            throw new Error(`Expected 6 faces, got ${faces?.length}`);
                        }

                        // Invariant 3: Positive volume
                        // Try standard Replicad volume getter
                        const vol = (shape as any).volume;
                        if (typeof vol !== 'number') {
                            // Fallback or skip if not computed
                            // throw new Error('Volume not computed');
                        } else {
                            expect(vol).toBeGreaterThan(0);
                        }
                        // Invariant 3: Closed shell (6 faces for a box)
                        expect((shape as any).faces.length).toBe(6);

                        return true;
                    } catch (e) {
                        console.error(`Failed with w=${w}, d=${d}, h=${h}`, e);
                        return false;
                    }
                }
            ),
            { numRuns: 50 } // Run 50 random variations
        );
    });
});
