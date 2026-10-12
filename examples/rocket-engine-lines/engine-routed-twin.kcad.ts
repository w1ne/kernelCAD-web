// examples/rocket-engine-lines/engine-routed.kcad.ts
//
// A generic gas-generator kerosene / liquid-oxygen engine display model,
// with hand-authored fluid lines (illustrative routing assembly). Every part that will take a line carries a fluid
// port: an axis connector with `port: { system, od }` on a boss or flange that
// is part of the part. Hand-authored hollow tubes connect the declared ports.
//
// Directions: the engine axis is Z. Forward (toward the vehicle) is +Z and aft
// (the nozzle exit) is -Z; Z = 0 is the throat plane. The turbopump side is
// +X. Azimuth runs from +X toward +Y.
//
// Sizes come from the sizing table in README.md: a 230 mm throat, a 920 mm
// exit (expansion ratio 16), an 80 % bell 1035 mm long and a 370 mm chamber.
// Units are mm.
//
// Run with (after `npm run build:cli`):
//   node dist/cli/index.js evaluate examples/rocket-engine-lines/engine-routed.kcad.ts --json
//   node dist/cli/index.js validate examples/rocket-engine-lines/engine-routed.kcad.ts
//   node dist/cli/index.js interference examples/rocket-engine-lines/engine-routed.kcad.ts
//   node dist/cli/index.js render examples/rocket-engine-lines/engine-routed.kcad.ts --preset publish --no-watermark -o engine-routed.png

type V3 = [number, number, number];

// --- Small helpers -----------------------------------------------------------

const DEG = Math.PI / 180;
/** Point at radius r and azimuth az (degrees from +X toward +Y), height z. */
const polar = (r: number, azDeg: number, z: number): V3 => [r * Math.cos(azDeg * DEG), r * Math.sin(azDeg * DEG), z];
/** Ring about the engine axis: rectangle rIn..rOut by z0..z1, revolved. */
const ring = (rIn: number, rOut: number, z0: number, z1: number) =>
  path().moveTo(rIn, z0).lineTo(rOut, z0).lineTo(rOut, z1).lineTo(rIn, z1).close().revolve();
/** Cylinder of radius r along +X from x0 to x1, on the X axis. */
const xCyl = (r: number, x0: number, x1: number) => cylinder(x1 - x0, r).rotateY(90).translate(x0, 0, 0);
/** Cylinder of radius r along +Y from y0 to y1, on the Y axis. */
const yCyl = (r: number, y0: number, y1: number) => cylinder(y1 - y0, r).rotateX(-90).translate(0, y0, 0);
/** Cylinder of radius r along +Z from z0 to z1 at (x, y). */
const zCyl = (r: number, x: number, y: number, z0: number, z1: number) => cylinder(z1 - z0, r).translate(x, y, z0);
/** Round bar of radius r from p0 to p1. */
const rod = (p0: V3, p1: V3, r: number) => {
  const d: V3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return cylinder(Math.hypot(d[0], d[1], d[2]), r).alongAxis(d).translate(p0[0], p0[1], p0[2]);
};
const port = (system: string, od: number) => ({ system, od });
const axisPort = (origin: V3, axis: V3, system: string, od: number) => ({
  type: 'axis' as const,
  origin: { kind: 'vec3' as const, value: origin },
  axis,
  port: port(system, od),
});

// Tube outer diameters per service (README, line sizes).
const OD_LOX_MAIN = 114.3;
const OD_FUEL_MAIN = 88.9;
const OD_LOX_GG = 25.4;
const OD_FUEL_GG = 19.05;
const OD_ACTUATOR = 12.7;
const OD_HOT_GAS = 101.6;
const OD_EXHAUST = 203.2;
const OD_IGNITER = 6.35;
const OD_PILOT = 6.35;
const OD_HELIUM = 9.525;

// --- Thrust chamber contour --------------------------------------------------

const R_THROAT = 115;
const R_EXIT = 460;
const R_CHAMBER = 185;
const WALL = 12;
const Z_INJECTOR = 500;
const BELL_LENGTH = 1035;
const Z_EXIT = -BELL_LENGTH;
const R_OUT_CHAMBER = R_CHAMBER + WALL;

/** Inside contour from the end of the chamber cylinder to the exit, as [r, z]. */
function innerContour(): { points: [number, number][]; zCylinderEnd: number } {
  const pts: [number, number][] = [];
  const conv = 30 * DEG;
  const rUp = 1.5 * R_THROAT;
  const rDown = 0.382 * R_THROAT;
  const rFillet = 120;
  // Upstream throat arc, from the cone down to the throat.
  const coneEnd: [number, number] = [R_THROAT + rUp * (1 - Math.cos(conv)), rUp * Math.sin(conv)];
  // Chamber fillet: tangent to the cylinder at zFillet, tangent to the cone at 30 degrees.
  const filletEndR = R_CHAMBER - rFillet * (1 - Math.cos(conv));
  const zFilletEnd = coneEnd[1] + (filletEndR - coneEnd[0]) / Math.tan(conv);
  const zFillet = zFilletEnd + rFillet * Math.sin(conv);
  for (let i = 1; i <= 4; i++) {
    const b = (conv * i) / 4;
    pts.push([R_CHAMBER - rFillet * (1 - Math.cos(b)), zFillet - rFillet * Math.sin(b)]);
  }
  for (let i = 5; i >= 0; i--) {
    const a = (conv * i) / 6;
    pts.push([R_THROAT + rUp * (1 - Math.cos(a)), rUp * Math.sin(a)]);
  }
  // Downstream throat arc to the bell start angle.
  const thetaN = 30 * DEG;
  const thetaE = 10 * DEG;
  for (let i = 1; i <= 3; i++) {
    const a = (thetaN * i) / 3;
    pts.push([R_THROAT + rDown * (1 - Math.cos(a)), -rDown * Math.sin(a)]);
  }
  // Bell: a parabola (quadratic Bezier) from the arc end to the exit, tangent
  // to the start angle at one end and the exit angle at the other.
  const n = pts[pts.length - 1];
  const e: [number, number] = [R_EXIT, Z_EXIT];
  const u = (e[0] - n[0] - Math.tan(thetaE) * (n[1] - e[1])) / (Math.tan(thetaN) - Math.tan(thetaE));
  const c: [number, number] = [n[0] + Math.tan(thetaN) * u, n[1] - u];
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const k0 = (1 - t) * (1 - t);
    const k1 = 2 * (1 - t) * t;
    const k2 = t * t;
    pts.push([k0 * n[0] + k1 * c[0] + k2 * e[0], k0 * n[1] + k1 * c[1] + k2 * e[1]]);
  }
  return { points: pts, zCylinderEnd: zFillet };
}

