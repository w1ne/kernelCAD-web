import { describe, it, expect } from 'vitest';
import { deleteVariableDeclarationAST, deleteVariableDeclarationFallback, parseCode } from './ast';

describe('deleteVariableDeclarationAST', () => {
    it('deletes sketch declaration and removes it from return array', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = replicad.makeBox(10, 10, 10);
        const sketch = new Sketcher('XY')
            .movePointerTo([0, 0])
            .lineTo([10, 0])
            .done();
        return [box, sketch];
    }
    return drawPart();
}
`.trim();

        const next = deleteVariableDeclarationAST(code, 'sketch');
        expect(next).not.toContain('const sketch');
        expect(next).toContain('return [box]');
        expect(() => parseCode(next)).not.toThrow();
    });

    it('keeps code unchanged when variable does not exist', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = replicad.makeBox(10, 10, 10);
        return [box];
    }
    return drawPart();
}
`.trim();

        const next = deleteVariableDeclarationAST(code, 'missingSketch');
        expect(next).toBe(code);
        expect(() => parseCode(next)).not.toThrow();
    });

    it('fallback removes multiline fluent sketch declaration and keeps code parseable', () => {
        const code = `
export default function main() {
  function drawPart() {
    const box = replicad.makeBox(10, 10, 10);
    const sketch = new Sketcher(new replicad.Plane([5, -5, 10], null, [0, 0, 1]))
      .movePointerTo([3.6284, 0])
      .lineTo([8, 0])
      .done();
    return [box, sketch];
  }
  return drawPart();
}
`.trim();

        const next = deleteVariableDeclarationFallback(code, 'sketch');
        expect(next).not.toContain('const sketch');
        expect(next).toContain('return [box]');
        expect(() => parseCode(next)).not.toThrow();
    });

    it('fallback handles corrupted autosave token (onst sketch) and removes sketch cleanly', () => {
        const code = `'onst sketch = new Sketcher(new replicad.Plane([-1.1102230246251565e-16, 1.3322676295501878e-16, 10], [1, 0, 0], [0, 0, 1])).movePointerTo([2, 2]).lineTo([6, 2]).lineTo([6, -1]).lineTo([2, -1]).lineTo([2, 2]).close();
return [replicad.makeBox(10, 10, 10), sketch];
`;

        const next = deleteVariableDeclarationFallback(code, 'sketch');
        expect(next).not.toContain('sketch =');
        expect(next).toContain('return [replicad.makeBox(10, 10, 10)]');
        expect(() => parseCode(next)).not.toThrow();
    });
});
