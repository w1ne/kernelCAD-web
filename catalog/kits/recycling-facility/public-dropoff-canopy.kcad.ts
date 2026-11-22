// SPDX-License-Identifier: CC0-1.0
// Public drop-off canopy: the open-fronted shelter at a household recycling
// centre where residents park and post their sorted waste. What makes it
// that canopy rather than a table: a three-bay steel portal frame on base
// plates, rafters and a profiled-sheet roof falling to a back gutter and
// downpipe, a deep sign fascia across the front with the stream colours, a
// raised kerbed plinth under the roof carrying a row of 1100-litre bins with
// colour-coded lids and stream labels, a clad back wall, yellow bollards
// along the front and a site information board at the end.
// Generic visualization geometry at about real size (6.6 x 4.3 m, 4.1 m
// tall), millimetres, Z up, open front toward -Y.

meta({
  name: "public-dropoff-canopy",
  license: 'CC0-1.0',
  title: "Public drop-off canopy",
  description: "Household recycling centre drop-off canopy at about real size: three-bay steel portal frame, profiled-sheet roof falling to a back gutter and downpipe, sign fascia with stream colours, kerbed plinth with four 1100-litre bins with colour-coded lids and labels, clad back wall, front bollards and a site information board. Back wall clad or open. Material controls: frame, roof and cladding, fascia and bin bodies. council, modern, weathered and highVisibility presets.",
  tags: ["recycling", "drop-off", "canopy", "household recycling centre", "civic amenity", "wheelie bin", "shelter", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f4f3a', { label: 'Frame (painted steel)' });
const roof = param('roof', '#c9ccce', { label: 'Roof and cladding (profiled sheet)' });
const fascia = param('fascia', '#2f7a46', { label: 'Sign fascia' });
const bins = param('bins', '#b8bec0', { label: 'Bin bodies (galvanised)' });
const backWall = param('backWall', 'clad', { choices: ['clad', 'open'], label: 'Back wall' });

presets({
  council: { frame: '#2f4f3a', roof: '#c9ccce', fascia: '#2f7a46', bins: '#b8bec0' },
  modern: { frame: '#2c3034', roof: '#5d6366', fascia: '#d77632', bins: '#8a9196' },
  weathered: { frame: '#4a5246', roof: '#9a9690', fascia: '#4f6a52', bins: '#8e918a' },
  highVisibility: { frame: '#2f6b8f', roof: '#e2e4e2', fascia: '#f0c419', bins: '#c9ccce' },
});

const p = assembly("public-dropoff-canopy");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const plane = (z: number) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });

// Mono-pitch roof falling from 3.6 m at the front to 3.2 m at the back.
const CY = 1700, ZF = 3600, ZB = 3200, ZM = (ZF + ZB) / 2;
const slope = Math.atan((ZF - ZB) / (2 * CY));
const ang = (slope * 180) / Math.PI;
const zr = (y: number) => ZM - y * Math.tan(slope);
const sloped = (s: Shape, z: number) => s.rotateX(-ang).translate(0, 0, z);
const XS = [-3000, -1000, 1000, 3000];
const tag = (x: number) => (x < 0 ? `l${-x}` : `r${x}`);

for (const x of XS) {
  for (const y of [-CY, CY]) {
    const t = `${tag(x)}-${y < 0 ? 'f' : 'b'}`;
    add(`column-${t}`, blk(x, y, 0, 150, 150, zr(y)).color(frame));
    add(`base-plate-${t}`, blk(x, y, 0, 320, 320, 25).color(frame));
    add(`haunch-${t}`, sloped(box(140, 450, 160, true), zr(y) - 80).translate(x, y + (y < 0 ? 170 : -170), 0).color(frame));
  }
  add(`rafter-${tag(x)}`, sloped(box(140, 4300, 260, true), ZM + 130).translate(x, 0, 0).color(frame));
}
for (const y of [-1950, -900, 200, 1300]) add(`purlin-${y < 0 ? `f${-y}` : `b${y}`}`, blk(0, y, zr(y) + 260, 6600, 80, 120).color(frame));

// Profiled roof sheet with standing ribs.
const RT = ZM + 260 + 120;
add("roof-sheet", sloped(box(6700, 4400, 30, true), RT + 15).color(roof));
for (let k = 0; k < 22; k++) {
  const x = -3150 + k * 300;
  add(`roof-rib-${k}`, sloped(box(50, 4400, 40, true), RT + 50).translate(x, 0, 0).color(roof));
}
// Back gutter and downpipe.
add("gutter", blk(0, 2260, zr(2200) + 200, 6700, 160, 160).color(frame));
add("downpipe", cylinder(zr(2200) + 220, 55, 10).translate(3250, 2280, 0).color(frame));
add("downpipe-shoe", blk(3250, 2200, 0, 140, 260, 90).color(frame));

// Sign fascia across the front with stream-colour tiles and lettering.
const FZ = zr(-2200) + 150;
add("fascia-board", blk(0, -2250, FZ - 400, 6700, 100, 650).color(fascia));
add("fascia-cap", blk(0, -2240, FZ + 250, 6760, 160, 50).color(frame));
const tiles = ['#2f68b0', '#3d7f45', '#e0b52a', '#8a5a34', '#c8322a', '#8a9196'];
tiles.forEach((c, k) => add(`fascia-tile-${k}`, blk(-3050 + k * 300, -2304, FZ - 300, 240, 8, 300).color(c)));
add("fascia-lettering", blk(900, -2304, FZ - 200, 3600, 8, 140).color('#f2f0e6'));
add("fascia-sub-lettering", blk(300, -2304, FZ - 330, 2400, 8, 60).color('#f2f0e6'));

// Kerbed plinth, back wall and the bin row.
add("plinth", blk(0, 650, 0, 6400, 2100, 150).color('#a39f96'));
add("plinth-edge", blk(0, -398, 0, 6400, 8, 150).color('#f0c419'));
if (backWall.value === 'clad') {
  add("back-wall", blk(0, 1800, 150, 6200, 60, 2300).color(roof));
  for (let k = 0; k < 20; k++) add(`back-wall-rib-${k}`, blk(-2850 + k * 300, 1765, 150, 40, 20, 2300).color(roof));
}
const lids = [['#2f68b0', 'paper'], ['#3d7f45', 'glass'], ['#e0b52a', 'cans'], ['#8a5a34', 'garden']];
lids.forEach(([lc, name], k) => {
  const x = -2250 + k * 1500, y = 700, z0 = 150 + 200, H = 950;
  add(`bin-body-${name}`, rect(1100, 820).loft([rect(1240, 960)], { planes: [plane(z0), plane(z0 + H)], ruled: true }).translate(x, y, 0).color(bins));
  add(`bin-rim-${name}`, blk(x, y, z0 + H - 60, 1280, 1000, 60).color(bins));
  add(`bin-lid-${name}`, box(1300, 1040, 70, true).rotateX(-4).translate(x, y, z0 + H + 50).color(lc));
  add(`bin-lid-flap-${name}`, blk(x - 300, y - 230, z0 + H + 85, 480, 420, 30).color(lc));
  add(`bin-label-${name}`, box(500, 8, 300, true).rotateX(4).translate(x, y - 450, z0 + H * 0.55).color(lc));
  add(`bin-label-text-${name}`, box(360, 8, 50, true).rotateX(4).translate(x, y - 456, z0 + H * 0.55 + 40).color('#f2f0e6'));
  add(`bin-trunnion-${name}`, cylinder(1340, 30, 8).rotateY(90).translate(x - 670, y, z0 + H - 260).color(bins));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const wx = x + sx * 440, wy = y + sy * 320;
    add(`bin-castor-${name}-${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`, blk(wx, wy, 150 + 120, 90, 90, 80).color(bins));
    add(`bin-wheel-${name}-${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`, cylinder(50, 88, 10).rotateY(90).translate(wx - 25, wy, 150 + 85).subtract(blk(wx, wy, 100, 200, 300, 50)).color('#1c1d1e'));
  }
});

// Bollards along the front and a site information board at the end.
for (const x of [-2000, 0, 2000]) {
  add(`bollard-${tag(x)}`, cylinder(1000, 70, 10).translate(x, -2150, 0).color('#f0c419'));
  add(`bollard-band-${tag(x)}`, cylinder(100, 73, 10).translate(x, -2150, 750).color('#1c1d1e'));
}
for (const x of [-4250, -3450]) add(`info-post-${x === -4250 ? 'l' : 'r'}`, blk(x, -1900, 0, 80, 80, 2300).color(frame));
add("info-board", blk(-3850, -1950, 1100, 1000, 40, 1100).color(fascia));
add("info-map", blk(-3850, -1974, 1250, 820, 8, 600).color('#f2f0e6'));
tiles.slice(0, 4).forEach((c, k) => add(`info-key-${k}`, blk(-4150 + k * 200, -1974, 1950, 150, 8, 150).color(c)));

return p.model();