const contour = innerContour();
const Z_CYL_END = contour.zCylinderEnd;
/** Inside contour including the cylinder end point. */
const INNER: [number, number][] = [[R_CHAMBER, Z_CYL_END], ...contour.points];
/** Outside contour: the inside one moved out along its normal by `d`. */
function offsetContour(d: number): [number, number][] {
  return INNER.map((p, i) => {
    const a = INNER[Math.max(0, i - 1)];
    const b = INNER[Math.min(INNER.length - 1, i + 1)];
    const tr = b[0] - a[0];
    const tz = b[1] - a[1];
    const len = Math.hypot(tr, tz);
    // Travelling aft (z falling), the outward normal is (-tz, tr) / len.
    return i === 0 ? [p[0] + d, p[1]] : [p[0] - (tz / len) * d, p[1] + (tr / len) * d];
  });
}
const OUTER = offsetContour(WALL);
/** Outside radius of the wall at height z (linear between contour points). */
function outerRadius(z: number): number {
  if (z >= Z_CYL_END) return R_OUT_CHAMBER;
  for (let i = 1; i < OUTER.length; i++) {
    const a = OUTER[i - 1];
    const b = OUTER[i];
    if (z <= a[1] && z >= b[1]) return a[0] + ((b[0] - a[0]) * (a[1] - z)) / (a[1] - b[1]);
  }
  return OUTER[OUTER.length - 1][0];
}

// --- Palette: sober metal tones, one per system or structure ----------------
// Finishes are applied once per part, after its booleans. The publish render
// shows them as metal; the default review render shows metal finishes nearly
// black, so review renders of this file use the publish look.

const C_CHAMBER = '#7b8088';   // nickel-alloy jacket
const C_MANIFOLD = '#9aa0a8';
const C_DOME = '#c2c6cc';
const C_STRUCTURE = '#3f444c';
const C_STEEL = '#7c838c';
const C_PUMP = '#9ba1a9';
const C_HOT = '#6e5f55';       // hot-gas parts
const C_BRACKET = '#4d535c';
const C_LOX_VALVE = '#5f7890';   // oxygen side, blue-grey
const C_FUEL_VALVE = '#8f7650';  // fuel side, bronze
const C_GG_VALVE = '#74707c';
const C_ACTUATOR = '#8a9099';
const C_CARTRIDGE = '#a58a4a';
const C_BOTTLE = '#2e3136';      // overwrapped bottle
const C_BLOCK = '#566270';

// --- Stations (constants: a connector origin does not take a param) ---------

const Z_COLLECTOR = 452;       // coolant collector band, mid height
const Z_IGNITER = 330;
const AZ_IGNITER = -60;
const AZ_RETURN = 135;         // coolant return jumper, between the two actuators
const R_RETURN = 285;
const Z_RETURN_OUT = 478;
const Z_MANIFOLD = -990;
const R_MANIFOLD_TUBE = 36;
const MANIFOLD_INLET: V3 = [320, 460, -930];
const AZ_ACTUATORS = [90, 180];
const R_ACT_LOWER = 262;
const Z_ACT_LOWER = 452;
const R_ACT_UPPER = 330;
const Z_ACT_UPPER = 895;

/** Fork for an actuator eye: two plates along +X with a pin hole at (rPin, zPin). */
const fork = (rFrom: number, rPin: number, zPin: number, halfHeight: number) =>
  box(rPin + 24 - rFrom, 12, 2 * halfHeight).translate(rFrom, 14, zPin - halfHeight)
    .union(box(rPin + 24 - rFrom, 12, 2 * halfHeight).translate(rFrom, -26, zPin - halfHeight))
    .subtract(yCyl(9, -40, 40).translate(rPin, 0, zPin));

const asm = assembly('rocket-engine-routed');

// --- chamber: chamber, throat and bell, one revolved wall --------------------

// Raised bands on the outside of the wall, as [zLow, zHigh, height]. They are
// steps in the revolved profile itself, so the wall, its bands and its flange
// are one revolve with no booleans.
const Z_LAND = -950;           // below this the outside is a straight cone for the manifold to sit on
const WALL_BANDS: [number, number, number][] = [
  [-871, -849, 12], [-641, -619, 12], [-411, -389, 12], [-191, -169, 12],   // bell stiffening bands
  [-26, 26, 16],                                                            // throat ring
  [Z_COLLECTOR - 20, Z_COLLECTOR + 20, 25],                                 // coolant collector
  [Z_INJECTOR - 22, Z_INJECTOR, 28],                                        // injector flange
];

function chamberShape() {
  const exitOuter = OUTER[OUTER.length - 1];
  let p = path()
    .moveTo(R_CHAMBER, Z_INJECTOR)
    .lineTo(R_CHAMBER, Z_CYL_END)
    .spline(INNER)
    .lineTo(exitOuter[0], exitOuter[1])
    .lineTo(outerRadius(Z_LAND), Z_LAND);
  // Walk up the outside: smooth runs between bands, a step out and back at each band.
  let run: [number, number][] = [[outerRadius(Z_LAND), Z_LAND]];
  const flush = () => {
    if (run.length >= 3) p = p.spline(run);
    else if (run.length === 2) p = p.lineTo(run[1][0], run[1][1]);
    run = [run[run.length - 1]];
  };
  let zNow = Z_LAND;
  const smoothTo = (z: number) => {
    // The cylinder is a straight line, not part of a spline run.
    if (zNow < Z_CYL_END && z > Z_CYL_END) smoothTo(Z_CYL_END);
    for (const q of [...OUTER].reverse()) if (q[1] > zNow + 1 && q[1] < z - 1) run.push(q);
    run.push([outerRadius(z), z]);
    flush();
    zNow = z;
  };
  for (const [z0, z1, h] of WALL_BANDS) {
    smoothTo(z0);
    p = p.lineTo(outerRadius(z0) + h, z0).lineTo(outerRadius(z1) + h, z1);
    if (z1 < Z_INJECTOR) p = p.lineTo(outerRadius(z1), z1);
    run = [[outerRadius(z1), z1]];
    zNow = z1;
  }
  const wall = p.close().revolve();

  // Coolant return boss on the collector band, facing forward.
  const returnBoss = zCyl(52, R_RETURN, 0, Z_COLLECTOR - 20, Z_RETURN_OUT)
    .union(box(R_RETURN - 200, 70, 40).translate(200, -35, Z_COLLECTOR - 20))
    .rotateZ(AZ_RETURN);

  // Igniter boss, radial.
  const igniterBoss = xCyl(14, R_OUT_CHAMBER - 6, 225).translate(0, 0, Z_IGNITER).rotateZ(AZ_IGNITER);

  // Actuator forks on the collector band.
  const forks = AZ_ACTUATORS.map((az) => fork(210, R_ACT_LOWER, Z_ACT_LOWER, 20).rotateZ(az));

  return wall.union(returnBoss, igniterBoss, ...forks).finish('aluminium', { color: C_CHAMBER });
}

const chamber = asm.part('chamber', chamberShape(), { at: [0, 0, 0] })
  .connector('igniter', axisPort(polar(225, AZ_IGNITER, Z_IGNITER), polar(1, AZ_IGNITER, 0), 'igniter', OD_IGNITER))
  .connector('coolant-out', axisPort(polar(R_RETURN, AZ_RETURN, Z_RETURN_OUT), [0, 0, 1], 'fuel', OD_FUEL_MAIN));

// --- coolant-manifold: inlet ring at the nozzle exit -------------------------

