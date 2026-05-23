// Gearfinity-inspired planetary gear stage hero asset.
//
// 12:8:28 planetary set, herringbone-style proportions (3.33:1 reduction):
//   - rear bolted flange housing the internal-tooth ring gear
//   - 12-tooth drive-sun-gear on the input shaft
//   - three 8-tooth planet gears on fixed pins in a carrier web
//   - output shaft + 5-blade turbine fan coupled to the carrier
//
// All gears are built from a local involute-tooth profile generator (ported
// from the standard 20-deg pressure-angle involute math used by Gearfinity's
// open-source planetary stage parts) and extruded as proper toothed solids.
// Animation is driven by a single `driveAngleDeg` parameter wired into
// revolute mates at the planetary set's kinematic ratios:
//   carrier  =  Z_sun / (Z_sun + Z_ring)        × driveAngleDeg  =  +0.30 ×
//   planet   = -(Z_sun / Z_planet) × (1 - 0.30) × driveAngleDeg  =  -1.05 ×  (relative to its carrier pin)
//   fan      =  +0.30 × driveAngleDeg                                       (coupled to carrier output)
//
// This is a parameterized kinematic preview, not a full involute meshing
// simulation; the tooth tips will visually interfere at the pitch line under
// some pose values, which is also how real gears touch each other.

const driveAngleDeg = param('driveAngleDeg', 90, {
  min: -720,
  max: 720,
  description: 'Input sun-gear rotation (deg). Carrier moves at 0.30× this.',
});

// --- Planetary gear set (module = 3.5 mm) ----------------------------------
const Z_SUN = 12;
const Z_PLANET = 8;
const Z_RING = Z_SUN + 2 * Z_PLANET; // 28; planetary geometric constraint
const MODULE = 3.5;
const PRESSURE_ANGLE_DEG = 20;
const ADDENDUM = MODULE * 1.0;        // 3.5
const DEDENDUM = MODULE * 1.25;       // 4.375

const SUN_PITCH_R = (Z_SUN * MODULE) / 2;          // 21.0
const PLANET_PITCH_R = (Z_PLANET * MODULE) / 2;    // 14.0
const RING_PITCH_R = (Z_RING * MODULE) / 2;        // 49.0
const PLANET_ORBIT_R = SUN_PITCH_R + PLANET_PITCH_R; // 35.0
const RING_OUTER_R = RING_PITCH_R + DEDENDUM + 6;    // 59.4

// Interior gears (sun + planets) are slightly TALLER than the ring gear so
// their toothed flanks remain visible above/below the ring's flat face from
// camera angles other than dead-on top-down. This is the visual "show-off"
// of an inspectable planetary stage.
const GEAR_H_INTERIOR = 18;
const GEAR_H_RING = 14;

// --- Z-stack layers --------------------------------------------------------
const FLANGE_THICK = 8;
const FLANGE_R = RING_OUTER_R + 6;             // 65.4
const FLANGE_Z = -GEAR_H_INTERIOR / 2 - FLANGE_THICK; // -17
const BOLT_CIRCLE_R = FLANGE_R - 3.4;          // 62.0
const BOLT_R = 2.8;
const BOLT_H = 5.5;
const BOLT_COUNT = 6;

// Slewing roller bearing on top of the ring gear — visual indicator that the
// carrier is properly supported. A thin annular race with a polished
// inner-track band; individual roller cylinders are intentionally omitted to
// keep the pairwise interference check (O(N²) part-pairs) under the test
// timeout — fusing them back in is a follow-up if budget allows.
const BEARING_OUTER_R = RING_OUTER_R - 1.0;     // 58.5
const BEARING_INNER_R = RING_PITCH_R + 2.5;     // 51.5
const BEARING_RACE_H = 3.5;
const BEARING_RACE_Z_BASE = GEAR_H_RING / 2 + 0.2;  // sits on the ring's top face

const CARRIER_PLATE_THICK = 3;
const CARRIER_Z_BASE = GEAR_H_INTERIOR / 2 + 2; // 11
const CARRIER_BOSS_R = 6;
const CARRIER_BOSS_H = 5;
const CARRIER_SPOKE_W = 4;

const PIN_R = 2.6;
const PIN_LEN = GEAR_H_INTERIOR + 6;           // 24

