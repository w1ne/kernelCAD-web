// SPDX-License-Identifier: CC0-1.0
// Flotation cell bank, the row of tank cells where air bubbles lift the
// mineral out of the slurry as froth. What makes it one: round tank cells set
// in a line and stepping down from feed to tail, each topped by a mineral-laden
// froth surface spilling into a ring launder, a drive bridge carrying the
// mechanism motor and belt guard over the rotor shaft, junction boxes with
// dart-valve actuators between cells, a low-pressure air header with a drop
// and valve to every cell, froth launders that fall to a concentrate pipe,
// and a walkway with handrails along the top.
// Millimetres, Z up, slurry flowing along +X, ground origin under the first cell.
meta({
  name: "flotation-cell-bank",
  license: 'CC0-1.0',
  title: "Flotation cell bank",
  description: "Bank of round forced-air flotation tank cells at about real size: 4.4 m tanks stepping down from feed to tail on concrete plinths, mineral froth surfaces spilling into external ring launders, drive bridges with mechanism motor, belt guard and rotor shaft, junction boxes with dart-valve actuators between cells, feed box, tailings box, air header with a drop and butterfly valve to each cell, concentrate launders falling to a collection pipe, walkway with handrails and stair. Material controls: tank coating, walkway and drive steel, rubber-lined launders and hoses, froth colour, plus a cell-count choice (3, 4, 5). weathered, highVisibility and copperFroth presets.",
  tags: ['mining', 'mineral processing', 'flotation', 'flotation cell', 'tank cell', 'froth', 'concentrator', 'launder'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 7400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3f7f9e', { label: 'Tank coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Walkway and drive steel' });
const rubber = param('rubber', '#2a2c2e', { label: 'Rubber-lined launders and hoses' });
const froth = param('froth', '#b7b29a', { label: 'Mineral froth' });
const cells = param('cells', '4', { choices: ['3', '4', '5'], label: 'Cells in the bank' });
presets({
  weathered: { coatedSteel: '#5d6f73', structuralSteel: '#666a66', rubber: '#333332', froth: '#a49d86' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#26292b', froth: '#c4c0ac' },
  copperFroth: { coatedSteel: '#5f7b4a', structuralSteel: '#3e4549', rubber: '#2a2c2e', froth: '#8f7a4a' },
});

const p = assembly("flotation-cell-bank");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const dark = '#26292b', concrete = '#a6a196', guard = '#e8c21a', valve = '#b5c0c0';
const n = Number(cells.value);
const R = 2200; // tank radius
const pitch = 5600; // cell centre spacing
const H = 4800; // tank height
const step = 300; // each cell sits lower than the one before
const N = 18;
const x0 = 0, xEnd = (n - 1) * pitch;
const plinth = (i) => 1600 - i * step;
const topZ = (i) => plinth(i) + H;

add('ground-slab', blk(-4600, -4200, 0, xEnd + 4400, 7400, 150).color(concrete));

for (let i = 0; i < n; i++) {
  const x = x0 + i * pitch, zp = plinth(i), zt = topZ(i);
  add(`plinth-${i}`, blk(x - 2500, -2500, 150, x + 2500, 2500, zp).color(concrete));
  // Tank with a short conical bottom skirt and a stiffening ring.
  add(`tank-${i}`, lathe([[R - 300, zp], [R, zp + 400], [R, zt]], N).translate(x, 0, 0).color(coatedSteel));
  add(`tank-ring-${i}`, rod(R + 60, zp + H * 0.45, zp + H * 0.45 + 120, N).translate(x, 0, 0).color(coatedSteel));
  // External froth launder ring, sloping lip and froth surface heaped to the centre.
  add(`launder-${i}`, lathe([[R + 50, zt - 700], [R + 550, zt - 250], [R + 550, zt - 50]], N).translate(x, 0, 0).color(rubber));
  add(`launder-lip-${i}`, rod(R + 580, zt - 50, zt + 30, N).translate(x, 0, 0).color(coatedSteel));
  add(`froth-${i}`, lathe([[R - 20, zt - 80], [R - 400, zt + 140], [900, zt + 260]], N).translate(x, 0, 0).color(froth));
  add(`froth-spill-${i}`, rod(R + 350, zt - 300, zt - 180, N).translate(x, 0, 0).color(froth));
  add(`froth-crowder-${i}`, lathe([[1100, zt - 400], [650, zt + 280]], 16).translate(x, 0, 0).color(coatedSteel));
  // Drive bridge, mechanism motor, belt guard and shaft.
  add(`drive-bridge-${i}`, blk(x - 450, -R - 400, zt + 300, x + 450, R + 400, zt + 560).color(structuralSteel));
  add(`bridge-leg-a-${i}`, blk(x - 450, -R - 400, zt - 50, x + 450, -R - 250, zt + 300).color(structuralSteel));
  add(`bridge-leg-b-${i}`, blk(x - 450, R + 250, zt - 50, x + 450, R + 400, zt + 300).color(structuralSteel));
  add(`mechanism-standpipe-${i}`, rod(360, zt - 200, zt + 300, 14).translate(x, 0, 0).color(coatedSteel));
  add(`mechanism-bearing-${i}`, rod(320, zt + 560, zt + 1250, 14).translate(x, 0, 0).color(structuralSteel));
  add(`mechanism-sheave-guard-${i}`, blk(x - 450, -500, zt + 1250, x + 450, 1700, zt + 1700).color(guard));
  add(`mechanism-motor-${i}`, rod(420, zt + 1700, zt + 2700, 18).translate(x, 1150, 0).color(structuralSteel));
  for (let f = 0; f < 2; f++) add(`motor-fin-${i}-${f}`, rod(460, zt + 1950 + f * 400, zt + 2000 + f * 400, 18).translate(x, 1150, 0).color(structuralSteel));
  add(`motor-cowl-${i}`, lathe([[380, zt + 2700], [260, zt + 2850]], 14).translate(x, 1150, 0).color(dark));
  // Air drop with a butterfly valve from the header.
  add(`air-drop-${i}`, tube([x - 250, -R - 1200, zt + 1600], [x - 250, -200, zt + 1600], 110, 8).color(structuralSteel));
  add(`air-drop-down-${i}`, tube([x - 250, -200, zt + 1600], [x - 250, -200, zt + 560], 110, 8).color(structuralSteel));
  add(`air-valve-${i}`, rod(180, -R - 900, -R - 700, 10).rotateX(-90).translate(x - 250, 0, zt + 1600).color(valve));
  add(`air-valve-actuator-${i}`, blk(x - 400, -R - 950, zt + 1780, x - 100, -R - 650, zt + 2050).color(guard));
  // Concentrate launder outlet dropping to the collection pipe.
  add(`launder-outlet-${i}`, tube([x, -R - 400, zt - 400], [x, -R - 1000, 1600], 220, 8).color(rubber));
}

// Junction boxes with dart-valve actuators between cells, feed and tail boxes.
for (let i = 0; i < n - 1; i++) {
  const x = x0 + i * pitch + pitch / 2, zt = topZ(i + 1);
  add(`junction-box-${i}`, blk(x - 700, -800, 300, x + 700, 800, zt - 300).color(coatedSteel));
  add(`dart-valve-${i}`, rod(140, zt - 300, zt + 900, 8).translate(x, 0, 0).color(valve));
  add(`dart-actuator-${i}`, blk(x - 250, -250, zt + 900, x + 250, 250, zt + 1300).color(guard));
}
add('feed-box', blk(-3300, -900, 150, -2200, 900, topZ(0) - 200).color(coatedSteel));
add('feed-pipe', tube([-4300, 0, topZ(0) + 400], [-2750, 0, topZ(0) + 400], 280, 10).color(rubber));
add('feed-pipe-drop', tube([-2750, 0, topZ(0) + 400], [-2750, 0, topZ(0) - 200], 280, 10).color(rubber));
add('tail-box', blk(xEnd + 2200, -900, 150, xEnd + 3400, 900, topZ(n - 1) - 300).color(coatedSteel));
add('tail-dart', rod(140, topZ(n - 1) - 300, topZ(n - 1) + 800, 8).translate(xEnd + 2800, 0, 0).color(valve));
add('tail-actuator', blk(xEnd + 2550, -250, topZ(n - 1) + 800, xEnd + 3050, 250, topZ(n - 1) + 1200).color(guard));
add('tail-pipe', tube([xEnd + 3400, 0, 900], [xEnd + 4300, 0, 900], 300, 10).color(rubber));

// Air header and concentrate collection pipe along the -Y side.
add('air-header', tube([-3300, -R - 1200, topZ(0) + 1600], [xEnd + 2000, -R - 1200, topZ(0) + 1600], 200, 10).color(structuralSteel));
for (let i = 1; i < n; i++) {
  const x = x0 + i * pitch;
  add(`air-header-drop-${i}`, tube([x - 250, -R - 1200, topZ(0) + 1600], [x - 250, -R - 1200, topZ(i) + 1600], 110, 8).color(structuralSteel));
}
add('concentrate-pipe', tube([-3400, -R - 1000, 1500], [xEnd + 3000, -R - 1000, 1200], 330, 10).color(rubber));
for (const x of [-2500, xEnd / 2, xEnd + 2200]) add(`pipe-stand-${x}`, blk(x - 150, -R - 1300, 150, x + 150, -R - 700, 1150).color(structuralSteel));

// Walkway along +Y across the tank tops with handrail and stair.
const wz = topZ(0) + 560, wy = R + 400;
add('walkway-deck', blk(-3400, wy, wz - 80, xEnd + 2400, wy + 1000, wz).color(structuralSteel));
for (let i = 0; i <= n; i++) {
  const x = -2800 + i * pitch;
  if (x > xEnd + 2400) break;
  add(`walkway-column-${i}`, rod(110, 150, wz - 80, 8).translate(x, wy + 900, 0).color(structuralSteel));
}
for (let x = -3300; x <= xEnd + 2300; x += 1600) add(`handrail-post-${x}`, rod(25, wz, wz + 1100, 6).translate(x, wy + 970, 0).color(guard));
add('handrail-top', tube([-3300, wy + 970, wz + 1100], [xEnd + 2300, wy + 970, wz + 1100], 25, 6).color(guard));
add('handrail-mid', tube([-3300, wy + 970, wz + 550], [xEnd + 2300, wy + 970, wz + 550], 20, 6).color(guard));
for (let k = 0; k < 16; k++) {
  const z = 150 + ((wz - 150) * (k + 1)) / 17, y = wy + 1000 + 3600 - 230 * k;
  add(`stair-tread-${k}`, blk(-3400, y - 260, z - 40, -2400, y, z).color(structuralSteel));
}
add('stair-stringer', tube([-2400, wy + 4550, 200], [-2400, wy + 1000, wz - 80], 60, 4).color(structuralSteel));

return p.model();
