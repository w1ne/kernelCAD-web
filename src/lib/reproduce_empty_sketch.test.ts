import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';

import { SafeSketcher } from './safeSketch';
import { extrude } from './geometryHelpers';

describe.skip('SafeSketcher Empty Sketch Handling', () => {
    beforeAll(async () => {
        const opencascade = await import('replicad-opencascadejs');
        const OC = await opencascade.default();
        replicad.setOC(OC);
    });

    it('should throw descriptive error from SafeSketcher when done() is called empty', () => {
        const sketcher = new SafeSketcher(new replicad.Sketcher());
        expect(() => {
            sketcher.done();
        }).toThrow(/No geometry has been drawn/);
    });

    it('should throw descriptive error from extrude helper when sketch is empty', () => {
        const sketcher = new replicad.Sketcher();
        // We simulate the raw replicad sketcher being passed to our extrude helper
        expect(() => {
            extrude(sketcher, 10);
        }).toThrow(/Extrusion failed: The sketch is empty or contains invalid geometry/);
    });

    it('should allow extrusion after drawing geometry', () => {
        const sketcher = new SafeSketcher(new replicad.Sketcher());
        sketcher.lineTo([10, 10]).lineTo([10, 0]).close();

        // This should NOT throw
        const result = sketcher.extrude(10);
        expect(result).toBeDefined();
    });
});
