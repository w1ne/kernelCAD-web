import { describe, it, expect } from 'vitest';
import { insertShape } from './ast';

describe('AST Insertion - Sketch Handling', () => {
    it('should include sketches in the return array if return is already an array', () => {
        const code = `
const box = replicad.makeBox(10, 10, 10);
return [box];
`;
        const snippet = `const sketch1 = new Sketcher('XY').rect(5, 5).done();`;
        const result = insertShape(code, snippet);

        expect(result).toContain('return [box, sketch1]');
    });

    it('should convert single return to array return if a sketch is inserted', () => {
        const code = `
const box = replicad.makeBox(10, 10, 10);
return box;
`;
        const snippet = `const sketch1 = new Sketcher('XY').rect(5, 5).done();`;
        const result = insertShape(code, snippet);

        expect(result).toContain('return [box, sketch1]');
    });

    it('should handle startSketch() factory calls', () => {
        const code = `
const box = replicad.makeBox(10, 10, 10);
return [box];
`;
        const snippet = `const sketch1 = startSketch().rect(5, 5).done();`;
        const result = insertShape(code, snippet);

        expect(result).toContain('return [box, sketch1]');
    });

    it('should handle multiple nested returns in drawPart correctly', () => {
        const code = `
function drawPart() {
    const box = replicad.makeBox(10, 10, 10);
    return [box];
}
`;
        const snippet = `const sketch1 = new Sketcher('XY').rect(5, 5).done();`;
        const result = insertShape(code, snippet);

        expect(result).toContain('return [box, sketch1]');
    });
});
