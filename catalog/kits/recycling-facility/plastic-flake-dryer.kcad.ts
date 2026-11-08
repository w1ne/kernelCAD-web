// SPDX-License-Identifier: CC0-1.0
// Plastic flake dryer: the vertical centrifugal (dewatering) dryer at the end
// of a plastics wash line. Wet flake is screwed in at the bottom, a fast
// paddle rotor flings it up and round inside a screen so the water is spun
// out, and the dry flake is blown up a duct into a cyclone that drops it into
// a big bag. What makes it that machine rather than a cabinet: a tall round
// stainless housing on a leg frame with the paddle rotor shown through the
// open access door, a top motor with a belt guard over the rotor shaft, an
// inclined wet-flake screw feeder from a floor hopper, a water drain into a
// tray, a pneumatic duct arching over to a cyclone on a tall stand, a rotary
// valve under the cone and a filling big bag hanging in its frame.
// Generic visualization geometry at about real size (dryer 3.3 m tall,
// cyclone stack to 3.9 m), millimetres, Z up, feed on -X, front on -Y.

meta({
  name: "plastic-flake-dryer",
  license: 'CC0-1.0',
  title: "Plastic flake dryer",
  description: "Vertical centrifugal dewatering dryer for washed plastic flake at about real size: tall stainless housing on a leg frame with the paddle rotor behind an open (or closed) access door, top motor with belt guard, inclined wet-flake screw feeder from a floor hopper, water drain to a tray, pneumatic duct over to a cyclone on a stand, rotary valve and a filling big bag. Material controls: stainless housing, frame paint, motor paint and plastic flake. plant, weathered, petLine and highVisibility presets.",
  tags: ["recycling", "flake dryer", "centrifugal dryer", "dewatering", "cyclone", "big bag", "fibc", "plastics washing", "pet", "materials recovery", "waste management", "plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#c2c8ca', { label: 'Dryer housing, duct and cyclone (stainless)' });
const frame = param('frame', '#2f6f8f', { label: 'Frames and stands (paint)' });
const motor = param('motor', '#3d7a3f', { label: 'Motors and feeder (paint)' });
const flake = param('flake', '#e7d9a8', { label: 'Plastic flake' });
const door = param('door', 'open', { choices: ['open', 'closed'], label: 'Access door' });

presets({
  plant: { housing: '#c2c8ca', frame: '#2f6f8f', motor: '#3d7a3f', flake: '#e7d9a8' },
  weathered: { housing: '#a3a9a8', frame: '#5a6062', motor: '#56624f', flake: '#c9c0a0' },
  petLine: { housing: '#cdd2d4', frame: '#3a3f44', motor: '#2f5d9a', flake: '#9fd3ea' },
  highVisibility: { housing: '#cdd2d4', frame: '#f0c419', motor: '#c8322a', flake: '#6fbf6a' },
});

const p = assembly("plastic-flake-dryer");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const ngon = (r: number, n: number) => {
  let q = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) q = q.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return q.close();
};
const loftZ = (profiles: ReturnType<typeof rect>[], zs: number[], x: number, y = 0) => profiles[0].loft(profiles.slice(1), {
  planes: zs.map((z) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
  ruled: true,
});
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const dark = '#2b2f33';
const bagCloth = '#ece8dc';

// Dryer housing: a hollow stainless drum on a leg frame; the open door is a window in its front.
const DZ0 = 450, DZ1 = 2700, R = 460;
const isOpen = door.value === 'open';
let shell = cylinder(DZ1 - DZ0, R, 20).translate(0, 0, DZ0).subtract(cylinder(DZ1 - DZ0 - 80, R - 14, 20).translate(0, 0, DZ0 + 40));
if (isOpen) shell = shell.subtract(blk(0, -R, DZ0 + 350, 560, 400, 1400));
add("housing", shell.color(housing));
add("housing-base-cone", ngon(R, 20).loft([ngon(220, 20)], { planes: [DZ0, DZ0 - 220].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })), ruled: true }).color(housing));
for (const z of [DZ0 + 20, 1550, DZ1 - 40]) add(`housing-flange-${z}`, cylinder(40, R + 30, 20).translate(0, 0, z).color(frame));
add("top-cover", cylinder(60, R + 40, 20).translate(0, 0, DZ1).color(housing));
if (isOpen) {
  // Door swung open on a hinge at the left edge of the window.
  add("door-panel", blk(0, 0, DZ0 + 350, 560, 20, 1400).translate(280, 0, 0).rotateZ(-110).translate(-280 - 10, -R - 10, 0).color(housing));
  add("door-hinge", cylinder(1400, 20, 8).translate(-290, -R - 10, DZ0 + 350).color(dark));
  add("rotor-shaft", cylinder(DZ1 - DZ0 - 40, 70, 12).translate(0, 0, DZ0 + 20).color(dark));
  for (let k = 0; k < 9; k++) add(`rotor-paddle-${k}`, box(R * 1.7, 50, 120, true).rotateX(18).rotateZ(k * 40).translate(0, 0, DZ0 + 420 + k * 150).color('#8f979c'));
  add("screen-basket", cylinder(1400, R - 60, 20).translate(0, 0, DZ0 + 350).subtract(cylinder(1500, R - 76, 20).translate(0, 0, DZ0 + 300)).subtract(blk(0, -R, DZ0 + 300, 520, 500, 1500)).color('#6f777b'));
} else {
  add("door-panel", blk(0, -R - 8, DZ0 + 350, 600, 24, 1440).color(housing));
  for (const z of [DZ0 + 600, DZ0 + 1500]) add(`door-clamp-${z}`, blk(260, -R - 30, z, 60, 40, 120).color(dark));
  add("door-window", blk(0, -R - 22, DZ0 + 900, 260, 10, 300).color('#4c6878'));
}
for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  add(`leg-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x * 520, y * 520, 0, 100, 100, DZ0 + 300).color(frame));
  add(`foot-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x * 520, y * 520, 0, 200, 200, 20).color(frame));
}
add("leg-ring", blk(0, 0, DZ0 + 200, 1140, 1140, 100).subtract(blk(0, 0, DZ0 + 150, 940, 940, 200)).color(frame));

