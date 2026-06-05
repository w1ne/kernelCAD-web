// Spice Dispenser — STATIC-CHAMBERS VARIANT (v3 architecture).
//
// Answers the two structural critiques of the revolver variants:
//   1. "Rotating the loaded drum is hard" — here NOTHING heavy rotates. The
//      six Ø18 chambers live in a STATIC block (also the grip body). A thin
//      Ø60 selector disc with ONE port rotates beneath them to choose a
//      chamber; a static funnel under the disc routes any station to one
//      central spout; the proven tap-scoop tube doses at the center.
//   2. "We can't hold the rotating part" — the entire outer surface (block,
//      shell, lid, base) is static. Rotors are fully internal.
//
// Drive layout (both motors on static structure, standard practice):
//   • servo-selector — in the top knob housing, shaft DOWN a Ø6 spindle
//     through the block's core to the selector disc (real spice carousels
//     put the selector knob on top).
//   • servo-doser    — horizontal under the base, coaxial with the tap tube
//     (same arrangement proven in spice-revolver.kcad.ts).
//
// Joints are revolute mates with param-driven poses → pose-only re-solves
// in Studio and draggable in the Joints tab.
//
// Geometry blockout — servo screws in the knob housing are omitted (noted),
// servos are MG90S modeled to datasheet (swap vendor STEP via lib.fromSTEP).

// ── Dimensions (mm) ────────────────────────────────────────────────────────
const SHELL_R   = 38;          // Ø76 outer silhouette, same as the revolver
const BOLT_R    = 24;          // chambers on a Ø48 bolt circle
const CHAMBER_R = 9;           // Ø18 spice chambers

const PLATE_T   = 16;          // bottom plate: tap valve + doser servo live here
const FUNNEL_H  = 28;          // funnel zone z 16..44 — 43° wall, steep enough for ground spice
const BLOCK_Z0  = PLATE_T + FUNNEL_H;   // 44 — chamber block seat
const BLOCK_H   = 55;
const DISC_Z0   = 40.15;       // selector disc bottom — SEATS on the funnel rim (0.15 running clearance)

// ── MG90S metal-gear 9 g servo (TowerPro), modeled to datasheet ────────────
// Built shaft-up (+Z), case base at z=0, centred in X/Y; output spline OFFSET.
const MG_L = 22.8, MG_W = 12.2, MG_H = 22.5;
const MG_FLANGE_L = 32.2, MG_FLANGE_T = 2.5, MG_FLANGE_Z = 16.0;
const MG_HOLE_SPACING = 28, MG_HOLE_R = 1.0;
const MG_SHAFT_X = -MG_L / 2 + 6;
function mg90s() {
  const caseBody = box(MG_L, MG_W, MG_H, true).translate(0, 0, MG_H / 2).color('servo');
  const flangeBlank = box(MG_FLANGE_L, MG_W, MG_FLANGE_T, true).translate(0, 0, MG_FLANGE_Z + MG_FLANGE_T / 2);
  const holeA = cylinder(MG_FLANGE_T + 2, MG_HOLE_R, 16).translate(MG_HOLE_SPACING / 2, 0, MG_FLANGE_Z - 1);
  const holeB = cylinder(MG_FLANGE_T + 2, MG_HOLE_R, 16).translate(-MG_HOLE_SPACING / 2, 0, MG_FLANGE_Z - 1);
  const flange = flangeBlank.subtract(holeA, holeB).color('servo');
  const boss   = cylinder(2, 3, 24).translate(MG_SHAFT_X, 0, MG_H).color('servo');
  // Output spline with the central SCREW POINT on top.
  const spline = cylinder(4, 2.45, 16).translate(MG_SHAFT_X, 0, MG_H + 2)
    .subtract(cylinder(3, 1, 12).translate(MG_SHAFT_X, 0, MG_H + 3)).color('shaft');
  const cable  = cylinder(5, 1.6, 12).alongAxis([1, 0, 0]).translate(MG_L / 2, 0, 5).color('#222222');
  return caseBody.union(flange, boss, spline, cable);
}

// ── Body — bottom plate + shell ring + funnel, one static printed part ──────
const plate = cylinder(PLATE_T, SHELL_R, 96);
// Shell ring: the outer skin of the funnel zone (z 16..44, 3 mm wall).
const shellRing = cylinder(FUNNEL_H, SHELL_R, 96).translate(0, 0, PLATE_T)
  .subtract(cylinder(FUNNEL_H + 2, SHELL_R - 3, 96).translate(0, 0, PLATE_T - 1));
