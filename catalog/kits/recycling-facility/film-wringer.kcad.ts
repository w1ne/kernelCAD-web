// SPDX-License-Identifier: CC0-1.0
// Plastic film wringer: the "squeezer" that takes washed, dripping film
// straight from the float tank and wrings the water out of it with a screw
// before densifying it. What makes it that machine rather than a tank: a
// big hopper of wet film over a horizontal screw barrel, a slotted
// dewatering screen section with water running out of it into a drain
// trough, a heated compression zone wrapped in heater bands under a steam
// hood, a die head with a face cutter chopping the squeezed film into
// popcorn-like agglomerate, a pickup hopper with a pneumatic take-off pipe,
// and a heavy gearbox and motor on the drive end.
// Generic visualization geometry at about real size (5.6 m long, hopper rim
// at 2.3 m), millimetres, Z up, drive on -X, front on -Y.

meta({
  name: "film-wringer",
  license: 'CC0-1.0',
  title: "Plastic film wringer",
  description: "Plastic film squeezer (wringer) at about real size: hopper of wet washed film over a horizontal screw barrel, slotted dewatering screen with water running into a drain trough, heated compression zone with heater bands under a steam hood, die head with a face cutter, agglomerate pickup hopper with pneumatic take-off pipe, gearbox and drive motor on a base frame. Material controls: frame paint, barrel steel, drive paint and plastic film. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "film squeezer", "film wringer", "dewatering", "plastic film", "ldpe", "agglomerate", "screw press", "plastics washing", "materials recovery", "waste management", "plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#4a5d6e', { label: 'Base, pedestals and hood (paint)' });
const barrel = param('barrel', '#b9c0c2', { label: 'Hopper, barrel and screen (steel)' });
const drive = param('drive', '#d0782e', { label: 'Gearbox, motor and cutter (paint)' });
const film = param('film', '#dfe8ee', { label: 'Plastic film' });
const feed = param('feed', 'loaded', { choices: ['loaded', 'empty'], label: 'Hopper' });

presets({
  plant: { frame: '#4a5d6e', barrel: '#b9c0c2', drive: '#d0782e', film: '#dfe8ee' },
  weathered: { frame: '#585e5c', barrel: '#9ea4a4', drive: '#8a6a4a', film: '#cfd2c4' },
  stainless: { frame: '#c4c9cb', barrel: '#d6dadb', drive: '#2f5d9a', film: '#dfe8ee' },
  highVisibility: { frame: '#f0c419', barrel: '#c4c9cb', drive: '#c8322a', film: '#b9dcef' },
});

const p = assembly("film-wringer");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const loftXY = (sections: [number, number, number][], x: number, y = 0) => rect(sections[0][1], sections[0][2]).loft(sections.slice(1).map(([, w, d]) => rect(w, d)), {
  planes: sections.map(([z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
  ruled: true,
});
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const alongX = (x0: number, x1: number, r: number, z: number, seg = 18, y = 0) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, y, z);
const dark = '#2b2f33';
const water = '#7fb0d0';
const heater = '#c6622a';

const AZ = 1150, R = 230; // screw axis height and barrel radius
const HX = -1050, HZ1 = 2300; // feed hopper centre and rim

// Base frame and barrel pedestals.
add("base-frame", blk(-300, 0, 0, 5000, 1100, 200).color(frame));
for (const x of [-1300, -100, 1300]) add(`pedestal-${x + 1300}`, blk(x, 0, 200, 260, 620, AZ - R - 180).color(frame));

// Drive: gearbox and coaxial motor on the -X end.
add("gearbox", blk(-1800, 0, 200, 620, 820, AZ + 260 - 200).color(drive));
add("gearbox-flange", alongX(-1490, -1400, R + 100, AZ).color(drive));
add("motor", alongX(-2700, -2110, 270, AZ - 150, 18).color(drive));
add("motor-fan-cover", alongX(-2770, -2700, 280, AZ - 150, 18).color(dark));
add("motor-feet", blk(-2400, 0, 200, 520, 460, AZ - 150 - 270 - 200).color(drive));
add("motor-terminal-box", blk(-2350, -300, AZ - 20, 200, 120, 160).color(drive));

// Barrel: feed throat, slotted dewatering screen, heated compression zone.
add("barrel", alongX(-1400, 1600, R, AZ, 20).color(barrel));
for (let k = 0; k < 8; k++) add(`screen-slot-${k}`, alongX(-650 + k * 120, -650 + k * 120 + 50, R + 6, AZ, 20).color(dark));
for (const x of [-700, 330]) add(`screen-flange-${x}`, alongX(x - 30, x + 30, R + 60, AZ, 20).color(barrel));
for (let k = 0; k < 5; k++) add(`heater-band-${k}`, alongX(420 + k * 230, 420 + k * 230 + 150, R + 40, AZ, 20).color(heater));
add("cable-tray", blk(910, 0, AZ + R + 160, 1200, 160, 40).color(dark));
for (let k = 0; k < 5; k++) add(`heater-lead-${k}`, blk(495 + k * 230, 0, AZ + R + 30, 20, 20, 140).color(dark));

// Water wrung out of the screen, falling into a drain trough piped to the back.
add("drain-trough", blk(-210, 0, 420, 1200, 760, 280).subtract(blk(-210, 0, 450, 1160, 720, 300)).color(frame));
add("trough-water", blk(-210, 0, 450, 1160, 720, 120).color('#6f8c9a'));
for (let k = 0; k < 6; k++) add(`water-stream-${k}`, blk(-600 + k * 160, (k % 2 ? 1 : -1) * 60, 560, 26, 26, AZ - R - 560 + 20).color(water));
add("drain-pipe", rod([-210, 300, 440], [-210, 900, 200], 60).color(dark));

// Steam hood over the heated zone.
add("steam-hood", loftXY([[AZ + R + 220, 1400, 760], [AZ + R + 560, 420, 420]], 910).color(frame));
add("steam-duct", cylinder(900, 160, 14).translate(910, 0, AZ + R + 560).color(frame));
add("steam-duct-cap", cylinder(40, 230, 14).translate(910, 0, AZ + R + 1460).color(dark));
for (const x of [260, 1560]) for (const y of [-340, 340]) add(`hood-post-${x}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 200, 60, 60, AZ + R + 20).color(frame));

// Die head with the face cutter, pickup hopper and pneumatic take-off.
add("die-head", alongX(1600, 1800, R + 110, AZ, 20).color(barrel));
add("cutter-housing", blk(1980, 0, AZ - 420, 360, 680, 760).color(drive));
add("cutter-motor", cylinder(500, 160, 14).translate(1980, 0, AZ + 340).color(drive));
add("cutter-window", blk(1980, -345, AZ - 120, 220, 10, 220).color('#4c6878'));
add("pickup-hopper", loftXY([[420, 300, 300], [AZ - 420, 640, 600]], 1980).subtract(loftXY([[400, 250, 250], [AZ - 400, 590, 550]], 1980)).color(barrel));
add("pickup-stand", blk(1980, 0, 200, 220, 220, 220).color(frame));
add("takeoff-pipe", rod([2120, 0, 560], [2600, 0, 900], 90, 12).color(barrel));
add("takeoff-riser", cylinder(2100, 90, 12).translate(2600, 0, 900).color(barrel));
add("takeoff-bend", sphere(90).translate(2600, 0, 3000).color(barrel));
add("takeoff-run", rod([2600, 0, 3000], [2600, 1600, 3000], 90, 12).color(barrel));
add("takeoff-support", blk(2600, 0, 0, 120, 120, 900).color(frame));
for (let k = 0; k < 6; k++) add(`agglomerate-${k}`, sphere(70).translate(1900 + (k % 3) * 80, -120 + Math.floor(k / 3) * 200, AZ - 520 + (k % 2) * 40).color(film));

// Feed hopper with wet film heaped in it, dripping.
add("feed-hopper", loftXY([[AZ + R - 40, 720, 640], [HZ1 - 40, 1500, 1300], [HZ1, 1540, 1340]], HX)
  .subtract(loftXY([[AZ + R - 50, 660, 580], [HZ1 - 40, 1440, 1240], [HZ1 + 10, 1480, 1280]], HX)).color(barrel));
add("hopper-rim", blk(HX, 0, HZ1, 1580, 1380, 40).subtract(blk(HX, 0, HZ1 - 10, 1480, 1280, 60)).color(frame));
add("hopper-platform", blk(HX - 1150, -200, 1500, 700, 900, 50).color(frame));
for (const y of [-620, 220]) add(`rail-post-${y > 0 ? 'b' : 'f'}`, blk(HX - 1470, y, 1550, 40, 40, 1000).color('#f0c419'));
for (const z of [2050, 2510]) add(`rail-bar-${z}`, blk(HX - 1470, -200, z, 40, 880, 40).color('#f0c419'));
add("platform-post", blk(HX - 1150, -600, 0, 80, 80, 1500).color(frame));
if (feed.value === 'loaded') {
  for (let k = 0; k < 5; k++) {
    add(`wet-film-${k}`, sphere(280).scale([1.3, 1, 0.55]).translate(HX - 380 + (k % 3) * 380, -280 + (k % 2) * 520, HZ1 - 40 + (k % 2) * 60)
      .color(k === 1 ? '#e58aa8' : k === 3 ? '#9ccf8a' : film));
  }
  add("hopper-drip", blk(HX + 500, -660, 1400, 26, 26, HZ1 - 1400).color(water));
}

// Control cabinet behind the cutter end.
add("control-cabinet", blk(2700, 1100, 0, 800, 400, 1900).color('#d9d9d4'));
add("cabinet-screen", blk(2700, 895, 1300, 320, 10, 220).color('#24425e'));
add("cabinet-estop", cylinder(30, 50, 10).rotateX(90).translate(2900, 900, 1050).color('#d62f2a'));
add("temperature-display", blk(2500, 895, 1050, 200, 10, 90).color('#c8322a'));

return p.model();