// Top drive: motor beside the rotor shaft with the belt guard between them.
add("motor-base", blk(560, 0, DZ1 + 60, 420, 420, 60).color(frame));
add("motor", cylinder(560, 200, 16).translate(560, 0, DZ1 + 120).color(motor));
add("motor-fan-cover", cylinder(50, 210, 16).translate(560, 0, DZ1 + 680).color(dark));
add("belt-guard", blk(280, 0, DZ1 + 120, 900, 320, 180).color('#f0c419'));
add("bearing-housing", cylinder(120, 140, 14).translate(0, 0, DZ1 + 60).color(motor));

// Wet-flake screw feeder: a floor hopper on -X and an inclined tube into the housing.
const FX = -1900, FZ = 900;
add("feed-hopper", loftZ([rect(500, 500), rect(1100, 1000), rect(1140, 1040)], [FZ - 200, FZ + 260, FZ + 300], FX)
  .subtract(loftZ([rect(440, 440), rect(1040, 940), rect(1080, 980)], [FZ - 210, FZ + 260, FZ + 310], FX)).color(motor));
add("hopper-flake", sphere(380).scale([1.3, 1.2, 0.3]).translate(FX, 0, FZ + 240).color(flake));
for (const x of [-1, 1]) for (const y of [-1, 1]) add(`hopper-leg-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(FX + x * 420, y * 380, 0, 70, 70, FZ - 100).color(frame));
add("screw-tube", rod([FX + 100, 0, FZ - 260], [-R + 40, 0, DZ0 + 260], 150, 14).color(motor));
add("screw-motor", cylinder(380, 140, 12).rotateY(90).translate(FX - 620, 0, FZ - 260).color(motor));
add("screw-gearbox", blk(FX - 200, 0, FZ - 420, 220, 300, 320).color(dark));
add("screw-tube-stand", blk(-1000, 0, 0, 80, 80, 760).color(frame));

// Water drain to a tray on the back.
add("drain-pipe", rod([0, 0, DZ0 - 220], [0, 900, 380], 60).color(dark));
add("drain-tray", blk(0, 1000, 0, 900, 600, 380).subtract(blk(0, 1000, 60, 840, 540, 400)).color(frame));
add("drain-water", blk(0, 1000, 60, 840, 540, 240).color('#6f8c9a'));

// Pneumatic duct from the top of the housing over to the cyclone.
const CX = 1750, CZ0 = 2500, CZ1 = 3300, CR = 420;
add("duct-riser", cylinder(820, 110, 12).translate(-260, 0, DZ1 + 60).color(housing));
add("duct-bend", sphere(110).translate(-260, 0, DZ1 + 880).color(housing));
add("duct-run", rod([-260, 0, DZ1 + 880], [CX - CR - 40, 0, CZ1 - 160], 110, 12).color(housing));
add("duct-inlet", blk(CX - CR - 80, 0, CZ1 - 320, 220, 260, 300).color(housing));
add("blower", cylinder(260, 280, 16).rotateX(90).translate(-260, 130, DZ1 + 380).color(motor));

// Cyclone on a tall stand, rotary valve and a filling big bag.
add("cyclone-barrel", cylinder(CZ1 - CZ0, CR, 20).translate(CX, 0, CZ0).color(housing));
add("cyclone-cone", ngon(CR, 20).loft([ngon(110, 20)], { planes: [CZ0, CZ0 - 900].map((z) => ({ plane: 'XY' as const, origin: [CX, 0, z] as [number, number, number] })), ruled: true }).color(housing));
add("cyclone-roof", cylinder(40, CR + 30, 20).translate(CX, 0, CZ1).color(frame));
add("vortex-finder", cylinder(500, 140, 14).translate(CX, 0, CZ1 + 40).color(housing));
add("exhaust-cap", cylinder(40, 200, 14).translate(CX, 0, CZ1 + 540).color(dark));
add("rotary-valve", blk(CX, 0, CZ0 - 1160, 300, 300, 260).color(motor));
add("valve-motor", cylinder(260, 90, 12).rotateX(90).translate(CX, -150, CZ0 - 1030).color(dark));
const SH = 2300;
for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(`stand-leg-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(CX + x * 560, y * 560, 0, 100, 100, SH + 200).color(frame));
add("stand-ring", blk(CX, 0, SH + 100, 1220, 1220, 120).subtract(blk(CX, 0, SH + 50, 1020, 1020, 220)).color(frame));
for (const z of [1500]) add(`bag-beam-${z}`, blk(CX, 0, z, 1220, 1220, 80).subtract(blk(CX, 0, z - 50, 1020, 1020, 180)).color(frame));
add("big-bag", loftZ([rect(900, 900), rect(1000, 1000), rect(980, 980), rect(840, 840)], [60, 300, 1150, 1300], CX).color(bagCloth));
add("bag-flake-top", sphere(330).scale([1.2, 1.2, 0.35]).translate(CX, 0, 1260).color(flake));
add("bag-spout", cylinder(160, 120, 12).translate(CX, 0, 1290).color(bagCloth));
for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(`bag-loop-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, rod([CX + x * 420, y * 420, 1280], [CX + x * 500, y * 500, 1540], 18, 6).color(bagCloth));
add("bag-pallet", blk(CX, 0, 0, 1100, 1100, 60).color('#a07a4a'));

// Control box on the dryer frame.
add("control-post", blk(-1050, -560, 0, 80, 80, 1300).color(frame));
add("control-box", blk(-1050, -640, 900, 360, 160, 460).color('#d9d9d4'));
add("estop", cylinder(30, 48, 10).rotateX(90).translate(-950, -720, 1260).color('#d62f2a'));
add("ammeter", blk(-1130, -725, 1180, 120, 10, 100).color(dark));

return p.model();