function manifoldShape() {
  // The ring sits on the straight cone at the end of the bell: its inner edge
  // is a piece of the same line, so the two parts touch without sharing volume.
  const exitOuter = OUTER[OUTER.length - 1];
  const land = (z: number) =>
    exitOuter[0] + ((outerRadius(Z_LAND) - exitOuter[0]) * (z - exitOuter[1])) / (Z_LAND - exitOuter[1]);
  const zA = Z_MANIFOLD - 32;
  const zB = Z_MANIFOLD + 32;
  const ringBody = path()
    .moveTo(land(zA), zA)
    .threePointsArc(land(zB), zB, land(Z_MANIFOLD) + 2 * R_MANIFOLD_TUBE, Z_MANIFOLD)
    .close()
    .revolve();
  const inlet = zCyl(52, MANIFOLD_INLET[0], MANIFOLD_INLET[1], Z_MANIFOLD, MANIFOLD_INLET[2]);
  return ringBody.union(inlet).finish('aluminium', { color: C_MANIFOLD });
}

const manifold = asm.part('coolant-manifold', manifoldShape(), { at: [0, 0, 0] })
  .connector('fuel-in', axisPort(MANIFOLD_INLET, [0, 0, 1], 'fuel', OD_FUEL_MAIN));

// --- injector-dome: injector body, oxygen dome and inlet elbow ---------------

const Z_DOME_TOP = 665;
const LOX_IN: V3 = [160, -315, 570];
const AZ_DOME_PURGE = 255;

function domeShape() {
  const body = path()
    .moveTo(0, Z_INJECTOR)
    .lineTo(225, Z_INJECTOR)
    .lineTo(225, Z_INJECTOR + 22)
    .lineTo(205, Z_INJECTOR + 22)
    .lineTo(205, 590)
    .lineTo(190, 590)
    .threePointsArc(75, Z_DOME_TOP, 143.6, 644.6)
    .lineTo(0, Z_DOME_TOP)
    .close()
    .revolve();
  // Oxygen inlet elbow: a neck out of the dome toward -Y, turning to face +X.
  const elbowX = 94; // 66 mm knuckle terminates at the 160 mm flange face
  const neck = yCyl(66, LOX_IN[1], -110).translate(elbowX, 0, LOX_IN[2]);
  const knuckle = sphere(66).translate(elbowX, LOX_IN[1], LOX_IN[2]);
  const stub = xCyl(66, elbowX, LOX_IN[0]).translate(0, LOX_IN[1], LOX_IN[2]);
  const loxFlange = xCyl(84, LOX_IN[0] - 14, LOX_IN[0]).translate(0, LOX_IN[1], LOX_IN[2]);
  // Fuel inlet lug: reaches out over the coolant return boss and faces aft.
  const fuelLug = zCyl(52, R_RETURN, 0, 550, 612)
    .union(box(R_RETURN - 190, 70, 50).translate(190, -35, 560))
    .rotateZ(AZ_RETURN);
  const purgeBoss = xCyl(11, 200, 230).translate(0, 0, 556).rotateZ(AZ_DOME_PURGE);
  return body.union(neck, knuckle, stub, loxFlange, fuelLug, purgeBoss).finish('aluminium', { color: C_DOME });
}

const dome = asm.part('injector-dome', domeShape(), { at: [0, 0, 0] })
  .connector('lox-in', axisPort(LOX_IN, [1, 0, 0], 'lox', OD_LOX_MAIN))
  .connector('fuel-in', axisPort(polar(R_RETURN, AZ_RETURN, 550), [0, 0, -1], 'fuel', OD_FUEL_MAIN))
  .connector('purge', axisPort(polar(230, AZ_DOME_PURGE, 556), polar(1, AZ_DOME_PURGE, 0), 'pneumatic', OD_PILOT));

// --- gimbal-mount: two yokes and a cross on the dome crown -------------------

const Z_GIMBAL_TOP = 785;

function gimbalShape() {
  const zc = 725;
  const base = zCyl(72, 0, 0, Z_DOME_TOP, Z_DOME_TOP + 22);
  const lowerEars = box(76, 18, 62).translate(-38, 44, Z_DOME_TOP + 20)
    .union(box(76, 18, 62).translate(-38, -62, Z_DOME_TOP + 20));
  const cross = sphere(36).translate(0, 0, zc)
    .union(yCyl(15, -66, 66).translate(0, 0, zc), xCyl(15, -66, 66).translate(0, 0, zc));
  const upperEars = box(18, 76, 62).translate(44, -38, zc - 20)
    .union(box(18, 76, 62).translate(-62, -38, zc - 20));
  const cap = zCyl(72, 0, 0, Z_GIMBAL_TOP - 20, Z_GIMBAL_TOP);
  return base.union(lowerEars, cross, upperEars, cap).finish('steel', { color: C_STEEL });
}

asm.part('gimbal-mount', gimbalShape(), { at: [0, 0, 0] });

// --- thrust-frame: hub, four legs and the vehicle ring -----------------------

const Z_FRAME_RING = 945;
const R_FRAME_RING = 330;

function thrustFrameShape() {
  const hub = zCyl(84, 0, 0, Z_GIMBAL_TOP, Z_GIMBAL_TOP + 34);
  const vehicleRing = torus(R_FRAME_RING, 18).translate(0, 0, Z_FRAME_RING);
  const legs = [45, 135, 225, 315].map((az) =>
    rod(polar(50, az, Z_GIMBAL_TOP + 17), polar(R_FRAME_RING, az, Z_FRAME_RING), 16));
  const pads = [45, 135, 225, 315].map((az) => {
    const p = polar(R_FRAME_RING, az, 0);
    return zCyl(30, p[0], p[1], Z_FRAME_RING, Z_FRAME_RING + 30);
  });
  // Forks for the actuator upper eyes, hanging under the ring.
  const forks = AZ_ACTUATORS.map((az) =>
    fork(R_ACT_UPPER - 24, R_ACT_UPPER, Z_ACT_UPPER, 26)
      .union(box(48, 52, 26).translate(R_ACT_UPPER - 24, -26, Z_ACT_UPPER + 20))
      .rotateZ(az));
  return hub.union(vehicleRing, ...legs, ...pads, ...forks).finish('paint-matte', { color: C_STRUCTURE });
}

asm.part('thrust-frame', thrustFrameShape(), { at: [0, 0, 0] });

// --- Placement parameters ----------------------------------------------------
// Parts beside the chamber are built in their own frame and placed with `at`,
// so moving a station moves the part and every port on it.

// The pump mount clamps the chamber cylinder between the bottle bracket and the
// coolant collector, which is what limits PumpStation.
const pumpStation = param('PumpStation', 310, { unit: 'mm', min: 270, max: 316, description: 'height of the fuel pump volute above the throat plane' });
const pumpOffset = param('PumpOffset', 470, { unit: 'mm', min: 450, max: 560, description: 'distance of the pump shaft from the engine axis' });

// --- turbopump: oxygen pump, fuel pump and turbine on one shaft --------------
// Own frame: shaft on Z, origin at the fuel volute mid plane. Oxygen pump
// forward, turbine aft; both volutes discharge on the chamber side.

const PUMP_LOX_Z = 260;        // oxygen volute mid plane
const PUMP_TURBINE_Z = -215;   // turbine inlet manifold mid plane
const PUMP_AFT_Z = -350;       // turbine outlet face
const PUMP_DISCHARGE_X = -150; // both discharge lines leave on this tangent
const PUMP_FUEL_OUT_Y = 320;    // fuel discharge duct length, so the valve sits close to its flange
const PUMP_GG_X = 150;         // gas-generator feed bosses
const PUMP_TURBINE_IN_X = 150;
const PUMP_TURBINE_IN_Y = -175; // extend the inlet boss beyond the manifold torus

