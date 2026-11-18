// FDM shelf bracket: a before/after example for the FDM design rules guide
// (docs/guide/fdm-design-rules.md).
//
// A 60 x 40 x 6 base plate screws to a surface through two Ø4.5 holes and a
// small centre hole. A 5 mm upright rises from the back edge, a 20 mm shelf
// lip sticks out forward at the top, a 30 x 8 cable window runs through the
// upright and two side ribs tie the base to the upright.
//
// FIXED = false is the first draft, printed base-down as modelled.
// dfm_review({ processes: ['fdm'], printer: 'bambu-a1' }) fails four checks:
//   fdm.overhangs  1200 mm² flat ceiling under the lip (reach 20 mm)
//   fdm.bridging   30 mm bridge over the cable window (limit 10 mm)
//   fdm.min-wall   0.6 mm ribs (limit 2 × 0.4 mm nozzle = 0.8 mm)
//   fdm.min-hole   Ø1.5 mm centre hole (limit 5 × nozzle = 2 mm)
//
// FIXED = true thickens the ribs to 1.2 mm (3 × nozzle), opens the centre
// hole to Ø3.4 (M3 clearance) and applies the orientation ranking's top
// suggestion, .rotateX(-90): the back of the upright goes on the bed, the lip
// and the window become vertical, and every FDM check passes.
const FIXED = true;

const smallHole = FIXED ? 3.4 : 1.5; // centre hole, mm
const ribT = FIXED ? 1.2 : 0.6; // side rib thickness, mm

// box(w, d, h) spans from the origin corner; holes u/v are from the face centre.
const base = box(60, 40, 6)
  .holes('top', {
    positions: [{ u: -20, v: -8 }, { u: 20, v: -8 }],
    diameter: 4.5,
    depth: 'through',
  })
  .holes('top', { positions: [{ u: 0, v: -12 }], diameter: smallHole, depth: 'through' });

const upright = box(60, 5, 40).translate(0, 35, 6);
const lip = box(60, 20, 4).translate(0, 15, 42);
const rib = (x: number) => box(ribT, 29, 20).translate(x, 6, 6);
const cableWindow = box(30, 5, 8).translate(15, 35, 20);

const bracket = base.union(upright, lip, rib(2), rib(58 - ribT)).subtract(cableWindow);

// Print orientation: the ranking's apply string, pasted in.
return FIXED ? bracket.rotateX(-90) : bracket;
