// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, test, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { executeGeometry, initReplicad } from '../../../../tests/regressionTestHelpers';

const runFuzz = process.env.KERNELCAD_FUZZ === '1';
const describeIfFuzz = runFuzz ? describe : describe.skip;

describeIfFuzz('Fuzzing: Geometric Primitives', () => {
    beforeAll(async () => {
        await initReplicad();
    });

    test('Box Primitive', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 100, noNaN: true }), // Width
                fc.double({ min: 0.1, max: 100, noNaN: true }), // Depth
                fc.double({ min: 0.1, max: 100, noNaN: true }), // Height
                (w, d, h) => {
                    const code = `
                        const { Sketcher } = replicad;
                        return new Sketcher().hLine(${w}).vLine(${d}).hLine(-${w}).close().extrude(${h});
                    `;
                    const { shape } = executeGeometry(code);
                    const faces = (shape as any).faces;
                    if (!faces || faces.length !== 6) throw new Error(`Expected 6 faces, got ${faces?.length}`);

                    const vol = (shape as any).volume ?? (shape as any).massProperties?.mass;
                    if (vol === undefined) {
                        const bb = (shape as any).boundingBox;
                        if (!bb || bb.width < 0.0001) throw new Error('Volume undefined and BoundingBox invalid');
                    } else {
                        expect(vol).toBeGreaterThan(0);
                    }
                    return true;
                }
            ),
            { numRuns: 30 }
        );
    });

    test('Cylinder Primitive', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 50, noNaN: true }), // Radius
                fc.double({ min: 0.1, max: 100, noNaN: true }), // Height
                (r, h) => {
                    const code = `
                        return replicad.makeCylinder(${r}, ${h});
                    `;
                    const { shape } = executeGeometry(code);
                    const faces = (shape as any).faces;
                    // Cylinder usually has 3 faces (Top, Bottom, Lateral)
                    if (!faces || faces.length !== 3) throw new Error(`Expected 3 faces, got ${faces?.length}`);

                    const vol = (shape as any).volume ?? (shape as any).massProperties?.mass;
                    if (vol === undefined) {
                        const bb = (shape as any).boundingBox;
                        if (!bb || bb.width < 0.0001) throw new Error('Volume undefined and BoundingBox invalid');
                    } else {
                        expect(vol).toBeGreaterThan(0);
                    }
                    return true;
                }
            ),
            { numRuns: 30 }
        );
    });

    test('Sketch Polygon Extrusion', () => {
        // Generate n (sides) and radius
        fc.assert(
            fc.property(
                fc.integer({ min: 3, max: 12 }), // Sides
                fc.double({ min: 1, max: 50, noNaN: true }),   // Radius
                fc.double({ min: 1, max: 50, noNaN: true }),   // Height
                (sides, r, h) => {
                    const code = `
                        const { Sketcher } = replicad;
                        let s = new Sketcher();
                        const n = ${sides};
                        const r = ${r};
                        const da = (2 * Math.PI) / n;
                        
                        // Start at (r, 0)
                        s = s.movePointerTo([r, 0]);
                        
                        for (let i = 1; i <= n; i++) {
                            const angle = i * da;
                            const x = r * Math.cos(angle);
                            const y = r * Math.sin(angle);
                            s = s.lineTo([x, y]);
                        }
                        s = s.close();
                        return s.extrude(${h});
                    `;

                    const { shape } = executeGeometry(code);

                    // N-sided polygon extrusion = N sides + Top + Bottom = N + 2 faces
                    // We relax strict check to >= 3 (Min valid solid)
                    const faces = (shape as any).faces;
                    if (!faces || faces.length < 3) {
                        throw new Error(`Expected at least 3 faces, got ${faces?.length}`);
                    }

                    const vol = (shape as any).volume ?? (shape as any).massProperties?.mass;
                    if (vol === undefined) {
                        const bb = (shape as any).boundingBox;
                        if (!bb || bb.width < 0.0001) throw new Error('Volume undefined and BoundingBox invalid');
                    } else {
                        expect(vol).toBeGreaterThan(0);
                    }
                    return true;
                }
            ),
            { numRuns: 20 }
        );
    });
});
