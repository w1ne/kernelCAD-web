// Planetary gear stage — a mated, coupled mechanism
//
// Prompt: "Planetary gear stage: sun, planets, ring, carrier."
//
// Words -> geometry:
//   "sun"      -> spurGear (true involute, 20 deg) on an input shaft that runs
//                 down through a clearance bore in the housing.
//   "planets"  -> planetCount spurGears on carrier pins (0.3 mm radial pin
//                 clearance), each rotated so a tooth meets a gap on the sun.
//   "ring"     -> internalSpurGear fused to a flanged housing plate with four
//                 mounting holes; it is the grounded part.
//   "carrier"  -> open three-arm spider with the planet pins and the output shaft.
//
// What makes it a mechanism, not a picture (beyond what one-shot generators
// emit):
//   - planetaryToothCompatibility() throws unless Zring = Zsun + 2 Zplanet,
//     and the script checks the equal-spacing assembly condition.
//   - Revolute mates: housing -> sun, housing -> carrier, carrier -> planets.
//   - coupleMates() ties sun and planets to the carrier at the real kinematic
//     ratios (sun = (Zs+Zr)/Zs x carrier; planet spin relative to the carrier
//     = -(Zr/Zp) x carrier), with gear-pair transmissions naming the physical
//     drive path.
//   - kernelCAD's mechanism-truth check sweeps the carrier through its limits
//     WITH the couplings applied, checks every unmated pair (sun-planet,
//     planet-ring) for interpenetration at each sampled pose, and nudges each
//     joint +-0.5 deg on its own to confirm it really is a revolute.

const carrierDeg = param('carrierDeg', 0, { min: -90, max: 90, description: 'Output (carrier) rotation (deg); the sun turns (Zs+Zr)/Zs times as far and the planets follow through the couplings' });
const zSunChoice = param('sunTeeth', '12', { choices: ['12', '15', '18', '21'] });
const zPlanetChoice = param('planetTeeth', '18', { choices: ['12', '15', '18', '21'] });
const countChoice = param('planetCount', '3', { choices: ['3', '4'] });

const M = 1.5; // module (mm)
const ZS = Number(zSunChoice.value);
const ZP = Number(zPlanetChoice.value);
const ZR = ZS + 2 * ZP;
const NP = Number(countChoice.value);
planetaryToothCompatibility({ sunTeeth: ZS, planetTeeth: ZP, ringTeeth: ZR });
if ((ZS + ZR) % NP !== 0) {
  throw new Error(`planetary assembly condition: (Zs + Zr) = ${ZS + ZR} must be divisible by planetCount ${NP} for equally spaced planets`);
}

const FACE = 10;        // gear face width
const GEAR_Z = 0.5;     // gears float 0.5 mm above the housing floor
// Circumferential backlash per mesh. 0.45 mm is a printed-gearbox running
// clearance; it is also what lets every gear be nudged +-0.5 deg on its own
// (the mechanism check's per-joint micro-pose) without tooth contact.
const BACKLASH = 0.45;
const CARRIER_R = (M * (ZS + ZP)) / 2; // planet centre radius = sum of pitch radii
const RING_PITCH_R = (M * ZR) / 2;
const PIN_R = 3.5;
const PLANET_BORE = 2 * (PIN_R + 0.3);

const CARRIER_RATIO = ZS / (ZS + ZR);
const PLANET_REL_RATIO = -(ZS / ZP) * (1 - CARRIER_RATIO);

const axis = (o: [number, number, number]) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: o }, axis: [0, 0, 1] as [number, number, number] });

const stage = assembly('planetary-stage');

// --- Housing: internal ring gear on a flanged base plate --------------------
const ringOuterR = RING_PITCH_R + 1.25 * M + 6;
const ring = internalSpurGear({ module: M, teeth: ZR, faceWidth: FACE + 1.5, backlash: BACKLASH, rimThickness: 6 });
const flangeR = ringOuterR + 10;
const basePlate = cylinder(5, flangeR, 96)
  .translate(0, 0, -5)
  .holes('top', {
    positions: [0, 90, 180, 270].map((d) => ({ u: (flangeR - 6) * Math.cos((d + 45) * Math.PI / 180), v: (flangeR - 6) * Math.sin((d + 45) * Math.PI / 180) })),
    diameter: 5.5,
    depth: 'through',
    name: 'mountHoles',
  })
  .hole('top', { u: 0, v: 0, diameter: 8.6, depth: 'through', name: 'sunShaftBore' });
const housing = union(basePlate, ring.translate(0, 0, -0.01));
stage
  .part('housing', housing.finish('paint-matte', { color: '#7f93ab' }), { material: 'aluminum-6061' })
  .connector('sun-axis', axis([0, 0, 0]))
  .connector('carrier-axis', axis([0, 0, 0]));