/** Volute scroll about Z: four 80-degree pieces of growing section, ending at azimuth 180.
 *  (Eight pieces look smoother but each piece costs about a second of boolean time.) */
function scroll() {
  const pieces = [];
  for (let i = 0; i < 4; i++) {
    const r = 24 + 10.5 * i;
    pieces.push(path().circle(95 + r, 0, r).revolve({ angleDeg: 80 }).rotateZ(-140 + 80 * i));
  }
  return pieces;
}
/** Discharge cone along +Z from radius r0 to r1 over `len`, with an end flange. */
const discharge = (r0: number, r1: number, len: number, flangeR: number) =>
  path().moveTo(0, 0).lineTo(r0, 0).lineTo(r1, len - 14).lineTo(flangeR, len - 14).lineTo(flangeR, len).lineTo(0, len).close().revolve();

function turbopumpShape() {
  // Shaft stack as one revolve: oxygen inlet (open), oxygen pump, bearing
  // housing, fuel pump, shaft housing, turbine, exhaust outlet (open).
  const stack = path()
    .moveTo(0, 330).lineTo(74, 330).lineTo(74, 390).lineTo(112, 390).lineTo(112, 376).lineTo(86, 376)
    .lineTo(86, 305).lineTo(110, 305).lineTo(110, 215).lineTo(80, 215).lineTo(80, 45).lineTo(110, 45)
    .lineTo(110, -45).lineTo(75, -45).lineTo(75, -150).lineTo(125, -150).lineTo(160, -168).lineTo(160, -285)
    .lineTo(104, -300).lineTo(104, -336).lineTo(128, -336).lineTo(128, PUMP_AFT_Z).lineTo(92, PUMP_AFT_Z)
    .lineTo(92, -290).lineTo(0, -290)
    .close()
    .revolve();

  const loxScroll = scroll().map((s) => s.translate(0, 0, PUMP_LOX_Z));
  const fuelScroll = scroll().map((s) => s.reflect('xz'));
  const loxOut = discharge(55, 62, 170, 80).rotateX(90).translate(PUMP_DISCHARGE_X, 0, PUMP_LOX_Z);
  const fuelOut = discharge(55, 50, PUMP_FUEL_OUT_Y, 68).rotateX(-90).translate(PUMP_DISCHARGE_X, 0, 0);

  // Gas-generator feed bosses on the outboard side of each volute, facing -Y.
  const ggLox = yCyl(22, -205, -40).translate(PUMP_GG_X, 0, PUMP_LOX_Z);
  const ggFuel = yCyl(18, -205, -40).translate(PUMP_GG_X, 0, 0);

  // Fuel inlet: side entry between the pumps, turned forward.
  const fuelInlet = rod([40, 40, 160], [170, 170, 160], 46)
    .union(sphere(46).translate(170, 170, 160), zCyl(46, 170, 170, 160, 390), zCyl(64, 170, 170, 376, 390))
    .subtract(zCyl(36, 170, 170, 340, 391));

  // Actuator supply and return pad on the bearing housing, facing +Y.
  const actuatorPad = box(90, 50, 80).translate(-45, 60, 118)
    .union(...[-22, 22].flatMap((x) => [138, 178].map((z) => yCyl(11, 108, 124).translate(x, 0, z))));

  // Turbine inlet manifold with a tangential inlet facing -Y.
  const turbineManifold = torus(150, 44).translate(0, 0, PUMP_TURBINE_Z)
    .union(
      yCyl(52, PUMP_TURBINE_IN_Y, 0).translate(PUMP_TURBINE_IN_X, 0, PUMP_TURBINE_Z),
      yCyl(66, PUMP_TURBINE_IN_Y, PUMP_TURBINE_IN_Y + 14).translate(PUMP_TURBINE_IN_X, 0, PUMP_TURBINE_Z),
    );

  return stack
    .union(...loxScroll, ...fuelScroll, loxOut, fuelOut, ggLox, ggFuel, fuelInlet, actuatorPad, turbineManifold)
    .finish('aluminium', { color: C_PUMP });
}

const turbopump = asm.part('turbopump', turbopumpShape(), { at: [pumpOffset, 0, pumpStation] })
  .connector('lox-out', axisPort([PUMP_DISCHARGE_X, -170, PUMP_LOX_Z], [0, -1, 0], 'lox', OD_LOX_MAIN))
  .connector('fuel-out', axisPort([PUMP_DISCHARGE_X, PUMP_FUEL_OUT_Y, 0], [0, 1, 0], 'fuel', OD_FUEL_MAIN))
  .connector('gg-lox', axisPort([PUMP_GG_X, -205, PUMP_LOX_Z], [0, -1, 0], 'lox', OD_LOX_GG))
  .connector('gg-fuel', axisPort([PUMP_GG_X, -205, 0], [0, -1, 0], 'fuel', OD_FUEL_GG))
  .connector('turbine-in', axisPort([PUMP_TURBINE_IN_X, PUMP_TURBINE_IN_Y, PUMP_TURBINE_Z], [0, -1, 0], 'hot-gas', OD_HOT_GAS))
  .connector('turbine-out', axisPort([0, 0, PUMP_AFT_Z], [0, 0, -1], 'hot-gas', OD_EXHAUST))
  .connector('act-supply-1', axisPort([-22, 124, 178], [0, 1, 0], 'fuel', OD_ACTUATOR))
  .connector('act-supply-2', axisPort([22, 124, 178], [0, 1, 0], 'fuel', OD_ACTUATOR))
  .connector('act-return-1', axisPort([-22, 124, 138], [0, 1, 0], 'fuel', OD_ACTUATOR))
  .connector('act-return-2', axisPort([22, 124, 138], [0, 1, 0], 'fuel', OD_ACTUATOR));

// --- turbine-exhaust-collar: flexible collar on the turbine outlet -----------
// Own frame: origin on the turbine outlet face, collar hanging aft. The exhaust
// duct starts at its `out` port and runs down beside the bell.

const COLLAR_LENGTH = 170;

function collarShape() {
  let p = path().moveTo(95, 0).lineTo(128, 0).lineTo(128, -14).lineTo(104, -14);
  for (const z of [-40, -72, -104]) p = p.lineTo(104, z).lineTo(116, z).lineTo(116, z - 16).lineTo(104, z - 16);
  return p
    .lineTo(104, -COLLAR_LENGTH + 14).lineTo(122, -COLLAR_LENGTH + 14).lineTo(122, -COLLAR_LENGTH).lineTo(95, -COLLAR_LENGTH)
    .close()
    .revolve()
    .finish('steel', { color: C_HOT });
}

const collar = asm.part('turbine-exhaust-collar', collarShape(), { at: [pumpOffset, 0, pumpStation.add(PUMP_AFT_Z)] })
  .connector('out', axisPort([0, 0, -COLLAR_LENGTH], [0, 0, -1], 'hot-gas', OD_EXHAUST));

// --- gas-generator: small combustor in line with the turbine inlet -----------
// Own frame: origin on its outlet face, body running toward -Y. Propellants
// enter through two bosses on top, the igniter through the head.

