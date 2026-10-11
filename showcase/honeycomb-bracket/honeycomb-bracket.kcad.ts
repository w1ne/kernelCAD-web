// Honeycomb L-bracket (with FDM print-readiness gate + STEP export)
//
// Prompt: "Honeycomb bracket: filleted L-bracket with a generative hex lattice."
//
// Words -> geometry:
//   "L-bracket"          -> a base plate and an upright plate, fused, with
//                           two Ø5.5 mm (M5 clearance) holes in each leg made
//                           with holes() so drawings / DFM see real holes.
//   "filleted"           -> the inside corner gets a concave fillet (filletR),
//                           the outside corners a smaller edge round.
//   "generative hex      -> latticeWindows(): a hex grid is laid over each
//    lattice"               leg and a cell is kept only when the WHOLE hexagon
//                           fits inside the leg's frame margin and clears every
//                           bolt-hole keep-out ring. Change the cell size or
//                           web and the pattern regenerates.
//
// Beyond the prompt — what the agent can prove about it:
//   dfmSpec() declares an FDM print gate (0.4 mm nozzle, 45 deg overhang,
//   1.6 mm min wall) and a build direction, so every evaluate measures the
//   lattice webs and overhangs; `kernelcad dfm` reports the result and
//   `kernelcad export step` writes the B-rep for a machinist.

const t = param('thickness', 5, { min: 3, max: 10, description: 'Plate thickness of both legs (mm)' });
const filletR = param('innerFillet', 6, { min: 1, max: 12, description: 'Inside corner fillet radius (mm)' });
const cellChoice = param('cellSize', '8', { choices: ['8', '10', '12', '14'] }); // hexagon across-flats (mm)
const webChoice = param('web', '2.0', { choices: ['1.6', '2.0', '2.4', '3.0'] }); // material between cells (mm)
const CELL = Number(cellChoice.value);
const WEB = Number(webChoice.value);

const W = 90;        // bracket width (X)
const LEG = 70;      // leg length, base (Y) and upright (Z)
const T0 = 5;        // nominal thickness used for the lattice layout
const MARGIN = 7;    // solid frame left around each lattice field
const HOLE_D = 5.5;  // M5 clearance
const KEEP = 6;      // keep-out radius around each bolt hole centre
const HOLE_X = [11, W - 11];
const HOLE_U = LEG - 9;  // hole distance from the corner along each leg
const FILLET_MAX = 12;   // lattice layout clears the innerFillet param's maximum

// --- Legs with mounting holes ----------------------------------------------
// holes() positions are (u, v) from the face centre.
const base = box(W, LEG, t).holes('top', {
  positions: HOLE_X.map((x) => ({ u: x - W / 2, v: HOLE_U - LEG / 2 })),
  diameter: HOLE_D,
  depth: 'through',
  name: 'baseBolts',
});
const upright = box(W, t, LEG).holes('front', {
  positions: HOLE_X.map((x) => ({ u: x - W / 2, v: HOLE_U - LEG / 2 })),
  diameter: HOLE_D,
  depth: 'through',
  name: 'uprightBolts',
});

let bracket = base.union(upright)
  .fillet(filletR, { parallel: [1, 0, 0], concave: true })
  .fillet(1.5, { parallel: [1, 0, 0], convex: true });

// --- Generative hex lattice -------------------------------------------------
/** Hex cell centres (pointy along the leg) that fit the leg's lattice field. */
function cellCentres(): [number, number][] {
  const af = CELL;                 // across flats
  const R = af / Math.sqrt(3);     // circumradius
  const dx = af + WEB;             // column pitch (across flats + web)
  const dy = (3 / 2) * R + WEB * Math.sqrt(3) / 2; // row pitch
  const u0 = T0 + FILLET_MAX + MARGIN; // start past the largest corner fillet the param allows
  const out: [number, number][] = [];
  for (let row = 0; row < 40; row++) {
    const v = u0 + R + row * dy;
    if (v + R > LEG - MARGIN) break;
    const shift = row % 2 === 0 ? 0 : dx / 2; // odd rows offset half a cell
    for (let col = -20; col <= 20; col++) {
      const x = W / 2 + shift + col * dx; // grid centred on the bracket width

      if (x - af / 2 < MARGIN || x + af / 2 > W - MARGIN) continue;
      const clear = HOLE_X.every((hx) => Math.hypot(x - hx, v - HOLE_U) > KEEP + R);
      if (clear) out.push([x, v]);
    }
  }
  return out;
}

function hexPrism(cx: number, cy: number, depth: number) {
  const R = CELL / Math.sqrt(3);
  let p = path();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (Math.PI / 3) * i; // flats parallel to the leg's width
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);
    p = i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  return p.close().extrude(depth);
}

const cells = cellCentres();
// Base leg: cells cut straight down through z.
const baseCells = cells.map(([x, v]) => hexPrism(x, v, 40).translate(0, 0, -10));
// Upright leg: same layout, sketch (x, v) mapped to (x, z), cut through y.
const upCells = cells.map(([x, v]) => hexPrism(x, v, 40).translate(0, 0, -10).rotateX(90).translate(0, 20, 0));
bracket = bracket.subtract(union(...baseCells), union(...upCells));

dfmSpec({
  process: 'fdm',
  buildDirection: '+x', // printed on its side: both lattices become vertical-wall prisms
  nozzleMm: 0.4,
  maxOverhangDeg: 45,
  maxBridgeMm: 10,
  minWall: 1.6,
  printer: 'generic-fdm',
});

return bracket.finish('abs', { color: '#e07a2e' });