// Funnel: revolved 3 mm wall from the Ø10 central spout mouth (z=16) up to
// the rim (r 32..35, z 40, merged into the shell ring). 43° wall — spice
// from ANY selector station slides to the central spout.
const funnel = path()
  .moveTo(5, PLATE_T)
  .lineTo(8, PLATE_T)
  .lineTo(35, BLOCK_Z0 - 4)
  .lineTo(32, BLOCK_Z0 - 4)
  .close()
  .revolve();
// Tap valve in the plate, at the CENTER (fed by the funnel spout). Same
// proven layout as spice-revolver: Ø14 bore along Y, axis z=+7, blind at +Y,
// 1.1 mm end wall at -Y with a Ø6.6 shaft hole for the servo coupling.
const TAP_Z = 7;
const valveBody = cylinder(17.2, 7.5, 48).alongAxis([0, 1, 0]).translate(0, -8.7, TAP_Z);
const valveBore = cylinder(15.8, 7, 48).alongAxis([0, 1, 0]).translate(0, -7.6, TAP_Z);
const shaftHole = cylinder(2.5, 3.3, 24).alongAxis([0, 1, 0]).translate(0, -9.2, TAP_Z);
const inlet  = cylinder(6, 5, 32).translate(0, 0, 12);             // funnel spout → bore top
const outlet = box(9, 6, 3).translate(-4.5, -3, -1)                // 9×15 capsule, bore → open air
  .union(cylinder(3, 4.5, 32).translate(0, -3, -1), cylinder(3, 4.5, 32).translate(0, 3, -1));
// Doser-servo recess + mount pillars (coaxial servo at z=7, case top 13.1,
// 2.6 mm roof; pillars at the flange ears, M2 bores along Y).
const dsrRecess = box(33.2, 26.2, 13.4).translate(-22, -35, 0);   // stops at y=-8.8, clear of the bore's end wall
const dsrMountA = box(4, 2.5, 13.4).translate(-21.4, -13.4, 0);    // pillar at ear x=-19.4, fully inside the plate
const dsrMountB = box(4, 2.5, 13.4).translate(6.6, -13.4, 0);      // pillar at ear x=+8.6, fully inside the plate
const dsrBoreA  = cylinder(5, 1.0, 16).alongAxis([0, 1, 0]).translate(-19.4, -16.4, TAP_Z);
const dsrBoreB  = cylinder(5, 1.0, 16).alongAxis([0, 1, 0]).translate(8.6, -16.4, TAP_Z);
const body = plate
  .union(shellRing, funnel, valveBody)
  .subtract(valveBore, shaftHole, inlet, outlet, dsrRecess)
  .union(dsrMountA, dsrMountB)
  .subtract(dsrBoreA, dsrBoreB)
  .color('frame');

// ── Chamber block + knob housing — the static grip body ─────────────────────
// Authored in its joint-local frame (origin at the seat on the shell top,
// world z=44). Six Ø18 chambers with 4 mm floors necking to Ø10 outlets that
// open into the selector cavity below. The Ø46 knob housing on top holds the
// inverted selector servo (flange screws omitted in this blockout).
const chamberLocal  = cylinder(52, CHAMBER_R, 32).translate(BOLT_R, 0, 4);     // z 4..56, punches the top
const chambersLocal = chamberLocal.patternCircular({ count: 6, axis: [0, 0, 1] });
const outletLocal   = cylinder(6, 5, 32).translate(BOLT_R, 0, -2);             // Ø10 floor outlet ×6
const outletsLocal  = outletLocal.patternCircular({ count: 6, axis: [0, 0, 1] });
const spindleBore   = cylinder(57.5, 3.5, 32).translate(0, 0, -1);             // Ø7 core bore for the Ø6 spindle
const knobHousing   = cylinder(34, 23, 64).translate(0, 0, BLOCK_H);           // z 55..89 local (99..133 world)
const servoCavity   = box(33, 12.8, 25).translate(-11.2, -6.4, 62.8);          // swallows case + flange (screws omitted)
const housingBore   = cylinder(9.5, 3.5, 24).translate(0, 0, 54);              // spindle/boss passage into the cavity
const block = cylinder(BLOCK_H, SHELL_R, 96)
  .union(knobHousing)
  .subtract(chambersLocal, outletsLocal, spindleBore, servoCavity, housingBore)
  .color('frame');

// ── Lid — static annular press-on cap around the knob housing ───────────────
// Local frame: seat on the block top (world z=99).
const lid = cylinder(13, 40, 96).translate(0, 0, -8)
  .subtract(
    cylinder(9, 38.3, 96).translate(0, 0, -8.5),    // skirt interior grips the block
    cylinder(15, 23.6, 96).translate(0, 0, -9),     // clears the knob housing
  )
  .color('plate');

