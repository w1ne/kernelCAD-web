// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { generateSketchCode } from './sketchCodegen';
import { type SketchData } from '../types/sketch';

describe('sketchCodegen', () => {
    it('should generate a sketch with .close() for a closed path', () => {
        const sketchData: SketchData = {
            id: 'sketch1',
            name: 'sketch1',
            plane: 'XY',
            entities: [
                {
                    id: 'e1',
                    type: 'rectangle',
                    corner: [0, 0],
                    width: 10,
                    height: 10,
                }
            ],
            closed: false, // isClosedPath helper will determine this
            createdAt: Date.now(),
        };

        const code = generateSketchCode(sketchData);
        expect(code).toContain('new Sketcher(\'XY\')');
        expect(code).toContain('.close();');
        expect(code).not.toContain('.extrude'); // Decoupled!
    });

    it('should generate a sketch with .done() for an open path', () => {
        const sketchData: SketchData = {
            id: 'sketch1',
            name: 'sketch1',
            plane: 'XY',
            entities: [
                {
                    id: 'e1',
                    type: 'line',
                    start: [0, 0],
                    end: [10, 10],
                }
            ],
            closed: false,
            createdAt: Date.now(),
        };

        const code = generateSketchCode(sketchData);
        expect(code).toContain('.done();');
    });

    it('should handle circles correctly', () => {
        const sketchData: SketchData = {
            id: 'sketch1',
            name: 'sketch1',
            plane: 'XY',
            entities: [
                {
                    id: 'e1',
                    type: 'circle',
                    center: [0, 0],
                    radius: 5,
                }
            ],
            closed: false,
            createdAt: Date.now(),
        };

        const code = generateSketchCode(sketchData);
        expect(code).toContain('.vSagittaArc(10, 5)');
        expect(code).toContain('.close();');
    });
});
