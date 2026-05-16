// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SketchingProvider, useSketching } from '../../../context/SketchingContext';
import { useEffect, useRef } from 'react';
import type { SketchEntity } from '../../../lib/constraints/types';

// Helper component with stable callback pattern
const TestRunner = ({
    setup
}: {
    setup: (ctx: ReturnType<typeof useSketching>) => void
}) => {
    const ctx = useSketching();
    const hasRun = useRef(false);

    useEffect(() => {
        if (!hasRun.current) {
            hasRun.current = true;
            setup(ctx);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - setup is called once

    return null;
};

const StateCapturer = ({ onUpdate }: { onUpdate: (entities: Map<string, SketchEntity>) => void }) => {
    const { entities } = useSketching();
    const updateRef = useRef(onUpdate);

    useEffect(() => {
        updateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        updateRef.current(entities);
    }, [entities]);

    return null;
};

describe('Constraints E2E Integration (via SketchingContext)', () => {
    it('should solve PARALLEL constraint in context', async () => {
        let capturedEntities: Map<string, SketchEntity> = new Map();

        render(
            <SketchingProvider>
                <TestRunner setup={(ctx) => {
                    // Fixed horizontal line
                    ctx.addEntity({ id: 'l1_p1', type: 'POINT', x: 0, y: 0, fixed: true });
                    ctx.addEntity({ id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true });
                    ctx.addEntity({ id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

                    // Moving diagonal line
                    ctx.addEntity({ id: 'l2_p1', type: 'POINT', x: 0, y: 10, fixed: false });
                    ctx.addEntity({ id: 'l2_p2', type: 'POINT', x: 5, y: 20, fixed: false });
                    ctx.addEntity({ id: 'l2', type: 'LINE', p1: 'l2_p1', p2: 'l2_p2' });

                    // Add constraint
                    ctx.addConstraint({
                        id: 'c1',
                        type: 'PARALLEL',
                        entities: ['l1', 'l2']
                    });
                }} />
                <StateCapturer onUpdate={(ents) => capturedEntities = ents} />
            </SketchingProvider>
        );

        // Wait for solver to converge
        await waitFor(() => {
            const p1 = capturedEntities.get('l2_p1');
            const p2 = capturedEntities.get('l2_p2');
            if (!p1 || !p2 || p1.type !== 'POINT' || p2.type !== 'POINT') {
                throw new Error('Points not found');
            }

            const dy = p2.y - p1.y;
            // Should be horizontal (dy ~ 0)
            expect(Math.abs(dy)).toBeLessThan(0.1);
        }, { timeout: 2000 });
    });

    it('should solve PERPENDICULAR constraint in context', async () => {
        let capturedEntities: Map<string, SketchEntity> = new Map();

        render(
            <SketchingProvider>
                <TestRunner setup={(ctx) => {
                    ctx.addEntity({ id: 'l1_p1', type: 'POINT', x: 0, y: 0, fixed: true });
                    ctx.addEntity({ id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true });
                    ctx.addEntity({ id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

                    ctx.addEntity({ id: 'l2_p1', type: 'POINT', x: 5, y: 5, fixed: false });
                    ctx.addEntity({ id: 'l2_p2', type: 'POINT', x: 6, y: 6, fixed: false });
                    ctx.addEntity({ id: 'l2', type: 'LINE', p1: 'l2_p1', p2: 'l2_p2' });

                    ctx.addConstraint({
                        id: 'c1',
                        type: 'PERPENDICULAR',
                        entities: ['l1', 'l2']
                    });
                }} />
                <StateCapturer onUpdate={(ents) => capturedEntities = ents} />
            </SketchingProvider>
        );

        await waitFor(() => {
            const p1 = capturedEntities.get('l2_p1');
            const p2 = capturedEntities.get('l2_p2');
            if (!p1 || !p2 || p1.type !== 'POINT' || p2.type !== 'POINT') {
                throw new Error('Points not found');
            }

            const dx = p2.x - p1.x;
            // Should be vertical (dx ~ 0)
            expect(Math.abs(dx)).toBeLessThan(0.1);
        }, { timeout: 2000 });
    });

    it('should solve TANGENT constraint in context', async () => {
        let capturedEntities: Map<string, SketchEntity> = new Map();

        render(
            <SketchingProvider>
                <TestRunner setup={(ctx) => {
                    ctx.addEntity({ id: 'c_center', type: 'POINT', x: 0, y: 15, fixed: false });
                    ctx.addEntity({ id: 'c1', type: 'CIRCLE', center: 'c_center', radius: 10 });

                    ctx.addEntity({ id: 'l1_p1', type: 'POINT', x: -10, y: 0, fixed: true });
                    ctx.addEntity({ id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true });
                    ctx.addEntity({ id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

                    ctx.addConstraint({
                        id: 'c1',
                        type: 'TANGENT',
                        entities: ['c1', 'l1']
                    });
                }} />
                <StateCapturer onUpdate={(ents) => capturedEntities = ents} />
            </SketchingProvider>
        );

        await waitFor(() => {
            const center = capturedEntities.get('c_center');
            if (!center || center.type !== 'POINT') {
                throw new Error('Center not found');
            }

            // Should be at y=10 or -10
            expect(Math.abs(Math.abs(center.y) - 10)).toBeLessThan(1.0);
        }, { timeout: 2000 });
    });

    it('should solve CONCENTRIC constraint in context', async () => {
        let capturedEntities: Map<string, SketchEntity> = new Map();

        render(
            <SketchingProvider>
                <TestRunner setup={(ctx) => {
                    ctx.addEntity({ id: 'c1_center', type: 'POINT', x: 0, y: 0, fixed: true });
                    ctx.addEntity({ id: 'c1', type: 'CIRCLE', center: 'c1_center', radius: 10 });

                    ctx.addEntity({ id: 'c2_center', type: 'POINT', x: 9, y: -3, fixed: false });
                    ctx.addEntity({ id: 'c2', type: 'CIRCLE', center: 'c2_center', radius: 4 });

                    ctx.addConstraint({
                        id: 'concentric',
                        type: 'CONCENTRIC',
                        entities: ['c1', 'c2']
                    });
                }} />
                <StateCapturer onUpdate={(ents) => capturedEntities = ents} />
            </SketchingProvider>
        );

        await waitFor(() => {
            const center = capturedEntities.get('c2_center');
            if (!center || center.type !== 'POINT') {
                throw new Error('Circle center not found');
            }

            expect(center.x).toBeCloseTo(0);
            expect(center.y).toBeCloseTo(0);
        }, { timeout: 2000 });
    });

    it('should solve SYMMETRIC point constraint in context', async () => {
        let capturedEntities: Map<string, SketchEntity> = new Map();

        render(
            <SketchingProvider>
                <TestRunner setup={(ctx) => {
                    ctx.addEntity({ id: 'axis_p1', type: 'POINT', x: 0, y: 0, fixed: true });
                    ctx.addEntity({ id: 'axis_p2', type: 'POINT', x: 0, y: 20, fixed: true });
                    ctx.addEntity({ id: 'axis', type: 'LINE', p1: 'axis_p1', p2: 'axis_p2' });

                    ctx.addEntity({ id: 'left', type: 'POINT', x: -8, y: 5, fixed: true });
                    ctx.addEntity({ id: 'right', type: 'POINT', x: 3, y: 0, fixed: false });

                    ctx.addConstraint({
                        id: 'symmetric',
                        type: 'SYMMETRIC',
                        entities: ['left', 'right', 'axis']
                    });
                }} />
                <StateCapturer onUpdate={(ents) => capturedEntities = ents} />
            </SketchingProvider>
        );

        await waitFor(() => {
            const right = capturedEntities.get('right');
            if (!right || right.type !== 'POINT') {
                throw new Error('Right point not found');
            }

            expect(right.x).toBeCloseTo(8);
            expect(right.y).toBeCloseTo(5);
        }, { timeout: 2000 });
    });
});