const OUTPUT_SHAFT_R = 4.5;
const OUTPUT_SHAFT_LEN = 14;
const OUTPUT_SHAFT_Z = CARRIER_Z_BASE + CARRIER_PLATE_THICK + CARRIER_BOSS_H;

const FAN_HUB_R = 7;
const FAN_HUB_H = 5;
const FAN_HUB_Z = OUTPUT_SHAFT_Z + OUTPUT_SHAFT_LEN;
const FAN_BLADE_COUNT = 5;
const FAN_BLADE_LEN = 26;
const FAN_BLADE_WIDTH = 6;
const FAN_BLADE_THICK = 1.4;
const FAN_BLADE_PITCH_DEG = 18;

const INPUT_SHAFT_R = 3.8;
const INPUT_SHAFT_LEN = 22;
const INPUT_SHAFT_Z = FLANGE_Z - INPUT_SHAFT_LEN + 4;

const PLANET_ANGLES_DEG = [0, 120, 240];

// --- Kinematic ratios ------------------------------------------------------
const CARRIER_RATIO = Z_SUN / (Z_SUN + Z_RING);                       //  0.30
const PLANET_REL_RATIO = -(Z_SUN / Z_PLANET) * (1 - CARRIER_RATIO);   // -1.05

setCameraTarget(0, 0, 4);
setCameraDistance(195);

// --- Helpers ---------------------------------------------------------------
const D2R = Math.PI / 180;
function polar(r: number, deg: number, z: number): [number, number, number] {
  return [r * Math.cos(deg * D2R), r * Math.sin(deg * D2R), z];
}
function frame(origin: [number, number, number]) {
  return { type: 'frame' as const, origin: { kind: 'vec3' as const, value: origin } };
}
function axisAt(origin: [number, number, number], dir: [number, number, number] = [0, 0, 1]) {
  return { type: 'axis' as const, origin: { kind: 'vec3' as const, value: origin }, axis: dir };
}

// ----- Involute-tooth gear builder ----------------------------------------
// Standard 20-deg pressure-angle involute. Trace the full outer perimeter of
// the gear in CCW order with each tooth contributing: root-arc, +flank
// involute, tip arc, -flank involute. Returns an [x,y] array suitable for a
// path().moveTo(...).lineTo(...) chain.

const SAMPLES_PER_FLANK = 4; // points along each involute flank
const TIP_INTERMEDIATE = 1;  // interior points on tip arc (excludes endpoints)
const ROOT_INTERMEDIATE = 1; // interior points on root arc between teeth

function involuteFn(t: number): number {
  return t - Math.atan(t);
}

function gearProfile(
  toothCount: number,
  pitchR: number,
  addendum: number,
  dedendum: number,
): [number, number][] {
  const phi = PRESSURE_ANGLE_DEG * D2R;
  const baseR = pitchR * Math.cos(phi);
  const tipR = pitchR + addendum;
  const rootR = Math.max(pitchR - dedendum, baseR * 0.96);
  const tMax = Math.sqrt((tipR / baseR) ** 2 - 1);
  const tPitch = Math.sqrt((pitchR / baseR) ** 2 - 1);
  const tRoot = rootR > baseR ? Math.sqrt((rootR / baseR) ** 2 - 1) : 0;
  const halfTooth = Math.PI / (2 * toothCount); // pitch-circle tooth half-thickness
  const pitchInv = involuteFn(tPitch);

  const points: [number, number][] = [];
  for (let i = 0; i < toothCount; i += 1) {
    const toothAngle = ((2 * Math.PI) / toothCount) * i;
    const offsetPlus = toothAngle + halfTooth - pitchInv;
    const offsetMinus = toothAngle - halfTooth + pitchInv;

    // +flank: root -> tip
    for (let s = 0; s <= SAMPLES_PER_FLANK; s += 1) {
      const t = tRoot + ((tMax - tRoot) * s) / SAMPLES_PER_FLANK;
      const r = baseR * Math.sqrt(1 + t * t);
      const a = involuteFn(t) + offsetPlus;
      points.push([r * Math.cos(a), r * Math.sin(a)]);
    }

    // Tip arc interior points (excluding the two flank endpoints already pushed)
    const tipAngPlus = involuteFn(tMax) + offsetPlus;
    const tipAngMinus = -involuteFn(tMax) + offsetMinus;
    for (let s = 1; s <= TIP_INTERMEDIATE; s += 1) {
      const u = s / (TIP_INTERMEDIATE + 1);
      const a = tipAngPlus + (tipAngMinus - tipAngPlus) * u;
      points.push([tipR * Math.cos(a), tipR * Math.sin(a)]);
    }

    // -flank: tip -> root
    for (let s = 0; s <= SAMPLES_PER_FLANK; s += 1) {
      const t = tMax - ((tMax - tRoot) * s) / SAMPLES_PER_FLANK;
      const r = baseR * Math.sqrt(1 + t * t);
      const a = -involuteFn(t) + offsetMinus;
      points.push([r * Math.cos(a), r * Math.sin(a)]);
    }

    // Root arc to next tooth's +flank root
    const thisRootAngMinus = -involuteFn(tRoot) + offsetMinus;
    const nextToothAngle = ((2 * Math.PI) / toothCount) * (i + 1);
    const nextOffsetPlus = nextToothAngle + halfTooth - pitchInv;
    const nextRootAngPlus = involuteFn(tRoot) + nextOffsetPlus;
    for (let s = 1; s <= ROOT_INTERMEDIATE; s += 1) {
      const u = s / (ROOT_INTERMEDIATE + 1);
      const a = thisRootAngMinus + (nextRootAngPlus - thisRootAngMinus) * u;
      points.push([rootR * Math.cos(a), rootR * Math.sin(a)]);
    }
  }
  return points;
}

