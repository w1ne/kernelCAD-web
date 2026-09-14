// mesh_to_features example — edge fillets.
//
// A rail end stop: a 60 x 40 x 12 plate with two mounting holes, 5 mm rounds
// on the two vertical edges of the rounded end, and a 2 mm round along the top
// edge of the square end. It is exported to STL and read back to show that
// constant-radius blends come back as fillet() features with measured radii,
// not as leftover facets.
//
// 1. Export the mesh (the committed end-stop.stl was written this way):
//      npx tsx src/agent/cli/index.ts export stl examples/mesh-to-features/end-stop.kcad.ts -o examples/mesh-to-features/end-stop.stl
//
// 2. Rebuild it from the mesh alone:
//      npx tsx src/agent/cli/index.ts reconstruct examples/mesh-to-features/end-stop.stl -o examples/mesh-to-features/end-stop.reconstructed.kcad.ts
//
//    Expected output (committed as end-stop.reconstructed.kcad.ts and
//    end-stop.reconstructed.ledger.json):
//      verdict: faithful  volumeIoU=1.0000  maxDeviationMm=0.000  rmsMm=0.000  (faithful needs IoU >= 0.98, max dev <= 0.25 mm; pass 0)
//      body: extrude (1)  holes: holes1 2x Ø5.5 through  fillets: R5 x2 edges, R2 x1 edges  cutouts: 0  boolean remainders: 0
//      profile: block 1 rectangle, rounds as fillet
//      params: length=60, width=40, thickness=12, holes1Diameter=5.5, fillet1Radius=5, fillet2Radius=2
//      mesh: 2792 triangles, watertight=true; unmatched regions: 0; open ledger facts: 12
//
//    The script is the sharp 60 x 40 x 12 plate, the two drilled holes, then
//    one fillet feature with two measured radius groups: R5 on the vertical
//    edges at x = 0 ({ atX: 0, parallel: [0, 0, 1] }) and R2 on the top edge at
//    x = 60 ({ atZ: 12, atX: 60 }) — the rounds this file authored.
//
// 3. The emitted script is an ordinary model:
//      npx tsx src/agent/cli/index.ts evaluate examples/mesh-to-features/end-stop.reconstructed.kcad.ts

const roundedEndRadius = 5;
const topEdgeRadius = 2;

return box(60, 40, 12)
  .holes('top', { positions: [{ u: -10, v: -10 }, { u: -10, v: 10 }], diameter: 5.5, depth: 'through', name: 'mount' })
  // Vertical edges at x = 0.
  .fillet(roundedEndRadius, { parallel: [0, 0, 1], atX: 0, tolerance: 0.01 })
  // Top edge at x = 60.
  .fillet(topEdgeRadius, { parallel: [0, 1, 0], atX: 60, atZ: 12, tolerance: 0.01 });
