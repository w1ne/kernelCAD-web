// SPDX-License-Identifier: CC0-1.0
// Glass breaker screen: the first machine on a bottle bank line. Whole
// bottles ride up an inclined belt into a breaker housing, where a rotor
// of swinging chain flails smashes them into cullet without pulverising
// the labels and caps. The broken glass falls onto a short vibrating
// screen: cullet drops through the mesh into a bin underneath, while the
// paper labels, plastic caps and neck rings walk off the end into a reject
// cage. What makes it a breaker screen rather than a crusher: the round
// hooded breaker box (here with its inspection window open on the flail
// rotor), the bottles going in on the belt, the sprung screen deck under
// it and the two outputs, clean cullet and light rejects.
// Generic visualization geometry at about real size (7.6 m long, 2.6 m
// wide, 3.8 m high), millimetres, Z up, feed from -X.

meta({
  name: "glass-breaker-screen",
  license: 'CC0-1.0',
  title: "Glass breaker screen",
  description: "Bottle breaker and screen at about real size: inclined infeed belt carrying green, amber and flint bottles into a hooded breaker housing on four legs, inspection window open on a chain-flail rotor, belt-drive motor on the side, sprung vibrating screen deck under the breaker with cullet on the mesh, cullet bin under the deck and a reject cage of labels and caps off the end. Material controls: housing paint, wear steel, glass, labels and caps. plant, weathered, highVisibility and flintLine presets.",
  tags: ["recycling", "glass recycling", "bottle breaker", "glass crusher", "cullet", "screening", "bottle bank", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#3a6d9c', { label: 'Breaker housing and frames (paint)' });
const wearSteel = param('wearSteel', '#9aa2a7', { label: 'Rotor, flails and mesh (wear steel)' });
const glass = param('glass', '#3f8a52', { label: 'Glass (bottles, cullet)' });
const labels = param('labels', '#e8e1cf', { label: 'Labels and caps' });

presets({
  plant: { housing: '#3a6d9c', wearSteel: '#9aa2a7', glass: '#3f8a52', labels: '#e8e1cf' },
  weathered: { housing: '#5d6a73', wearSteel: '#7d7f7b', glass: '#4f7a58', labels: '#c9c1ad' },
  highVisibility: { housing: '#e3742b', wearSteel: '#b9c0c4', glass: '#3f8a52', labels: '#f2f0e8' },
  flintLine: { housing: '#4f8a3c', wearSteel: '#9aa2a7', glass: '#cfe3df', labels: '#e0b52f' },
});

const p = assembly("glass-breaker-screen");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const deg = (r: number) => (r * 180) / Math.PI;
const dark = '#26292b';
const amber = '#a8662a', flint = '#d8e6e2';

// Breaker housing: hollow box with a round hood, open underneath, window in the front.
const HW = 1300, HD = 1400, HZ0 = 1900, HZ1 = 2900, HR = HW / 2;
const shell = blk(0, 0, HZ0, HW, HD, HZ1 - HZ0)
  .union(cylinder(HD, HR, 16).rotateX(90).translate(0, HD / 2, HZ1))
  .subtract(blk(0, 0, HZ0 - 10, HW - 60, HD - 60, HZ1 - HZ0 + 10))
  .subtract(cylinder(HD - 60, HR - 30, 16).rotateX(90).translate(0, HD / 2 - 30, HZ1))
  .subtract(blk(0, -HD / 2, HZ0 + 250, HW - 360, 200, 950))
  .subtract(blk(-HW / 2, 0, HZ1 - 50, 300, HD - 300, 450));
add("breaker-housing", shell.color(housing));
add("window-frame", blk(0, -HD / 2 - 20, HZ0 + 200, HW - 260, 40, 50).color(dark));
add("inspection-door", blk(0, 0, 0, HW - 360, 40, 950).rotateZ(-70).translate(-(HW - 360) / 2 * Math.cos((70 * Math.PI) / 180) - 300, -HD / 2 - (HW - 360) / 2 * Math.sin((70 * Math.PI) / 180), HZ0 + 250).color(housing));
for (const x of [-HW / 2 + 40, HW / 2 - 40]) for (const y of [-HD / 2 + 40, HD / 2 - 40]) add(`housing-leg-${x}-${y}`, blk(x, y < 0 ? y - 60 : y + 60, 0, 160, 160, HZ0 + 100).color(housing));

// Chain-flail rotor seen through the window.
const RZ = HZ0 + 650;
add("rotor-shaft", cylinder(HD + 500, 70, 10).rotateX(90).translate(0, HD / 2 + 400, RZ).color(wearSteel));
for (let k = 0; k < 4; k++) {
  const y = -HD / 2 + 230 + k * 310;
  add(`rotor-disc-${k}`, cylinder(40, 260, 10).rotateX(90).translate(0, y + 20, RZ).color(wearSteel));
  for (let j = 0; j < 4; j++) {
    const a = j * 90 + k * 45;
    add(`flail-${k}-${j}`, blk(0, 0, 0, 70, 50, 300).translate(0, 0, 200).rotateY(a).translate(0, y, RZ).color(dark));
  }
}
// Belt drive on the +Y side.
add("drive-motor", cylinder(600, 220, 14).rotateY(90).translate(-300, HD / 2 + 650, HZ0 - 300).color(dark));
add("motor-base", blk(0, HD / 2 + 650, HZ0 - 600, 800, 500, 80).color(housing));
add("belt-guard", profileXZ([[-250, HZ0 - 500], [250, HZ0 - 500], [300, RZ + 250], [-300, RZ + 250]], 120).translate(0, HD / 2 + 280, 0).color('#e0b52f'));

// Infeed belt from -X up into the hood opening, with bottles.
const AX = -5200, AZ = 900, BX = -HW / 2 + 100, BZ = HZ1 + 180;
const rise = deg(Math.atan2(BZ - AZ, BX - AX)), len = Math.hypot(BX - AX, BZ - AZ);
const onBelt = (s: Shape) => s.rotateY(-rise).translate(AX, 0, AZ);
add("infeed-belt", onBelt(blk(len / 2, 0, 0, len, 700, 30)).color(dark));
for (const sd of [-1, 1]) add(`infeed-rail-${sd < 0 ? 'l' : 'r'}`, onBelt(blk(len / 2, sd * 390, -160, len, 60, 300)).color(housing));
add("infeed-tail", onBelt(cylinder(760, 120, 12).rotateX(90).translate(0, 380, -40)).color(wearSteel));
for (const s of [len * 0.12, len * 0.6]) {
  const x = AX + s * Math.cos((rise * Math.PI) / 180), z = AZ + s * Math.sin((rise * Math.PI) / 180);
  for (const sd of [-1, 1]) add(`infeed-leg-${Math.round(s)}-${sd < 0 ? 'l' : 'r'}`, blk(x, sd * 390, 0, 80, 80, z - 160).color(housing));
}
const bottle = () => cylinder(240, 50, 8).union(cylinder(110, 20, 6).translate(0, 0, 240));
for (let i = 0; i < 9; i++) {
  const s = 500 + i * 520;
  const lie = i % 3 === 1;
  const b = lie ? bottle().rotateX(90).rotateZ(i * 40).translate(0, 0, 50) : bottle();
  add(`bottle-${i}`, onBelt(b.translate(0, -200 + (i % 3) * 200, 30).translate(s, 0, 0)).color(i % 3 === 0 ? glass : i % 3 === 1 ? amber : flint));
}

// Sprung screen deck under the breaker, running out toward +X.
const SX0 = -900, SX1 = 3000, SW = 1300, SZ = 1250;
add("screen-mesh", blk((SX0 + SX1) / 2, 0, SZ, SX1 - SX0, SW, 20).color(wearSteel));
for (let i = 1; i < 8; i++) add(`mesh-bar-${i}`, blk(SX0 + (i * (SX1 - SX0)) / 8, 0, SZ + 20, 30, SW, 25).color(dark));
for (const sd of [-1, 1]) {
  add(`screen-side-${sd < 0 ? 'f' : 'b'}`, profileXZ([[SX0, SZ - 200], [SX1, SZ - 200], [SX1, SZ + 160], [SX0, SZ + 360]], 30).translate(0, sd * (SW / 2 + 15), 0).color(housing));
  for (const x of [SX0 + 400, SX1 - 400]) {
    add(`spring-${sd < 0 ? 'f' : 'b'}-${x}`, cylinder(260, 80, 10).translate(x, sd * (SW / 2 + 140), SZ - 520).color('#e0b52f'));
    add(`spring-arm-${sd < 0 ? 'f' : 'b'}-${x}`, blk(x, sd * (SW / 2 + 90), SZ - 260, 220, 200, 60).color(housing));
    add(`screen-leg-${sd < 0 ? 'f' : 'b'}-${x}`, blk(x, sd * (SW / 2 + 140), 0, 180, 180, SZ - 520).color(housing));
  }
}
add("screen-motor", cylinder(500, 150, 12).rotateX(90).translate(1600, -SW / 2 - 30, SZ + 50).color(dark));
add("screen-motor-mount", blk(1600, -SW / 2 - 120, SZ - 120, 360, 160, 160).color(housing));

// Cullet on the deck, mixed with flecks of label paper and caps.
for (let i = 0; i < 18; i++) {
  const col = i % 6, row = Math.floor(i / 6);
  const sz = 70 + ((i * 23) % 60);
  add(`cullet-${i}`, box(sz * 1.4, sz, sz * 0.4, true).rotateX(i * 31).rotateZ(i * 53).translate(SX0 + 600 + col * 380 + (row % 2) * 150, -SW / 2 + 260 + row * 380, SZ + 50).color(i % 3 === 0 ? amber : i % 3 === 1 ? flint : glass));
}
for (let i = 0; i < 6; i++) add(`label-${i}`, box(160, 110, 8, true).rotateZ(i * 47).rotateX(i % 2 ? 15 : -10).translate(SX1 - 900 + (i % 3) * 300, -400 + Math.floor(i / 3) * 600, SZ + 70).color(labels));

// Cullet bin under the deck, reject cage off the end.
add("cullet-funnel", rect(1100, 900).loft([rect(SX1 - SX0 - 900, SW - 40)], {
  planes: [{ plane: 'XY' as const, origin: [1000, 0, 950] as [number, number, number] }, { plane: 'XY' as const, origin: [1000, 0, SZ - 40] as [number, number, number] }],
  ruled: true,
}).color(housing));
add("cullet-bin", rect(1300, 1100).loft([rect(1450, 1250)], {
  planes: [{ plane: 'XY' as const, origin: [1000, 0, 0] as [number, number, number] }, { plane: 'XY' as const, origin: [1000, 0, 820] as [number, number, number] }],
  ruled: true,
}).subtract(blk(1000, 0, 80, 1300, 1100, 800)).color(dark));
add("cullet-heap", rect(1320, 1120).loft([rect(500, 400)], {
  planes: [{ plane: 'XY' as const, origin: [1000, 0, 700] as [number, number, number] }, { plane: 'XY' as const, origin: [1000, 0, 930] as [number, number, number] }],
  ruled: true,
}).color(glass));
add("reject-lip", profileXZ([[SX1, SZ + 20], [SX1, SZ - 20], [SX1 + 600, SZ - 420], [SX1 + 600, SZ - 360]], SW).color(housing));
const CX = SX1 + 1000, CW = 1200, CH = 1000;
add("cage-base", blk(CX, 0, 0, CW, CW, 80).color(housing));
for (const x of [CX - CW / 2, CX + CW / 2]) for (const y of [-CW / 2, CW / 2]) add(`cage-post-${x}-${y}`, blk(x, y, 0, 60, 60, CH).color(housing));
for (const z of [CH / 2, CH - 40]) {
  for (const sd of [-1, 1]) {
    add(`cage-rail-x-${z}-${sd}`, blk(CX, sd * CW / 2, z, CW, 40, 40).color(housing));
    add(`cage-rail-y-${z}-${sd}`, blk(CX + sd * CW / 2, 0, z, 40, CW, 40).color(housing));
  }
}
for (let i = 0; i < 5; i++) add(`cage-mesh-${i}`, blk(CX - CW / 2 + (i + 1) * (CW / 6), -CW / 2, 80, 16, 16, CH - 120).color(housing));
add("reject-heap", rect(CW - 80, CW - 80).loft([rect(450, 400)], {
  planes: [{ plane: 'XY' as const, origin: [CX, 0, 80] as [number, number, number] }, { plane: 'XY' as const, origin: [CX, 0, 820] as [number, number, number] }],
  ruled: true,
}).color(labels));
for (let i = 0; i < 6; i++) add(`cap-${i}`, cylinder(30, 45, 8).rotateX(i * 30).translate(CX - 300 + (i % 3) * 300, -250 + Math.floor(i / 3) * 450, 700 + (i % 2) * 80).color(i % 2 ? '#d6402e' : '#2f6f9e'));

return p.model();
