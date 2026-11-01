// Original kernelCAD low-poly treasure chest: a plank box with a barrel-
// vaulted lid (a half-octagon profile extruded along the chest), iron
// corner bands and a lock plate; open, it shows a heap of gold.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, lock towards -Y.

meta({
  name: 'treasure-chest',
  license: 'CC0-1.0',
  title: 'Treasure chest',
  description: 'Wooden treasure chest with a vaulted lid, iron bands and a lock plate, shut or flung open over a heap of gold. Knobs: lid, size, wood, iron and gold colours.',
  tags: ['chest', 'treasure', 'treasure chest', 'loot', 'gold', 'pirate', 'trunk', 'fantasy', 'dungeon'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'medieval', 'fantasy', 'dungeon', 'pirate'],
  triangleBudget: 300,
});

const lid = param('lid', 'closed', { choices: ['closed', 'open'], label: 'Lid' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const wood = param('wood', '#8a5530', { label: 'Wood' });
const iron = param('iron', '#3f3d3b', { label: 'Iron bands' });
const gold = param('gold', '#f0c23a', { label: 'Gold' });

presets({
  royal: { wood: '#7a2a2a', iron: '#d8b040' },
  dungeon: { wood: '#5e4a36', iron: '#2a2a2c' },
});

const s = size.value === 'small' ? 0.6 : size.value === 'large' ? 1.4 : 1;
const L = 700 * s;
const D = 450 * s;
const H = 330 * s; // box height
const band = 40 * s;
const hingeY = D / 2;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Half-octagon vault in (y, z) extruded along X, base at z = 0.
const vault = (d: number, l: number) => {
  const r = d / 2;
  const pts: [number, number][] = [];
  for (let k = 0; k <= 4; k++) {
    const a = (Math.PI * k) / 4;
    pts.push([r * Math.cos(a), r * 0.75 * Math.sin(a)]);
  }
  return extrudePolygon(pts, l).rotateX(90).rotateZ(90).translate(-l / 2, 0, 0);
};

const c = assembly('treasure-chest');
c.part('box', blk(-L / 2, -D / 2, 0, L / 2, D / 2, H).color(wood));
// Bands wrap the box at both ends; lid pieces follow the lid.
for (const [i, x] of [[1, -L / 2 + 50 * s], [2, L / 2 - 50 * s - band]] as [number, number][]) {
  c.part(`band-${i}`, blk(x, -D / 2 - 8, 0, x + band, D / 2 + 8, H).color(iron));
}
c.part('lock', blk(-50 * s, -D / 2 - 18, H - 110 * s, 50 * s, -D / 2 + 1, H + 30 * s).color(iron));

const lidShape = () => vault(D, L).union(blk(-L / 2, -D / 2, -1, L / 2, D / 2, 30 * s)).translate(0, 0, 30 * s - 1);
const lidBand = (x: number) => vault(D + 16, band).translate(x + band / 2, 0, 30 * s + 6).union(blk(x, -D / 2 - 8, 0, x + band, D / 2 + 8, 37 * s));
// The lid is built shut at the hinge line, then swung back about it when open.
const swing = (sh: Shape) => (lid.value === 'open' ? sh.translate(0, -hingeY, 0).rotateX(-105).translate(0, hingeY, H) : sh.translate(0, 0, H));
c.part('lid', swing(lidShape()).color(wood));
c.part('lid-band-1', swing(lidBand(-L / 2 + 50 * s)).color(iron));
c.part('lid-band-2', swing(lidBand(L / 2 - 50 * s - band)).color(iron));

if (lid.value === 'open') {
  const gl = L - 60 * s;
  const gd = D - 60 * s;
  c.part('gold', path().moveTo(-gl / 2, -gd / 2).lineTo(gl / 2, -gd / 2).lineTo(gl / 2, gd / 2).lineTo(-gl / 2, gd / 2).close()
    .loft(path().moveTo(-gl * 0.25, -gd * 0.15).lineTo(gl * 0.2, -gd * 0.2).lineTo(gl * 0.25, gd * 0.15).lineTo(-gl * 0.2, gd * 0.2).close(), { spacing: 110 * s, ruled: true })
    .translate(0, 0, H - 30 * s).color(gold));
}

return c.model();