const GG_LOX_Y = -140;        // feed bosses on top of the body
const GG_FUEL_Y = -80;
const GG_GAP = 65;             // straight duct between generator outlet and turbine inlet

function gasGeneratorShape() {
  const body = yCyl(52, -50, 0)
    .union(yCyl(66, -14, 0), yCyl(65, -210, -50), yCyl(78, -225, -210), yCyl(55, -250, -225));
  const feeds = [zCyl(17, 0, GG_LOX_Y, 40, 80), zCyl(15, 0, GG_FUEL_Y, 40, 80)];
  const igniter = yCyl(10, -262, -250);
  const purge = zCyl(10, 0, -150, -85, -60);
  return body.union(...feeds, igniter, purge).finish('steel', { color: C_HOT });
}

const gasGenerator = asm.part('gas-generator', gasGeneratorShape(), {
  at: [pumpOffset.add(PUMP_TURBINE_IN_X), PUMP_TURBINE_IN_Y - GG_GAP, pumpStation.add(PUMP_TURBINE_Z)],
})
  .connector('out', axisPort([0, 0, 0], [0, 1, 0], 'hot-gas', OD_HOT_GAS))
  .connector('lox-in', axisPort([0, GG_LOX_Y, 80], [0, 0, 1], 'lox', OD_LOX_GG))
  .connector('fuel-in', axisPort([0, GG_FUEL_Y, 80], [0, 0, 1], 'fuel', OD_FUEL_GG))
  .connector('igniter', axisPort([0, -262, 0], [0, -1, 0], 'igniter', OD_IGNITER))
  .connector('purge', axisPort([0, -150, -85], [0, 0, -1], 'pneumatic', OD_PILOT));

// --- pump-mount: two link plates from the chamber to the pump shaft housing --
// Own frame: engine axis on Z, origin at the pump station. Each plate has an
// eye round the chamber cylinder and an eye round the pump housing; a web
// joins the two plates.

function pumpMountShape() {
  const plate = (z0: number) =>
    ring(R_OUT_CHAMBER, 232, z0, z0 + 14)
      .union(
        extrudePolygon([[205, -55], [pumpOffset.subtract(80), -55], [pumpOffset.subtract(80), 55], [205, 55]], 14).translate(0, 0, z0),
        ring(80, 110, z0, z0 + 14).translate(pumpOffset, 0, 0),
      );
  // Web between the two plates, so the mount is one I-section bracket.
  const web = extrudePolygon([[240, -8], [pumpOffset.subtract(112), -8], [pumpOffset.subtract(112), 8], [240, 8]], 54).translate(0, 0, 60);
  return plate(60).union(plate(100), web).finish('paint-matte', { color: C_BRACKET });
}

asm.part('pump-mount', pumpMountShape(), { at: [0, 0, pumpStation] });

// --- Valves ------------------------------------------------------------------
// Each valve follows the pump (it sits on a pump discharge line) and has one
// station of its own along that line.

const mlvStation = param('MainLoxValveStation', -315, { unit: 'mm', description: 'main oxygen valve position along the pump discharge line (Y)' });
const mfvStation = param('MainFuelValveStation', 460, { unit: 'mm', description: 'main fuel valve position along the pump discharge line (Y)' });
const ggValveStation = param('GgValveStation', -285, { unit: 'mm', description: 'gas-generator valve inlet face position along the feed lines (Y)' });

/** Angle valve body about the origin: a ball, an inlet stub along `inAxis` and
 *  an outlet stub along `outAxis`, each ending in a flange `reach` from the centre. */
function angleValve(ballR: number, stubR: number, flangeR: number, reach: number, inAxis: V3, outAxis: V3) {
  const stub = (axis: V3) =>
    cylinder(reach, stubR).union(cylinder(14, flangeR).translate(0, 0, reach - 14)).alongAxis(axis);
  return sphere(ballR).union(stub(inAxis), stub(outAxis));
}

// main-lox-valve: inlet faces the pump (+Y), outlet faces the dome (-X).
const MLV_REACH = 80;
function mainLoxValveShape() {
  const pilot = zCyl(40, 0, 0, 0, 170).union(zCyl(46, 0, 0, 150, 170), yCyl(9, -55, 0).translate(0, 0, 130));
  return angleValve(78, 66, 82, MLV_REACH, [0, 1, 0], [-1, 0, 0]).union(pilot).finish('anodized', { color: C_LOX_VALVE });
}
const mainLoxValve = asm.part('main-lox-valve', mainLoxValveShape(), {
  at: [pumpOffset.add(PUMP_DISCHARGE_X), mlvStation, pumpStation.add(PUMP_LOX_Z)],
})
  .connector('in', axisPort([0, MLV_REACH, 0], [0, 1, 0], 'lox', OD_LOX_MAIN))
  .connector('out', axisPort([-MLV_REACH, 0, 0], [-1, 0, 0], 'lox', OD_LOX_MAIN))
  .connector('pneumatic', axisPort([0, -55, 130], [0, -1, 0], 'pneumatic', OD_PILOT));

// main-fuel-valve: inlet faces the pump (-Y), outlet faces aft toward the manifold.
const MFV_REACH = 70;
function mainFuelValveShape() {
  const pilot = xCyl(34, 0, 150).union(xCyl(40, 132, 150), zCyl(9, 110, 0, 0, 46));
  return angleValve(62, 52, 68, MFV_REACH, [0, -1, 0], [0, 0, -1]).union(pilot).finish('anodized', { color: C_FUEL_VALVE });
}
const mainFuelValve = asm.part('main-fuel-valve', mainFuelValveShape(), {
  at: [pumpOffset.add(PUMP_DISCHARGE_X), mfvStation, pumpStation],
})
  .connector('in', axisPort([0, -MFV_REACH, 0], [0, -1, 0], 'fuel', OD_FUEL_MAIN))
  .connector('out', axisPort([0, 0, -MFV_REACH], [0, 0, -1], 'fuel', OD_FUEL_MAIN))
  .connector('pneumatic', axisPort([110, 0, 46], [0, 0, 1], 'pneumatic', OD_PILOT));

