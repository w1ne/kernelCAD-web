import { describe, it, beforeAll } from 'vitest';
import { initReplicad, executeGeometry } from '../../test/regressionTestHelpers';
import { expectGeometryMatch } from '../../test/geometryValidators';
import { generateSketchCode } from '../../shared/codeGeneration/sketchCodegen';
import { generateBooleanCode, generateFilletCode } from './core/modifiers.feature';
import { CodeAnalyzer } from '../../shared/codeGeneration/index';
import type { SketchData } from '../../shared/types/sketch';

describe('Standard Workflow Validation', () => {
    beforeAll(async () => {
        await initReplicad();
    });

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
        closed: true,
        createdAt: Date.now()
    });

    it('should execute the Bracket workflow (Sketch -> Extrude -> Fillet)', () => {
        const ctx = new CodeAnalyzer('').createContext();
        // 1. Generate Code (User Workflow Simulation)
        const sketch = createRectangleSketch('baseSketch', 50, 20);
        const sketchCode = generateSketchCode(sketch);

        // Extrude logic (usually handled by extrude feature logic or manual code)
        // Here we simulate the code generation for extrude manually as we don't have a pure "generateExtrudeCode" independent of UI state easily available?
        // Actually, we can use the pattern string.
        const extrudeCode = `const baseBlock = ${sketch.name}.extrude(10);`;

        // Fillet
        // generateFilletCode expects a shape name. 
        const filletCode = generateFilletCode(ctx, 'baseBlock', 5, 'vertical');

        const workflowCode = `
            const { Sketcher } = replicad;
            ${sketchCode}
            ${extrudeCode}
            ${filletCode}
            return baseBlock_filleted; 
        `;

        // 2. Execute
        const shape = executeGeometry(workflowCode);

        // 3. Validate
        // Original Block Volume: 50 * 20 * 10 = 10000
        // Fillet: 4 vertical edges. Height 10. Radius 5.
        // Corner removed area: (r*r - PI*r*r/4) = r^2(1 - PI/4)
        // Total removed vol = 4 * 10 * 25 * (1 - PI/4)
        // 1000 * (1 - 0.785398) = 1000 * 0.2146 = 214.6
        // Expected Vol = 9785.4 approx.

        const r = 5;
        const cornerArea = r * r - (Math.PI * r * r) / 4;
        const removedVol = 4 * 10 * cornerArea;
        const expectedVol = 10000 - removedVol;

        expectGeometryMatch({ volume: (shape as any).volume }, { volume: expectedVol });
    });

    it('should execute the Drilling workflow (Cylinder -> Cylinder -> Cut)', () => {
        const ctx = new CodeAnalyzer('').createContext();
        // 1. Generate Code
        // User creates base cylinder
        const baseCode = `
            const { makeCylinder } = replicad;
            const base = makeCylinder(20, 20);
        `;

        // User creates tool cylinder (hole)
        const toolCode = `
            const tool = makeCylinder(10, 30).translate(0, 0, -5);
        `;

        // Boolean Cut
        const cutCode = generateBooleanCode(ctx, 'base', 'tool', 'cut');

        const workflowCode = `
            ${baseCode}
            ${toolCode}
            ${cutCode}
            // The generateBooleanCode returns a variable like 'const base_cut = ...'
            // We need to know the variable name or usually in the app we insert it.
            // generateBooleanCode returns "const base_cut = base.cut(tool);"
            
             return base_cut;
        `;

        // 2. Execute
        const shape = executeGeometry(workflowCode);

        // 3. Validate
        // Base Vol: PI * 20^2 * 20 = 8000PI
        // Hole Vol: PI * 10^2 * 20 (intersection height is 20) = 2000PI
        // Result: 6000PI

        const expectedVol = Math.PI * 6000;
        expectGeometryMatch({ volume: (shape as any).volume }, { volume: expectedVol });
    });
});
