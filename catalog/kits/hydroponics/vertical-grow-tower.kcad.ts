// SPDX-License-Identifier: CC0-1.0
// Vertical grow tower: a stacked aeroponic column where a pump in the base
// reservoir lifts nutrient up the centre pipe and it rains back down over
// the roots of plants sitting in angled ports around the tower.
// What makes it a grow tower: a round weighted reservoir base on castors
// with a fill door and level window, a white column of stacked ribbed
// sections, each with four ports angled up and out (staggered between
// sections so the plants spiral up the tower), a plant in each port, a
// domed top cap where the feed rises, and the pump power lead and timer
// hanging off the base.
// Generic visualization geometry at about real size (0.75 m across,
// 1.85 m high in the tall option), millimetres, Z up, fill door facing -Y.

meta({
  name: "vertical-grow-tower",
  license: 'CC0-1.0',
  title: "Vertical grow tower",
  description: "Aeroponic vertical grow tower at about real size: round reservoir base on castors with fill door and level window, stacked white column sections with four angled planting ports each (staggered so plants spiral up), a plant in every port, domed feed cap and pump lead with timer. Material controls: base reservoir, tower column, port collars and foliage, plus a short or tall stack choice. herbs, lettuce, strawberry and weathered presets.",
  tags: ['vertical tower', 'aeroponic tower', 'tower garden', 'grow tower', 'vertical farming', 'herbs', 'lettuce', 'strawberry', 'hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const base = param('base', '#3b4246', { label: 'Reservoir base (polyethylene)' });
const column = param('column', '#efefea', { label: 'Tower column (food-grade ABS)' });
const collar = param('collar', '#8fbf3f', { label: 'Port collars and cap (accent plastic)' });
const foliage = param('foliage', '#4f9a3a', { label: 'Crop foliage' });
const height = param('height', 'tall', { choices: ['short', 'tall'], label: 'Stack height' });

presets({
  herbs: { base: '#3b4246', column: '#efefea', collar: '#8fbf3f', foliage: '#4f9a3a' },
  lettuce: { base: '#efefea', column: '#efefea', collar: '#3b4246', foliage: '#86bb4c' },
  strawberry: { base: '#2a2c2e', column: '#f1ece0', collar: '#c0392b', foliage: '#3e8a35' },
  weathered: { base: '#565b5d', column: '#d6d3c6', collar: '#8a9a5a', foliage: '#7b9450' },
});

const p = assembly("vertical-grow-tower");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const SECTIONS = height.value === 'tall' ? 6 : 4;
const SH = 230, R = 115; // section height, column radius
const ZB = 390; // top of base reservoir

// Reservoir base on castors: a squat turned tub with a lid shoulder.
add("reservoir", turned([[0, 60], [330, 60], [370, 110], [375, 300], [340, 360], [150, ZB], [0, ZB]]).color(base));
add("reservoir-rim", turned([[300, 345], [362, 300], [370, 312], [312, 360]]).color(collar));
add("fill-door", blk(0, -360, 150, 220, 40, 120).rotateX(-6).color(collar));
add("fill-door-grip", blk(0, -384, 230, 80, 16, 16).color(base));
add("level-window", blk(220, -300, 120, 30, 40, 160).rotateZ(-36).color('#2f5b52'));
for (let i = 0; i < 4; i++) {
  const a = Math.PI / 4 + (i * Math.PI) / 2;
  const x = 280 * Math.cos(a), y = 280 * Math.sin(a);
  add(`castor-fork-${i}`, blk(x, y, 40, 50, 60, 30).color('#5d6366'));
  add(`castor-wheel-${i}`, cylinder(30, 22, 10).rotateY(90).translate(x - 15, y, 19).subtract(blk(x, y, -20, 80, 80, 20)).color('#1d2023'));
}
add("pump-lead", cylZ(-300, 150, 60, 300, 6, 6).color('#1d2023'));
add("timer", blk(-330, 150, 360, 90, 60, 130).color('#e6e7e1'));
add("timer-dial", cylinder(10, 30, 12).rotateX(90).translate(-330, 125, 430).color(collar));

// Stacked column: each section ribbed at its joint, with four angled ports.
for (let s = 0; s < SECTIONS; s++) {
  const z0 = ZB + s * SH;
  add(`section-${s}`, cylZ(0, 0, z0, SH, R).color(column));
  add(`joint-${s}`, cylZ(0, 0, z0, 24, R + 10).color(column));
  for (let k = 0; k < 4; k++) {
    const a = (k * 90 + (s % 2) * 45 - 90 + 22.5) * Math.PI / 180;
    const yaw = (a * 180) / Math.PI;
    const zc = z0 + SH * 0.45;
    const port = cylinder(110, 48, 12).rotateY(45).translate(R - 30, 0, 0);
    const ring = cylinder(16, 56, 12).rotateY(45).translate(R - 30 + 78, 0, 78);
    const plant = sphere(95).scale([1.1, 1.1, 0.75]).translate(R - 30 + 130, 0, 125);
    add(`port-${s}-${k}`, port.rotateZ(yaw).translate(0, 0, zc).color(column));
    add(`collar-${s}-${k}`, ring.rotateZ(yaw).translate(0, 0, zc).color(collar));
    add(`plant-${s}-${k}`, plant.rotateZ(yaw).translate(0, 0, zc).color(foliage));
  }
}

// Domed top cap where the feed pipe ends.
const ZT = ZB + SECTIONS * SH;
add("cap", turned([[0, ZT], [R + 14, ZT], [R + 14, ZT + 40], [R - 20, ZT + 90], [40, ZT + 115], [0, ZT + 118]]).color(collar));
add("cap-knob", cylZ(0, 0, ZT + 110, 30, 28, 12).color(column));

return p.model();