// gg-valve: two poppet bodies on one actuator, oxygen above fuel. Own frame:
// origin on the inlet face plane, midway between the two feed lines. Inlets
// face the pump (+Y); outlets face aft, above the generator's feed bosses.
const GG_VALVE_HALF = PUMP_LOX_Z / 2;
const GGV_LOX_OUT: V3 = [0, PUMP_TURBINE_IN_Y - GG_GAP + GG_LOX_Y + 285, GG_VALVE_HALF - 50];
const GGV_FUEL_OUT: V3 = [0, PUMP_TURBINE_IN_Y - GG_GAP + GG_FUEL_Y + 285, -GG_VALVE_HALF - 50];
function ggValveShape() {
  const loxBody = yCyl(32, -130, 0).union(yCyl(40, -12, 0)).translate(0, 0, GG_VALVE_HALF);
  const fuelBody = yCyl(32, -60, 0).union(yCyl(40, -12, 0)).translate(0, 0, -GG_VALVE_HALF);
  const loxOut = zCyl(17, 0, GGV_LOX_OUT[1], GGV_LOX_OUT[2], GG_VALVE_HALF);
  const fuelOut = zCyl(15, 0, GGV_FUEL_OUT[1], GGV_FUEL_OUT[2], -GG_VALVE_HALF);
  const spine = box(22, 50, 2 * GG_VALVE_HALF).translate(28, -55, -GG_VALVE_HALF);
  const pilot = xCyl(38, 45, 120).union(xCyl(9, 120, 135)).translate(0, -30, 0);
  return loxBody.union(fuelBody, loxOut, fuelOut, spine, pilot).finish('anodized', { color: C_GG_VALVE });
}
const ggValve = asm.part('gg-valve', ggValveShape(), {
  at: [pumpOffset.add(PUMP_GG_X), ggValveStation, pumpStation.add(GG_VALVE_HALF)],
})
  .connector('lox-in', axisPort([0, 0, GG_VALVE_HALF], [0, 1, 0], 'lox', OD_LOX_GG))
  .connector('fuel-in', axisPort([0, 0, -GG_VALVE_HALF], [0, 1, 0], 'fuel', OD_FUEL_GG))
  .connector('lox-out', axisPort(GGV_LOX_OUT, [0, 0, -1], 'lox', OD_LOX_GG))
  .connector('fuel-out', axisPort(GGV_FUEL_OUT, [0, 0, -1], 'fuel', OD_FUEL_GG))
  .connector('pneumatic', axisPort([135, -30, 0], [1, 0, 0], 'pneumatic', OD_PILOT));

// --- Thrust-vector actuators -------------------------------------------------
// Each runs from a fork on the collector band up and out to a fork under the
// frame ring, 90 degrees apart. Own frame: origin at the lower pin.

const ACT_RISE = Z_ACT_UPPER - Z_ACT_LOWER;
const ACT_RUN = R_ACT_UPPER - R_ACT_LOWER;
const ACT_LENGTH = Math.hypot(ACT_RISE, ACT_RUN);
const ACT_TILT = Math.atan2(ACT_RUN, ACT_RISE) / DEG;
const ACT_PORT_STATIONS = { supply: 370, return: 230 };
const ACT_PORT_REACH = 60;

/** Actuator for azimuth 90: pins along X, leaning toward +Y; ports face +X. */
function actuatorShape() {
  const eye = (z: number) => xCyl(18, -12, 12).union(xCyl(8, -30, 30)).translate(0, 0, z);
  const rodAndBody = zCyl(12, 0, 0, 10, 200)
    .union(zCyl(44, 0, 0, 185, ACT_LENGTH - 45), zCyl(48, 0, 0, 185, 200), zCyl(48, 0, 0, ACT_LENGTH - 60, ACT_LENGTH - 45))
    .union(zCyl(12, 0, 0, ACT_LENGTH - 45, ACT_LENGTH - 10));
  const bosses = [ACT_PORT_STATIONS.supply, ACT_PORT_STATIONS.return].map((z) => xCyl(11, 30, ACT_PORT_REACH).translate(0, 0, z));
  return eye(0).union(eye(ACT_LENGTH), rodAndBody, ...bosses).rotateX(-ACT_TILT).finish('aluminium', { color: C_ACTUATOR });
}
/** Where a point on the untilted actuator ends up, for azimuth 90 (turn 0) or 180 (turn 90). */
function actuatorPoint(p: V3, turnDeg: number): V3 {
  const t = ACT_TILT * DEG;
  const tilted: V3 = [p[0], p[1] * Math.cos(t) + p[2] * Math.sin(t), -p[1] * Math.sin(t) + p[2] * Math.cos(t)];
  const a = turnDeg * DEG;
  return [tilted[0] * Math.cos(a) - tilted[1] * Math.sin(a), tilted[0] * Math.sin(a) + tilted[1] * Math.cos(a), tilted[2]];
}
const actuators = AZ_ACTUATORS.map((az, i) => {
  const turn = az - 90;
  const outward = actuatorPoint([1, 0, 0], turn);
  return asm.part(`tvc-actuator-${i + 1}`, actuatorShape().rotateZ(turn), { at: polar(R_ACT_LOWER, az, Z_ACT_LOWER) })
    .connector('supply', axisPort(actuatorPoint([ACT_PORT_REACH, 0, ACT_PORT_STATIONS.supply], turn), outward, 'fuel', OD_ACTUATOR))
    .connector('return', axisPort(actuatorPoint([ACT_PORT_REACH, 0, ACT_PORT_STATIONS.return], turn), outward, 'fuel', OD_ACTUATOR));
});

// --- Igniter cartridge, helium bottle and pneumatic block --------------------
// Each hangs off the chamber cylinder on a plate bracket. The bracket is cut
// to the cylinder so it touches the wall without entering it.

const cartridgeStation = param('CartridgeStation', 190, { unit: 'mm', description: 'height of the igniter cartridge base above the throat plane' });
const bottleStation = param('BottleStation', 230, { unit: 'mm', description: 'height of the helium bottle barrel base above the throat plane' });
const blockStation = param('BlockStation', 300, { unit: 'mm', description: 'height of the pneumatic block centre above the throat plane' });

/** Plate from the part origin toward the engine axis, ending on the chamber cylinder.
 *  `xy` is the part position; z0 and thickness are in the part frame. */
function wallBracket(xy: [number, number], width: number, z0: number, thickness: number) {
  const reach = Math.hypot(xy[0], xy[1]);
  const az = Math.atan2(-xy[1], -xy[0]) / DEG;
  return box(reach - R_OUT_CHAMBER + 8, width, thickness).translate(0, -width / 2, z0).rotateZ(az)
    .subtract(zCyl(R_OUT_CHAMBER, -xy[0], -xy[1], z0 - 5, z0 + thickness + 5));
}

const CARTRIDGE_XY: [number, number] = [175, -330];
function cartridgeShape() {
  return zCyl(32, 0, 0, 0, 160)
    .union(zCyl(37, 0, 0, 0, 14), zCyl(37, 0, 0, 146, 160), zCyl(8, -16, 0, 160, 178), zCyl(8, 16, 0, 160, 178))
    .union(wallBracket(CARTRIDGE_XY, 30, 50, 12))
    .finish('brass', { color: C_CARTRIDGE });
}
const cartridge = asm.part('igniter-cartridge', cartridgeShape(), { at: [CARTRIDGE_XY[0], CARTRIDGE_XY[1], cartridgeStation] })
  .connector('out-chamber', axisPort([-16, 0, 178], [0, 0, 1], 'igniter', OD_IGNITER))
  .connector('out-gg', axisPort([16, 0, 178], [0, 0, 1], 'igniter', OD_IGNITER));

const BOTTLE_XY: [number, number] = [-310, -190];
function bottleShape() {
  return zCyl(85, 0, 0, 0, 200)
    .union(sphere(85), sphere(85).translate(0, 0, 200), zCyl(16, 0, 0, 270, 300), zCyl(22, 0, 0, 270, 284))
    .union(wallBracket(BOTTLE_XY, 44, 20, 12), wallBracket(BOTTLE_XY, 44, 80, 12))
    .finish('paint-matte', { color: C_BOTTLE });
}
const bottle = asm.part('helium-bottle', bottleShape(), { at: [BOTTLE_XY[0], BOTTLE_XY[1], bottleStation] })
  .connector('out', axisPort([0, 0, 300], [0, 0, 1], 'pneumatic', OD_HELIUM));

