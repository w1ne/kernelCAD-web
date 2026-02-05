// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { SketchingProvider, useSketching } from '../../context/SketchingContext';
import { useEffect } from 'react';
import type { SketchEntity, Constraint } from '../../lib/constraints/types';

// Helper component to run the test logic inside the context
const TestRunner = ({
    onReady
}: {
    onReady: (ctx: ReturnType<typeof useSketching>) => Promise<void>
}) => {
    const ctx = useSketching();
    // Use a ref or simple effect to run once
    useEffect(() => {
        onReady(ctx);
    }, []);

    return null;
};

describe('Constraints E2E Integration (via SketchingContext)', () => {
    it('should solve PARALLEL constraint in context', async () => {
        let capturedEntities: Map<string, SketchEntity> = new Map();

        await act(async () => {
            render(
                <SketchingProvider>
                    <TestRunner onReady={async (ctx) => {
                        // 1. Add Entities
                        // Fixed horizontal line
                        ctx.addEntity({ id: 'l1_p1', type: 'POINT', x: 0, y: 0, fixed: true });
                        ctx.addEntity({ id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true });
                        ctx.addEntity({ id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

                        // Moving diagonal line
                        ctx.addEntity({ id: 'l2_p1', type: 'POINT', x: 0, y: 10, fixed: false });
                        ctx.addEntity({ id: 'l2_p2', type: 'POINT', x: 5, y: 20, fixed: false });
                        ctx.addEntity({ id: 'l2', type: 'LINE', p1: 'l2_p1', p2: 'l2_p2' });

                        // 2. Add Constraint
                        ctx.addConstraint({
                            id: 'c1',
                            type: 'PARALLEL',
                            entities: ['l1', 'l2']
                        });

                        // 3. Wait for solver (it runs in microtask/effect)
                        // We can't await microtask easily here, but we can poll entities
                    }} />

                    {/* Capture state for assertion */}
                    <StateCapturer onUpdate={(ents) => capturedEntities = ents} />
                </SketchingProvider>
            );
        });

        // Wait for solver to converge
        await waitFor(() => {
            const p1 = capturedEntities.get('l2_p1');
            const p2 = capturedEntities.get('l2_p2');
            if (!p1 || !p2 || p1.type !== 'POINT' || p2.type !== 'POINT') throw new Error('Points not found');

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;

            // Should be horizontal (dy ~ 0)
            expect(Math.abs(dy)).toBeLessThan(0.1);
        }, { timeout: 1000 });
    });

    it('should solve PERPENDICULAR constraint in context', async () => {
        let capturedEntities: Map<string, SketchEntity> = new Map();

        await act(async () => {
            render(
                <SketchingProvider>
                    <TestRunner onReady={async (ctx) => {
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
        });

        await waitFor(() => {
            const p1 = capturedEntities.get('l2_p1');
            const p2 = capturedEntities.get('l2_p2');
            if (!p1 || !p2 || p1.type !== 'POINT' || p2.type !== 'POINT') throw new Error('Points not found');

            const dx = p2.x - p1.x;
            // Should be vertical (dx ~ 0)
            expect(Math.abs(dx)).toBeLessThan(0.1);
        });
    });

    it('should solve TANGENT constraint in context', async () => {
        let capturedEntities: Map<string, SketchEntity> = new Map();

        await act(async () => {
            render(
                <SketchingProvider>
                    <TestRunner onReady={async (ctx) => {
                        ctx.addEntity({ id: 'c_center', type: 'POINT', x: 0, y: 15, fixed: false }); // start away
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
        });

        await waitFor(() => {
            const center = capturedEntities.get('c_center');
            if (!center || center.type !== 'POINT') throw new Error('Center not found');

            // Should be at y=10 or -10
            expect(Math.abs(Math.abs(center.y) - 10)).toBeLessThan(1.0); // Allow some convergence slack
        });
    });
});

const StateCapturer = ({ onUpdate }: { onUpdate: (e: Map<string, SketchEntity>) => void }) => {
    const { entities } = useSketching();
    useEffect(() => {
        onUpdate(entities);
    }, [entities, onUpdate]);
    return null;
};
