/**
 * Workflow Integration Tests
 * 
 * Tests for complete CAD workflow patterns to ensure reliability
 * These tests validate the code generation and workflow patterns
 * that users would typically execute.
 */

import { describe, it, expect } from 'vitest';
import { generateSketchCode, generateSketchName } from './sketchCodegen';
import { CodeAnalyzer } from './codeGeneration';
import { generateExtrudeFromFaceCode } from '../features/core/extrudeFromFace.feature';
import { generateRevolveCode } from '../features/core/revolve.feature';
import { generateSketchOnFaceCode } from '../features/core/sketchOnFace.feature';
import {
    generateFilletCode,
    generateChamferCode,
    generateBooleanCode
} from '../features/core/modifiers.feature';
import type { SketchData } from '../types/sketch';

const createCodeContext = (code = '') => new CodeAnalyzer(code).createContext();

// ============================================================================
// Test Fixtures - Reusable sketch data for common shapes
// ============================================================================

const createRectangleSketch = (name: string, width: number, height: number): SketchData => ({
    id: `${name}-id`,
    name,
    plane: 'XY',
    entities: [{
        id: 'rect1',
        type: 'rectangle',
        corner: [0, 0],
        width,
        height
    }],
    closed: false,
    createdAt: Date.now()
});

const createCircleSketch = (name: string, radius: number): SketchData => ({
    id: `${name}-id`,
    name,
    plane: 'XY',
    entities: [{
        id: 'circle1',
        type: 'circle',
        center: [0, 0],
        radius
    }],
    closed: false,
    createdAt: Date.now()
});

const createLineSketch = (name: string): SketchData => ({
    id: `${name}-id`,
    name,
    plane: 'XY',
    entities: [{
        id: 'line1',
        type: 'line',
        start: [0, 0],
        end: [10, 10]
    }],
    closed: false,
    createdAt: Date.now()
});

// ============================================================================
// Workflow: Sketch → Extrude
// ============================================================================

describe('Workflow: Sketch → Extrude', () => {
    it('should generate closed rectangle sketch code', () => {
        const sketch = createRectangleSketch('baseSketch', 20, 10);
        const code = generateSketchCode(sketch);

        // Should create Sketcher on XY plane
        expect(code).toContain("new Sketcher('XY')");
        // Should move to corner and draw rectangle
        expect(code).toContain('.movePointerTo([0, 0])');
        expect(code).toContain('.lineTo([20, 0])');
        expect(code).toContain('.lineTo([20, -10])');
        expect(code).toContain('.lineTo([0, -10])');
        // Rectangle should close back to start
        expect(code).toContain('.close()');
    });

    it('should detect closed paths and use close()', () => {
        const sketch = createRectangleSketch('closedSketch', 5, 5);
        const code = generateSketchCode(sketch);

        expect(code).toContain('.close();');
        expect(code).not.toContain('.done();');
    });

    it('should detect open paths and use done()', () => {
        const sketch = createLineSketch('openSketch');
        const code = generateSketchCode(sketch);

        expect(code).toContain('.done();');
        expect(code).not.toContain('.close()');
    });

    it('should generate circle using sagitta arcs', () => {
        const sketch = createCircleSketch('circleSketch', 10);
        const code = generateSketchCode(sketch);

        // Circle is drawn as two 180° arcs
        expect(code).toContain('.vSagittaArc(20, 10)');
        expect(code).toContain('.vSagittaArc(-20, 10)');
    });

    it('should generate unique sketch names', () => {
        const existingCode = `
            const sketch1 = new Sketcher('XY').close();
            const sketch2 = new Sketcher('XY').close();
        `;
        const nextName = generateSketchName(existingCode);
        expect(nextName).toBe('sketch3');
    });
});

// ============================================================================
// Workflow: Face Sketching
// ============================================================================

describe('Workflow: Face Sketching', () => {
    it('should generate sketch on face code', () => {
        const ctx = createCodeContext();
        const code = generateSketchOnFaceCode(ctx, 'myBox', 3, 'faceSketch1');

        // Should create a plane from face and a new Sketcher
        expect(code).toContain('myBox.faces[3]');
        expect(code).toContain('replicad.makePlaneFromFace');
        expect(code).toContain('new Sketcher');
    });

    it('should generate extrude from face workflow', () => {
        const ctx = createCodeContext();
        const code = generateExtrudeFromFaceCode(ctx, 'basePart', 2, 15);

        // Full workflow: face reference → extrude → fuse
        expect(code).toContain('basePart.faces[2]');
        expect(code).toContain('extrude(');
        expect(code).toContain('15)');
        expect(code).toContain('basePart.fuse(');
    });
});

// ============================================================================
// Workflow: Revolve
// ============================================================================

