// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, it, expect } from 'vitest';
import { insertShape } from './ast';

describe('ast.ts - sketch insertion', () => {
    it('should correctly insert a multi-line sketch chain and preserve all calls', () => {
        const initialCode = `
export function drawPart() {
    const box = replicad.makeBox(10, 10, 10);
    return box;
}
        `.trim();

        const sketchCode = `
const sketch1 = new Sketcher('XY')
    .movePointerTo([5, 0])
    .vSagittaArc(10, 5)
    .vSagittaArc(-10, 5)
    .close();
        `.trim();

        const result = insertShape(initialCode, sketchCode);

        // Verify return statement is updated
        expect(result).toContain('return [box, sketch1]');

        // Verify all sketch calls are present (ignoring whitespace differences caused by astring)
        expect(result).toContain('.movePointerTo([5, 0])');
        expect(result).toContain('.vSagittaArc(10, 5)');
        expect(result).toContain('.vSagittaArc(-10, 5)');
        expect(result).toContain('.close()');
    });

    it('should handle detached plane sketches with long numbers', () => {
        const initialCode = `
export function drawPart() {
    return [replicad.makeBox(10, 10, 10)];
}
        `.trim();

        const sketchCode = `
const sketch1 = new Sketcher(new replicad.Plane([5, -5, 10], null, [0, 0, 1]))
    .movePointerTo([3.62842712474668, 0])
    .vSagittaArc(10, 5)
    .close();
        `.trim();

        const result = insertShape(initialCode, sketchCode);

        expect(result).toContain('new replicad.Plane([5, -5, 10], null, [0, 0, 1])');
        expect(result).toContain('.movePointerTo([3.62842712474668, 0])');
        expect(result).toContain('.close()');
    });
});
