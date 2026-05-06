import { describe, it, expect } from 'vitest';
import { insertShape, getDeclaredVariablesAST, parseCode } from '../lib/ast';

function expectParseable(code: string): void {
    expect(() => parseCode(code)).not.toThrow();
}

describe('Integration - Shape Insertion Workflow', () => {
    it('should insert Box and auto-update return array', () => {
        const initialCode = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        const boxStatement = 'const box = replicad.makeBox(20, 20, 20);';
        const codeAfterBox = insertShape(initialCode, boxStatement);

        expect(codeAfterBox).toContain('const box');
        expect(codeAfterBox).toContain('return [box]');
        expectParseable(codeAfterBox);
    });

    it('should insert multiple shapes and maintain return array order', () => {
        const initialCode = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        // Insert Box
        const codeWithBox = insertShape(initialCode, 'const box = replicad.makeBox(20, 20, 20);');
        expect(codeWithBox).toContain('return [box]');

        // Insert Cylinder
        const codeWithBoth = insertShape(codeWithBox, 'const cylinder = replicad.makeCylinder(10, 30);');
        expect(codeWithBoth).toContain('const box');
        expect(codeWithBoth).toContain('const cylinder');
        expect(codeWithBoth).toContain('return [box, cylinder]');
        expectParseable(codeWithBoth);
    });

    it('should handle Cylinder insertion workflow', () => {
        const initialCode = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        const cylinderStatement = 'const cylinder = replicad.makeCylinder(10, 30);';
        const newCode = insertShape(initialCode, cylinderStatement);

        expect(newCode).toContain('const cylinder');
        expect(newCode).toContain('return [cylinder]');
        expectParseable(newCode);
    });

    it('should insert Sphere correctly', () => {
        const initialCode = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        const sphereStatement = 'const sphere = replicad.makeSphere(15);';
        const newCode = insertShape(initialCode, sphereStatement);

        expect(newCode).toContain('const sphere');
        expect(newCode).toContain('return [sphere]');
        expectParseable(newCode);
    });

    it('should work with default template (non-array return)', () => {
        const defaultTemplate = `
export default function main() {
    function drawPart() {
        const width = 10;
        const cube = replicad.makeBox(width, 10, 10);
        const rounded = cube.fillet(2, (e) => e);
        const cyl = replicad.makeCylinder(2, 20);
        const filleted = rounded.cut(cyl);
        return filleted.cut(cyl);
    }
    return drawPart();
}`;

        // Insert new shape
        const newCode = insertShape(defaultTemplate, 'const box = replicad.makeBox(5, 5, 5);');
        expect(newCode).toContain('const box');
        // Non-array return won't be auto-updated (expected behavior)
        expect(newCode).toContain('const filleted = rounded.cut(cyl);');
        expectParseable(newCode);
    });

    it('should handle multiple sequential insertions', () => {
        let code = `
export default function main() {
    function drawPart() {
        return [];
    }
    return drawPart();
}`;

        code = insertShape(code, 'const box = replicad.makeBox(20, 20, 20);');
        expect(code).toContain('return [box]');

        code = insertShape(code, 'const cylinder = replicad.makeCylinder(10, 30);');
        expect(code).toContain('return [box, cylinder]');

        code = insertShape(code, 'const sphere = replicad.makeSphere(15);');
        expect(code).toContain('return [box, cylinder, sphere]');
        expectParseable(code);
    });
});