// ── Selector — thin rotor: Ø60 disc with ONE port + Ø6 drive spindle ─────────
// Local frame: origin on the axis at the disc bottom (world z=40.7). The
// only rotating mass between the spice and the funnel — grams, not the drum.
const selectorDisc    = cylinder(3, 30, 96);
const selectorPort    = cylinder(5, 5, 32).translate(BOLT_R, 0, -1);           // Ø10 port at the bolt circle
const selectorSpindle = cylinder(62.85, 3, 32).translate(0, 0, 2);             // up through the block core, top z=64.85 (world 105)
const splineSocket    = cylinder(5.4, 2.6, 16).translate(0, 0, 59.65);         // grips the servo spline from above
const selector = selectorDisc
  .union(selectorSpindle)
  .subtract(selectorPort, splineSocket)
  .color('gear');

// ── Doser — the proven tap-scoop tube, at the center ────────────────────────
// Identical to spice-revolver's doser: Ø13.4 tube, blind 9×15 scoop ≈1 ml,
// 0° fills under the spout / 180° drops out the bottom. Local frame on the
// tap axis (world (0, 0, 7)).
const doseScoop = box(9, 6, 11.5).translate(-4.5, -3, -4.5)
  .union(
    cylinder(11.5, 4.5, 32).translate(0, -3, -4.5),
    cylinder(11.5, 4.5, 32).translate(0, 3, -4.5),
  );
const doser = cylinder(14.5, 6.7, 48).alongAxis([0, 1, 0]).translate(0, -7.5, 0)
  .subtract(
    doseScoop,
    cylinder(5.5, 2.6, 16).alongAxis([0, 1, 0]).translate(0, -7.55, 0),
    cylinder(1.2, 3.3, 24).alongAxis([0, 1, 0]).translate(0, -7.55, 0),
  )
  .color('tool');

// ── Servos ───────────────────────────────────────────────────────────────────
// Doser servo: horizontal, half-recessed under the plate, coaxial with the tap.
const servoDoser = mg90s()
  .rotate([0, 0, 1], 180)
  .rotate([1, 0, 0], -90)
  .translate(-5.4, -32, TAP_Z);
// Selector servo: inverted (shaft DOWN) inside the knob housing; spline
// reaches the spindle's socket at world z 101..105.
const servoSelector = mg90s()
  .rotate([1, 0, 0], 180)
  .translate(5.4, 0, 129.5);

// ── Params ───────────────────────────────────────────────────────────────────
const selectorDeg = param('selectorDeg', 0, {
  min: 0, max: 300, description: 'Chamber selector — 60° per chamber (station k = k·60°)',
});
const doserAngleDeg = param('doserAngleDeg', 0, {
  min: 0, max: 180, description: 'Tap tube angle — 0 fills the scoop, 180 drops the dose',
});

// ── Assembly — connectors, joints, posed model ───────────────────────────────
const asm = assembly('spice-dispenser-static-chambers');
const bodyPart = asm.part('body', body);
bodyPart.connector('selectorAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, DISC_Z0] }, axis: [0, 0, 1] });
bodyPart.connector('tapAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, TAP_Z] }, axis: [0, 1, 0] });
bodyPart.connector('blockSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, BLOCK_Z0] } });
bodyPart.connector('dsrMount', { type: 'frame', origin: { kind: 'vec3', value: [-5.4, -32, TAP_Z] } });

const blockPart = asm.part('block', block);
blockPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
blockPart.connector('lidSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, BLOCK_H] } });
blockPart.connector('selServoMount', { type: 'frame', origin: { kind: 'vec3', value: [5.4, 0, 85.5] } });

const lidPart = asm.part('lid', lid);
lidPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

const selectorPart = asm.part('selector', selector);
selectorPart.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

const doserPart = asm.part('doser', doser);
doserPart.connector('tapAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });

const dsrServoPart = asm.part('servo-doser', servoDoser);
dsrServoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [-5.4, -32, TAP_Z] } });

const selServoPart = asm.part('servo-selector', servoSelector);
selServoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [5.4, 0, 129.5] } });

// Both rotors are enclosed by design (disc inside the shell, tube inside
// its bore) — declare that to Gate 4 instead of faking fork daylight.
asm.mate('select', 'body.selectorAxis', 'selector.axis', 'revolute', { pose: selectorDeg, limitsDeg: [0, 300], exposure: 'concealed' });
asm.mate('tap', 'body.tapAxis', 'doser.tapAxis', 'revolute', { pose: doserAngleDeg, limitsDeg: [0, 180], exposure: 'concealed' });
asm.mate('block-fit', 'body.blockSeat', 'block.seat', 'fastened');
asm.mate('lid-fit', 'block.lidSeat', 'lid.seat', 'fastened');
asm.mate('dsr-servo-fix', 'body.dsrMount', 'servo-doser.mount', 'fastened');
asm.mate('sel-servo-fix', 'block.selServoMount', 'servo-selector.mount', 'fastened');

return asm.solvedModel({});
