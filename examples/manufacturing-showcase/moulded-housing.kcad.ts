// Injection-moulded enclosure base, 80 x 50 mm starting profile, 25 mm tall,
// 2 mm nominal wall. At 1.5° draft the final envelope is about 81.31 × 51.31 mm,
// opening up (+Z is the mould pull direction, the core comes out of the top).
//
// - Straight walls fail: 8 faces with 0.00° draft and 8 sharp inside corners.
// - draft(+1.5) tapers the walls INWARD toward the opening; after shell() the
//   cavity is narrower at the top than at the floor, so the core cannot be
//   pulled: dfm.moulding.undercut on all four inner walls.
// - draft(-1.5) flares the walls outward toward the opening (both skins), and
//   a 1 mm concave fillet (half the wall) rounds the inside corners: PASS.
const draftDeg = param('draftDeg', 1.5, { min: 0.5, max: 5 });
const wall = 2;

dfmSpec({
  process: 'moulding',
  pullDirection: '+z', // mould halves separate along ±Z
  minDraftDeg: 1,      // smooth finish; add ~1° per 0.025 mm of texture depth
  minWallMm: 1.2,      // thinner walls freeze off before the cavity fills
  maxWallMm: 3.5,      // thicker sections sink and warp
  minRadiusMm: 0.5,    // inside corners tighter than this concentrate stress
});

let base = box(80, 50, 25);
for (const side of ['front', 'back', 'left', 'right']) {
  base = base.draft(draftDeg.negate(), { face: side, pullDir: [0, 0, 1] });
}
base = base.shell(wall, { face: 'top' }).fillet(wall / 2, { concave: true });
// Four cored posts for a board on a 40 × 20 mm pattern. Both inner and outer
// walls taper toward the opening; these are not certified screw/insert pilots.
// Add the board, retention, gate, ejectors and parting strategy with a toolmaker.
for (const [x, y] of [[20, 15], [60, 15], [20, 35], [60, 35]] as const) {
  const post = path().moveTo(1.4, 0).lineTo(4, 0).lineTo(3.79, 6)
    .lineTo(1.61, 6).close().revolve();
  base = base.union(post.translate(x, y, 1.9));
}
return base.fillet(0.5, { concave: true });
