// SPDX-License-Identifier: CC0-1.0
// Star screen: the tracked mobile screener a compost yard or green-waste
// site drives up to a windrow. A loader tips material into the hopper;
// an apron belt in its floor carries it onto a deck of rotating shafts
// fitted with flexible rubber stars. The stars fling the load along so
// fine compost drops between them onto a belt underneath, which carries
// it out sideways onto a fines pile, while sticks, plastic and stones
// ride off the end of the deck onto a long overs conveyor. What makes it
// a star screen rather than a trommel: the open deck of star-studded
// shafts, the two conveyors leaving at right angles to each other, the
// tipping hopper and power pack on a crawler chassis, and the two
// separate piles it leaves behind.
// Generic visualization geometry at about real size (14 m long, 9.5 m
// wide with the conveyors out, 4.2 m high), millimetres, Z up.

meta({
  name: "star-screen",
  license: 'CC0-1.0',
  title: "Mobile star screen",
  description: "Tracked mobile star screen at about real size: crawler chassis, flared tipping hopper full of green waste with an apron feed belt, open deck of twelve shafts carrying rubber stars, power pack with exhaust stack, fines conveyor folding out to the side onto a compost pile, and a long overs conveyor off the end of the deck onto a pile of oversize. Material controls: machine paint, rubber stars, compost, running gear. yard, weathered, highVisibility and woodChip presets.",
  tags: ["recycling", "star screen", "mobile screener", "compost screening", "green waste", "tracked plant", "screening", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machine = param('machine', '#4f8a3c', { label: 'Machine body (paint)' });
const stars = param('stars', '#e0b52f', { label: 'Rubber stars' });
const compost = param('compost', '#4a3626', { label: 'Compost and green waste' });
const runningGear = param('runningGear', '#2b2e30', { label: 'Tracks and running gear' });

presets({
  yard: { machine: '#4f8a3c', stars: '#e0b52f', compost: '#4a3626', runningGear: '#2b2e30' },
  weathered: { machine: '#6c7458', stars: '#9a8a5a', compost: '#56473a', runningGear: '#3a3835' },
  highVisibility: { machine: '#e3742b', stars: '#2f2f2f', compost: '#4a3626', runningGear: '#23262a' },
  woodChip: { machine: '#2f6f9e', stars: '#d6402e', compost: '#9c7a4e', runningGear: '#2b2e30' },
});

const p = assembly("star-screen");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const deg = (r: number) => (r * 180) / Math.PI;
const belt = '#26292b';

// Straight strut between two points.
const rod = (a: [number, number, number], b: [number, number, number], t: number) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  return box(t, t, len, true).rotateY(deg(Math.atan2(Math.hypot(dx, dy), dz))).rotateZ(deg(Math.atan2(dy, dx))).translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
};

// Crawler tracks (stadium profile) under a box-section chassis.
const TL = 5200, TR = 420;
const stadium: [number, number][] = [];
for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 6; stadium.push([TL / 2 - TR + TR * Math.cos(a), TR + TR * Math.sin(a)]); }
for (let k = 0; k <= 6; k++) { const a = Math.PI / 2 + (k * Math.PI) / 6; stadium.push([-TL / 2 + TR + TR * Math.cos(a), TR + TR * Math.sin(a)]); }
for (const sd of [-1, 1]) {
  add(`track-${sd < 0 ? 'f' : 'b'}`, profileXZ(stadium, 500).translate(0, sd * 1050, 0).color(runningGear));
  add(`track-frame-${sd < 0 ? 'f' : 'b'}`, blk(0, sd * 1050, 300, TL - 900, 520, 260).color(machine));
  for (const x of [-TL / 2 + TR, TL / 2 - TR]) add(`idler-${sd < 0 ? 'f' : 'b'}-${x}`, cylinder(540, 300, 12).rotateX(90).translate(x, sd * 1050 + 270, TR).color('#5b6064'));
}
add("chassis", blk(500, 0, 840, 10800, 1300, 420).color(machine));

// Power pack at the +X end with exhaust stack and grille.
add("power-pack", blk(4700, 0, 1260, 1600, 2300, 1500).color(machine));
add("power-pack-grille", blk(4700, -1160, 1500, 1100, 30, 900).color(belt));
add("exhaust", cylinder(700, 70, 10).translate(5100, 600, 2760).color('#7b8084'));
add("fuel-tank", blk(4700, 1250, 1300, 900, 300, 700).color(machine));

// Tipping hopper: flared open bin with green waste heaped in it.
const HX = 2200, HZ = 1700, HH = 1500;
const hopper = rect(2600, 1500).loft([rect(3400, 3200)], {
  planes: [{ plane: 'XY' as const, origin: [HX, 0, HZ] as [number, number, number] }, { plane: 'XY' as const, origin: [HX, 0, HZ + HH] as [number, number, number] }],
  ruled: true,
}).subtract(rect(2500, 1400).loft([rect(3300, 3100)], {
  planes: [{ plane: 'XY' as const, origin: [HX, 0, HZ + 80] as [number, number, number] }, { plane: 'XY' as const, origin: [HX, 0, HZ + HH + 10] as [number, number, number] }],
  ruled: true,
}));
add("hopper", hopper.color(machine));
add("hopper-heap", rect(3200, 2900).loft([rect(1400, 1000)], {
  planes: [{ plane: 'XY' as const, origin: [HX, 0, HZ + HH - 300] as [number, number, number] }, { plane: 'XY' as const, origin: [HX + 200, 0, HZ + HH + 400] as [number, number, number] }],
  ruled: true,
}).color(compost));
for (let i = 0; i < 6; i++) add(`branch-${i}`, cylinder(900 + (i % 3) * 200, 35, 6).rotateY(70 + i * 7).rotateZ(i * 57).translate(HX - 600 + (i % 3) * 500, -700 + Math.floor(i / 3) * 1200, HZ + HH + 120 + (i % 2) * 100).color('#7a5a38'));
add("hopper-support", blk(HX, 0, 1260, 2400, 1400, HZ - 1260).color(machine));

// Star deck: twelve shafts, each with four five-point rubber stars.
const DX0 = -2700, DX1 = 700, DZ = 2700, DW = 1800, NS = 12;
const starPts: [number, number][] = [];
for (let k = 0; k < 10; k++) { const r = k % 2 ? 90 : 210; const a = (k * Math.PI) / 5; starPts.push([r * Math.cos(a), r * Math.sin(a)]); }
const star = (rot: number) => extrudePolygon(starPts, 70).rotateZ(rot).rotateX(90).translate(0, 35, 0);
for (let i = 0; i < NS; i++) {
  const x = DX0 + 150 + (i * (DX1 - DX0 - 300)) / (NS - 1);
  add(`shaft-${i}`, cylinder(DW, 45, 8).rotateX(90).translate(x, DW / 2, DZ).color('#8f969b'));
  for (let k = 0; k < 4; k++) add(`star-${i}-${k}`, star(i * 23).translate(x, -DW / 2 + 260 + k * 420 + (i % 2) * 180, DZ).color(stars));
}
for (const sd of [-1, 1]) {
  add(`deck-wall-${sd < 0 ? 'f' : 'b'}`, profileXZ([[DX0 - 100, DZ - 450], [DX1 + 500, DZ - 450], [DX1 + 500, DZ + 500], [DX0 + 600, DZ + 260], [DX0 - 100, DZ + 260]], 40).translate(0, sd * (DW / 2 + 40), 0).color(machine));
  add(`drive-guard-${sd < 0 ? 'f' : 'b'}`, blk((DX0 + DX1) / 2, sd * (DW / 2 + 160), DZ - 300, DX1 - DX0, 200, 420).color(sd < 0 ? machine : belt));
}
add("deck-support-a", blk(DX0 + 300, 0, 1260, 300, 1200, DZ - 1710).color(machine));
add("deck-support-b", blk(DX1 - 200, 0, 1260, 300, 1200, DZ - 1710).color(machine));
// Compost riding on the first half of the deck, thinning toward the overs end.
add("deck-bed", profileXZ([[DX1 + 300, DZ + 150], [DX0 + 1600, DZ + 150], [DX1 + 300, DZ + 380]], DW - 120).color(compost));
for (let i = 0; i < 7; i++) add(`overs-${i}`, box(420, 90, 70, true).rotateZ(i * 49).translate(DX0 + 300 + (i % 4) * 350, -DW / 2 + 300 + Math.floor(i / 2) * 330, DZ + 240).color(i % 3 ? '#7a5a38' : '#4c8fd0'));

// Conveyor laid along local +X, rising at `rise` degrees, then turned and placed.
const conveyor = (prefix: string, len: number, w: number, rise: number, az: number, at: [number, number, number], load: string) => {
  const place = (s: Shape) => s.rotateY(-rise).rotateZ(az).translate(at[0], at[1], at[2]);
  add(`${prefix}-belt`, place(blk(len / 2, 0, 0, len, w, 30)).color(belt));
  add(`${prefix}-load`, place(blk(len / 2 + 300, 0, 30, len - 900, w * 0.6, 70)).color(load));
  for (const sd of [-1, 1]) add(`${prefix}-rail-${sd < 0 ? 'l' : 'r'}`, place(blk(len / 2, sd * (w / 2 + 40), -180, len, 70, 260)).color(machine));
  add(`${prefix}-head`, place(cylinder(w + 60, 140, 12).rotateX(90).translate(len, w / 2 + 30, -40)).color('#8f969b'));
  const r = (rise * Math.PI) / 180, a = (az * Math.PI) / 180;
  return (s: number): [number, number, number] => [at[0] + s * Math.cos(r) * Math.cos(a), at[1] + s * Math.cos(r) * Math.sin(a), at[2] + s * Math.sin(r)];
};

// Overs conveyor off the -X end, fines conveyor out to the -Y side.
// Apron belt climbing from the hopper floor up onto the deck.
const AX = HX + 1100, AZ = HZ + 120, BX = DX1 + 250, BZ = DZ + 180;
conveyor("apron", Math.hypot(AX - BX, BZ - AZ), 1300, deg(Math.atan2(BZ - AZ, AX - BX)), 180, [AX, 0, AZ], compost);
const overs = conveyor("overs-conveyor", 5600, 900, 16, 180, [DX0 - 200, 0, DZ - 500], '#7a5a38');
const oh = overs(5600);
add("overs-strut-l", rod([-4400, -500, 1260], [overs(3600)[0], -480, overs(3600)[2] - 220], 110).color(machine));
add("overs-strut-r", rod([-4400, 500, 1260], [overs(3600)[0], 480, overs(3600)[2] - 220], 110).color(machine));
const fines = conveyor("fines-conveyor", 6000, 1000, 22, -90, [-1000, 500, 1500], compost);
const fh = fines(6000);
add("fines-strut", rod([-1000, -650, 1260], [fines(3900)[0], fines(3900)[1], fines(3900)[2] - 220], 110).color(machine));
add("fines-hopper", rect(1200, 1600).loft([rect(DX1 - DX0 - 400, DW - 100)], {
  planes: [{ plane: 'XY' as const, origin: [-1000, 300, 1620] as [number, number, number] }, { plane: 'XY' as const, origin: [(DX0 + DX1) / 2, 0, DZ - 460] as [number, number, number] }],
  ruled: true,
}).color(machine));

// The two piles the machine leaves behind.
const pile = (name: string, x: number, y: number, r: number, h: number, c: string) => add(name, rect(r * 2, r * 2.2).loft([rect(r * 0.5, r * 0.6)], {
  planes: [{ plane: 'XY' as const, origin: [x, y, 0] as [number, number, number] }, { plane: 'XY' as const, origin: [x, y, h] as [number, number, number] }],
  ruled: true,
}).color(c));
pile("fines-pile", fh[0], fh[1] - 600, 1400, 1900, compost);
pile("overs-pile", oh[0] - 700, oh[1], 1100, 1300, '#6e5236');
for (let i = 0; i < 5; i++) add(`overs-stick-${i}`, cylinder(800, 40, 6).rotateY(80).rotateZ(i * 41).translate(oh[0] - 1100 + (i % 3) * 300, -500 + i * 250, 700 + (i % 2) * 250).color('#8a6a44'));

return p.model();