describe('Workflow: Revolve', () => {
    it('should generate revolve code with default axis', () => {
        const ctx = createCodeContext();
        const code = generateRevolveCode(ctx, 'profile', 360, 'X');

        expect(code).toContain('profile');
        expect(code).toContain('revolve');
    });

    it('should handle partial revolve angles', () => {
        const ctx = createCodeContext();
        const code = generateRevolveCode(ctx, 'sketch', 180, 'Y');

        expect(code).toContain('180');
    });
});

// ============================================================================
// Workflow: Boolean Operations
// ============================================================================

describe('Workflow: Boolean Operations', () => {
    it('should generate fuse (union) code', () => {
        const ctx = createCodeContext();
        const code = generateBooleanCode(ctx, 'box', 'cylinder', 'fuse');

        expect(code).toContain('.fuse(cylinder)');
    });

    it('should generate cut (subtract) code', () => {
        const ctx = createCodeContext();
        const code = generateBooleanCode(ctx, 'box', 'hole', 'cut');

        expect(code).toContain('.cut(hole)');
    });

    it('should generate intersect code', () => {
        const ctx = createCodeContext();
        const code = generateBooleanCode(ctx, 'shape1', 'shape2', 'intersect');

        expect(code).toContain('intersect');
    });

    it('should create unique result variable names', () => {
        const ctx = createCodeContext();
        const code = generateBooleanCode(ctx, 'partA', 'partB', 'fuse');

        // Should have a result variable with operation suffix
        expect(code).toContain('const ');
        expect(code).toContain('_fuse');
    });
});

// ============================================================================
// Workflow: Fillet & Chamfer
// ============================================================================

describe('Workflow: Fillet & Chamfer', () => {
    it('should generate fillet code for all edges', () => {
        const ctx = createCodeContext();
        const code = generateFilletCode(ctx, 'box', 2, 'all');

        expect(code).toContain('box.fillet(2');
    });

    it('should generate fillet code for vertical edges', () => {
        const ctx = createCodeContext();
        const code = generateFilletCode(ctx, 'shape', 3, 'vertical');

        expect(code).toContain('fillet');
        expect(code).toContain('3');
    });

    it('should generate chamfer code', () => {
        const ctx = createCodeContext();
        const code = generateChamferCode(ctx, 'part', 1.5, 'all');

        expect(code).toContain('chamfer');
        expect(code).toContain('1.5');
    });
});

// ============================================================================
// Workflow: Complete "Bracket" Pattern
// ============================================================================

describe('Workflow: Bracket Pattern (Integration)', () => {
    it('should generate L-bracket workflow', () => {
        const ctx = createCodeContext();
        // Step 1: Create base sketch
        const baseSketch = createRectangleSketch('base', 50, 30);
        const sketchCode = generateSketchCode(baseSketch);

        // Step 2: Fillet the base
        const filletCode = generateFilletCode(ctx, 'extruded', 3, 'all');

        // Validate the workflow generates valid patterns
        expect(sketchCode).toContain("new Sketcher('XY')");
        expect(sketchCode).toContain('.close();');
        expect(filletCode).toContain('.fillet(3');
    });

    it('should generate box with hole workflow', () => {
        const ctx = createCodeContext();
        // Step 1: Create box sketch
        const boxSketch = createRectangleSketch('boxBase', 40, 40);
        const boxCode = generateSketchCode(boxSketch);

        // Step 2: Create hole sketch
        const holeSketch = createCircleSketch('holeProfile', 10);
        const holeCode = generateSketchCode(holeSketch);

        // Step 3: Boolean cut
        const cutCode = generateBooleanCode(ctx, 'box', 'hole', 'cut');

        // Validate workflow
        expect(boxCode).toContain('.close();');
        expect(holeCode).toContain('.vSagittaArc');
        expect(cutCode).toContain('.cut(');
    });
});

// ============================================================================
// Edge Cases & Error Handling
// ============================================================================

describe('Edge Cases', () => {
    it('should handle empty sketch', () => {
        const emptySketch: SketchData = {
            id: 'empty',
            name: 'empty',
            plane: 'XY',
            entities: [],
            closed: false,
            createdAt: Date.now()
        };

        const code = generateSketchCode(emptySketch);
        expect(code).toBe('');
    });

    it('should handle different planes', () => {
        const xzSketch: SketchData = {
            ...createRectangleSketch('xzSketch', 10, 10),
            plane: 'XZ'
        };

        const code = generateSketchCode(xzSketch);
        expect(code).toContain("new Sketcher('XZ')");
    });

    it('should generate unique names without conflicts', () => {
        const code1 = `const sketch1 = x; const sketch5 = y;`;
        const name1 = generateSketchName(code1);
        expect(name1).toBe('sketch6');

        const code2 = `const foo = x;`;
        const name2 = generateSketchName(code2);
        expect(name2).toBe('sketch1');
    });
});
