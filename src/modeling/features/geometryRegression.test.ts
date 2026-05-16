import { describe, it, beforeAll } from 'vitest';
import { expectGeometryMatch } from '../../../tests/geometryValidators';
import { initReplicad, executeGeometry } from '../../../tests/regressionTestHelpers';

describe('Geometry Regression Suite', () => {
    beforeAll(async () => {
        await initReplicad();
    });

    describe('Primitives', () => {
        it('should create a Cylinder', () => {
            const code = `
                const { makeCylinder } = replicad;
                const cyl = makeCylinder(10, 10);
                return cyl;
            `;
            const { shape } = executeGeometry(code);
            expectGeometryMatch({ volume: shape.volume }, { volume: Math.PI * 100 * 10 });
        });
    });

    describe('Complex Operations', () => {
        it('should perform boolean transformations', () => {
            // Translate and Fuse
            const code = `
                const { makeCylinder } = replicad;
                const c1 = makeCylinder(5, 10);
                const c2 = makeCylinder(5, 10).translate(0, 0, 10);
                const fused = c1.fuse(c2);
                return fused;
             `;
            const { shape } = executeGeometry(code);
            // Two stacked cylinders. Total height 20.
            // Vol = PI * 25 * 20
            expectGeometryMatch({ volume: shape.volume }, { volume: Math.PI * 25 * 20 });
        });
    });

    describe('Robustness', () => {
        it('should handle boolean cut', () => {
            const code = `
                 const { makeCylinder } = replicad;
                 const base = makeCylinder(10, 10);
                 const tool = makeCylinder(5, 20).translate(0, 0, -5);
                 const result = base.cut(tool);
                 return result;
            `;
            const { shape } = executeGeometry(code);
            // Vol = Base - Hole
            expectGeometryMatch({ volume: shape.volume }, { volume: Math.PI * 100 * 10 - Math.PI * 25 * 10 });
        });
    });
});
