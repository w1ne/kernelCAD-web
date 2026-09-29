// U15 — Modify an imported STEP: "add two 5 mm holes 20 mm apart through the
// top face." Input STEP is the U2 NEMA17-motor-mount export
// (out/U2/motormount.step), used as the "here is a STEP file of a part" input.
// Holes placed on the exposed area of the base-plate top face (Y=35, clear of
// the existing M5 T-slots at Y=17..27 and of the base plate edges).
// VERIFIED against live kernelCAD MCP 2026-09-28. Published:
// https://app.kernelcad.com/p/ZVCbKHPj

const holeDia = param('holeDia', 5);
const holeSpacing = param('holeSpacing', 20);
const holeY = param('holeY', 35);

const imported = await lib.fromSTEP('/private/tmp/claude-501/-Users-andrii/122b263c-73af-4938-b0f4-a973bc33a96a/scratchpad/usecases/out/U2/motormount.step');

const cutLen = 20; // longer than the 5mm base thickness to guarantee a clean through-cut
const h1 = cylinder(cutLen, holeDia.divide(2)).translate(holeSpacing.divide(-2), holeY, -5);
const h2 = cylinder(cutLen, holeDia.divide(2)).translate(holeSpacing.divide(2), holeY, -5);

dfmSpec({ minWall: 1.2 });

return imported.subtract(h1).subtract(h2);
