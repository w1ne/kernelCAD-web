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
// Drive layout — BOTH servos at the bottom (same as the revolver, simple):
//   • servo-selector — vertical under the plate at the CENTER, shaft up a
//     Ø6 spindle inside a static center column to the selector disc. The
//     funnel spout sits 14 mm off-center to free the axis for the spindle.
//   • servo-doser    — horizontal inside the plate, coaxial with the tap
//     tube at x=14 (under the spout).
//
// Joints are revolute mates with param-driven poses → pose-only re-solves
// in Studio and draggable in the Joints tab.
//
// Geometry blockout — servos are MG90S modeled to datasheet (swap vendor
// STEP via lib.fromSTEP).

// ── Dimensions (mm) ────────────────────────────────────────────────────────
const SHELL_R   = 38;          // Ø76 outer silhouette, same as the revolver
const BOLT_R    = 24;          // chambers on a Ø48 bolt circle
const CHAMBER_R = 9;           // Ø18 spice chambers

const PLATE_T   = 16;          // bottom plate: tap valve + both servo mounts live here
const FUNNEL_H  = 34;          // funnel zone z 16..50 — keeps the far wall at 37° with the offset spout
const BLOCK_Z0  = PLATE_T + FUNNEL_H;   // 50 — chamber block seat
const BLOCK_H   = 55;
const DISC_Z0   = 46.15;       // selector disc bottom — SEATS on the funnel rim (0.15 running clearance)
const TAP_X     = 14;          // tap axis under the off-center spout

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
// Funnel: 3 mm-wall cone LOFTED from the Ø10 spout at (14, 0, 16) up to the
// rim at the shell (z 50). The spout sits off-center so the dispenser's
// central axis stays free for the selector spindle; far wall slope is 37°.
const circleAt = (cx, r) => path()
  .moveTo(cx + r, 0)
  .bulgeArc(cx - r, 0, 1)
  .bulgeArc(cx + r, 0, 1)
  .close();
const funnelOuter = circleAt(TAP_X, 8).loft(circleAt(0, 34), { spacing: FUNNEL_H - 4 }).translate(0, 0, PLATE_T);
const funnelInner = circleAt(TAP_X, 5).loft(circleAt(0, 31), { spacing: FUNNEL_H - 4 }).translate(0, 0, PLATE_T + 0.5);
// Center column: static Ø10 tube standing in the funnel (spice flows around
// it, like any hopper center column); the Ø6.5 gallery inside carries the
// selector spindle from the bottom servo up to the disc.
const column  = cylinder(FUNNEL_H - 4, 5, 32).translate(0, 0, PLATE_T);
const gallery = cylinder(FUNNEL_H + PLATE_T + 2, 3.25, 32).translate(0, 0, -1);
// Tap valve in the plate, at the CENTER (fed by the funnel spout). Same
// proven layout as spice-revolver: Ø14 bore along Y, axis z=+7, blind at +Y,
// 1.1 mm end wall at -Y with a Ø6.6 shaft hole for the servo coupling.
const TAP_Z = 7;
const valveBody = cylinder(17.2, 7.5, 48).alongAxis([0, 1, 0]).translate(TAP_X, -8.7, TAP_Z);
const valveBore = cylinder(15.8, 7, 48).alongAxis([0, 1, 0]).translate(TAP_X, -7.6, TAP_Z);
const shaftHole = cylinder(2.5, 3.3, 24).alongAxis([0, 1, 0]).translate(TAP_X, -9.2, TAP_Z);
const inlet  = cylinder(6, 5, 32).translate(TAP_X, 0, 12);         // funnel spout → bore top
const outlet = box(9, 6, 3).translate(TAP_X - 4.5, -3, -1)         // 9×15 capsule, bore → open air
  .union(cylinder(3, 4.5, 32).translate(TAP_X, -3, -1), cylinder(3, 4.5, 32).translate(TAP_X, 3, -1));
// Doser-servo recess + mount pillars (coaxial servo at z=7, case top 13.1,
// 2.6 mm roof; pillars at the flange ears, M2 bores along Y).
const dsrRecess = box(33.2, 26.2, 13.4).translate(-8, -35, 0);     // stops at y=-8.8, clear of the bore's end wall
const dsrMountA = box(4, 2.5, 13.4).translate(-7.4, -13.4, 0);     // pillar at ear x=-5.4, fully inside the plate
const dsrMountB = box(4, 2.5, 13.4).translate(20.6, -13.4, 0);     // pillar at ear x=+22.6, fully inside the plate
const dsrBoreA  = cylinder(5, 1.0, 16).alongAxis([0, 1, 0]).translate(-5.4, -16.4, TAP_Z);
const dsrBoreB  = cylinder(5, 1.0, 16).alongAxis([0, 1, 0]).translate(22.6, -16.4, TAP_Z);
// Selector-servo recess: vertical servo at the center, hanging below the
// plate exactly like the revolver's drum servo; M2 screw passages beside it.
const selRecess = box(13, 27, 4.3).translate(-6.5, -8.1, 0);    // case-top recess; the flange mounts below the plate, revolver-style
const selScrewA = cylinder(5, 1.1, 16).translate(0, 19.4, -1);
const selScrewB = cylinder(5, 1.1, 16).translate(0, -8.6, -1);
const body = plate
  .union(shellRing, funnelOuter, column, valveBody)
  .subtract(funnelInner, valveBore, shaftHole, inlet, outlet, dsrRecess, selRecess, selScrewA, selScrewB, gallery)
  .union(dsrMountA, dsrMountB)
  .subtract(dsrBoreA, dsrBoreB)
  .color('frame');

