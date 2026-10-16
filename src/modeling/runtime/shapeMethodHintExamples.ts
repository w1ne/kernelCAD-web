// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Worked examples for the "X is a Shape method, not a global function" hint
 * (`holes(face, …)` written as a free function). Each entry is a statement
 * on a `plate` (a `box(40, 30, 10)`) that follows the method's real
 * signature in `list_api` — a test evaluates every one of them. A method
 * without an entry gets the bare `body.<method>(...)` form plus a pointer to
 * `lookup_api`, never a made-up argument list.
 */
export const SHAPE_METHOD_HINT_EXAMPLES: Readonly<Record<string, string>> = {
  translate: 'plate = plate.translate(0, 0, 5)',
  rotate: 'plate = plate.rotate([0, 0, 1], 90)',
  rotateX: 'plate = plate.rotateX(90)',
  rotateY: 'plate = plate.rotateY(90)',
  rotateZ: 'plate = plate.rotateZ(90)',
  scale: 'plate = plate.scale(2)',
  union: 'plate = plate.union(cylinder(20, 3))',
  subtract: 'plate = plate.subtract(cylinder(20, 3).translate(20, 15, -1))',
  intersect: 'plate = plate.intersect(box(30, 30, 30))',
  fillet: "plate = plate.fillet(2, { parallel: 'Z' })",
  chamfer: "plate = plate.chamfer(1, 'top')",
  shell: "plate = plate.shell(2, { face: 'top' })",
  draft: "plate = plate.draft(3, { face: 'front' })",
  hole: "plate = plate.hole('top', { u: 0, v: 0, diameter: 3, depth: 'through' })",
  holes: "plate = plate.holes('top', { positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }], diameter: 3, depth: 'through' })",
  cutout: "plate = plate.cutout(path().moveTo(-5, -3).lineTo(5, -3).lineTo(5, 3).lineTo(-5, 3).close(), { face: 'top', depth: 4 })",
  reflect: "plate = plate.reflect('yz')",
  mirror: "plate = plate.mirror({ plane: 'yz', offset: -1 })",
  patternLinear: 'plate = plate.patternLinear({ count: 3, direction: [1, 0, 0], spacing: 50 })',
  patternCircular: 'plate = plate.patternCircular({ count: 4, axis: [0, 0, 1] })',
  color: "plate = plate.color('red')",
  finish: "plate = plate.finish('pla')",
};

/** The hint text for `method` called as a free function. */
export function shapeMethodHint(method: string): string {
  const example = SHAPE_METHOD_HINT_EXAMPLES[method];
  return example
    ? `Call it on the body: \`body.${method}(...)\`, and keep the returned shape — e.g. \`${example}\`.`
    : `Call it on the body: \`body.${method}(...)\`, and keep the returned shape; lookup_api({ query: '${method}' }) shows its signature.`;
}