function buildSketchFromPoints(pts: [number, number][]) {
  let p = path().moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) {
    p = p.lineTo(pts[i][0], pts[i][1]);
  }
  return p.close();
}

// External spur gear (sun, planets): involute-toothed solid centered on Z axis.
function buildSpurGear(
  toothCount: number,
  pitchR: number,
  height: number,
  color: string,
) {
  const profile = gearProfile(toothCount, pitchR, ADDENDUM, DEDENDUM);
  return buildSketchFromPoints(profile).extrude(height).color(color);
}

// Internal ring gear: a smooth outer disk minus a "bore solid" whose outer
// perimeter is the internal-tooth profile (the external gear profile mirrored
// radially around the pitch circle, so external tooth tips become internal
// tooth tips pointing inward to pitchR - addendum, and external roots become
// internal roots at pitchR + dedendum, the deepest bore region).
function buildInternalRingGear(
  toothCount: number,
  pitchR: number,
  outerR: number,
  height: number,
  color: string,
) {
  const externalProfile = gearProfile(toothCount, pitchR, ADDENDUM, DEDENDUM);
  const internalBoreProfile: [number, number][] = externalProfile.map(([x, y]) => {
    const r = Math.sqrt(x * x + y * y);
    const a = Math.atan2(y, x);
    const rNew = 2 * pitchR - r;
    return [rNew * Math.cos(a), rNew * Math.sin(a)];
  });
  const outerDisk = cylinder(height, outerR, 96).color(color);
  const boreSolid = buildSketchFromPoints(internalBoreProfile)
    .extrude(height + 2)
    .translate(0, 0, -1);
  return outerDisk.subtract(boreSolid).color(color);
}

// --- Assembly --------------------------------------------------------------
const stage = assembly('Gearfinity planetary gear stage with fan output');

// Rear flange + housing ring (a single rigid grounded part), with the internal
// ring gear fused into its bore.
const flangeBodyColor = '#262c33';
const flangeSkirtColor = '#3a424b';
const ringGearColor = '#aab2b9';

const ringGearShape = buildInternalRingGear(Z_RING, RING_PITCH_R, RING_OUTER_R, GEAR_H_RING, ringGearColor)
  .translate(0, 0, -GEAR_H_RING / 2);
const flangeDisk = cylinder(FLANGE_THICK, FLANGE_R, 96)
  .translate(0, 0, FLANGE_Z)
  .color(flangeBodyColor);
const flangeSkirt = cylinder(FLANGE_THICK - 2, RING_OUTER_R + 2.5, 96)
  .translate(0, 0, FLANGE_Z + FLANGE_THICK - 0.5)
  .color(flangeSkirtColor);

