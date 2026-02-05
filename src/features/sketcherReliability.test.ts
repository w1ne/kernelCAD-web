import { describe, it, expect, beforeAll } from 'vitest';
import { initReplicad, executeGeometry } from '../test/regressionTestHelpers';

describe('Sketcher Reliability', () => {
    beforeAll(async () => {
        await initReplicad();
    });

    it('should capture sketches created with new Sketcher()', () => {
        const code = `
            const { Sketcher } = replicad;
            const sketch = new Sketcher().hLine(10).close();
            return sketch.extrude(10);
        `;

        const { sketches } = executeGeometry(code);
        expect(sketches.length).toBeGreaterThan(0);
        expect(sketches[0]).toBeDefined();
    });

    it('should NOT throw "only move pointer" error when reusing sketcher logic', () => {
        // This reproduces the user's issue primarily if SafeSketcher doesn't 
        // handle state resets correctly or if we start a new chain on a dirty state.

        // Scenario: Manually constructing a sketch with explicit moves
        // The error "You can only move the pointer if there is no edge defined" 
        // comes from Replicad when you call movePointerTo() after lineTo() without closing?
        // Or if you call it twice?

        // Let's rely on a known failure pattern if we can find one.
        // For now, let's test a complex chain.
        const complexCode = `
            const { Sketcher } = replicad;
            const s = new Sketcher();
            s.hLine(10).vLine(10).hLine(-10).close();
            // Start second loop
            s.movePointerTo([2,2]);
            s.hLine(5).vLine(5).hLine(-5).close();
            
            return s.done().extrude(5);
        `;

        const { shape } = executeGeometry(complexCode);
        expect(shape).toBeDefined();
    });
});
