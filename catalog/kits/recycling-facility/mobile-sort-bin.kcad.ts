// SPDX-License-Identifier: CC0-1.0
// Mobile sort bin: the wheeled tub parked under a picking-station chute to
// catch one hand-sorted stream. What makes it that bin rather than a box: a
// tapered moulded tub with a rolled rim, a colour-coded stream plate with a
// recycling chevron on the front, a lid hinged open at the back, a steel
// chassis with forklift tipping pockets, four swivel castors (two braked) and
// a tubular push handle, and the sorted stream heaped inside.
// Generic visualization geometry at about real size (1.2 x 1.0 m, 1.25 m
// tall), millimetres, Z up, stream plate on -Y.

meta({
  name: "mobile-sort-bin",
  license: 'CC0-1.0',
  title: "Mobile sort bin",
  description: "Wheeled picking-station sort bin at about real size: tapered moulded tub with rolled rim, colour-coded stream plate with recycling chevrons, lid hinged open at the back, steel chassis with forklift tipping pockets, four swivel castors with brakes, push handle and the sorted stream heaped inside. Lid open or removed. Material controls: tub, chassis, lid and contents. paper, plastics, glass and metals presets.",
  tags: ["recycling", "sort bin", "wheeled bin", "picking station", "castor", "tub", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tub = param('tub', '#2f68b0', { label: 'Tub (moulded HDPE)' });
const chassis = param('chassis', '#5d6366', { label: 'Chassis and handle (steel)' });
const lid = param('lid', '#24272a', { label: 'Lid (moulded HDPE)' });
const contents = param('contents', '#d8c9a2', { label: 'Sorted stream' });
const lidMode = param('lidPosition', 'open', { choices: ['open', 'removed'], label: 'Lid' });

presets({
  paper: { tub: '#2f68b0', lid: '#24272a', contents: '#d8c9a2' },
  plastics: { tub: '#e0b52a', lid: '#24272a', contents: '#8fc0d8' },
  glass: { tub: '#3d7f45', lid: '#2a3a2c', contents: '#9ac29a' },
  metals: { tub: '#8a9196', lid: '#3a3d40', contents: '#b8babc' },
});

const p = assembly("mobile-sort-bin");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const plane = (z: number) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

// Tapered tub: 950 x 750 base widening to 1150 x 950 at the rim.
const Z0 = 260, H = 880, ZT = Z0 + H;
const BW = 950, BD = 750, TW = 1150, TD = 950, T = 30;
const shell = rect(BW, BD).loft([rect(TW, TD)], { planes: [plane(Z0), plane(ZT)], ruled: true });
const cavity = rect(BW - 2 * T + 8, BD - 2 * T + 8).loft([rect(TW - 2 * T + 30, TD - 2 * T + 30)], { planes: [plane(Z0 + T), plane(ZT + 40)], ruled: true });
add("tub", shell.subtract(cavity).color(tub));
add("rolled-rim", blk(0, 0, ZT - 60, TW + 70, TD + 70, 60).subtract(blk(0, 0, ZT - 80, TW - 40, TD - 40, 100)).color(tub));
// Moulded vertical ribs on the front and -X side, following the taper.
for (const x of [-380, 380]) add(`front-rib-${x < 0 ? 'l' : 'r'}`, box(50, 30, H - 120, true).rotateX(6.5).translate(x, -(BD + TD) / 4 - 14, Z0 + H / 2).color(tub));
for (const y of [-280, 280]) add(`side-rib-${y < 0 ? 'f' : 'b'}`, box(30, 50, H - 120, true).rotateY(-6.5).translate(-(BW + TW) / 4 - 14, y, Z0 + H / 2).color(tub));

// Stream plate with recycling chevrons on the front face.
const plateY = -(BD + TD) / 4 - 24;
add("stream-plate", box(520, 8, 380, true).rotateX(6.5).translate(0, plateY, Z0 + H * 0.55).color('#f2f0e6'));
const chev = (a: number) => profileXZ([[-70, 0], [70, 0], [100, 40], [40, 40], [0, 110], [-40, 40], [-100, 40]], 10).rotateY(a);
for (const [k, a] of [0, 120, 240].entries()) {
  const r = 85, ang = ((a + 90) * Math.PI) / 180;
  add(`chevron-${k}`, chev(-a).translate(r * Math.cos(ang), 0, r * Math.sin(ang)).rotateX(6.5).translate(0, plateY - 8, Z0 + H * 0.55 + 20).color(tub));
}
add("stream-band", box(520, 10, 60, true).rotateX(6.5).translate(0, plateY - 4, Z0 + H * 0.55 - 150).color(tub));

// Sorted stream heaped in the tub.
add("contents-heap", sphere(500).scale([1.05, 0.85, 0.42]).translate(0, 0, ZT - 60).color(contents));
const items: [number, number, number, number][] = [[-250, -150, ZT + 110, 25], [160, -90, ZT + 140, -40], [-40, 200, ZT + 120, 70], [300, 160, ZT + 60, 10]];
items.forEach(([x, y, z, a], k) => add(`contents-item-${k}`, box(260, 180, 30, true).rotateX(18).rotateZ(a).translate(x, y, z).color(k % 2 ? '#ece6d4' : contents)));

// Lid hinged on the back rim, swung up and back.
if (lidMode.value === 'open') {
  const hinge = (s: Shape) => s.rotateX(-108).translate(0, TD / 2 + 30, ZT);
  add("lid-panel", hinge(blk(0, -(TD + 60) / 2, 0, TW + 60, TD + 60, 40)).color(lid));
  for (const x of [-350, 0, 350]) add(`lid-rib-${x === 0 ? 'c' : x < 0 ? 'l' : 'r'}`, hinge(blk(x, -(TD + 60) / 2, -30, 50, TD - 40, 30)).color(lid));
  add("lid-grip", hinge(blk(0, -TD - 30, -40, 400, 40, 40)).color(lid));
  for (const x of [-420, 420]) add(`hinge-${x < 0 ? 'l' : 'r'}`, cylinder(120, 26, 10).rotateY(90).translate(x - 60, TD / 2 + 30, ZT + 10).color(chassis));
}

// Steel chassis with forklift tipping pockets.
add("chassis-frame", blk(0, 0, 170, BW + 80, BD + 80, 90).subtract(blk(0, 0, 160, BW - 80, BD - 80, 120)).color(chassis));
for (const y of [-220, 220]) add(`fork-pocket-${y < 0 ? 'f' : 'b'}`, blk(0, y, 175, BW + 120, 200, 80).subtract(blk(0, y, 185, BW + 140, 170, 60)).color(chassis));

// Four swivel castors, braked on the -Y pair.
for (const [s, sx, sy] of [['fl', -1, -1], ['fr', 1, -1], ['bl', -1, 1], ['br', 1, 1]] as const) {
  const x = sx * (BW / 2 - 30), y = sy * (BD / 2 - 30);
  add(`castor-plate-${s}`, blk(x, y, 155, 130, 130, 15).color(chassis));
  add(`castor-swivel-${s}`, cylinder(20, 50, 12).translate(x, y, 135).color(chassis));
  for (const dx of [-38, 38]) add(`castor-fork-${s}-${dx < 0 ? 'a' : 'b'}`, blk(x + dx, y + 20, 75, 10, 80, 60).color(chassis));
  add(`castor-wheel-${s}`, cylinder(50, 80, 14).rotateY(90).translate(x - 25, y + 30, 76).subtract(blk(x, y + 30, -40, 120, 200, 40)).color('#1c1d1e'));
  add(`castor-hub-${s}`, cylinder(64, 30, 10).rotateY(90).translate(x - 32, y + 30, 76).color('#c9ccce'));
  if (sy < 0) add(`castor-brake-${s}`, blk(x, y - 60, 120, 60, 60, 16).color('#c8322a'));
}

// Tubular push handle across the back.
for (const x of [-420, 420]) add(`handle-post-${x < 0 ? 'l' : 'r'}`, blk(x, TD / 2 + 70, 250, 40, 40, ZT - 160).color(chassis));
for (const x of [-420, 420]) add(`handle-bracket-${x < 0 ? 'l' : 'r'}`, blk(x, TD / 2 + 25, 500, 40, 90, 40).color(chassis));
add("handle-bar", cylinder(900, 22, 10).rotateY(90).translate(-450, TD / 2 + 70, ZT + 70).color(chassis));
add("handle-grip", cylinder(500, 26, 10).rotateY(90).translate(-250, TD / 2 + 70, ZT + 70).color('#1c1d1e'));

return p.model();