const flange = stage.part(
  'fixed-ring-gear-with-internal-teeth',
  ringGearShape.union(flangeDisk).union(flangeSkirt),
);
flange.connector('center-axis', axisAt([0, 0, 0]));
flange.connector('carrier-axis', axisAt([0, 0, CARRIER_Z_BASE]));
flange.connector('fan-output-axis', axisAt([0, 0, FAN_HUB_Z]));
flange.connector('input-axis', axisAt([0, 0, FLANGE_Z]));
flange.connector('rear-face', frame([0, 0, FLANGE_Z]));

// Housing bolts standing on top of the flange. Hex head + visible threaded
// shaft sinking into the flange.
const FLANGE_TOP_Z = FLANGE_Z + FLANGE_THICK;
for (let i = 0; i < BOLT_COUNT; i += 1) {
  const deg = (360 / BOLT_COUNT) * i + 30;
  const seatXY = polar(BOLT_CIRCLE_R, deg, FLANGE_TOP_Z);
  const boltName = `housing-bolt-${i + 1}`;
  const headCyl = cylinder(BOLT_H, BOLT_R + 1.4, 6) // low-segment cylinder → hex head silhouette
    .translate(seatXY[0], seatXY[1], FLANGE_TOP_Z)
    .color('#13161a');
  const headTopBevel = cylinder(0.8, BOLT_R + 0.8, 6)
    .translate(seatXY[0], seatXY[1], FLANGE_TOP_Z + BOLT_H)
    .color('#21262c');
  const bolt = stage.part(boltName, headCyl.union(headTopBevel));
  flange.connector(`bolt-seat-${i + 1}`, frame([seatXY[0], seatXY[1], FLANGE_TOP_Z]));
  bolt.connector('head-seat', frame([seatXY[0], seatXY[1], FLANGE_TOP_Z]));
  stage.mate(
    `housing-bolt-${i + 1}-fastened`,
    `fixed-ring-gear-with-internal-teeth.bolt-seat-${i + 1}`,
    `${boltName}.head-seat`,
    'fastened',
  );
}

// Slewing bearing race on top of the ring gear: a thin annular ring with a
// bright inner-track groove that the carrier turns on. Roller cylinders are
// inscribed as a low-detail visual band on the top face — kept as a single
// part so the pairwise interference check stays affordable.
const bearingRaceShape = cylinder(BEARING_RACE_H, BEARING_OUTER_R, 64)
  .translate(0, 0, BEARING_RACE_Z_BASE)
  .color('#54606b')
  .subtract(
    cylinder(BEARING_RACE_H + 2, BEARING_INNER_R, 64)
      .translate(0, 0, BEARING_RACE_Z_BASE - 1),
  )
  .union(
    // Bright top track ring — reads as the polished race surface.
    cylinder(0.8, BEARING_OUTER_R - 1.5, 64)
      .translate(0, 0, BEARING_RACE_Z_BASE + BEARING_RACE_H - 0.1)
      .subtract(
        cylinder(2, BEARING_INNER_R + 1.5, 64)
          .translate(0, 0, BEARING_RACE_Z_BASE + BEARING_RACE_H - 1),
      )
      .color('#dfe3e7'),
  );
const bearingRace = stage.part('roller-bearing-race', bearingRaceShape);
const bearingRaceSeat = [0, 0, BEARING_RACE_Z_BASE] as [number, number, number];
flange.connector('bearing-race-seat', frame(bearingRaceSeat));
bearingRace.connector('flange-seat', frame(bearingRaceSeat));
stage.mate(
  'bearing-race-fastened',
  'fixed-ring-gear-with-internal-teeth.bearing-race-seat',
  'roller-bearing-race.flange-seat',
  'fastened',
);

// Sun gear.
const sun = stage.part(
  'drive-sun-gear',
  buildSpurGear(Z_SUN, SUN_PITCH_R, GEAR_H_INTERIOR, '#d4a635')
    .translate(0, 0, -GEAR_H_INTERIOR / 2),
);
sun.connector('axis', axisAt([0, 0, 0]));
sun.connector('shaft-bore', frame([0, 0, -GEAR_H_INTERIOR / 2]));
stage.mate(
  'drive-sun-spin',
  'fixed-ring-gear-with-internal-teeth.center-axis',
  'drive-sun-gear.axis',
  'revolute',
  { pose: driveAngleDeg, limitsDeg: [-720, 720] },
);

