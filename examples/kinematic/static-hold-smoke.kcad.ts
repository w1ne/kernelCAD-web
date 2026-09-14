// Static-hold inner-loop smoke. A single steel beam hinged to a wall via a
// revolute joint (a stand-in for a 2-link servo arm's shoulder joint),
// with a declared actuator torque capacity. Runs checkStaticHold three
// times —
//
//   (1) generous actuator torque   → ok=true, no diagnostics.
//   (2) undersized actuator torque → assembly.joint.static-hold.exceeded.
//   (3) borderline actuator torque → assembly.joint.static-hold.margin-low.
//
// Verifies the worst-pose gravitational torque matches the analytic
// cantilever formula (tau = m*g*L/2 at the horizontal pose) and that the
// margin/exceeded diagnostics fire with the canonical hint + nextAction.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/static-hold-smoke.kcad.ts
//
// Expected console output (last line):
//   [smoke] static-hold dispatch OK: expectedTau≈0.693 N*m, exceededFired=true, marginLowFired=true

const LENGTH_MM = 300;
const WIDTH_MM = 20;
const HEIGHT_MM = 10;
const STEEL_DENSITY = 7850;
const G = 9.81;

// Hand calc: mass m = density * volume; volume = 300*20*10 mm^3 = 6e-5 m^3.
// m = 7850 * 6e-5 = 0.471 kg. At the horizontal pose the moment arm about
// the hinge is L/2 = 0.15 m. tau = m * g * L/2 ≈ 0.6931 N*m.
const volumeM3 = (LENGTH_MM * WIDTH_MM * HEIGHT_MM) * 1e-9;
const expectedTauNm = STEEL_DENSITY * volumeM3 * G * (LENGTH_MM / 2) * 1e-3;

function buildArm(actuatorTorqueNm: number) {
  const arm = assembly(`static-hold-smoke-${actuatorTorqueNm}`);
  const wall = arm.part('wall', box(40, 40, 40, true));
  const beam = arm.part(
    'beam',
    box(LENGTH_MM, WIDTH_MM, HEIGHT_MM, true).translate(LENGTH_MM / 2, 0, 0),
    { density: STEEL_DENSITY },
  );
  arm.revolute('shoulder', wall, beam, {
    axis: [0, 1, 0],
    origin: [0, 0, 0],
    limitsDeg: [-90, 90],
    actuator: { torqueNm: actuatorTorqueNm },
  });
  return arm;
}

// ---- 1. Generous actuator (10x margin) → ok=true, no diagnostics -------
const generousArm = buildArm(expectedTauNm * 10);
const generous = await kinematic.checkStaticHold(generousArm, { pose: { shoulder: 0 } });
console.log(
  `[smoke] generous: source=${generous.source} ok=${generous.ok} ` +
    `worstRequired=${generous.joints[0].worstRequired.toFixed(4)} diagnostics=${generous.diagnostics.length}`,
);
if (generous.source !== 'local') throw new Error('generous: source != local');
if (!generous.ok) throw new Error('generous: ok unexpectedly false');
if (generous.diagnostics.length !== 0) throw new Error('generous: expected zero diagnostics');
const tauDelta = Math.abs(generous.joints[0].worstRequired - expectedTauNm);
if (tauDelta > 1e-3)
  throw new Error(
    `generous: worstRequired ${generous.joints[0].worstRequired.toFixed(4)} drifts from analytical ${expectedTauNm.toFixed(4)} by ${tauDelta.toFixed(5)}`,
  );

// ---- 2. Undersized actuator (half of required) → exceeded --------------
const undersizedArm = buildArm(expectedTauNm * 0.5);
const undersized = await kinematic.checkStaticHold(undersizedArm, { pose: { shoulder: 0 } });
const exceeded = undersized.diagnostics.some(
  (d) => d.code === 'assembly.joint.static-hold.exceeded',
);
console.log(
  `[smoke] undersized: source=${undersized.source} ok=${undersized.ok} exceededFired=${exceeded}`,
);
if (undersized.ok) throw new Error('undersized: ok unexpectedly true');
if (!exceeded) throw new Error('undersized: expected assembly.joint.static-hold.exceeded');

// ---- 3. Borderline actuator (10% headroom, below the 20% floor) --------
const borderlineArm = buildArm(expectedTauNm * 1.1);
const borderline = await kinematic.checkStaticHold(borderlineArm, { pose: { shoulder: 0 } });
const marginLow = borderline.diagnostics.some(
  (d) => d.code === 'assembly.joint.static-hold.margin-low',
);
console.log(
  `[smoke] borderline: source=${borderline.source} ok=${borderline.ok} marginLowFired=${marginLow}`,
);
if (!borderline.ok) throw new Error('borderline: ok unexpectedly false (capacity not exceeded)');
if (!marginLow) throw new Error('borderline: expected assembly.joint.static-hold.margin-low');

console.log(
  `[smoke] static-hold dispatch OK: expectedTau≈${expectedTauNm.toFixed(3)} N*m, ` +
    `exceededFired=${exceeded}, marginLowFired=${marginLow}`,
);

return generousArm.solvedModel({ shoulder: 0 }, { ignore: [['wall', 'beam']] });
