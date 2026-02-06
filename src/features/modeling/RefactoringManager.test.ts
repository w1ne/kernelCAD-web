import { describe, it, expect } from 'vitest';
import { refactoringManager } from './RefactoringManager';

describe('RefactoringManager', () => {
    it('should rename a variable definition and references', () => {
        const code = `
            const myVar = 10;
            const result = myVar * 2;
            const other = 5;
        `;
        const expected = `
            const newName = 10;
            const result = newName * 2;
            const other = 5;
        `;

        const result = refactoringManager.renameVariable(code, 'myVar', 'newName');

        // Remove whitespace for comparison to avoid formatting issues
        const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
        expect(clean(result)).toBe(clean(expected));
    });

    it('should handle non-existent variables gracefully', () => {
        const code = `const a = 1;`;
        const result = refactoringManager.renameVariable(code, 'b', 'c');
        expect(result).toBe(code);
    });
});