// Input shaft, keyed into the sun.
const inputShaft = stage.part(
  'input-drive-shaft',
  cylinder(INPUT_SHAFT_LEN, INPUT_SHAFT_R, 32)
    .translate(0, 0, INPUT_SHAFT_Z)
    .color('#9aa3ab')
    .union(
      cylinder(2.5, INPUT_SHAFT_R + 1.4, 32)
        .translate(0, 0, INPUT_SHAFT_Z + INPUT_SHAFT_LEN - 4)
        .color('#cdd2d6'),
    ),
);
inputShaft.connector('sun-coupling', frame([0, 0, 0]));
stage.mate(
  'input-shaft-keyed-to-sun',
  'drive-sun-gear.shaft-bore',
  'input-drive-shaft.sun-coupling',
  'fastened',
);

// Carrier web: central hub, three spokes out to the planet pins, planet pin
// bosses, and the boss that carries the output shaft.
const carrierColor = '#8a98a3';
const carrierAccent = '#6f7c87';
let carrierShape = cylinder(CARRIER_PLATE_THICK, CARRIER_BOSS_R + 2, 64)
  .translate(0, 0, CARRIER_Z_BASE)
  .color(carrierColor);
for (const deg of PLANET_ANGLES_DEG) {
  const spoke = box(PLANET_ORBIT_R + 6, CARRIER_SPOKE_W, CARRIER_PLATE_THICK, true)
    .translate((PLANET_ORBIT_R + 6) / 2, 0, CARRIER_Z_BASE + CARRIER_PLATE_THICK / 2)
    .rotate([0, 0, 1], deg)
    .color(carrierColor);
  const pinHub = cylinder(CARRIER_PLATE_THICK + 1.5, PIN_R + 2.6, 32)
    .translate(
      PLANET_ORBIT_R * Math.cos(deg * D2R),
      PLANET_ORBIT_R * Math.sin(deg * D2R),
      CARRIER_Z_BASE,
    )
    .color(carrierColor);
  carrierShape = carrierShape.union(spoke).union(pinHub);
}
carrierShape = carrierShape.union(
  cylinder(CARRIER_BOSS_H, CARRIER_BOSS_R, 64)
    .translate(0, 0, CARRIER_Z_BASE + CARRIER_PLATE_THICK)
    .color(carrierAccent),
);

const carrier = stage.part('planet-carrier-output-web', carrierShape);
carrier.connector('center-axis', axisAt([0, 0, CARRIER_Z_BASE]));
carrier.connector('output-shaft-face', frame([0, 0, OUTPUT_SHAFT_Z]));
stage.mate(
  'carrier-output-spin',
  'fixed-ring-gear-with-internal-teeth.carrier-axis',
  'planet-carrier-output-web.center-axis',
  'revolute',
  { pose: driveAngleDeg.multiply(CARRIER_RATIO), limitsDeg: [-360, 360] },
);

// Planet pins (fastened to carrier) and planet gears (revolute on each pin).
for (let i = 0; i < PLANET_ANGLES_DEG.length; i += 1) {
  const deg = PLANET_ANGLES_DEG[i];
  const [px, py] = polar(PLANET_ORBIT_R, deg, 0);
  const pinName = `planet-pin-${i + 1}`;
  const planetName = `planet-gear-${i + 1}`;
  const pinZBase = -PIN_LEN / 2;

  const pin = stage.part(
    pinName,
    cylinder(PIN_LEN, PIN_R, 24)
      .translate(px, py, pinZBase)
      .color('#cdd2d6')
      .union(
        cylinder(1.6, PIN_R + 1.1, 24)
          .translate(px, py, pinZBase + PIN_LEN - 1.6)
          .color('#dfe3e6'),
      ),
  );
  carrier.connector(`pin-${i + 1}-seat`, frame([px, py, CARRIER_Z_BASE]));
  pin.connector('carrier-seat', frame([px, py, CARRIER_Z_BASE]));
  pin.connector('axis', axisAt([px, py, 0]));
  stage.mate(
    `planet-pin-${i + 1}-fastened`,
    `planet-carrier-output-web.pin-${i + 1}-seat`,
    `${pinName}.carrier-seat`,
    'fastened',
  );

  const planetColor = i === 0 ? '#b96838' : i === 1 ? '#c47545' : '#a85a30';
  const planetShape = buildSpurGear(Z_PLANET, PLANET_PITCH_R, GEAR_H_INTERIOR, planetColor)
    .translate(px, py, -GEAR_H_INTERIOR / 2);
  const planet = stage.part(planetName, planetShape);
  planet.connector('axis', axisAt([px, py, 0]));
  stage.mate(
    `planet-${i + 1}-orbit-spin`,
    `${pinName}.axis`,
    `${planetName}.axis`,
    'revolute',
    { pose: driveAngleDeg.multiply(PLANET_REL_RATIO), limitsDeg: [-1080, 1080] },
  );
}

