import { describe, it, expect, beforeEach } from 'vitest';
import { CodeAnalyzer } from './CodeAnalyzer';

describe('CodeAnalyzer', () => {
    let analyzer: CodeAnalyzer;

    beforeEach(() => {
        analyzer = new CodeAnalyzer('');
    });

    it('identifies declared variables', () => {
        const code = `
            const box = makeBox(10);
            const cylinder = makeCylinder(5, 20);
            function test() {
                const inner = 1;
            }
            return [box, cylinder];
        `;
        analyzer.updateCode(code);
        const vars = analyzer.getDeclaredVariables();
        expect(vars.has('box')).toBe(true);
        expect(vars.has('cylinder')).toBe(true);
        expect(vars.has('inner')).toBe(true);
    });

    it('generates unique names', () => {
        const code = 'const box = makeBox(10);';
        analyzer.updateCode(code);

        expect(analyzer.generateUniqueName('box')).toBe('box1');
        expect(analyzer.generateUniqueName('cylinder')).toBe('cylinder');
    });

    it('tracks multiple names generated in the same session', () => {
        const code = 'const box = makeBox(10);';
        analyzer.updateCode(code);

        const name1 = analyzer.generateUniqueName('box'); // box1
        const name2 = analyzer.generateUniqueName('box'); // box2

        expect(name1).toBe('box1');
        expect(name2).toBe('box2');
    });

    it('resolves returned variables by index', () => {
        const code = `
            const part1 = makeBox(10);
            const part2 = makeCylinder(5, 20);
            return [part1, part2];
        `;
        analyzer.updateCode(code);

        expect(analyzer.getVariableAtIndex(0)).toBe('part1');
        expect(analyzer.getVariableAtIndex(1)).toBe('part2');
    });

    it('handles return outside function correctly (kernelCAD template style)', () => {
        const code = `
            const a = 1;
            return a;
        `;
        analyzer.updateCode(code);
        expect(analyzer.getVariableAtIndex(0)).toBe('a');
    });

    it('invalidates cache when code changes', () => {
        analyzer.updateCode('const a = 1;');
        expect(analyzer.getDeclaredVariables().has('a')).toBe(true);

        analyzer.updateCode('const b = 2;');
        expect(analyzer.getDeclaredVariables().has('a')).toBe(false);
        expect(analyzer.getDeclaredVariables().has('b')).toBe(true);
    });
});
