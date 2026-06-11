// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Load-capacity eval — a 200×50×5 mm cantilever bracket fastened to a wall.
// Steel + 50 N tip load: ok=true, SF ≈ 5.2. PLA + 500 N: K6 fires (stress
// exceeds yield). Both branches assert in-script via throw so a clean
// evaluate <=> the closed-form beam path returned both expected outcomes.

const arm = assembly('kinematic-load-bracket');

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

// ---- Steel + 50 N tip load → ok=true, SF >= 4 ----
const steel = await kinematic.checkLoadCapacity(
  arm,
  { cantilever: { force: [0, 0, 50] } },
  { materials: { cantilever: { material: 'steel' } } },
);
if (steel.source !== 'local') throw new Error('steel: source must be local');
if (!steel.ok) throw new Error('steel: expected ok=true under 50 N');
if (steel.safetyFactor < 4) {
  throw new Error(`steel: SF ${steel.safetyFactor} unexpectedly below 4`);
}
if (steel.elements.length !== 1) {
  throw new Error(`steel: expected one element; got ${steel.elements.length}`);
}

// ---- PLA + 500 N tip load → K6 fires ----
const pla = await kinematic.checkLoadCapacity(
  arm,
  { cantilever: { force: [0, 0, 500] } },
  { materials: { cantilever: { material: 'pla' } } },
);
if (pla.ok) throw new Error('pla: expected ok=false under 500 N');
const k6 = pla.diagnostics.some((d) => d.code === 'kinematic.load-exceeds-yield');
if (!k6) {
  const codes = pla.diagnostics.map((d) => d.code).join(', ') || '(none)';
  throw new Error(`pla: expected K6 kinematic.load-exceeds-yield; codes=${codes}`);
}
if (pla.failures.length !== 1) {
  throw new Error(`pla: expected one failure record; got ${pla.failures.length}`);
}
if (pla.failures[0].reason !== 'stress-exceeds-yield') {
  throw new Error(`pla: unexpected failure reason '${pla.failures[0].reason}'`);
}

return arm.solvedModel({});
