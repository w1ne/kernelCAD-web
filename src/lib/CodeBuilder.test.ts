import { describe, it, expect } from 'vitest';
import { CodeBuilder } from './CodeBuilder';

describe('CodeBuilder', () => {
    it('should initialize with optional code', () => {
        const builder = new CodeBuilder('// init');
        expect(builder.toString()).toBe('// init');
    });

    it('should generate unique names', () => {
        const builder = new CodeBuilder();
        const name1 = builder.getUniqueName('box');
        const name2 = builder.getUniqueName('box');

        expect(name1).toBe('box'); // First one usually takes base if available
        // Note: My implementation checks if variable is in set.
        // If I just call getUniqueName('box') it returns 'box' and adds to set.
        // Next call returns 'box1'.
        expect(name2).toBe('box1');
    });

    it('should add declarations', () => {
        const builder = new CodeBuilder();
        builder.addDeclaration('myVar', '10');
        expect(builder.toString()).toBe('const myVar = 10;');
    });

    it('should add statements', () => {
        const builder = new CodeBuilder();
        builder.addStatement('return true;');
        expect(builder.toString()).toBe('return true;');
    });

    it('should indent blocks', () => {
        const builder = new CodeBuilder();
        builder.addBlock('if (true) {', (b) => {
            b.addStatement('console.log("hi");');
        });

        const code = builder.toString();
        expect(code).toContain('if (true) {');
        expect(code).toContain('  console.log("hi");');
        expect(code).toContain('}');
    });

    it('should add method calls', () => {
        const builder = new CodeBuilder();
        builder.addCall('shape', 'extrude', [10]);
        expect(builder.toString()).toBe('shape.extrude(10);');
    });

    it('should respect existing declarations for unique names', () => {
        // If "const box = ..." is already in the code
        const builder = new CodeBuilder('const box = makeBox(10);');
        const name = builder.getUniqueName('box');
        expect(name).toBe('box1');
    });
});
