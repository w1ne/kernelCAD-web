// Original kernelCAD low-poly cobblestone road tile: a 2 m x 2 m tile with a
// cobbled carriageway running along Y between kerb stones and grass verges.
// Cobbles are small chamfered lofts in staggered rows; the road meets the
// front and back edges centred, so roads join on the 2 m grid.

meta({
  name: 'cobblestone-road-tile',
  license: 'CC0-1.0',
  title: 'Cobblestone road tile',
  description: 'Square 2 m road tile with staggered chamfered cobbles between kerb stones and grass verges. Knobs: road width, cobble size, cobble, accent cobble, kerb, verge and dirt colours.',
  tags: ['tile', 'road', 'cobblestone', 'cobbles', 'street', 'medieval', 'town', 'paving', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'town', 'village', 'castle'],
  triangleBudget: 1300,
});

const widthM = param('widthM', '1.4', { choices: ['1', '1.4', '1.8'], label: 'Road width (m)' });
const cobbleSize = param('cobbleSize', 'medium', { choices: ['small', 'medium', 'large'], label: 'Cobble size' });
const cobble = param('cobble', '#8f8b85', { label: 'Cobbles' });
const cobble2 = param('cobble2', '#7a766f', { label: 'Accent cobbles' });
const kerb = param('kerb', '#b4afa5', { label: 'Kerb' });
const verge = param('verge', '#6aa443', { label: 'Verge' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  sandstone: { cobble: '#c9a878', cobble2: '#b39064', kerb: '#dcc49a' },
  wet: { cobble: '#5c6068', cobble2: '#4c4f56', kerb: '#80838a', verge: '#4f7f3a' },
  town: { verge: '#9a9690', kerb: '#c8c4bc' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const w = (Number(widthM.value) * 1000) / 2;
const kw = 120; // kerb width
const cs = cobbleSize.value === 'small' ? 200 : cobbleSize.value === 'large' ? 330 : 260;
const g = 22;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const rect = (x0: number, y0: number, x1: number, y1: number) =>
  path().moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).close();

const tile = assembly('cobblestone-road-tile');
tile.part('dirt', blk(-h, -h, 0, h, h, skirtH).color(dirt));
tile.part('verge-left', blk(-h, -h, skirtH - 5, -w - kw, h, t).color(verge));
tile.part('verge-right', blk(w + kw, -h, skirtH - 5, h, h, t).color(verge));
tile.part('kerb-left', blk(-w - kw, -h, skirtH - 5, -w, h, t + 25).color(kerb));
tile.part('kerb-right', blk(w, -h, skirtH - 5, w + kw, h, t + 25).color(kerb));
// Bedding the cobbles sit in (shows in the joints).
tile.part('bed', blk(-w, -h, skirtH - 5, w, h, t - 40).color(dirt));

const rows = Math.round(S / cs);
const rl = S / rows;
const cols = Math.max(2, Math.round((2 * w) / cs));
const cw = (2 * w) / cols;
let k = 0;
for (let r = 0; r < rows; r++) {
  const y0 = -h + r * rl;
  const shift = r % 2 === 1 ? cw / 2 : 0;
  const xs: [number, number][] = [];
  if (shift === 0) {
    for (let c = 0; c < cols; c++) xs.push([-w + c * cw, -w + (c + 1) * cw]);
  } else {
    xs.push([-w, -w + shift]);
    for (let c = 0; c < cols - 1; c++) xs.push([-w + shift + c * cw, -w + shift + (c + 1) * cw]);
    xs.push([w - shift, w]);
  }
  for (const [xa, xb] of xs) {
    k++;
    const x0 = xa + g / 2;
    const x1 = xb - g / 2;
    const ya = y0 + g / 2;
    const yb = y0 + rl - g / 2;
    const ch = Math.min(40, (x1 - x0) * 0.25);
    const top = t - 8 * (0.5 + 0.5 * Math.sin(k * 5.3));
    tile.part(`cobble-${k}`, rect(x0, ya, x1, yb).loft(rect(x0 + ch, ya + ch, x1 - ch, yb - ch), {
      planes: [
        { plane: 'XY', origin: [0, 0, t - 50] },
        { plane: 'XY', origin: [0, 0, top] },
      ],
      ruled: true,
    }).color(k % 4 === 0 ? cobble2 : cobble));
  }
}

return tile.model();
