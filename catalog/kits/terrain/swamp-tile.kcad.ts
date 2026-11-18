// Original kernelCAD low-poly swamp tile: a 2 m x 2 m tile of murky water at
// the pond level with lumpy mud islands, reed clumps, floating lily pads and
// a rotten snag. Edges sit at the water level of the nature water tile.

meta({
  name: 'swamp-tile',
  license: 'CC0-1.0',
  title: 'Swamp tile',
  description: 'Square 2 m bog tile of murky water with mud islands, reed clumps, lily pads and a rotten tree snag. Knobs: island count, reeds, snag, water, mud, reed, lily pad and wood colours.',
  tags: ['tile', 'swamp', 'bog', 'marsh', 'wetland', 'water', 'mud', 'reeds', 'lily pad', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'swamp', 'forest'],
  triangleBudget: 800,
});

const islands = param('islands', '2', { choices: ['1', '2', '3'], label: 'Mud islands' });
const reedsP = param('reeds', 'yes', { choices: ['yes', 'no'], label: 'Reeds' });
const snag = param('snag', 'yes', { choices: ['yes', 'no'], label: 'Rotten snag' });
const water = param('water', '#4d7a6e', { label: 'Water' });
const mud = param('mud', '#5a4632', { label: 'Mud' });
const reed = param('reed', '#7a8f3a', { label: 'Reeds' });
const lily = param('lily', '#4f9a3a', { label: 'Lily pads' });
const wood = param('wood', '#4a3b2c', { label: 'Snag wood' });

presets({
  toxic: { water: '#7a9a2a', reed: '#5a6a2a', lily: '#9ac23a' },
  dark: { water: '#2f4a44', mud: '#3a2e24', reed: '#4f5a2f', lily: '#3f6a2f' },
});

const S = 2000;
const bedZ = 50;
const waterTop = 145; // the nature water tile's water level

const ring = (r: number, s: number, salt: number, rot = 0, sy = 1) => {
  let p = path();
  for (let k = 0; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * (0.78 + 0.32 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233)));
    p = k === 0 ? p.moveTo(rr * Math.cos(a), rr * sy * Math.sin(a)) : p.lineTo(rr * Math.cos(a), rr * sy * Math.sin(a));
  }
  return p.close();
};

const tile = assembly('swamp-tile');
tile.part('bed', box(S, S, bedZ, true).translate(0, 0, bedZ / 2).color(mud));
tile.part('water', box(S, S, waterTop - bedZ + 5, true).translate(0, 0, (waterTop + bedZ - 5) / 2).color(water));

const isl: [number, number, number][] = [[-420, 330, 520], [480, -380, 420], [520, 600, 300]];
for (let i = 0; i < Number(islands.value); i++) {
  const [x, y, r] = isl[i];
  tile.part(`island-${i + 1}`, ring(r, 8, i + 1, 0, 0.8).loft([ring(r * 0.75, 8, i + 4, 0.3, 0.8), ring(r * 0.35, 8, i + 7, 0.1, 0.8)], {
    planes: [
      { plane: 'XY', origin: [x, y, bedZ - 5] },
      { plane: 'XY', origin: [x + 20, y, waterTop + 60] },
      { plane: 'XY', origin: [x - 30, y + 20, waterTop + 110] },
    ],
    ruled: true,
  }).color(mud));
}
if (reedsP.value === 'yes') {
  // Reed clumps: thin leaning stalks rooted in the mud islands and shallows.
  const clumps: [number, number][] = [[-500, 380], [-300, 250], [620, -330], [-780, -620]];
  let k = 0;
  for (const [cx, cy] of clumps) {
    for (let j = 0; j < 4; j++) {
      k++;
      const hh = 650 + 200 * Math.sin(k * 2.3);
      const stalk = ring(18, 3, k).loft(ring(6, 3, k + 9), { spacing: hh, ruled: true })
        .rotateY(9 * Math.sin(k * 1.7)).rotateX(9 * Math.cos(k * 2.1))
        .translate(cx + 55 * Math.cos(k * 2.4), cy + 55 * Math.sin(k * 2.4), bedZ);
      tile.part(`reed-${k}`, stalk.color(reed));
    }
  }
}
// Lily pads: flat discs with a notch, floating on the water.
const pads: [number, number, number][] = [[150, -150, 140], [-50, -520, 110], [-700, -150, 120], [80, 700, 95], [760, 120, 105]];
pads.forEach(([x, y, r], i) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 7; k++) {
    const a = 0.35 + ((2 * Math.PI - 0.7) * k) / 6 + i;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  pts.push([0, 0]);
  tile.part(`lily-${i + 1}`, extrudePolygon(pts, 12).translate(x, y, waterTop - 4).color(lily));
});
if (snag.value === 'yes') {
  // Rotten snag: a broken leaning trunk with a stub branch.
  tile.part('snag', ring(110, 6, 2).loft([ring(80, 6, 3, 0.4), ring(55, 6, 4)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [30, 0, 500] },
      { plane: 'XY', origin: [70, 10, 900] },
    ],
    ruled: true,
  }).translate(450, -380, bedZ).color(wood));
  tile.part('snag-branch', ring(40, 5, 6).loft(ring(18, 5, 7), { spacing: 380, ruled: true }).rotateY(55).translate(500, -380, bedZ + 560).color(wood));
}

return tile.model();