describe('Integration - Variable Name Management', () => {
    it('should support unique variable names', () => {
        const codeWithBox = `
export default function main() {
    function drawPart() {
        const box = replicad.makeBox(20, 20, 20);
        return [box];
    }
    return drawPart();
}`;

        // Insert another box with different name
        const newCode = insertShape(codeWithBox, 'const box1 = replicad.makeBox(10, 10, 10);');

        expect(newCode).toContain('const box ');
        expect(newCode).toContain('const box1');
        expect(newCode).toContain('return [box, box1]');
        expectParseable(newCode);
    });

    it('should maintain variable naming consistency', () => {
        const code = `
export default function main() {
    function drawPart() {
        const myShape1 = replicad.makeBox(10, 10, 10);
        const myShape2 = replicad.makeCylinder(5, 20);
        return [myShape1, myShape2];
    }
    return drawPart();
}`;

        const newCode = insertShape(code, 'const myShape3 = replicad.makeSphere(15);');

        expect(newCode).toContain('return [myShape1, myShape2, myShape3]');
        expectParseable(newCode);
    });

    it('should extract all declared variables correctly', () => {
        const code = `
export default function main() {
    function drawPart() {
        const box = replicad.makeBox(20, 20, 20);
        const cylinder = replicad.makeCylinder(10, 30);
        const sphere = replicad.makeSphere(15);
        return [box, cylinder, sphere];
    }
    return drawPart();
}`;

        const vars = getDeclaredVariablesAST(code);
        expect(vars.has('box')).toBe(true);
        expect(vars.has('cylinder')).toBe(true);
        expect(vars.has('sphere')).toBe(true);
        expect(vars.has('drawPart')).toBe(true);
        expect(vars.has('main')).toBe(true);
    });
});

describe('Integration - Regression Tests (Regex Bugs)', () => {
    it('should ignore "return" text inside comments when updating code', () => {
        const codeWithComment = `
export default function main() {
    function drawPart() {
        // You must return a Shape or array of Shapes
        const box = replicad.makeBox(20, 20, 20);
        return [box];
    }
    return drawPart();
}`;

        const newCode = insertShape(codeWithComment, 'const cylinder = replicad.makeCylinder(10, 30);');

        // Verify the actual return is updated, not the comment text.
        expect(newCode).toContain('return [box, cylinder]');
        expectParseable(newCode);
    });

    it('should NOT match "return" in string literals', () => {
        const codeWithString = `
export default function main() {
    function drawPart() {
        const message = "return [fake];";
        const box = replicad.makeBox(20, 20, 20);
        return [box];
    }
    return drawPart();
}`;

        const newCode = insertShape(codeWithString, 'const cylinder = replicad.makeCylinder(10, 30);');

        // String literal should remain unchanged
        expect(newCode).toContain('const message = "return [fake];"');

        // Real return should be updated
        expect(newCode).toContain('return [box, cylinder]');
        expectParseable(newCode);
    });

    it('should handle nested return statements correctly', () => {
        const codeWithNested = `
export default function main() {
    function drawPart() {
        const helper = () => { return []; };
        const box = replicad.makeBox(20, 20, 20);
        return [box];
    }
    return drawPart();
}`;

        const newCode = insertShape(codeWithNested, 'const cylinder = replicad.makeCylinder(10, 30);');

        // Should only update drawPart's return, not the arrow function.
        expect(newCode).toContain('return [];');
        expect(newCode).toContain('return [box, cylinder]');
        expectParseable(newCode);
    });
});

describe('Integration - Error Handling', () => {
    it('should handle code without drawPart function', () => {
        const codeWithoutDrawPart = `
export default function main() {
    return "no drawPart";
}`;

        expect(() => {
            insertShape(codeWithoutDrawPart, 'const box = makeBox(10);');
        }).toThrow('Could not find drawPart');
    });

    it('should handle drawPart without return statement', () => {
        const codeWithoutReturn = `
export default function main() {
    function drawPart() {
        const box = makeBox(10);
    }
    return drawPart();
}`;

        expect(() => {
            insertShape(codeWithoutReturn, 'const cylinder = makeCylinder(5);');
        }).toThrow();
    });

    it('should handle malformed code gracefully', () => {
        const malformedCode = `
export default function main() {
    function drawPart() {
        const box = makeBox(;
        return [box];
    }
    return drawPart();
}`;

        expect(() => {
            insertShape(malformedCode, 'const cylinder = makeCylinder(5);');
        }).toThrow();
    });
});
