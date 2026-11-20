// A guard plate for a 60 mm axial fan: 60 × 60 × 2 mm, four Ø4.3 holes for M4
// screws on the standard 50 mm square, and two rings of radial vent slots.
// One hole and one slot are drawn once at the origin. Every other hole and
// slot is a transformed copy; no rotated coordinate is computed by hand.
//
// - translate: the Ø4.3 hole placed on the four corners of the 50 mm square.
// - rotate: the 13 × 5 mm slot turned to eight positions, 45° apart.
// - scale: each outer slot resized by 0.45 about the fan axis, which makes
//   the inner ring; the ring is then turned 22.5° to sit between the outer slots.

const outline = path().moveTo(-30, -30).lineTo(30, -30).lineTo(30, 30).lineTo(-30, 30).close();

const hole = path().circle(0, 0, 2.15);
const corners: [number, number][] = [[-25, -25], [25, -25], [25, 25], [-25, 25]];
const mounts = corners.map(([x, y]) => hole.translate(x, y));

// Slot along +X: R2.5 ends centred 16 mm and 24 mm from the fan axis.
const slot = path()
  .moveTo(16, -2.5).lineTo(24, -2.5).threePointsArc(24, 2.5, 26.5, 0)
  .lineTo(16, 2.5).threePointsArc(16, -2.5, 13.5, 0).close();
const outerRing = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => slot.rotate(45 * i));
const innerRing = outerRing.map((s) => s.scale(0.45).rotate(22.5));

const profile = await outline.subtract([...mounts, ...outerRing, ...innerRing]);
const plate = profile.extrude(2);

// Check gauges, not catalog parts: an Ø4 pin through each mounting hole.
const pins = corners.map(([x, y]) => path().circle(x, y, 2).extrude(8).translate(0, 0, -3).color('#c9ccd1'));

return [plate.color('#3b82c4'), ...pins];
