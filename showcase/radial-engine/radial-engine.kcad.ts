// 9-cylinder radial aircraft engine
//
// Prompt: "9-cylinder radial aircraft engine: round crankcase, nine finned
// cylinders in a star, domed heads, prop hub."
//
// Words -> geometry (built about +Z = propeller axis, then turned so the
// propeller faces -Y, the default front view):
//   "round crankcase"       -> one revolved profile: the main ring the
//                              cylinders bolt to, a rear accessory case, and a
//                              tapered nose case.
//   "nine finned cylinders" -> cylinderCount (choice; radials use odd counts)
//   "in a star"                spaced 360/N about the axis. Each barrel's
//                              cooling fins are ONE revolved comb profile.
//   "domed heads"           -> finned head + revolved dome cap + a rocker box,
//                              a separate aluminium part from the steel barrel.
//   (realism)               -> two pushrod tubes per cylinder from the cam
//                              case to a rocker box on the head, and an
//                              exhaust stub out of the back of each head.
//   "prop hub"              -> splined-shaft stand-in, hub and a six-bolt
//                              propeller flange on the nose.
//
// It is a static display model (no crank train inside), returned as an
// assembly so every part keeps its own name and finish.

const countChoice = param('cylinderCount', '9', { choices: ['5', '7', '9'] });
const N = Number(countChoice.value);

const barrelChoice = param('barrelLength', '50', { choices: ['40', '50', '60'] }); // finned barrel length, crankcase to head (mm)
const BARREL_LEN = Number(barrelChoice.value);
const finPitch = 3.4;      // fin spacing (mm)
const finT = 1.1;          // fin thickness (mm)
const R_CASE = 60;         // crankcase main ring radius
const BARREL_CORE = 15;    // barrel core radius
const BARREL_FIN = 22;     // barrel fin tip radius
const HEAD_LEN = 26;       // head (finned part) length
const HEAD_FIN = 25;       // head fin tip radius
const DOME = 16;           // dome rise

const BARREL_START = R_CASE + 2; // first fin clears the crankcase; the spigot below it plugs into a bore
const headStart = BARREL_START + BARREL_LEN;

/** Revolved comb: core radius rc, fins to rf, from y0 to y0+len (local axis = Z). */
function finnedTube(rc: number, rf: number, len: number, startPad: number) {
  let p = path().moveTo(0, 0).lineTo(rc, 0);
  let y = startPad;
  while (y + finT < len - 1) {
    p = p.lineTo(rc, y).lineTo(rf, y + 0.4).lineTo(rf, y + finT).lineTo(rc, y + finT + 0.4);
    y += finPitch;
  }
  return p.lineTo(rc, len).lineTo(0, len).close().revolve();
}

/** Put a part built along local +Z onto the radial axis at angle a (deg), at radius r. */
function radial(shape: Shape, a: number, r: number) {
  return shape.translate(0, 0, r).rotateY(90).rotateZ(a);
}

/** Final orientation for the whole engine: propeller faces -Y. */
const face = (s: Shape) => s.rotateX(90);

const engine = assembly('radial-engine');

// Parts touch but never share volume: every barrel spigot, pushrod and
// exhaust stub sits in a matching bore cut into the part it plugs into, so
// the interference check sees face contact, not overlap.
const SPIGOT_START = 44;               // barrel spigot reaches down to r = 44 inside the case
const PUSHROD_START = 46;
const PUSHROD_END = headStart + HEAD_LEN - 4; // centre of the rocker box
const PUSHROD_Z = HEAD_FIN + 3;        // forward offset of the pushrods

/** Barrel spigot (the plain core below the first fin) for cylinder at angle a. */
const spigotTool = (a: number) => radial(cylinder(BARREL_START + 8 - SPIGOT_START, BARREL_CORE, 48), a, SPIGOT_START);
/** Pushrod tube for cylinder at angle a, side = tangential offset (mm). */
const pushrodTube = (a: number, side: number) =>
  cylinder(PUSHROD_END - PUSHROD_START, 2.2, 24)
    .translate(0, side, PUSHROD_START) // runs radially once turned; side = tangential offset
    .rotateY(90)
    .translate(0, 0, PUSHROD_Z) // in front of the fins (+Z = forward), into the rocker box
    .rotateZ(a);