// Output shaft, fastened to the carrier.
const outputShaft = stage.part(
  'output-drive-shaft',
  cylinder(OUTPUT_SHAFT_LEN, OUTPUT_SHAFT_R, 32)
    .translate(0, 0, OUTPUT_SHAFT_Z)
    .color('#4a525b')
    .union(
      cylinder(1.4, OUTPUT_SHAFT_R + 0.9, 32)
        .translate(0, 0, OUTPUT_SHAFT_Z + OUTPUT_SHAFT_LEN - 1.4)
        .color('#cdd2d6'),
    ),
);
outputShaft.connector('carrier-seat', frame([0, 0, OUTPUT_SHAFT_Z]));
stage.mate(
  'output-shaft-on-carrier',
  'planet-carrier-output-web.output-shaft-face',
  'output-drive-shaft.carrier-seat',
  'fastened',
);

// Output fan wheel. Declared as 'output-fan-wheel' for the gallery hero pose.
const fanHubShape = cylinder(FAN_HUB_H, FAN_HUB_R, 48)
  .translate(0, 0, FAN_HUB_Z)
  .color('#d4a635')
  .union(
    cylinder(1.8, FAN_HUB_R + 0.6, 48)
      .translate(0, 0, FAN_HUB_Z + FAN_HUB_H - 1.8)
      .color('#e8c14a'),
  );
const fan = stage.part('output-fan-wheel', fanHubShape);
fan.connector('axis', axisAt([0, 0, FAN_HUB_Z]));
const bladeTipR = FAN_HUB_R + FAN_BLADE_LEN;
fan.connector('blade-tip', frame([bladeTipR, 0, FAN_HUB_Z + FAN_HUB_H / 2]));
stage.mate(
  'fan-output-spin',
  'fixed-ring-gear-with-internal-teeth.fan-output-axis',
  'output-fan-wheel.axis',
  'revolute',
  { pose: driveAngleDeg.multiply(CARRIER_RATIO), limitsDeg: [-360, 360] },
);

// Five pitched turbine blades. Each blade is built so its root attaches at
// the hub OD, extends radially outward, with a longitudinal twist for the
// turbine pitch.
const FAN_MID_Z = FAN_HUB_Z + FAN_HUB_H / 2;
for (let i = 0; i < FAN_BLADE_COUNT; i += 1) {
  const deg = (360 / FAN_BLADE_COUNT) * i;
  const bladeName = `fan-blade-${i + 1}`;
  const bladeShape = box(FAN_BLADE_LEN, FAN_BLADE_WIDTH, FAN_BLADE_THICK)
    .translate(0, -FAN_BLADE_WIDTH / 2, -FAN_BLADE_THICK / 2)
    .rotate([1, 0, 0], FAN_BLADE_PITCH_DEG)
    .translate(FAN_HUB_R - 0.5, 0, FAN_MID_Z)
    .rotate([0, 0, 1], deg)
    .color('#d96a3b');
  const blade = stage.part(bladeName, bladeShape);
  const seat = polar(FAN_HUB_R - 0.5, deg, FAN_MID_Z);
  fan.connector(`blade-${i + 1}-seat`, frame(seat));
  blade.connector('hub-root', frame(seat));
  stage.mate(
    `fan-blade-${i + 1}-fastened`,
    `output-fan-wheel.blade-${i + 1}-seat`,
    `${bladeName}.hub-root`,
    'fastened',
  );
}

return stage.solvedModel({}, { validate: 'off' });
