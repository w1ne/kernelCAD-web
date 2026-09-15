// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { stripTypeScriptSyntax } from './stripTypeScript';
import { parseCode } from './ast';

describe('stripTypeScriptSyntax', () => {
    it('blanks Array<[number, number]> annotations while keeping the binding', () => {
        const src = 'const standoffXY: Array<[number, number]> = [[1, 2]];';
        const stripped = stripTypeScriptSyntax(src);
        expect(stripped).toContain('const standoffXY');
        expect(stripped).toContain('= [[1, 2]];');
        expect(stripped).not.toContain('Array<');
        expect(stripped.length).toBe(src.length);
    });

    it('blanks non-null assertions', () => {
        const src = 'const [x, y] = standoffXY[i]!;';
        const stripped = stripTypeScriptSyntax(src);
        expect(stripped).toContain('standoffXY[i]');
        expect(stripped.includes(']!')).toBe(false);
    });

    it('keeps ternaries, object literals, comparisons, and import * as', () => {
        const src = `
            import * as util from './util';
            const on = a ? b : c;
            const pt = { x: 1, y: 2 };
            if (foo < bar && baz > qux) util.ok();
        `;
        expect(stripTypeScriptSyntax(src)).toBe(src);
        expect(() => parseCode(src)).not.toThrow();
    });

    it('strips annotations beside preserved JS (import * as + generic)', () => {
        const src = `import * as util from './util';\nconst pts: Array<[number, number]> = [];\n`;
        const stripped = stripTypeScriptSyntax(src);
        expect(stripped).toContain("import * as util from './util';");
        expect(stripped).toContain('const pts');
        expect(stripped).not.toContain('Array<');
        expect(() => parseCode(src)).not.toThrow();
    });

    it('keeps object keys named type (connector frames)', () => {
        const src = `
            plate.connector('s0', {
              type: 'frame',
              origin: { kind: 'vec3', value: [1, 2, 3] },
              normal: [0, 0, 1],
            });
        `;
        expect(stripTypeScriptSyntax(src)).toBe(src);
        expect(() => parseCode(src)).not.toThrow();
    });
});
