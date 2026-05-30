// expected: ['kinematic.load-exceeds-yield']
//
// Snippet 3 — checkLoadCapacity in beam mode on a cantilever bracket.
//
// 200×50×5 mm slender rectangular bracket fastened to a wall, with a 50 N
// tip load along -Z. First runs with steel (yield ≈ 250 MPa) — comfortable
// safety factor. Then re-runs with PLA (yield ≈ 50 MPa) — K6 fires because
// the same tip load now exceeds the PLA yield.

const arm = assembly('cookbook-cantilever-beam');

arm
  .part('wall', box(40, 40, 40, true))
  .connector('anchor', { type: 'frame', origin: { kind: 'vec3', value: [20, 0, 0] } });

arm
  .part(
    'cantilever',
    box(200, 50, 5, true).translate(100, 0, 0),
    {
      crossSection: {
        kind: 'rectangle', widthMm: 50, heightMm: 5, lengthMm: 200,
      },
    },
  )
  .connector('root', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

arm.mate('rootMate', 'wall.anchor', 'cantilever.root', 'fastened');

// Steel — safety factor ≈ 5.2, ok=true.
const steel = await kinematic.checkLoadCapacity(
  arm,
  { cantilever: { force: [0, 0, 50] } },
  { materials: { cantilever: { material: 'steel' } } },
);
if (steel.source !== 'local') throw new Error('steel: source !== local');
if (!steel.ok) throw new Error('steel: expected ok=true');
if (steel.safetyFactor < 4) throw new Error(`steel: SF ${steel.safetyFactor} unexpectedly low`);

// PLA — same load, much lower yield → K6 fires.
const pla = await kinematic.checkLoadCapacity(
  arm,
  { cantilever: { force: [0, 0, 500] } },
  { materials: { cantilever: { material: 'pla' } } },
);
if (pla.ok) throw new Error('pla: expected ok=false');
const k6 = pla.diagnostics.some((d) => d.code === 'kinematic.load-exceeds-yield');
if (!k6) throw new Error('pla: expected K6 kinematic.load-exceeds-yield');
if (pla.failures.length !== 1) throw new Error(`pla: expected one failure; got ${pla.failures.length}`);

return arm.solvedModel({});