// --- Sun gear + input shaft ---------------------------------------------------
const sun = union(
  spurGear({ module: M, teeth: ZS, faceWidth: FACE, backlash: BACKLASH }).translate(0, 0, GEAR_Z),
  cylinder(22, 4, 48).translate(0, 0, -20),
);
stage.part('sun', sun.finish('steel'), { material: 'mild-steel' }).connector('axis', axis([0, 0, 0]));

// --- Planets ------------------------------------------------------------------
const planetAngles: number[] = [];
for (let i = 0; i < NP; i++) planetAngles.push((360 / NP) * i);
planetAngles.forEach((th, i) => {
  // Mesh phase: the sun has a tooth centred on 0 deg; put a planet GAP where
  // the sun's tooth phase at angle th demands it.
  const sunPhase = ((th * ZS) / 360) % 1;
  const spin = th + 180 - (0.5 - sunPhase) * (360 / ZP);
  const c: [number, number, number] = [CARRIER_R * Math.cos(th * Math.PI / 180), CARRIER_R * Math.sin(th * Math.PI / 180), 0];
  const planet = spurGear({ module: M, teeth: ZP, faceWidth: FACE, bore: PLANET_BORE, backlash: BACKLASH })
    .rotateZ(spin)
    .translate(c[0], c[1], GEAR_Z);
  stage.part(`planet-${i + 1}`, planet.finish('brass'), { material: 'mild-steel' }).connector('axis', axis(c));
});

// --- Carrier: plate + pins + output shaft -----------------------------------
const plateZ = GEAR_Z + FACE + 0.5;
const pins = planetAngles.map((th) =>
  cylinder(FACE + 0.5, PIN_R, 32).translate(CARRIER_R * Math.cos(th * Math.PI / 180), CARRIER_R * Math.sin(th * Math.PI / 180), GEAR_Z + 0.5),
);
// Open three-arm spider so the gears stay visible from above.
const arms = planetAngles.map((th) =>
  box(CARRIER_R, 9, 4, false).translate(0, -4.5, plateZ).rotateZ(th),
);
const pads = planetAngles.map((th) =>
  cylinder(4, PIN_R + 4, 48).translate(CARRIER_R * Math.cos(th * Math.PI / 180), CARRIER_R * Math.sin(th * Math.PI / 180), plateZ),
);
const carrier = union(
  cylinder(4, 11, 64).translate(0, 0, plateZ),
  cylinder(18, 6, 48).translate(0, 0, plateZ + 3.9),
  ...arms,
  ...pads,
  ...pins,
);
const carrierPart = stage.part('carrier', carrier.finish('aluminium'), { material: 'aluminum-6061' }).connector('axis', axis([0, 0, 0]));
planetAngles.forEach((th, i) => {
  carrierPart.connector(`pin-${i + 1}`, axis([CARRIER_R * Math.cos(th * Math.PI / 180), CARRIER_R * Math.sin(th * Math.PI / 180), 0]));
});

// --- Mates, couplings, transmissions -----------------------------------------
// The stage has ONE degree of freedom. It is declared on the carrier mate and
// the sun and planets are coupled to it at the planetary ratios; with the
// ring held, a sun turn of 1/CARRIER_RATIO x the carrier angle is exactly the
// reduction (sun in, carrier out). Declaring the DoF on the carrier keeps every
// coupled gear moving together when the checker poses the source mate.
stage.mate('carrier-turn', 'housing.carrier-axis', 'carrier.axis', 'revolute', { limitsDeg: [-90, 90], pose: carrierDeg, exposure: 'concealed' });
stage.mate('sun-drive', 'housing.sun-axis', 'sun.axis', 'revolute', { exposure: 'concealed' });
stage.coupleMates('sun-drive', { source: 'carrier-turn', ratio: 1 / CARRIER_RATIO });
stage.transmission('sun-carrier-reduction', {
  kind: 'gear-pair',
  sourceMate: 'carrier-turn',
  drivenMates: ['sun-drive'],
  input: 'sun',
  output: 'carrier',
  path: ['sun', 'planet-1', 'carrier'],
  ratio: 1 / CARRIER_RATIO,
});
planetAngles.forEach((_, i) => {
  const n = i + 1;
  stage.mate(`planet-${n}-spin`, `carrier.pin-${n}`, `planet-${n}.axis`, 'revolute', { exposure: 'concealed' });
  stage.coupleMates(`planet-${n}-spin`, { source: 'carrier-turn', ratio: PLANET_REL_RATIO / CARRIER_RATIO });
  stage.transmission(`planet-${n}-mesh`, {
    kind: 'gear-pair',
    sourceMate: 'carrier-turn',
    drivenMates: [`planet-${n}-spin`],
    input: 'sun',
    output: `planet-${n}`,
    path: ['sun', `planet-${n}`],
    ratio: PLANET_REL_RATIO / CARRIER_RATIO,
  });
});

animationView({ param: 'carrierDeg', from: -72, to: 72, durationMs: 6000, fps: 20 });

return stage.solvedModel({});
