// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/helpers/drawingPdf/fixtureModels.ts
//
// Source models for the drawing-to-CAD round-trip fixtures. Each entry is the
// ground truth a fixture PDF was generated from: kernelCAD's own svg-drawing
// exporter draws `code` with `annotations`, the sheet is converted to PDF
// (see ./svgToPdf.ts), and the PDF is committed under
// tests/fixtures/drawing-pdf/. The round-trip tests read the PDF back and
// compare the rebuilt model against `expected` here.
//
// Regenerate with:
//   npx tsx tests/helpers/drawingPdf/generateFixtures.ts

import type { DrawingAnnotation } from '../../../src/kernel/backends/occt/drawingAnnotations';

export interface DrawingFixtureModel {
  /** File stem under tests/fixtures/drawing-pdf/ (`<name>.svg` + `<name>.pdf`). */
  name: string;
  code: string;
  annotations: DrawingAnnotation[];
  expected: {
    /** Overall bounding-box extents [x, y, z] in mm. */
    extents: [number, number, number];
    /** Every hole diameter in the part, sorted ascending (mm). */
    holeDiameters: number[];
  };
}

const PLATE_CODE = `
let plate = box(80, 50, 8);
for (const [x, y] of [[10, 10], [70, 10], [10, 40], [70, 40]]) {
  plate = plate.subtract(cylinder(12, 3.25).translate(x, y, -2));
}
return plate.subtract(cylinder(12, 6).translate(40, 25, -2));
`;

export const PLATE_WITH_HOLES: DrawingFixtureModel = {
  name: 'plate-with-holes',
  code: PLATE_CODE,
  annotations: [
    { kind: 'linear', from: [0, 0, 8], to: [80, 0, 8], view: 'top' },
    { kind: 'linear', from: [0, 10, 8], to: [10, 10, 8], view: 'top' },
    { kind: 'linear', from: [80, 0, 8], to: [80, 50, 8], view: 'top' },
    { kind: 'linear', from: [70, 0, 8], to: [70, 10, 8], view: 'top' },
    { kind: 'linear', from: [80, 0, 0], to: [80, 0, 8], view: 'front' },
    { kind: 'hole', edge: { ofCurveType: 'CIRCLE', near: [13.25, 10, 8] }, through: true, count: 4, view: 'top' },
    { kind: 'hole', edge: { ofCurveType: 'CIRCLE', near: [46, 25, 8] }, through: true, view: 'top' },
  ],
  expected: { extents: [80, 50, 8], holeDiameters: [6.5, 6.5, 6.5, 6.5, 12] },
};

/**
 * Same plate, but the overall width dimension is lettered 82 while the
 * linework is drawn 80 long — the classic "dimension edited, drawing not
 * updated" sheet. The stated value must win and the ledger must say so.
 */
export const PLATE_DIMENSION_DISAGREEMENT: DrawingFixtureModel = {
  name: 'plate-dimension-disagreement',
  code: PLATE_CODE,
  annotations: [
    { kind: 'linear', from: [0, 0, 8], to: [80, 0, 8], view: 'top', text: '82' },
    { kind: 'linear', from: [80, 0, 8], to: [80, 50, 8], view: 'top' },
    { kind: 'linear', from: [80, 0, 0], to: [80, 0, 8], view: 'front' },
    { kind: 'hole', edge: { ofCurveType: 'CIRCLE', near: [13.25, 10, 8] }, through: true, count: 4, view: 'top' },
    { kind: 'hole', edge: { ofCurveType: 'CIRCLE', near: [46, 25, 8] }, through: true, view: 'top' },
  ],
  expected: { extents: [82, 50, 8], holeDiameters: [6.5, 6.5, 6.5, 6.5, 12] },
};

