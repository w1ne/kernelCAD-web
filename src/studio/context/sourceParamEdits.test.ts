// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { expect, it } from 'vitest';
import { sourceParamEdits } from './sourceParamEdits';
it('changes literal defaults while preserving comments, types, and other code', () => {
 const source = "// keep this\nconst w: number = param('width', 75, { min: 40 });\nconst enabled = param('enabled', true);\nreturn box(w, 30, 10);";
 expect(sourceParamEdits(source, [{ name: 'width', value: 120 }, { name: 'enabled', value: false }])).toBe(source.replace("'width', 75", "'width', 120").replace("'enabled', true", "'enabled', false"));
});
it('leaves dynamic and ambiguous declarations to the kernel', () => {
 expect(sourceParamEdits("const w = param(name, 20);", [{name:'width',value:120}])).toBeNull();
 expect(sourceParamEdits("const w = param('width', 20); const x = param('width', 30);", [{name:'width',value:120}])).toBeNull();
});

it('quotes choice values and leaves incomplete source untouched', () => {
 expect(sourceParamEdits("const screw = param('Screw', 'M4');", [{name:'Screw',value:'M5'}])).toBe('const screw = param(\'Screw\', "M5");');
 expect(sourceParamEdits('const broken =', [{name:'width',value:120}])).toBeNull();
});
