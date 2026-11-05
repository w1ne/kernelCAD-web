// Injection-moulded enclosure base, 80 x 50 mm starting profile, 25 mm tall,
// 2 mm nominal wall. At 1.5° draft the final envelope is about 81.31 × 51.31 mm,
// opening up (+Z is the mould pull direction, the core comes out of the top).
// Four cored posts accept an illustrative Ø2.1 mm pilot for M2.5 self-tapping
// board screws on a 40 × 20 mm pattern. Eight 60%-wall ribs tie the posts into
// the side walls; rib-to-wall ratio, flow, gate, ejection and tooling still need
// an injection-moulding engineer and resin/screw supplier review.
//
// - Straight walls fail: 8 faces with 0.00° draft and 8 sharp inside corners.
// - draft(+1.5) tapers the walls INWARD toward the opening; after shell() the
//   cavity is narrower at the top than at the floor, so the core cannot be
//   pulled: dfm.moulding.undercut on all four inner walls.
// - draft(-1.5) flares the walls outward toward the opening (both skins), and
//   a 1 mm concave fillet (half the wall) rounds the inside corners: PASS.
const draftDeg = param('draftDeg', 1.5, { min: 1, max: 5 });
const length = param('length', 80, { min: 70, max: 120 });
const width = param('width', 50, { min: 45, max: 90 });
const height = param('height', 25, { min: 20, max: 40 });
const wall = param('wall', 2, { min: 2, max: 2.5 });

dfmSpec({
  process: 'moulding',
  pullDirection: '+z', // mould halves separate along ±Z
  minDraftDeg: 1,      // smooth finish; add ~1° per 0.025 mm of texture depth
  minWallMm: 1,        // includes drafted ribs; the enclosure wall itself is >= 2 mm
  maxWallMm: 3.5,      // thicker sections sink and warp
  minRadiusMm: 0.5,    // inside corners tighter than this concentrate stress
});

let base = box(length, width, height);
for (const side of ['front', 'back', 'left', 'right']) {
  base = base.draft(draftDeg.negate(), { face: side, pullDir: [0, 0, 1] });
}
base = base.shell(wall, { face: 'top' }).fillet(wall.divide(2), { concave: true });
const boardScrewPilotDia = param('boardScrewPilotDia', 2.1, { min: 2, max: 2.2 });
// Four cored, drafted screw bosses on the board's 40 × 20 mm pattern.
const cx = length.divide(2);
const cy = width.divide(2);
const boardPosts = [
  { x: cx.subtract(20), y: cy.subtract(10), xSide: 'low', ySide: 'low' },
  { x: cx.add(20), y: cy.subtract(10), xSide: 'high', ySide: 'low' },
  { x: cx.subtract(20), y: cy.add(10), xSide: 'low', ySide: 'high' },
  { x: cx.add(20), y: cy.add(10), xSide: 'high', ySide: 'high' },
] as const;
const pilotRadius = boardScrewPilotDia.divide(2);
for (const { x, y } of boardPosts) {
  const post = path().moveTo(pilotRadius, 0).lineTo(3, 0).lineTo(2.79, 6)
    .lineTo(pilotRadius.add(0.105), 6).close().revolve();
  base = base.union(post.translate(x, y, wall.subtract(0.1)));
}

// BEGIN STRUCTURAL RIBS
// Rib stock stays at 60% of nominal wall, with overlap into each post and wall.
const ribThickness = wall.multiply(0.6);
const ribDraftDeg = 1.1; // margin above the 1° release floor; keep rib tips above 1 mm
for (const { x, y, xSide, ySide } of boardPosts) {
  // End the ribs inside each post's minimum Ø5.58 mm body so their drafted
  // edges cannot leave a lip outside the post as it narrows toward +Z.
  const xStart = xSide === 'low' ? wall.subtract(1) : x.add(2);
  const xEnd = xSide === 'low' ? x.subtract(2) : length.subtract(wall).add(1);
  let xRib = box(xEnd.subtract(xStart), ribThickness, 3.5);
  for (const side of ['front', 'back', 'left', 'right']) {
    xRib = xRib.draft(ribDraftDeg, { face: side, pullDir: [0, 0, 1] });
  }
  base = base.union(xRib.translate(xStart, y.subtract(ribThickness.divide(2)), wall.subtract(0.1)));

  const yStart = ySide === 'low' ? wall.subtract(1) : y.add(2);
  const yEnd = ySide === 'low' ? y.subtract(2) : width.subtract(wall).add(1);
  let yRib = box(ribThickness, yEnd.subtract(yStart), 3.5);
  for (const side of ['front', 'back', 'left', 'right']) {
    yRib = yRib.draft(ribDraftDeg, { face: side, pullDir: [0, 0, 1] });
  }
  base = base.union(yRib.translate(x.subtract(ribThickness.divide(2)), yStart, wall.subtract(0.1)));
}
// END STRUCTURAL RIBS

// Generic pilot sizing and resin-dependent screw engagement remain illustrative.
return base.fillet(wall.divide(4), { concave: true, ofCurveType: 'CIRCLE' });
