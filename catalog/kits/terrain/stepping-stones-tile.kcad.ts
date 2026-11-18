// Original kernelCAD low-poly stepping-stones tile: a 2 m x 2 m tile with a
// shallow stream running along X between grassy banks, crossed by a line of
// flat-topped faceted stepping stones. The banks sit at the 0.2 m tile height
// and the water at the nature water tile's level.

meta({
  name: 'stepping-stones-tile',
  license: 'CC0-1.0',
  title: 'Stepping stones tile',
  description: 'Square 2 m stream tile with grassy banks and a line of flat faceted stepping stones crossing the water. Knobs: stone count, stream width, grass, bank, water, stone and dirt colours.',
  tags: ['tile', 'stepping stones', 'stream', 'creek', 'crossing', 'ford', 'water', 'river', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'forest', 'meadow'],
  triangleBudget: 400,
});

const stones = param('stones', '4', { choices: ['3', '4', '5'], label: 'Stones' });
const streamM = param('streamM', '0.8', { choices: ['0.8', '1.2', '1.6'], label: 'Stream width (m)' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const bank = param('bank', '#a08a62', { label: 'Bank' });
const water = param('water', '#3f8fc4', { label: 'Water' });
const stone = param('stone', '#9a9690', { label: 'Stones' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  mossy: { stone: '#7f8f5a', water: '#4a7f8a' },
  icy: { water: '#cfe6f2', grass: '#eef3f6', bank: '#b9c4cc', stone: '#7d8288' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const bedZ = 50;
const waterTop = 145;
const sw = (Number(streamM.value) * 1000) / 2;

// Extrude a (y, z) profile along +X across the whole tile.
const slab = (pts: [number, number][]) => extrudePolygon(pts, S).rotateX(90).rotateZ(90).translate(-h, 0, 0);
const ring = (r: number, s: number, salt: number, rot = 0) => {
  let p = path();
  for (let k = 0; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * (0.82 + 0.25 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233)));
    p = k === 0 ? p.moveTo(rr * Math.cos(a), rr * Math.sin(a)) : p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};

const tile = assembly('stepping-stones-tile');
for (const side of [-1, 1]) {
  const s = side < 0 ? 'front' : 'back';
  // Mirror a front-bank (y, z) profile to the back bank when side = 1.
  const m = (pts: [number, number][]) => (side < 0 ? pts : pts.map(([y, z]) => [-y, z] as [number, number]).reverse());
  const yg = -sw - 170; // where the grass stops and the bank slopes down
  tile.part(`dirt-${s}`, slab(m([[-h, 0], [yg, 0], [yg, skirtH], [-h, skirtH]])).color(dirt));
  tile.part(`grass-${s}`, slab(m([[-h, skirtH - 5], [yg, skirtH - 5], [yg + 10, t], [-h, t]])).color(grass));
  tile.part(`bank-${s}`, slab(m([[yg - 5, 0], [-sw + 90, 0], [-sw + 90, bedZ], [-sw + 10, bedZ + 40], [yg + 10, t - 12], [yg - 5, t - 12]])).color(bank));
}
tile.part('bed', box(S, 2 * sw - 100, bedZ, true).translate(0, 0, bedZ / 2).color(bank));
tile.part('water', box(S, 2 * sw + 160, waterTop - bedZ + 5, true).translate(0, 0, (waterTop + bedZ - 5) / 2).color(water));

// Stepping stones: flat-topped faceted lofts on a slightly wavering line.
const n = Number(stones.value);
for (let i = 0; i < n; i++) {
  const y = -sw - 80 + ((2 * sw + 160) * (i + 0.5)) / n;
  const x = 110 * Math.sin(i * 2.2 + 0.5);
  const r = 170 + 30 * Math.sin(i * 1.7);
  tile.part(`stone-${i + 1}`, ring(r, 7, i + 1).loft(ring(r * 0.78, 7, i + 1, 0.2), {
    planes: [
      { plane: 'XY', origin: [x, y, bedZ - 5] },
      { plane: 'XY', origin: [x, y, waterTop + 80 + 15 * Math.sin(i * 3.1)] },
    ],
    ruled: true,
  }).color(stone));
}

return tile.model();
