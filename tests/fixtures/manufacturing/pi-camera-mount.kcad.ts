// Manufacturing benchmark case 04 (#1227): a robot-camera adapter mount, the
// named-interface adapter case.
//
// Prompt: "FDM PETG bracket that holds a Raspberry Pi Camera Module 2/3 on
// the top face of a 2020 aluminium extrusion. Bolt the base down with two M5
// screws into T-nuts on a 20 mm pitch along the extrusion. Hold the camera
// board on four 2 mm standoffs with M2 clearance holes, so its rear parts
// clear the bracket. The camera must stay on its standoffs when the mount
// height changes."
//
// Parts and interfaces the benchmark checks:
//   - `mount`: 40 x 20 x 4 mm base flange on the extrusion (y = 0..20) with
//     two 5.5 mm M5 clearance holes along Z at x = 10 and x = 30, y = 10;
//     4 mm upright (y = 0..4) with four 2.4 mm M2 clearance holes along Y on
//     the camera's 21 x 12.5 mm pattern, centred at x = 20,
//     z = PatternHeight; four 5 mm x 2 mm standoffs on the front face
//     (y = -2..0) around those holes; connector `camera` on the standoff
//     faces at the pattern centre;
//   - `camera`: the camera board, 25 x 24 x 1 mm with four 2.2 mm holes;
//     connector `seat` on its back face at the pattern centre;
//   - mate: `bolted` (fastened mount.camera -> camera.seat).
// Board outline, hole size and hole positions come from the Raspberry Pi
// Camera Module 2 mechanical drawing (Camera Module 3 keeps the footprint):
// 25 x 23.86 mm board, 2.2 mm holes at 2 mm from the sides and 2 mm and
// 14.5 mm from the bottom edge. The board is a placeholder plate: the lens
// housing and the rear components are not modelled, and no vendor STEP is
// in the catalog.
const patternHeight = param('PatternHeight', 30, { unit: 'mm', min: 20, max: 60 });

const alongY = (length: number, radius: number) => cylinder(length, radius).rotate([1, 0, 0], -90);
const pattern: Array<[number, number]> = [[-10.5, -6.25], [10.5, -6.25], [-10.5, 6.25], [10.5, 6.25]];

// The mount is authored in world coordinates, then moved so that its
// `camera` connector sits at the local origin: mate connector origins take
// numbers only, so PatternHeight reaches the world through the mount `at`.
let mount = box(40, 20, 4).union(box(40, 4, patternHeight.add(10)));
for (const [dx, dz] of pattern) {
  mount = mount.union(alongY(2, 2.5).translate(20 + dx, -2, patternHeight.add(dz)));
}
for (const [dx, dz] of pattern) {
  mount = mount.subtract(alongY(8, 1.2).translate(20 + dx, -3, patternHeight.add(dz)));
}
for (const x of [10, 30]) {
  mount = mount.subtract(cylinder(6, 2.75).translate(x, 10, -1));
}
mount = mount.translate(-20, 2, patternHeight.negate());

let board = box(25, 1, 23.86).translate(-12.5, -1, -8.25);
for (const [dx, dz] of pattern) {
  board = board.subtract(alongY(3, 1.1).translate(dx, -2, dz));
}

const seat = { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } } as const;
const cameraMount = assembly('pi-camera-mount');
cameraMount.part('mount', mount.color('#3d4a57'), { at: [20, -2, patternHeight] }).connector('camera', seat);
cameraMount.part('camera', board.color('#1f7a3a')).connector('seat', seat);
cameraMount.mate('bolted', 'mount.camera', 'camera.seat', 'fastened');
return cameraMount.solvedModel({}, { validate: 'error' });
