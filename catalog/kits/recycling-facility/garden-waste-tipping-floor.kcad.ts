// SPDX-License-Identifier: CC0-1.0
// Garden-waste tipping floor: the open concrete apron at a recycling or
// composting site where vans and skips tip garden waste into bays before a
// loader feeds the shredder. What makes it a tipping floor rather than a yard:
// interlocking concrete push-wall blocks (studded on top) forming three
// open-fronted bays, each holding a different stream (grass and leaves,
// hedge clippings, branches and logs), hazard-striped wall ends that take
// the loader bucket, bay signs on the back wall, and a grated drainage
// channel across the front that catches the leachate.
// Generic visualization geometry at about real size (12 m wide, 6.5 m
// deep, walls 2.4 m high), millimetres, Z up, bays open toward -Y.

meta({
  name: "garden-waste-tipping-floor",
  license: 'CC0-1.0',
  title: "Garden-waste tipping floor",
  description: "Three-bay garden-waste tipping floor at about real size: concrete slab, studded interlocking push-wall blocks, open-fronted bays of grass and leaves, hedge clippings and branches with logs, hazard-striped wall ends, colour-coded bay signs and a grated drainage channel. Material controls: wall blocks, floor slab, green waste, branches and logs; full, half or empty bays. depot, freshConcrete, autumn and weathered presets.",
  tags: ['tipping floor', 'tipping bay', 'green waste', 'garden waste', 'push wall', 'concrete blocks', 'lego blocks', 'compost', 'organics', 'recycling', 'waste management', 'household recycling centre', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 5600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#bdb8ac', { label: 'Push-wall blocks (precast concrete)' });
const slab = param('slab', '#8f8b83', { label: 'Floor slab (concrete)' });
const greenWaste = param('greenWaste', '#5f8a3a', { label: 'Green waste (grass, hedge clippings)' });
const timber = param('timber', '#8a6a48', { label: 'Branches and logs (wood)' });
const fill = param('fill', 'full', { choices: ['full', 'half', 'empty'], label: 'Bay fill level' });

presets({
  depot: { concrete: '#bdb8ac', slab: '#8f8b83', greenWaste: '#5f8a3a', timber: '#8a6a48' },
  freshConcrete: { concrete: '#d6d3cb', slab: '#a9a59c', greenWaste: '#6e9a3e', timber: '#9a7a52' },
  autumn: { concrete: '#bdb8ac', slab: '#8f8b83', greenWaste: '#9a7a32', timber: '#6d4f34' },
  weathered: { concrete: '#9a958a', slab: '#6f6b64', greenWaste: '#4f6a34', timber: '#6a5a48' },
});

const p = assembly("garden-waste-tipping-floor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 8) => cylinder(len, r, seg).translate(x, y, z);
// Heap of height h and footprint radius about r, sitting on z = z0.
const cap = (x: number, y: number, r: number, h: number, z0: number) => {
  const R = (r * r + h * h) / (2 * h);
  return sphere(R).translate(x, y, z0 + h - R).subtract(blk(x, y, z0 - 2 * R, 4 * R, 4 * R, 2 * R));
};

const BW = 4000, BD = 4400, B = 800, CN = 3, ZS = 150;
const walls = [-1.5 * BW, -0.5 * BW, 0.5 * BW, 1.5 * BW];
const YB = BD;

// Slab and drainage channel across the front.
add("slab", blk(0, BD / 2 - 900, 0, 3 * BW + 1400, BD + 2600, ZS).color(slab));
add("channel", blk(0, -1500, ZS, 3 * BW + 1200, 300, 6).color('#2a2c2d'));
for (let k = 0; k < 24; k++) add(`grate-${k}`, blk(-3 * BW / 2 - 450 + k * 520, -1500, ZS + 6, 40, 300, 10).color('#5a6266'));

// Interlocking push-wall blocks: back wall and three dividers, stud tops on the top course.
const block = (name: string, x: number, y: number, c: number, alongX: boolean, len: number, top: boolean) => {
  const z = ZS + c * B;
  add(name, (alongX ? blk(x, y, z, len - 20, B, B - 10) : blk(x, y, z, B, len - 20, B - 10)).color(concrete));
  if (top) for (const o of [-len / 4, len / 4]) add(`${name}-stud`, cylZ(alongX ? x + o : x, alongX ? y : y + o, z + B - 10, 90, 200).color(concrete));
};
const backLen = 3 * BW + B;
for (let c = 0; c < CN; c++) {
  const off = c % 2 ? 800 : 0;
  for (let x = -backLen / 2; x < backLen / 2 - 10; x += x === -backLen / 2 && off ? off : 1600) {
    const len = Math.min(x === -backLen / 2 && off ? off : 1600, backLen / 2 - x);
    block(`back-${c}-${x}`, x + len / 2, YB + B / 2, c, true, len, c === CN - 1);
  }
}
for (const wx of walls) for (let c = 0; c < CN; c++) {
  const off = c % 2 ? 800 : 0;
  for (let y = 0; y < BD - 10; y += y === 0 && off ? off : 1600) {
    const len = Math.min(y === 0 && off ? off : 1600, BD - y);
    block(`divider-${wx}-${c}-${y}`, wx, y + len / 2, c, false, len, c === CN - 1);
  }
  // Hazard-striped end plate where the loader bucket strikes.
  add(`end-plate-${wx}`, blk(wx, -20, ZS, B + 40, 40, CN * B - 10).color('#f2c230'));
  for (let k = 0; k < 4; k++) add(`end-stripe-${wx}-${k}`, box(B + 40, 44, 160, true).rotateY(35).translate(wx, -20, ZS + 300 + k * 520).color('#1d2224'));
}

// Bay signs on the back wall.
const signColors = ['#3d8a4f', '#2f6db5', '#8a5a2b'];
for (let i = 0; i < 3; i++) {
  const x = (i - 1) * BW;
  add(`sign-${i}`, blk(x, YB - 30, ZS + CN * B - 1000, 1800, 40, 700).color('#f4f1e8'));
  add(`sign-band-${i}`, blk(x, YB - 55, ZS + CN * B - 500, 1800, 10, 180).color(signColors[i]));
  add(`sign-text-${i}`, blk(x + 250, YB - 55, ZS + CN * B - 850, 1000, 10, 200).color('#2a2c2d'));
  add(`sign-icon-${i}`, cylinder(10, 150, 12).rotateX(90).translate(x - 600, YB - 50, ZS + CN * B - 750).color(signColors[i]));
}

// Bay contents.
if (fill.value !== 'empty') {
  const f = fill.value === 'full' ? 1 : 0.6;
  // Bay 1: grass and leaves.
  add("grass-heap", cap(-BW, 1900, 1600, 2100 * f, ZS).color(greenWaste));
  add("leaf-heap", cap(-BW - 600, 1200, 1000, 700 * f, ZS).color('#9a7a32'));
  // Bay 2: hedge clippings, a darker leafy heap with twiggy brown bits.
  add("hedge-heap", cap(0, 1900, 1650, 2200 * f, ZS).color('#46703a'));
  add("hedge-spill", cap(500, 900, 900, 500 * f, ZS).color(greenWaste));
  for (let i = 0; i < 6; i++) {
    const a = i * 60 + 15;
    add(`twig-${i}`, box(900, 50, 50, true).rotateY(-20).rotateZ(a).translate(Math.cos((a * Math.PI) / 180) * 700, 1900 + Math.sin((a * Math.PI) / 180) * 700, ZS + 1500 * f).color(timber));
  }
  // Bay 3: branches and a stack of logs.
  add("brush-heap", cap(BW + 300, 2600, 1500, 1700 * f, ZS).color('#6d7a3a'));
  for (let i = 0; i < 8; i++) {
    const a = (i * 47) % 180;
    const r = 60 + (i % 3) * 25;
    add(`branch-${i}`, cylinder(2400, r, 6).rotateY(90).rotateZ(a).translate(BW + 300 - Math.cos((a * Math.PI) / 180) * 1200, 2400 - Math.sin((a * Math.PI) / 180) * 1200 + (i % 3) * 200, ZS + r + 500 + (i % 4) * 260 * f).color(timber));
  }
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - r; k++) {
    add(`log-${r}-${k}`, cylinder(1600, 170, 10).rotateX(90).translate(BW + 1000 - k * 360 - r * 180, 1300, ZS + 175 + r * 310).color(timber));
    add(`log-end-${r}-${k}`, cylinder(10, 140, 10).rotateX(90).translate(BW + 1000 - k * 360 - r * 180, -305, ZS + 175 + r * 310).color('#c9a46a'));
  }
}

// Loose clippings blown onto the apron.
for (let i = 0; i < 10; i++) add(`litter-${i}`, box(240, 140, 20, true).rotateZ((i * 41) % 180).translate(-5000 + i * 1050 + ((i * 313) % 400), -700 - ((i * 211) % 500), ZS).color(i % 3 ? greenWaste : timber));

return p.model();
