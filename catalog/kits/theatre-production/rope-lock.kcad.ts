// SPDX-License-Identifier: CC0-1.0
// Rope lock: the cam lock on a counterweight fly-rail that clamps a lineset's
// purchase line so the batten stays where it was trimmed.
// What makes it a rope lock rather than a box on a beam: a cast housing
// bolted on top of the steel locking rail, the two strands of the purchase
// line running straight up through it, a long lever on a front pivot with a
// coloured grip, a steel safety ring that drops over the lever when it is
// locked, a white set-name card on the rail face, and coloured trim tape
// spiked onto the rope. A choice swings the lever between locked and
// released.
// Generic visualization geometry at about real size (0.78 m rail section on
// two floor stanchions, rail top at 0.95 m, rope up to 1.8 m), millimetres,
// Z up, lever toward -Y, standing on z = 0.

meta({
  name: "rope-lock",
  license: 'CC0-1.0',
  title: "Rope lock",
  description: "Counterweight fly-rail rope lock at about real size: cast housing bolted on a steel angle locking rail carried by two floor stanchions, purchase line strands running up through it with coloured trim tape, long lever on a front pivot with a coloured grip, safety ring and a white set-name card on the rail face. Material controls: locking rail, lock casting, lever grip, purchase line; lever locked or released. houseShow, touring and heritageRail presets.",
  tags: ['rope lock', 'rope brake', 'locking rail', 'counterweight system', 'fly rail', 'rigging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const lever = param('lever', 'locked', { choices: ['locked', 'released'], label: 'Lever position' });

const rail = param('rail', '#2b2f33', { label: 'Locking rail and stanchions' });
const casting = param('casting', '#5d6a72', { label: 'Lock casting and lever' });
const grip = param('grip', '#d0302a', { label: 'Lever grip' });
const rope = param('rope', '#d8cfb4', { label: 'Purchase line' });

presets({
  houseShow: { rail: '#2b2f33', casting: '#5d6a72', grip: '#d0302a', rope: '#d8cfb4' },
  touring: { rail: '#3a4046', casting: '#c9a227', grip: '#1f2326', rope: '#2a2d30' },
  heritageRail: { rail: '#4a3a2c', casting: '#2c3034', grip: '#b8b2a2', rope: '#c49b5a' },
});

const CARD = '#f2f0e8';
const INK = '#2a2c2e';
const STEEL = '#a6aeb2';
const TAPE_A = '#e2362b';
const TAPE_B = '#2f7fd0';

const p = assembly("rope-lock");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const RZ = 950; // locking rail top
const PX = -80; // lever pivot y
const PZ = RZ + 45; // lever pivot z
const LOCKED = lever.value !== 'released';

// Floor stanchions with base plates, and the steel angle locking rail.
for (const [s, x] of [["left", -330], ["right", 330]] as [string, number][]) {
  add(`stanchion-${s}`, box(60, 60, RZ - 10, true).translate(x, 0, (RZ - 10) / 2).color(rail));
  add(`base-plate-${s}`, box(170, 170, 10, true).translate(x, 0, 5).color(rail));
}
add("rail-top", box(780, 130, 12, true).translate(0, 0, RZ - 6).color(rail));
add("rail-face", box(780, 12, 120, true).translate(0, -59, RZ - 60).color(rail));
add("set-card", box(260, 4, 64, true).translate(0, -67, RZ - 58).color(CARD));
for (const [i, w] of [[0, 150], [1, 90]] as [number, number][])
  add(`set-card-text-${i}`, box(w, 3, 10, true).translate(-40 + i * -30, -70, RZ - 46 - i * 24).color(INK));

// Cast lock housing on the rail with its hold-down bolts and front pivot lugs.
add("housing", extrudeRoundedRect(150, 210, 22, 150, { axis: 'y' }).translate(0, -60, RZ + 105).color(casting));
add("housing-cap", extrudeRoundedRect(170, 24, 10, 170, { axis: 'y' }).translate(0, -70, RZ + 222).color(casting));
for (const x of [-60, 60]) add(`hold-down-${x > 0 ? 'r' : 'l'}`, cylinder(14, 16, 6).translate(x, 70, RZ).color(STEEL));
for (const [s, x] of [["left", -50], ["right", 50]] as [string, number][])
  add(`pivot-lug-${s}`, box(16, 40, 60, true).translate(x, PX + 10, PZ).color(casting));
add("pivot-pin", cylinder(130, 11, 12).rotateY(90).translate(-65, PX, PZ).color(STEEL));

// Lever: built standing up from the pivot, then swung about it.
const ANGLE = LOCKED ? -2 : 72;
const swing = (s: Shape) => s.rotateX(ANGLE).translate(0, PX, PZ);
add("lever-arm", swing(box(40, 26, 340, true).translate(0, 0, 160)).color(casting));
add("lever-grip", swing(cylinder(120, 24, 14).translate(0, 0, 300)).color(grip));
add("lever-knob", swing(sphere(28).translate(0, 0, 425)).color(grip));

// Safety ring: over the lever and housing cap when locked, hanging when released.
if (LOCKED) add("safety-ring", torus(78, 8, 20).translate(0, -40, RZ + 260).color(STEEL));
else add("safety-ring", torus(60, 8, 20).rotateY(90).translate(86, 0, RZ + 150).color(STEEL));
add("ring-chain", cylinder(80, 4, 6).translate(86, 0, RZ + 210).color(STEEL));

// Purchase line strands up through the lock, with coloured trim spikes.
for (const [s, x] of [["on", -36], ["off", 36]] as [string, number][]) {
  add(`rope-${s}`, cylinder(1800, 15, 12).translate(x, 15, 0).color(rope));
}
add("trim-tape-red", cylinder(36, 16.5, 12).translate(-36, 15, 1480).color(TAPE_A));
add("trim-tape-blue", cylinder(36, 16.5, 12).translate(-36, 15, 1600).color(TAPE_B));

return p.model();
