// Load-capacity inner-loop smoke. Builds a single cantilever beam fastened
// to a wall, then runs the closed-form Euler-Bernoulli path three times —
//
//   (1) steel + 50 N tip load   → SF ≈ 5.2, ok=true.
//   (2) PLA + 500 N tip load    → SF ≈ 0.10, K6 fires.
//   (3) part without crossSection → K7 beam-not-applicable.
//
// Verifies that the new `arm.part(..., { crossSection })` declaration
// round-trips into the closed-form path, that K6 / K7 emit with the
// canonical hint + nextAction, and that source: 'local' is preserved
// across every envelope.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate \
//     --file examples/kinematic/load-capacity-smoke.kcad.ts
//
// Expected console output (last line):
//   [smoke] load-capacity dispatch OK: steelSF≈5.21, plaFailed=true, k7Fired=true

const arm = assembly('load-capacity-smoke');

// Wall: 40 mm cube at the origin. Mating frame at its +X face.
arm
  .part('wall', box(40, 40, 40, true))
  .connector('anchor', {
    type: 'frame',
    origin: { kind: 'vec3', value: [20, 0, 0] },
  });

// Cantilever: a 50×5×200 mm slender beam, root at the wall.
arm
  .part(
    'cantilever',
    box(200, 50, 5, true).translate(100, 0, 0),
    {
      crossSection: {
        kind: 'rectangle',
        widthMm: 50,
        heightMm: 5,
        lengthMm: 200,
      },
    },
  )
  .connector('root', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  });

arm.mate('rootMate', 'wall.anchor', 'cantilever.root', 'fastened');

// ---- 1. Steel cantilever + 50 N → SF ≈ 5.21 -----------------------------
const steel = await kinematic.checkLoadCapacity(
  arm,
  { cantilever: { force: [0, 0, 50] } },
  { materials: { cantilever: { material: 'steel' } } },
);
console.log(
  `[smoke] steel: source=${steel.source} ok=${steel.ok} ` +
    `SF=${steel.safetyFactor.toFixed(3)} ` +
    `elements=${steel.elements.length} diagnostics=${steel.diagnostics.length}`,
);
if (steel.source !== 'local') throw new Error('steel: source != local');
if (!steel.ok) throw new Error('steel: ok unexpectedly false');
if (steel.elements.length !== 1) throw new Error('steel: expected one element');
const expectedSteelSF = 5.208;
const sfDelta = Math.abs(steel.safetyFactor - expectedSteelSF);
if (sfDelta > 0.01)
  throw new Error(
    `steel: SF ${steel.safetyFactor.toFixed(3)} drifts from analytical ${expectedSteelSF} by ${sfDelta.toFixed(4)}`,
  );

// ---- 2. PLA cantilever + 500 N → K6 fires -------------------------------
const pla = await kinematic.checkLoadCapacity(
  arm,
  { cantilever: { force: [0, 0, 500] } },
  { materials: { cantilever: { material: 'pla' } } },
);
const k6 = pla.diagnostics.some((d) => d.code === 'kinematic.load-exceeds-yield');
console.log(
  `[smoke] pla: source=${pla.source} ok=${pla.ok} ` +
    `SF=${pla.safetyFactor.toFixed(3)} ` +
    `failures=${pla.failures.length} K6=${k6}`,
);
if (pla.ok) throw new Error('pla: ok unexpectedly true');
if (!k6) throw new Error('pla: expected K6 kinematic.load-exceeds-yield');
if (pla.failures.length !== 1) throw new Error('pla: expected one failure record');
if (pla.failures[0].reason !== 'stress-exceeds-yield')
  throw new Error(`pla: unexpected failure reason ${pla.failures[0].reason}`);

// ---- 3. Part without crossSection → K7 ----------------------------------
const noSectionArm = assembly('load-capacity-smoke-no-section');
noSectionArm
  .part('wall', box(40, 40, 40, true))
  .connector('anchor', {
    type: 'frame',
    origin: { kind: 'vec3', value: [20, 0, 0] },
  });
noSectionArm
  .part('beam', box(200, 50, 5, true).translate(100, 0, 0))
  .connector('root', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  });
noSectionArm.mate('rootMate', 'wall.anchor', 'beam.root', 'fastened');

const notApplicable = await kinematic.checkLoadCapacity(
  noSectionArm,
  { beam: { force: [0, 0, 50] } },
  { materials: { beam: { material: 'steel' } } },
);
const k7 = notApplicable.diagnostics.some(
  (d) => d.code === 'kinematic.load.beam-not-applicable',
);
console.log(
  `[smoke] no-crossSection: source=${notApplicable.source} ` +
    `elements=${notApplicable.elements.length} K7=${k7}`,
);
if (!k7) throw new Error('no-crossSection: expected K7 kinematic.load.beam-not-applicable');
if (notApplicable.elements.length !== 0)
  throw new Error('no-crossSection: expected zero elements computed');

console.log(
  `[smoke] load-capacity dispatch OK: steelSF≈${steel.safetyFactor.toFixed(2)}, ` +
    `plaFailed=${!pla.ok}, k7Fired=${k7}`,
);

// Return the cantilever scene at the load pose so `kernelcad evaluate`
// finishes cleanly. The wall + beam don't share BREP volume here (the
// connector frames are coincident on the +X face of the wall, the beam's
// shape starts at x = 0 relative to its 'root' connector); the harness's
// default interference gate has nothing to flag.
return arm.solvedModel({});
