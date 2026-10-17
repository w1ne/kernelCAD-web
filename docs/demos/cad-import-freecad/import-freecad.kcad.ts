// Import a FreeCAD document with lib.fromCAD and keep modelling on the result.
// The document holds two real RP1 parts (see make-fcstd.ts). They are spaced out
// along X for the demo; this is not the RP1 assembly placement.
const parts = await lib.fromCAD('./rp1-parts.FCStd');

// Continue the work: a mounting plate under the imported parts, touching the first one.
const plate = box(240, 120, 8).translate(-10, -60, -8).color('#34383d');

return parts.color('#a8b3bd').union(plate);
