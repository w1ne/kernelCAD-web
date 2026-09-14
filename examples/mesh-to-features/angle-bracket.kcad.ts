// mesh_to_features example — source model.
//
// An angle bracket: a 6 mm L-section extruded 30 mm, with an inside fillet,
// a counterbored bolt hole in the base leg and a plain hole in the upright.
// It exists to be exported to STL and read back, so the reconstruction can be
// compared with a part whose design intent is known.
//
// 1. Export the mesh (the committed angle-bracket.stl was written this way):
//      npx tsx src/agent/cli/index.ts export stl examples/mesh-to-features/angle-bracket.kcad.ts -o examples/mesh-to-features/angle-bracket.stl
//
// 2. Rebuild an editable feature tree from the mesh alone:
//      npx tsx src/agent/cli/index.ts reconstruct examples/mesh-to-features/angle-bracket.stl -o examples/mesh-to-features/angle-bracket.reconstructed.kcad.ts
//
//    Expected output (committed as angle-bracket.reconstructed.kcad.ts and
//    angle-bracket.reconstructed.ledger.json):
//      verdict: faithful  volumeIoU=1.0000  maxDeviationMm=0.001  rmsMm=0.000  (faithful needs IoU >= 0.98, max dev <= 0.25 mm; pass 0)
//      body: extrude (1)  holes: crossHole1 1x Ø6.5 through, crossHole2 1x Ø6.5 through cb Ø11x3  fillets: none  cutouts: 0  boolean remainders: 0
//      params: height=30, crossHole1Diameter=6.5, crossHole1Depth=6, crossHole2Diameter=6.5, crossHole2Depth=6, crossHole2CounterboreDiameter=11, crossHole2CounterboreDepth=3
//      mesh: 3304 triangles, watertight=true; unmatched regions: 0; open ledger facts: 10
//
//    The mesh carried no feature history, yet the script it wrote has the
//    L profile with its fillet, a counterbored hole entering the base leg's
//    inside face at u = 4 and a plain hole in the upright at u = 1.5 — the
//    same placement this file authored.
//
// 3. The emitted script is an ordinary model:
//      npx tsx src/agent/cli/index.ts evaluate examples/mesh-to-features/angle-bracket.reconstructed.kcad.ts
//    Features: 4
//    OK

const legLength = 60;
const legHeight = 45;
const wall = 6;
const width = 30;
const innerFillet = 6;

// Inside corner arc from (wall + r, wall) to (wall, wall + r) about (wall + r, wall + r).
const c = wall + innerFillet;
const mid = c - innerFillet * Math.SQRT1_2;

return path()
  .moveTo(0, 0)
  .lineTo(legLength, 0)
  .lineTo(legLength, wall)
  .lineTo(c, wall)
  .threePointsArc(wall, c, mid, mid)
  .lineTo(wall, legHeight)
  .lineTo(0, legHeight)
  .close()
  .extrude(width)
  // Holes use depth: wall rather than 'through': the base leg's inside face is
  // shorter than its underside (the fillet), so their centroids are 6 mm apart
  // and the 'through' back-face search, which looks near the entry centroid's
  // line, would not find the underside.
  // Base leg: counterbored M6 clearance hole, drilled down from the inside face.
  // That face spans x 12..60, so its centroid is x = 36; the hole sits at x = 40.
  .hole({ byNormal: 'Y', atY: wall }, {
    u: 4,
    v: 0,
    diameter: 6.5,
    depth: wall,
    counterbore: { diameter: 11, depth: 3 },
    name: 'baseBolt',
  })
  // Upright leg: plain clearance hole. Face spans y 12..45 (centroid 28.5); hole at y = 30.
  .hole({ byNormal: 'X', atX: wall }, { u: 1.5, v: 0, diameter: 6.5, depth: wall, name: 'uprightBolt' });