const BLOCK_XY: [number, number] = [-100, -300];
const BLOCK_OUTLETS = { 'out-lox-valve': -30, 'out-fuel-valve': 0, 'out-gg-valve': 30 };
const BLOCK_PURGES = { 'purge-dome': -25, 'purge-gg': 25 };
function blockShape() {
  const outlets = Object.values(BLOCK_OUTLETS).map((x) => zCyl(9, x, 0, 55, 67));
  const purges = Object.values(BLOCK_PURGES).map((x) => yCyl(9, -42, -30).translate(x, 0, 10));
  return box(90, 60, 110, true)
    .union(...outlets, ...purges, xCyl(11, -57, -45))
    .union(wallBracket(BLOCK_XY, 24, -10, 12))
    .finish('anodized', { color: C_BLOCK });
}
let block = asm.part('pneumatic-block', blockShape(), { at: [BLOCK_XY[0], BLOCK_XY[1], blockStation] })
  .connector('in', axisPort([-57, 0, 0], [-1, 0, 0], 'pneumatic', OD_HELIUM));
for (const [name, x] of Object.entries(BLOCK_OUTLETS)) block = block.connector(name, axisPort([x, 0, 67], [0, 0, 1], 'pneumatic', OD_PILOT));
for (const [name, x] of Object.entries(BLOCK_PURGES)) block = block.connector(name, axisPort([x, -42, 10], [0, -1, 0], 'pneumatic', OD_PILOT));

// --- No joints ---------------------------------------------------------------
// Every part is placed by its `at` alone. A mate decides where the part it
// places goes and ignores that part's `at`, and a connector origin cannot take
// a param, so a mate here would pin the parts that follow the stations. With
// no mates, `validate` reports the parts placed with `at` as floating (README,
// finding 4).

// --- Static illustrative supports --------------------------------------------
// These brackets give valves and generator a visible path back to the existing
// pump mount. They are solid display fabrications, with no fastening/load proof.
// Cut terminal pockets with fresh housing shapes (Shape transforms mutate):
// surface contact, no
// hidden interpenetration. The ring sits clear of the existing bottle brackets.
const supportZ = 218;
const supportSaddle = ring(R_OUT_CHAMBER, 211, supportZ, supportZ + 12);
const valveX = pumpOffset.subtract(150);
const mainValveSupport = supportSaddle.union(
  box(valveX.subtract(197), 20, 12).translate(197, -10, supportZ),
  box(20, mfvStation.subtract(60).subtract(mlvStation), 12).translate(valveX.subtract(10), mlvStation, supportZ),
  box(20, 18, pumpStation.subtract(70).subtract(supportZ)).translate(valveX.subtract(10), mfvStation.subtract(70), supportZ),
  box(20, 20, pumpStation.add(260).subtract(supportZ)).translate(valveX.subtract(10), mlvStation.subtract(10), supportZ),
).subtract(
  mainLoxValveShape().translate(valveX, mlvStation, pumpStation.add(260)),
  mainFuelValveShape().translate(valveX, mfvStation, pumpStation),
).finish('paint-matte', { color: C_BRACKET });
asm.part('main-valve-support', mainValveSupport);
// Outboard web bolts to the existing pump mount and carries the GG valve and
// combustor in side pockets; the hot-gas and feed port faces remain unobstructed.
const ggX = pumpOffset.add(150);
const ggSupportBlank = box(20, 28, 255).translate(pumpOffset.subtract(240), 42, pumpStation.subtract(155))
  .union(
    box(450, 28, 20).translate(pumpOffset.subtract(240), 42, pumpStation.subtract(155)),
    // Peripheral U bridge passes around the shaft housing, rather than
    // being severed by the contact pocket through the original straight web.
    box(20, 178, 20).translate(pumpOffset.subtract(240), 42, pumpStation.subtract(155)),
    box(450, 20, 20).translate(pumpOffset.subtract(240), 200, pumpStation.subtract(155)),
    box(20, 178, 20).translate(ggX.add(40), 42, pumpStation.subtract(155)),
    box(20, 290, 20).translate(ggX.add(40), -240, pumpStation.subtract(155)),
    box(20, 40, 220).translate(ggX.add(40), -240, pumpStation.subtract(155)),
    box(50, 20, 20).translate(ggX, -240, pumpStation.subtract(155)),
    box(20, 60, 20).translate(ggX.add(40), ggValveStation, pumpStation.add(50)),
    box(50, 20, 20).translate(ggX, ggValveStation.subtract(10), pumpStation.add(50)),
  );
const ggSupport = ggSupportBlank.subtract(
  turbopumpShape().translate(pumpOffset, 0, pumpStation),
  pumpMountShape().translate(0, 0, pumpStation),
  gasGeneratorShape().translate(ggX, -240, pumpStation.subtract(215)),
  ggValveShape().translate(ggX, ggValveStation, pumpStation.add(130)),
).finish('paint-matte', { color: C_BRACKET });
asm.part('generator-valve-support', ggSupport);

