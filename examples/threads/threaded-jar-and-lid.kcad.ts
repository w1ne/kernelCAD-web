// Threaded jar and screw lid: a 70 mm jar whose neck carries a real ISO
// metric M64 × 4 external thread, and a lid with the matching internal thread
// cut by threadedHole({ modeled: true }). Both threads are right-hand; the lid
// sits on a whole pitch so the threads are in phase and the parts keep
// `rodPlay + lidPlay` of clearance (no interference).
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/threads/threaded-jar-and-lid.kcad.ts
//
// Expected console output:
//   OK

const thread = isoThread('M64x4'); // custom size: any 'M<d>x<pitch>' works
const P = thread.pitch;

const bodyR = 35; // Ø70 jar
const bodyH = 68; // shoulder height
const wall = 2.5;
const floor = 3;
const neckTurns = 4;
const neckH = neckTurns * P; // 16 mm of thread
const neckBoreR = 27; // ≥ 2.5 mm under the thread root (Ø59.7)

// Printed-fit play: taken off the jar's thread and added to the lid's.
const rodPlay = 0.2; // ≤ pitch / 10
const lidPlay = 0.3; // ≤ pitch / 8

// Jar: body + threaded neck, then hollowed. threadedRod starts at z = 0 with
// the ridge crossing +X at every whole pitch; lifting it by bodyH (a whole
// number of pitches: 68 = 17 × 4) keeps that phase in world z.
const neck = threadedRod({ spec: thread.spec, length: neckH, clearance: rodPlay }).translate(0, 0, bodyH);
const jar = cylinder(bodyH, bodyR)
  .fillet(2, { face: 'bottom' })
  .union(neck)
  .subtract(
    cylinder(bodyH - floor, bodyR - wall).translate(0, 0, floor),
    cylinder(neckH + 2, neckBoreR).translate(0, 0, bodyH - 1),
  );

// Lid: a solid cap with the internal thread tapped up from its open bottom.
// The thread stops short of the 3 mm top; grip ribs run round the skirt.
const lidR = 36.5;
const lidH = neckH + 5;
const lidTop = 3;
let lid = cylinder(lidH, lidR).threadedHole('bottom', {
  u: 0,
  v: 0,
  spec: thread.spec,
  depth: lidH - lidTop,
  modeled: true,
  clearance: lidPlay,
});
const rib = box(1.6, 1.2, lidH - 2).translate(lidR - 0.4, -0.6, 1);
lid = lid.union(rib.patternCircular({ count: 36, axis: [0, 0, 1] }));

// Seat the lid one pitch above the shoulder: its entry face is then on a
// whole pitch (72 = 18 × 4), so the groove meets the ridge in phase.
const arm = assembly('threaded-jar-and-lid');
arm.part('jar', jar, { material: 'petg' });
arm.part('lid', lid, { material: 'petg', at: [0, 0, bodyH + P] });
return arm.model();