/** Exhaust stub out of the back of the head at angle a. */
const exhaustStub = (a: number) =>
  cylinder(26, 5, 24).rotateY(180).translate(headStart + HEAD_LEN / 2, 0, -HEAD_FIN + 8).rotateZ(a);

const angles: number[] = [];
for (let i = 0; i < N; i++) angles.push(90 + (360 / N) * i); // cylinder 1 points straight up

// --- Crankcase (main ring + accessory case + nose case), revolved -------------
let crankcase = path()
  .moveTo(0, -58)
  .lineTo(44, -58)
  .lineTo(46, -30)
  .lineTo(R_CASE - 4, -26)
  .threePointsArc(R_CASE - 4, 26, R_CASE + 2, 0)
  .lineTo(52, 30)
  .lineTo(34, 62)
  .lineTo(0, 62)
  .close()
  .revolve();
for (const a of angles) crankcase = crankcase.subtract(spigotTool(a), pushrodTube(a, -6), pushrodTube(a, 6));
engine.part('crankcase', face(crankcase.finish('paint-matte', { color: '#8d969f' })), { material: 'aluminum-6061' });

// --- Cylinders -----------------------------------------------------------------
angles.forEach((a, i) => {
  // Barrel: plain spigot in the case bore, then the finned steel tube up to the head.
  const barrel = union(
    cylinder(BARREL_START + 8 - SPIGOT_START + 0.5, BARREL_CORE, 48).translate(0, 0, SPIGOT_START - BARREL_START),
    finnedTube(BARREL_CORE, BARREL_FIN, BARREL_LEN, 8),
  );
  engine.part(`barrel-${i + 1}`, face(radial(barrel, a, BARREL_START).finish('anodized-black')), { material: 'mild-steel' });

  // Head: finned aluminium block + dome + rocker box on the front flank.
  const headFins = finnedTube(BARREL_FIN - 4, HEAD_FIN, HEAD_LEN, 2.5);
  const dome = path()
    .moveTo(0, HEAD_LEN - 0.5)
    .lineTo(BARREL_FIN - 3, HEAD_LEN - 0.5)
    .threePointsArc(0, HEAD_LEN + DOME, (BARREL_FIN - 3) * 0.72, HEAD_LEN + DOME * 0.72)
    .close()
    .revolve();
  // Rocker box lies tangentially; local frame here: +Z = radial, -X = forward after radial().
  const rocker = cylinder(24, 6.5, 32).rotateX(90).translate(-PUSHROD_Z, 12, HEAD_LEN - 4);
  const rockerWeb = box(10, 20, 12, true).translate(-(HEAD_FIN - 2), 0, HEAD_LEN - 6);
  const head = radial(union(headFins, dome, rocker, rockerWeb), a, headStart)
    .subtract(pushrodTube(a, -6), pushrodTube(a, 6), exhaustStub(a));
  engine.part(`head-${i + 1}`, face(head.finish('aluminium')), { material: 'aluminum-6061' });

  // Pushrod tubes: front of the cylinder, cam case -> rocker box.
  for (const side of [-6, 6]) {
    engine.part(`pushrod-${i + 1}${side < 0 ? 'a' : 'b'}`, face(pushrodTube(a, side).finish('stainless')), { material: 'mild-steel' });
  }

  // Exhaust stub: short pipe out of the back of the head.
  engine.part(`exhaust-${i + 1}`, face(exhaustStub(a).finish('copper')), { material: 'mild-steel' });
});

// --- Prop hub: shaft, hub and six-bolt flange -------------------------------
const hub = union(
  cylinder(14, 14, 48).translate(0, 0, 62),          // hub barrel, seated on the nose face
  cylinder(8, 38, 64).translate(0, 0, 76),           // propeller flange
  path().moveTo(0, 83.9).lineTo(22, 83.9).lineTo(10, 100).lineTo(0, 102).close().revolve(), // hub nut cone
);
// Six bolt heads seated 0.1 mm into the flange face, fused into the hub part.
const bolts = [];
for (let k = 0; k < 6; k++) bolts.push(cylinder(5, 3.5, 16).translate(28, 0, 83.9).rotateZ(60 * k));
engine.part('prop-hub', face(union(hub, ...bolts).finish('steel')), { material: 'mild-steel' });

return engine.model();
