// Original kernelCAD low-poly river tile: a 2 m x 2 m grass tile with a
// shallow river running straight along Y or bending round a corner, sandy
// bank ledges and a few midstream rocks. The channel is centred on the tile
// edges and the water sits at the nature water tile's level, so rivers join
// across the 2 m grid.

meta({
  name: 'river-bend-tile',
  license: 'CC0-1.0',
  title: 'River tile',
  description: 'Square 2 m river tile, straight or bending round a corner, with ragged grassy banks, sandy bank ledges and midstream rocks. Knobs: layout, river width, rock count, grass, bank, water, rock and dirt colours.',
  tags: ['tile', 'river', 'stream', 'creek', 'bend', 'water', 'bank', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'forest', 'meadow'],
  triangleBudget: 700,
});

const layout = param('layout', 'bend', { choices: ['bend', 'straight'], label: 'Layout' });
const widthM = param('widthM', '1', { choices: ['0.8', '1', '1.2'], label: 'River width (m)' });
const rocks = param('rocks', '2', { choices: ['0', '2', '3'], label: 'Rocks' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const bank = param('bank', '#cdb685', { label: 'Bank' });
const water = param('water', '#3f8fc4', { label: 'Water' });
const rockC = param('rock', '#8a8d91', { label: 'Rocks' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  swampy: { water: '#4d7a6e', bank: '#6b5a3a', grass: '#5c7d3a' },
  icy: { water: '#cfe6f2', grass: '#eef3f6', bank: '#b9c4cc' },
  autumn: { grass: '#a8a043', bank: '#b89a6a' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const bedZ = 50;
const waterTop = 145;
const w = (Number(widthM.value) * 1000) / 2;
const bk = 140; // sandy ledge width
const bend = layout.value === 'bend';
const segs = 8;

// Point at lateral offset o from the centreline, fraction i/segs along it.
// The banks are ragged except at the tile edges, so tiles still join.
const at = (o: number, i: number): [number, number] => {
  const u = i / segs;
  let d = o;
  if (Math.abs(o) > w - 1) d += Math.sign(o) * 55 * Math.sin(i * 2.9 + o * 0.01) * Math.sin(Math.PI * u);
  if (!bend) return [d, -h + S * u];
  const a = Math.PI / 2 + (Math.PI / 2) * u;
  return [h + (h - d) * Math.cos(a), -h + (h - d) * Math.sin(a)];
};
const line = (o: number, rev = false) => {
  const pts: [number, number][] = [];
  for (let k = 0; k <= segs; k++) pts.push(at(o, rev ? segs - k : k));
  return pts;
};
const band = (o0: number, o1: number) => [...line(o0), ...line(o1, true)];
const prism = (pts: [number, number][], z0: number, z1: number) => extrudePolygon(pts, z1 - z0).translate(0, 0, z0);

const tile = assembly('river-bend-tile');
tile.part('bed', box(S, S, bedZ, true).translate(0, 0, bedZ / 2).color(bank));
// Ground on each side of the river: dirt skirt under a grass cap.
const sides: [string, [number, number][]][] = bend
  ? [['inner', [[h, -h], ...line(w + bk, true)]], ['outer', [...line(-w - bk), [-h, -h], [-h, h], [h, h]]]]
  : [['left', [[-h, -h], ...line(-w - bk), [-h, h]]], ['right', [[h, h], ...line(w + bk, true), [h, -h]]]];
for (const [name, pts] of sides) {
  tile.part(`dirt-${name}`, prism(pts, bedZ - 5, skirtH).color(dirt));
  tile.part(`grass-${name}`, prism(pts, skirtH - 5, t).color(grass));
}
tile.part('ledge-a', prism(band(-w - bk - 2, -w + 40), bedZ - 5, t - 30).color(bank));
tile.part('ledge-b', prism(band(w - 40, w + bk + 2), bedZ - 5, t - 30).color(bank));
tile.part('water', prism(band(-w + 20, w - 20), bedZ - 5, waterTop).color(water));

const ring = (r: number, s: number, salt: number) => {
  let p = path();
  for (let k = 0; k < s; k++) {
    const a = (2 * Math.PI * k) / s + salt;
    const rr = r * (0.8 + 0.3 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233)));
    p = k === 0 ? p.moveTo(rr * Math.cos(a), rr * Math.sin(a)) : p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};
const spots: [number, number, number][] = [[-0.3, 3, 150], [0.35, 6, 110], [0, 4.5, 90]];
for (let i = 0; i < Number(rocks.value); i++) {
  const [o, idx, r] = spots[i];
  const [x, y] = at(o * w, idx);
  tile.part(`rock-${i + 1}`, ring(r, 6, i + 1).loft(ring(r * 0.5, 6, i + 2), { spacing: r * 1.1, ruled: true })
    .translate(x, y, bedZ + 20).color(rockC));
}

return tile.model();