// --- Explicit hand-authored routing ------------------------------------------
// Geometry/display example only: no combustion, pressure, thermal, fit, load or
// propulsion approval. Rules below are layout estimates, not design allowables.
// Cold rigid lines keep >=3 OD bend radius; hot-gas formed duct uses >=1.5 OD.
// Default surface clearance is 6 mm; unlike-fluid and hot-gas separation is larger.
tubeSpec({
  minBendRadiusFactor: 3, minStraightBetweenBends: 2, minStraightAtEnd: 2.5,
  systems: {
    lox: { minBendRadiusFactor: 3 }, fuel: { minBendRadiusFactor: 3 },
    'hot-gas': { minBendRadiusFactor: 1.5, minStraightAtEnd: 1 },
    igniter: { minBendRadiusFactor: 3 }, pneumatic: { minBendRadiusFactor: 3 },
  },
  clearance: { default: 6, pairs: [
    { a: 'lox', b: 'fuel', min: 12 },
    { a: 'hot-gas', b: 'lox', min: 25 },
    { a: 'hot-gas', b: 'fuel', min: 25 },
    { a: 'hot-gas', b: 'igniter', min: 25 },
    { a: 'hot-gas', b: 'pneumatic', min: 25 },
  ] },
});
const LINE_COLORS = { lox: '#398cd7', fuel: '#d7a43a', 'hot-gas': '#b65e36', igniter: '#b979de', pneumatic: '#4aaf85' } as const;
type LineOptions = Parameters<typeof tube>[1];
function line(name: string, system: keyof typeof LINE_COLORS, from: LineOptions['from'], to: LineOptions['to'], via: NonNullable<LineOptions['via']>, wall: number, bendRadius: number) {
  const shape = tube(name, { from, to, via, wall, bendRadius, material: 'mild-steel' }).color(LINE_COLORS[system]);
  asm.part(name, shape);
}
// Four LOX lines: each large cast-in port is already aimed at its partner.
line('lox-pump-main', 'lox', turbopump.port('lox-out'), mainLoxValve.port('in'), [], 1.65, 343);
line('lox-main-dome', 'lox', mainLoxValve.port('out'), dome.port('lox-in'), [], 1.65, 343);
line('lox-pump-gg', 'lox', turbopump.port('gg-lox'), ggValve.port('lox-in'), [], 1.24, 80);
line('lox-gg-generator', 'lox', ggValve.port('lox-out'), gasGenerator.port('lox-in'), [], 1.24, 80);
// Nine fuel lines. Four actuator circuits use the four separate pump galleries.
line('fuel-pump-main', 'fuel', turbopump.port('fuel-out'), mainFuelValve.port('in'), [], 1.65, 270);
line('fuel-main-manifold', 'fuel', mainFuelValve.port('out'), manifold.port('fuel-in'), [], 1.65, 270);
line('fuel-coolant-dome', 'fuel', chamber.port('coolant-out'), dome.port('fuel-in'), [], 1.65, 270);
line('fuel-pump-gg', 'fuel', turbopump.port('gg-fuel'), ggValve.port('fuel-in'), [], 1.24, 60);
line('fuel-gg-generator', 'fuel', ggValve.port('fuel-out'), gasGenerator.port('fuel-in'), [], 1.24, 60);
const a1s = actuatorPoint([ACT_PORT_REACH, 0, ACT_PORT_STATIONS.supply], 0);
const a1r = actuatorPoint([ACT_PORT_REACH, 0, ACT_PORT_STATIONS.return], 0);
const a2s = actuatorPoint([ACT_PORT_REACH, 0, ACT_PORT_STATIONS.supply], 90);
const a2r = actuatorPoint([ACT_PORT_REACH, 0, ACT_PORT_STATIONS.return], 90);
line('fuel-act1-supply', 'fuel', turbopump.port('act-supply-1'), actuators[0].port('supply'), [
  [pumpOffset.subtract(22), R_ACT_LOWER + a1s[1], pumpStation.add(178)],
  [180, R_ACT_LOWER + a1s[1], pumpStation.add(178)],
  [180, R_ACT_LOWER + a1s[1], Z_ACT_LOWER + a1s[2]],
], 0.89, 40);
line('fuel-act1-return', 'fuel', turbopump.port('act-return-1'), actuators[0].port('return'), [
  [pumpOffset.subtract(22), R_ACT_LOWER + a1r[1], pumpStation.add(138)],
  [140, R_ACT_LOWER + a1r[1], pumpStation.add(138)],
  [140, R_ACT_LOWER + a1r[1], Z_ACT_LOWER + a1r[2]],
], 0.89, 40);
line('fuel-act2-supply', 'fuel', turbopump.port('act-supply-2'), actuators[1].port('supply'), [
  [pumpOffset.add(22), 600, pumpStation.add(178)],
  [-R_ACT_LOWER + a2s[0], 600, pumpStation.add(178)],
  [-R_ACT_LOWER + a2s[0], 600, Z_ACT_LOWER + a2s[2]],
], 0.89, 40);
line('fuel-act2-return', 'fuel', turbopump.port('act-return-2'), actuators[1].port('return'), [
  [pumpOffset.add(22), 540, pumpStation.add(138)],
  [-R_ACT_LOWER + a2r[0], 540, pumpStation.add(138)],
  [-R_ACT_LOWER + a2r[0], 540, Z_ACT_LOWER + a2r[2]],
], 0.89, 40);
// Direct turbine-out / collar inlet is a bolted interface, not a zero-length tube.
// Exhaust deliberately has an open, angled aft end beside the bell.
line('hotgas-generator-turbine', 'hot-gas', gasGenerator.port('out'), turbopump.port('turbine-in'), [], 1.65, 155);
line('hotgas-exhaust', 'hot-gas', collar.port('out'), {
  point: [pumpOffset.add(630), 0, pumpStation.subtract(1500)], axis: [-1, 0, 1],
}, [[pumpOffset, 0, pumpStation.subtract(870)]], 2, 305);
// Two independent cartridge feeds, using the radial chamber igniter boss.
const ci = polar(R_OUT_CHAMBER + 28, -60, 330);
const ciRun: V3 = [ci[0] + 40, ci[1] - 80 * Math.sin(60 * DEG), ci[2]];
line('igniter-chamber', 'igniter', cartridge.port('out-chamber'), chamber.port('igniter'), [
  [159, -330, cartridgeStation.add(258)], [ciRun[0], ciRun[1], cartridgeStation.add(258)], ciRun,
], 0.71, 20);
const igniterRunRise = param('IgniterRunRise', 308, { unit: 'mm', description: 'igniter generator run elevation above cartridge base; 308 deliberately crosses a pilot line' });
line('igniter-generator', 'igniter', cartridge.port('out-gg'), gasGenerator.port('igniter'), [
  [191, -330, cartridgeStation.add(igniterRunRise)], [191, -590, cartridgeStation.add(igniterRunRise)],
  [pumpOffset.add(150), -590, cartridgeStation.add(igniterRunRise)],
  [pumpOffset.add(150), -590, pumpStation.subtract(215)],
], 0.71, 20);
// Six pneumatic services: helium feed, three valve pilots and two purge lines.
line('pneumatic-helium-block', 'pneumatic', bottle.port('out'), block.port('in'), [
  [-310, -190, bottleStation.add(420)], [-400, -190, bottleStation.add(420)],
  [-400, -300, bottleStation.add(420)], [-400, -300, blockStation],
], 0.89, 30);
line('pneumatic-main-lox', 'pneumatic', block.port('out-lox-valve'), mainLoxValve.port('pneumatic'), [
  [-130, -300, pumpStation.add(470)], [-130, -470, pumpStation.add(470)],
  [pumpOffset.subtract(150), -470, pumpStation.add(470)],
  [pumpOffset.subtract(150), -470, pumpStation.add(390)],
], 0.71, 20);
line('pneumatic-main-fuel', 'pneumatic', block.port('out-fuel-valve'), mainFuelValve.port('pneumatic'), [
  [-100, -300, 650], [-100, -570, 650], [pumpOffset.add(390), -570, 650],
  [pumpOffset.add(390), mfvStation, 650], [pumpOffset.subtract(40), mfvStation, 650],
], 0.71, 20);
line('pneumatic-gg-valve', 'pneumatic', block.port('out-gg-valve'), ggValve.port('pneumatic'), [
  [-70, -300, 500], [-70, -540, 500], [pumpOffset.add(350), -540, 500],
  [pumpOffset.add(350), ggValveStation.subtract(30), 500],
  [pumpOffset.add(350), ggValveStation.subtract(30), pumpStation.add(130)],
], 0.71, 20);
const dp = polar(R_OUT_CHAMBER + 33, -105, 556);
const dpRun: V3 = [dp[0] - 120 * Math.sin(15 * DEG), dp[1] - 120 * Math.cos(15 * DEG), dp[2]];
line('pneumatic-purge-dome', 'pneumatic', block.port('purge-dome'), dome.port('purge'), [
  [-125, -420, blockStation.add(10)], [-220, -420, blockStation.add(10)],
  [-220, -420, 556], [dpRun[0], -420, 556], dpRun,
], 0.71, 20);
line('pneumatic-purge-generator', 'pneumatic', block.port('purge-gg'), gasGenerator.port('purge'), [
  [-75, -610, blockStation.add(10)], [pumpOffset.add(430), -610, blockStation.add(10)],
  [pumpOffset.add(430), -390, blockStation.add(10)],
  [pumpOffset.add(430), -390, pumpStation.subtract(410)],
  [pumpOffset.add(150), -390, pumpStation.subtract(410)],
], 0.71, 20);
return asm.model();
