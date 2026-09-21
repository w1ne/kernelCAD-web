// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export type StarterId = 'stand' | 'bracket' | 'box';
export type Dimension = 'width' | 'depth' | 'height';
export type Sizes = Record<Dimension, number>;
export interface StarterModel {
  id: StarterId;
  name: string;
  sizes: Sizes;
}
export const STARTERS: readonly StarterModel[] = [
  { id: 'stand', name: 'Phone stand', sizes: { width: 75, depth: 80, height: 65 } },
  { id: 'bracket', name: 'Bracket', sizes: { width: 60, depth: 45, height: 40 } },
  { id: 'box', name: 'Open box', sizes: { width: 80, depth: 55, height: 35 } },
];
export const SIZE_LIMITS: Record<Dimension, { min: number; max: number }> = {
  width: { min: 40, max: 120 },
  depth: { min: 40, max: 120 },
  height: { min: 25, max: 80 },
};

/** Curated examples use the common browser/Node CAD API. Units are mm. */
export function starterCode(model: StarterModel): string {
  const { width: w, depth: d, height: h } = model.sizes;
  const header = `// ${model.name} — dimensions in mm\nconst w = ${w};\nconst d = ${d};\nconst h = ${h};\nconst t = 3;\n`;
  switch (model.id) {
    case 'box':
      return header + `const outer = box(w, d, h);
const inside = box(w - 2*t, d - 2*t, h).translate(t, t, t);
return outer.subtract(inside);
`;
    case 'bracket':
      return header + `const foot = box(w, d, t);
const wall = box(w, t, h);
const base = foot.union(wall);
const hole1 = cylinder(t + 2, 2).translate(w/4, d*0.65, -1);
const hole2 = cylinder(t + 2, 2).translate(w*0.75, d*0.65, -1);
const wallHole = cylinder(t + 2, 2).rotate([1, 0, 0], 90).translate(w/2, t + 1, h*0.65);
return base.subtract(hole1).subtract(hole2).subtract(wallHole);
`;
    case 'stand':
      return header + `const base = box(w, d, t);
const backHeight = (h - 1) / Math.cos(Math.PI / 15);
const back = box(w, t, backHeight).rotate([1, 0, 0], -12).translate(0, d*0.5, 1);
const lip = box(w, t, 10).translate(0, d*0.5 - 14, 0);
return base.union(back).union(lip);
`;
  }
}

export function studioStarterCode(model: StarterModel): string {
  let code = starterCode(model);
  for (const [dimension, variable] of [['width', 'w'], ['depth', 'd'], ['height', 'h']] as const) {
    const { min, max } = SIZE_LIMITS[dimension];
    code = code.replace(`const ${variable} = ${model.sizes[dimension]};`,
      `const ${variable} = param('${dimension}', ${model.sizes[dimension]}, { min: ${min}, max: ${max} });`);
  }
  return code
    .replaceAll('w - 2*t', 'w.add(-2*t)')
    .replaceAll('d - 2*t', 'd.add(-2*t)')
    .replaceAll('w/4', 'w.divide(4)')
    .replaceAll('w*0.75', 'w.multiply(0.75)')
    .replaceAll('w/2', 'w.divide(2)')
    .replaceAll('d*0.65', 'd.multiply(0.65)')
    .replaceAll('h*0.65', 'h.multiply(0.65)')
    .replaceAll('(h - 1) / Math.cos(Math.PI / 15)', 'h.subtract(1).divide(Math.cos(Math.PI / 15))')
    .replaceAll('d*0.5 - 14', 'd.multiply(0.5).subtract(14)')
    .replaceAll('d*0.5', 'd.multiply(0.5)');
}
