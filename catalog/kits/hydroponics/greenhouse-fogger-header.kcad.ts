// SPDX-License-Identifier: CC0-1.0
// Greenhouse fogger header: a high-pressure fog line that cools the air
// and raises humidity by spraying water droplets so fine they evaporate
// before they reach the crop.
// What makes it a fog line: a thin stainless high-pressure line hung on
// clips from a support wire between two posts, nozzle drops with brass
// anti-drip valves and cross-shaped four-way nozzle heads, white fog
// plumes hanging under each head, and at the feed end a floor-standing
// high-pressure pump unit (motor, crankcase pump head, cartridge filter
// and gauge) with a braided hose riser up the post to the line.
// Generic visualization geometry at about real size (1.8 m span, line at
// 2 m), millimetres, Z up, front -Y.

meta({
  name: "greenhouse-fogger-header",
  license: 'CC0-1.0',
  title: "Greenhouse fogger header",
  description: "High-pressure greenhouse fog line at about real size: stainless line hung from a support wire between two posts, nozzle drops with brass anti-drip valves and four-way or single nozzle heads, fog plumes, and a floor-standing high-pressure pump unit with motor, pump head, cartridge filter, gauge and braided hose riser. Material controls: posts and wire, high-pressure line, nozzle brass, pump unit and fog, plus nozzle head (cross or single) and fogging (on or off). stainless, blackNozzle, weathered and highVisibility presets.",
  tags: ['fogger', 'fog line', 'misting', 'high pressure', 'humidification', 'evaporative cooling', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const posts = param('posts', '#9aa3a6', { label: 'Posts and support wire (galvanised steel)' });
const line = param('highPressureLine', '#d4d8da', { label: 'High-pressure line (stainless)' });
const brass = param('nozzleBrass', '#c49a3c', { label: 'Anti-drip valves and nozzles (brass)' });
const pump = param('pumpUnit', '#2e6aa6', { label: 'Pump unit (painted)' });
const fog = param('fog', '#eef3f5', { label: 'Fog plume' });
const head = param('nozzleHead', 'cross', { choices: ['cross', 'single'], label: 'Nozzle head' });
const fogging = param('fogging', 'on', { choices: ['on', 'off'], label: 'Fogging' });

presets({
  stainless: { posts: '#9aa3a6', highPressureLine: '#d4d8da', nozzleBrass: '#c49a3c', pumpUnit: '#2e6aa6', fog: '#eef3f5' },
  blackNozzle: { posts: '#8f979a', highPressureLine: '#c9cdcf', nozzleBrass: '#26282a', pumpUnit: '#c23b2b', fog: '#e8eef1' },
  weathered: { posts: '#7a7f7c', highPressureLine: '#a9aca6', nozzleBrass: '#8f7440', pumpUnit: '#4d6378', fog: '#dfe4e2' },
  highVisibility: { posts: '#e87832', highPressureLine: '#e3e5e6', nozzleBrass: '#f2c84b', pumpUnit: '#e8b21f', fog: '#f6f8f9' },
});

const p = assembly("greenhouse-fogger-header");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 12) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

const PX = 900, WZ = 2300, LZ = 2050;
// Posts with base plates, support wire between them.
for (const x of [-PX, PX]) {
  add(`base-${x}`, blk(x, 0, 0, 220, 220, 12).color(posts));
  add(`post-${x}`, blk(x, 0, 12, 60, 60, WZ + 60).color(posts));
  add(`wire-anchor-${x}`, blk(x - Math.sign(x) * 40, 0, WZ - 20, 30, 40, 40).color(posts));
}
add("support-wire", cylX(-PX, 0, WZ, 2 * PX, 3, 4).color(posts));

// Stainless high-pressure line on hanger clips.
add("hp-line", cylX(-PX + 60, 0, LZ, 2 * PX - 60, 8, 10).color(line));
add("end-plug", cylX(PX - 60, 0, LZ, 40, 13, 10).color(brass));
for (const x of [-600, 0, 600]) {
  add(`hanger-${x}`, cylZ(x, 0, LZ + 10, WZ - LZ - 10, 2, 4).color(posts));
  add(`hanger-clip-${x}`, blk(x, 0, LZ - 14, 24, 30, 28).color('#3a3d40'));
}

// Nozzle drops: tee, drop tube, anti-drip valve, nozzle head, fog plume.
const plume: [number, number][] = [[0, 0], [45, -50], [130, -180], [175, -300], [165, -380], [105, -430], [0, -440]];
for (let k = 0; k < 6; k++) {
  const x = -750 + k * 300;
  add(`tee-${k}`, blk(x, 0, LZ - 14, 30, 26, 28).color(line));
  add(`drop-${k}`, cylZ(x, 0, LZ - 110, 100, 4, 6).color(line));
  add(`valve-${k}`, cylZ(x, 0, LZ - 150, 42, 9, 8).color(brass));
  const hz = LZ - 165;
  add(`hub-${k}`, cylZ(x, 0, hz, 16, 11, 8).color(brass));
  if (head.value === 'cross') {
    add(`arm-x-${k}`, cylX(x - 42, 0, hz + 8, 84, 4, 6).color(brass));
    add(`arm-y-${k}`, cylY(x, 42, hz + 8, 84, 4, 6).color(brass));
    for (const [dx, dy] of [[-44, 0], [44, 0], [0, -44], [0, 44]]) add(`tip-${k}-${dx}-${dy}`, cylZ(x + dx, dy, hz - 6, 18, 6, 6).color(brass));
  } else {
    add(`tip-${k}`, cylZ(x, 0, hz - 18, 20, 6, 6).color(brass));
  }
  if (fogging.value === 'on') add(`plume-${k}`, turned(plume).translate(x, 0, hz - 20).color(fog));
}

// Floor-standing high-pressure pump unit at the feed end (front left).
const UX = -560, UY = -420;
add("pump-skid", blk(UX, UY, 0, 520, 320, 40).color('#3a3d40'));
add("pump-motor", cylX(UX - 230, UY, 170, 260, 95, 16).color(pump));
for (let k = 0; k < 4; k++) add(`motor-fin-${k}`, cylX(UX - 200 + k * 55, UY, 170, 10, 102, 16).color(pump));
add("motor-cradle", blk(UX - 100, UY, 40, 200, 180, 40).color(pump));
add("motor-terminal", blk(UX - 100, UY, 260, 90, 90, 50).color(pump));
add("pump-head", blk(UX + 120, UY, 40, 170, 200, 200).color('#b9bec1'));
add("pump-manifold", blk(UX + 120, UY - 40, 240, 150, 90, 50).color(brass));
add("pump-gauge-stem", cylZ(UX + 150, UY - 60, 290, 50, 6, 6).color(brass));
add("pump-gauge", cylY(UX + 150, UY - 60, 360, 22, 42, 16).color('#e9ebe8'));
add("pump-gauge-ring", cylY(UX + 150, UY - 82, 360, 4, 44, 16).color(line));
add("filter-housing", cylZ(UX + 200, UY + 110, 40, 300, 50, 14).color('#dfe5e6'));
add("filter-cap", cylZ(UX + 200, UY + 110, 340, 40, 58, 14).color(pump));
// Braided hose up the left post to the line.
add("hose-out", cylX(-PX + 50, UY - 40, 265, UX + 190 + PX - 50, 9, 8).color(line));
add("hose-run", cylY(-PX + 50, 0, 265, -UY + 40, 9, 8).color(line));
add("hose-riser", cylZ(-PX + 50, 0, 265, LZ - 265, 9, 8).color(line));
add("hose-elbow", blk(-PX + 70, 0, LZ - 15, 60, 30, 30).color(brass));

return p.model();
