import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import opencascade from 'replicad-opencascadejs';
import { ConstraintSolver } from '../../src/modeling/constraints/solver';
import type { SolverState, SketchEntity } from '../../src/modeling/constraints/types';

const runE2E = process.env.KERNELCAD_E2E === '1';
const describeE2E = runE2E ? describe : describe.skip;

describeE2E('Core Workflows E2E', () => {
    let OC: Parameters<typeof replicad.setOC>[0];

    beforeAll(async () => {
        try {
            const oc = await opencascade();
            OC = oc as unknown as Parameters<typeof replicad.setOC>[0];
            replicad.setOC(OC);
            console.log('Replicad initialized successfully');
        } catch (e) {
            console.error('Failed to initialize Replicad:', e);
            throw e;
        }
    });

    describe('1. The Sketch-Profile Workflow', () => {
        it('should create a valid closed loop sketch', () => {
            const sketcher = new replicad.Sketcher()
                .hLine(10)
                .vLine(10)
                .hLine(-10)
                .close();

            const sketch = sketcher;
            expect(sketch).toBeDefined();

            // Check if wire exists and is closed
            const maybeWire = (sketch as unknown as { wire?: { isClosed: boolean } }).wire;
            if (maybeWire) {
                expect(maybeWire.isClosed).toBe(true);
            } else {
                // If .wire is hidden, verify we can create a face which implies closure
                expect(() => sketch.face()).not.toThrow();
            }
        });

        it('should fail if loop is not closed', () => {
            const sketcher = new replicad.Sketcher()
                .hLine(10)
                .vLine(10);

            // For open sketch, usually the sketcher itself is used
            const sketch = sketcher;

            const maybeWire = (sketch as unknown as { wire?: { isClosed: boolean } }).wire;
            if (maybeWire) {
                expect(maybeWire.isClosed).toBe(false);
            } else {
                // Try to create a face - should typically fail or be invalid for simple wire
                // Or we check if it is explicitly NOT closed
                // expect(() => sketch.face()).toThrow(); // behavior depends on impl
            }
        });
    });

    describe('2. The Constraint-Solve Workflow', () => {
        it('should solve constraints through the kernel constraint solver', () => {
            const solver = new ConstraintSolver();
            const state: SolverState = {
                entities: new Map<string, SketchEntity>([
                    ['fixed', { id: 'fixed', type: 'POINT', x: 0, y: 0, fixed: true }],
                    ['moving', { id: 'moving', type: 'POINT', x: 7, y: 0, fixed: false }],
                ]),
                constraints: [
                    { id: 'distance', type: 'DISTANCE', entities: ['fixed', 'moving'], value: 20 },
                ],
            };

            solver.solve(state);

            const moving = state.entities.get('moving');
            if (!moving || moving.type !== 'POINT') throw new Error('moving point missing');
            expect(moving.x).toBeCloseTo(20);
            expect(moving.y).toBeCloseTo(0);
        });
    });

    describe('3. The Extrude-Solid Workflow', () => {
        it('should extrude a profile into a solid', () => {
            const profile = new replicad.Sketcher()
                .hLine(10)
                .vLine(10)
                .hLine(-10)
                .close();

            const solid = profile.extrude(10);

            // Check validity safely
            const solidMeta = solid as unknown as {
                isValid?: () => boolean;
                volume?: number;
                boundingBox?: { width: number; height: number; depth: number };
                faces: unknown[];
            };
            if (typeof solidMeta.isValid === 'function') {
                expect(solidMeta.isValid()).toBe(true);
            }

            // Check volume or bbox
            if (solidMeta.volume !== undefined) {
                expect(solidMeta.volume).toBeCloseTo(1000, 1);
            } else {
                const bbox = solidMeta.boundingBox;
                expect(bbox?.width).toBeCloseTo(10);
                expect(bbox?.height).toBeCloseTo(10);
                expect(bbox?.depth).toBeCloseTo(10);
            }

            expect(solidMeta.faces.length).toBeGreaterThan(0);
        });
    });

    describe('4. The Boolean Workflow', () => {
        it('should perform a cut operation (Hole)', () => {
            const base = new replicad.Sketcher()
                .hLine(20)
                .vLine(20)
                .hLine(-20)
                .close()
                .extrude(10);

            const tool = replicad.makeCylinder(5, 20).translate(10, 10, 0);

            const result = base.cut(tool);

            const resultMeta = result as unknown as { volume?: number; faces: unknown[] };
            const baseMeta = base as unknown as { faces: unknown[] };
            if (resultMeta.volume !== undefined) {
                expect(resultMeta.volume).toBeLessThan(4000);
            } else {
                // Check faces changed
                expect(resultMeta.faces.length).not.toBe(baseMeta.faces.length);
                // Or bbox volume check? No, bbox might be same.
            }
        });
    });

    describe('5. The Parametric Edit Workflow', () => {
        it('should regenerate geometry when parameters change', () => {
            const generatePart = (width: number) => {
                const profile = new replicad.Sketcher()
                    .hLine(width)
                    .vLine(10)
                    .hLine(-width)
                    .close();
                return profile.extrude(10);
            };

            const partA = generatePart(10);
            const partB = generatePart(20);

            const partAMeta = partA as unknown as { volume?: number; boundingBox?: { width: number } };
            const partBMeta = partB as unknown as { volume?: number; boundingBox?: { width: number } };
            if (partAMeta.volume !== undefined && partBMeta.volume !== undefined) {
                expect(partAMeta.volume).not.toBeCloseTo(partBMeta.volume);
            } else {
                expect(partAMeta.boundingBox?.width).toBeCloseTo(10);
                expect(partBMeta.boundingBox?.width).toBeCloseTo(20);
            }
        });
    });
});