export const L_BRACKET: DrawingFixtureModel = {
  name: 'l-bracket',
  code: `
const bracket = path()
  .moveTo(0, 0).lineTo(60, 0).lineTo(60, 6).lineTo(6, 6).lineTo(6, 50).lineTo(0, 50).close()
  .extrude(40)
  .rotateX(90)
  .translate(0, 40, 0);
return bracket.subtract(cylinder(10, 3.25).translate(35, 20, -2));
`,
  annotations: [
    { kind: 'linear', from: [0, 0, 0], to: [60, 0, 0], view: 'front' },
    { kind: 'linear', from: [0, 0, 50], to: [6, 0, 50], view: 'front' },
    { kind: 'linear', from: [0, 0, 0], to: [0, 0, 50], view: 'front' },
    { kind: 'linear', from: [60, 0, 0], to: [60, 0, 6], view: 'front' },
    { kind: 'linear', from: [60, 0, 6], to: [60, 40, 6], view: 'top' },
    { kind: 'linear', from: [0, 20, 6], to: [35, 20, 6], view: 'top' },
    { kind: 'linear', from: [35, 0, 6], to: [35, 20, 6], view: 'top' },
    { kind: 'hole', edge: { ofCurveType: 'CIRCLE', near: [38.25, 20, 6] }, through: true, view: 'top' },
  ],
  expected: { extents: [60, 40, 50], holeDiameters: [6.5] },
};

/** Stepped shaft standing on its axis (Z): ⌀20×30, ⌀14×40, ⌀10×20. */
export const TURNED_SHAFT: DrawingFixtureModel = {
  name: 'turned-shaft',
  code: `
return cylinder(30, 10)
  .union(cylinder(40, 7).translate(0, 0, 30))
  .union(cylinder(20, 5).translate(0, 0, 70));
`,
  annotations: [
    { kind: 'linear', from: [10, 0, 0], to: [10, 0, 30], view: 'front' },
    { kind: 'linear', from: [7, 0, 30], to: [7, 0, 70], view: 'front' },
    { kind: 'linear', from: [5, 0, 70], to: [5, 0, 90], view: 'front' },
    { kind: 'linear', from: [-10, 0, 0], to: [10, 0, 0], view: 'front', text: '⌀20' },
    { kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [7, 0, 70] }, view: 'top' },
    { kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [5, 0, 90] }, view: 'top' },
  ],
  expected: { extents: [20, 20, 90], holeDiameters: [] },
};

/**
 * The drawing behind examples/drawing-to-cad/: an angle bracket with two
 * base holes and a wall hole whose axis runs along X (seen as a circle in the
 * left view). Only one base hole's Y position is dimensioned — the second and
 * the wall hole's Y are placed by symmetry, which the ledger reports.
 */
export const MOTOR_MOUNT_BRACKET: DrawingFixtureModel = {
  name: 'motor-mount-bracket',
  code: `
let bracket = path()
  .moveTo(0, 0).lineTo(70, 0).lineTo(70, 5).lineTo(5, 5).lineTo(5, 45).lineTo(0, 45).close()
  .extrude(50)
  .rotateX(90)
  .translate(0, 50, 0);
for (const y of [12, 38]) {
  bracket = bracket.subtract(cylinder(9, 2.75).translate(45, y, -2));
}
return bracket.subtract(cylinder(9, 6).rotateY(90).translate(-2, 25, 27));
`,
  annotations: [
    { kind: 'linear', from: [0, 0, 0], to: [70, 0, 0], view: 'front' },
    { kind: 'linear', from: [0, 0, 45], to: [5, 0, 45], view: 'front' },
    { kind: 'linear', from: [0, 0, 0], to: [0, 0, 45], view: 'front' },
    { kind: 'linear', from: [70, 0, 0], to: [70, 0, 5], view: 'front' },
    { kind: 'linear', from: [70, 0, 5], to: [70, 50, 5], view: 'top' },
    { kind: 'linear', from: [0, 12, 5], to: [45, 12, 5], view: 'top' },
    { kind: 'linear', from: [45, 0, 5], to: [45, 12, 5], view: 'top' },
    { kind: 'linear', from: [0, 50, 0], to: [0, 50, 27], view: 'left' },
    { kind: 'hole', edge: { ofCurveType: 'CIRCLE', near: [47.75, 12, 5] }, through: true, count: 2, view: 'top' },
    { kind: 'hole', edge: { ofCurveType: 'CIRCLE', near: [0, 31, 27] }, through: true, view: 'left' },
  ],
  expected: { extents: [70, 50, 45], holeDiameters: [5.5, 5.5, 12] },
};

export const DRAWING_FIXTURE_MODELS: readonly DrawingFixtureModel[] = [
  PLATE_WITH_HOLES,
  PLATE_DIMENSION_DISAGREEMENT,
  L_BRACKET,
  TURNED_SHAFT,
];