// ── Chamber block — the static grip body, now a plain cylinder ───────────────
// Authored in its joint-local frame (origin at the seat on the shell top,
// world z=50). Six Ø18 chambers with 4 mm floors necking to Ø10 outlets that
// open into the selector cavity below. No core bore, no top housing — the
// selector drive comes from BELOW.
const chamberLocal  = cylinder(52, CHAMBER_R, 32).translate(BOLT_R, 0, 4);     // z 4..56, punches the top
const chambersLocal = chamberLocal.patternCircular({ count: 6, axis: [0, 0, 1] });
const outletLocal   = cylinder(6, 5, 32).translate(BOLT_R, 0, -2);             // Ø10 floor outlet ×6
const outletsLocal  = outletLocal.patternCircular({ count: 6, axis: [0, 0, 1] });
const block = cylinder(BLOCK_H, SHELL_R, 96)
  .subtract(chambersLocal, outletsLocal)
  .color('frame');

// ── Lid — simple press-on cap with a knob (same style as the revolver) ──────
// Local frame: seat on the block top (world z=105).
const lid = cylinder(5, 40, 96)
  .union(
    cylinder(8, 40, 96).translate(0, 0, -8)
      .subtract(cylinder(10, 38.3, 96).translate(0, 0, -9)),   // skirt grips the block
    cylinder(12, 7, 32).translate(0, 0, 5),                    // knob
  )
  .color('plate');

// ── Selector — thin rotor: Ø60 disc with ONE port + Ø6 drive spindle ─────────
// Local frame: origin on the axis at the disc bottom (world z=46.15). The
// only rotating mass between the spice and the funnel — grams, not the drum.
// The spindle runs DOWN the center column to the bottom servo's spline.
const selectorDisc    = cylinder(3, 30, 96);
const selectorPort    = cylinder(5, 5, 32).translate(BOLT_R, 0, -1);           // Ø10 port at the bolt circle
const selectorSpindle = cylinder(40.45, 3, 32).translate(0, 0, -39.95);        // down the gallery, bottom z=6.2 world
const splineSocket    = cylinder(5.3, 2.6, 16).translate(0, 0, -40);           // grips the servo spline from below
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
  .translate(TAP_X - 5.4, -32, TAP_Z);
// Selector servo: vertical at the center, shaft up — hanging below the
// plate exactly like the revolver's drum servo (flange below the plate,
// case top recessed 4 mm in). The spline (z 6..10) reaches the spindle's
// socket up the gallery.
const servoSelector = mg90s()
  .rotate([0, 0, 1], 90)
  .translate(0, 0 - MG_SHAFT_X, -18.5);

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
bodyPart.connector('tapAxis', { type: 'axis', origin: { kind: 'vec3', value: [TAP_X, 0, TAP_Z] }, axis: [0, 1, 0] });
bodyPart.connector('blockSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, BLOCK_Z0] } });
bodyPart.connector('dsrMount', { type: 'frame', origin: { kind: 'vec3', value: [TAP_X - 5.4, -32, TAP_Z] } });
bodyPart.connector('selMount', { type: 'frame', origin: { kind: 'vec3', value: [0, 5.4, -18.5] } });

const blockPart = asm.part('block', block);
blockPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
blockPart.connector('lidSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, BLOCK_H] } });

const lidPart = asm.part('lid', lid);
lidPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

const selectorPart = asm.part('selector', selector);
selectorPart.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

const doserPart = asm.part('doser', doser);
doserPart.connector('tapAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });

const dsrServoPart = asm.part('servo-doser', servoDoser);
dsrServoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [TAP_X - 5.4, -32, TAP_Z] } });

const selServoPart = asm.part('servo-selector', servoSelector);
selServoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 5.4, -18.5] } });

// Both rotors are enclosed by design (disc inside the shell, tube inside
// its bore) — declare that to Gate 4 instead of faking fork daylight.
asm.mate('select', 'body.selectorAxis', 'selector.axis', 'revolute', { pose: selectorDeg, limitsDeg: [0, 300], exposure: 'concealed' });
asm.mate('tap', 'body.tapAxis', 'doser.tapAxis', 'revolute', { pose: doserAngleDeg, limitsDeg: [0, 180], exposure: 'concealed' });
asm.mate('block-fit', 'body.blockSeat', 'block.seat', 'fastened');
asm.mate('lid-fit', 'block.lidSeat', 'lid.seat', 'fastened');
asm.mate('dsr-servo-fix', 'body.dsrMount', 'servo-doser.mount', 'fastened');
asm.mate('sel-servo-fix', 'body.selMount', 'servo-selector.mount', 'fastened');

return asm.solvedModel({});
