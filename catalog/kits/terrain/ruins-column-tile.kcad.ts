// Original kernelCAD low-poly ruins tile: a 2 m x 2 m patch of cracked stone
// paving with broken classical columns - stepped bases, faceted shafts with
// jagged snapped tops, one still wearing its capital - and fallen drums lying
// in the grass. Edges sit at the 0.2 m tile height.

meta({
  name: 'ruins-column-tile',
  license: 'CC0-1.0',
  title: 'Ruined columns tile',
  description: 'Square 2 m ruins tile of cracked paving with broken classical columns, one capital and fallen column drums. Knobs: standing columns, fallen drums, stone, accent stone, paving, moss and grass colours.',
  tags: ['tile', 'ruins', 'column', 'pillar', 'temple', 'ancient', 'greek', 'roman', 'broken', 'stone', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'ruins', 'desert', 'forest'],
  triangleBudget: 700,
});

const columns = param('columns', '2', { choices: ['1', '2', '3'], label: 'Standing columns' });
const fallen = param('fallen', '2', { choices: ['0', '1', '2', '3'], label: 'Fallen drums' });
const stone = param('stone', '#ddd5c3', { label: 'Column stone' });
const stone2 = param('stone2', '#c4baa5', { label: 'Accent stone' });
const paving = param('paving', '#b5ad9c', { label: 'Paving' });
const moss = param('moss', '#6f8f3f', { label: 'Moss' });
const grass = param('grass', '#6aa443', { label: 'Grass' });

presets({
  desert: { stone: '#e2c99a', stone2: '#cdb07a', paving: '#c9a878', grass: '#d8b77a', moss: '#a8944a' },
  marble: { stone: '#f1eee8', stone2: '#dcd8d0', paving: '#c8c4bc' },
  overgrown: { moss: '#4f8a3a', paving: '#9a9a88' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const sides = 10;

const ngon = (r: number, s = sides, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / s), r * Math.sin(rot + (2 * Math.PI * k) / s));
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const tile = assembly('ruins-column-tile');
tile.part('ground', blk(-h, -h, 0, h, h, t - 40).color(grass));
tile.part('grass-top', blk(-h, -h, t - 41, h, h, t - 10).color(grass));
// Paving: a 3 x 3 grid of slabs, a couple missing and one tilted up.
let k = 0;
const cell = S / 3;
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    k++;
    if (k === 3 || k === 7) continue; // missing slabs show grass
    const x0 = -h + i * cell + (i === 0 ? 0 : 12);
    const x1 = -h + (i + 1) * cell - (i === 2 ? 0 : 12);
    const y0 = -h + j * cell + (j === 0 ? 0 : 12);
    const y1 = -h + (j + 1) * cell - (j === 2 ? 0 : 12);
    let slab = blk(x0, y0, t - 60, x1, y1, t - 6 * (0.5 + 0.5 * Math.sin(k * 3.3)));
    if (k === 9) slab = blk(x0 + 20, y0 + 20, t - 60, x1 - 20, y1 - 20, t).rotateX(-6).translate(0, 0, 25);
    tile.part(`slab-${k}`, slab.color(k % 2 === 0 ? paving : stone2));
  }
}
// Standing columns: square plinth, torus-like base ring, faceted shaft with a
// jagged snapped top (a ruled loft to a tilted, smaller ring).
const spots: [number, number, number][] = [[-450, 380, 2100], [420, 420, 1250], [-380, -420, 700]];
const R = 150;
for (let c = 0; c < Number(columns.value); c++) {
  const [x, y, ht] = spots[c];
  tile.part(`plinth-${c + 1}`, blk(x - 230, y - 230, t - 10, x + 230, y + 230, t + 90).color(stone2));
  tile.part(`base-${c + 1}`, ngon(R * 1.35).loft(ngon(R * 1.1, sides, 0.3), { spacing: 90, ruled: true }).translate(x, y, t + 88).color(stone));
  const z0 = t + 175;
  const shaft = ngon(R, sides, 0.3).loft([ngon(R * 0.88, sides, 0.3), ngon(R * 0.7, sides, 0.9)], {
    planes: [
      { plane: 'XY', origin: [x, y, z0] },
      { plane: 'XY', origin: [x, y, z0 + ht * 0.92] },
      { plane: 'XY', origin: [x + 25, y - 15, z0 + ht] },
    ],
    ruled: true,
  });
  tile.part(`shaft-${c + 1}`, shaft.color(c % 2 === 0 ? stone : stone2));
  if (c === 0) {
    // The tallest keeps its capital: a flared echinus and a square abacus.
    tile.part('capital', ngon(R * 0.9, sides, 0.3).loft(ngon(R * 1.35, sides, 0.3), { spacing: 110, ruled: true })
      .translate(x + 20, y - 12, z0 + ht - 30).color(stone));
    tile.part('abacus', blk(x - 210 + 20, y - 210 - 12, z0 + ht + 78, x + 210 + 20, y + 210 - 12, z0 + ht + 160).color(stone2));
    tile.part('moss-1', ngon(R * 1.5, 6).loft(ngon(R * 1.2, 6, 0.5), { spacing: 40, ruled: true }).translate(x, y, t + 80).color(moss));
  }
}
// Fallen drums lying on their sides.
const drums: [number, number, number][] = [[380, -380, 30], [120, -650, 70], [700, 30, 115]];
for (let d = 0; d < Number(fallen.value); d++) {
  const [x, y, yaw] = drums[d];
  tile.part(`drum-${d + 1}`, ngon(R * 0.95, sides).extrude(380).rotateY(90).translate(-190, 0, R * 0.95 * Math.cos(Math.PI / sides)).rotateZ(yaw).translate(x, y, t - 25).color(d % 2 === 0 ? stone : stone2));
}
tile.part('moss-2', ngon(260, 6, 0.4).loft(ngon(130, 6, 0.9), { spacing: 70, ruled: true }).translate(-650, -720, t - 15).color(moss));

return tile.model();
