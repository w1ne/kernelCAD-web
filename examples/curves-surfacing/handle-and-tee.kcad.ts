// Curves-surfacing slice: rail loft + G2 bridge + surface intersection.
//
// A grip whose side profile follows two rails, a G2 blend into a mounting
// boss, and a pipe-tee weld seam taken from the cylinder-cylinder section.
//
// RUN
//   npx tsx src/agent/cli/index.ts evaluate examples/curves-surfacing/handle-and-tee.kcad.ts
//
// EXPECTED (measured 2026-09-14):
//   Features: 22 (two bodies: handle, welded tee)
//   OK

const start = path().moveTo(-8, -5).lineTo(8, -5).lineTo(8, 5).lineTo(-8, 5).close();
const end = path().moveTo(-6, -4).lineTo(6, -4).lineTo(6, 4).lineTo(-6, 4).close();
const railL = nurbsCurve([[-8, -5, 0], [-10, -6, 20], [-6, -4, 40]], { degree: 2 });
const railR = nurbsCurve([[8, -5, 0], [10, -6, 20], [6, -4, 40]], { degree: 2 });
const grip = start.loft(end, {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, 40] },
  ],
  rails: [railL, railR],
});

const leftFlank = spline3d([[-16, 0, 48], [-10, 3, 46], [-4, 0, 44]]);
const rightFlank = spline3d([[4, 0, 44], [10, 3, 46], [16, 0, 48]]);
const crown = curveBridge(leftFlank, rightFlank, { continuity: 'G2' });
const ribProfile = path().moveTo(-1.2, -1.2).lineTo(1.2, -1.2).lineTo(1.2, 1.2).lineTo(-1.2, 1.2).close();
const rib = variableSweep(crown, [
  { t: 0, profile: ribProfile },
  { t: 1, profile: path().moveTo(-1.2, -1.2).lineTo(1.2, -1.2).lineTo(1.2, 1.2).lineTo(-1.2, 1.2).close() },
]);

// The boss sinks 0.5 mm into the grip: resting exactly on the loft's top face
// (z = 40) the fuse kept them as two solids touching face to face.
const boss = cylinder(12.5, 7).translate(0, 0, 39.5);

const run = cylinder(36, 7).translate(40, 0, 0);
const branch = cylinder(22, 5).rotateY(90).translate(28, 0, 18);
const tee = run.union(branch);
const seams = await surfaceIntersection(run, branch);
const weldHit = seams[0].pointAt(0.5);
const weldMark = sphere(1.2).translate(weldHit[0], weldHit[1], weldHit[2]);

// Two separate objects: the handle and the welded tee. Returned as two bodies,
// not fused: one union() of both was two solids 19 mm apart
// (union.disconnected).
const handle = grip.union(boss).union(rib);
const weldedTee = tee.union(weldMark);
return [handle, weldedTee];
