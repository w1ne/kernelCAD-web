// Original kernelCAD low-poly ground tile: a 2 m x 2 m grass slab with a
// faceted, gently raised top, wrapped in a dirt skirt that shows on the edges.
// Edges sit at exactly the tile thickness so tiles line up on a 2 m grid.

meta({
  name: 'ground-tile',
  title: 'Ground tile (grass)',
  description: 'Square 2 m grass ground tile with a dirt edge and an optional faceted bumpy top. Knobs: thickness, top relief, grass and dirt colours.',
  tags: ['tile', 'ground', 'grass', 'terrain', 'floor', 'lawn', 'grid', 'nature'],
  kit: 'nature',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'meadow', 'forest'],
  triangleBudget: 120,
});

const thickness = param('thickness', '0.2', { choices: ['0.1', '0.2', '0.4'], label: 'Thickness (m)' });
const relief = param('relief', 'bumpy', { choices: ['flat', 'bumpy'], label: 'Top relief' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  dry: { grass: '#b3a456', dirt: '#8f6a43' },
  snowy: { grass: '#eef3f6', dirt: '#6f5a48' },
  sand: { grass: '#e2c98f', dirt: '#b8915c' },
});

const S = 2000;
const t = Number(thickness.value) * 1000;
const wall = 20;
const half = S / 2;
const skirtH = t * 0.7;

// Square as an 8-point ring (corners + edge midpoints) so it lofts to an octagon.
const square8 = (a: number) => {
  const pts = [[a, 0], [a, a], [0, a], [-a, a], [-a, 0], [-a, -a], [0, -a], [a, -a]];
  let p = path().moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < 8; k++) p = p.lineTo(pts[k][0], pts[k][1]);
  return p.close();
};
const octa = (r: number, z: number) => {
  let p = path().moveTo(r * Math.cos(0.1), r * Math.sin(0.1));
  for (let k = 1; k < 8; k++) {
    const a = 0.1 + (2 * Math.PI * k) / 8;
    const rr = r * (0.9 + 0.15 * Math.sin(k * 2.3));
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};

const tile = assembly('ground-tile');
const bump = relief.value === 'bumpy' ? Math.min(60, t * 0.4) : 0;
const grassBody =
  bump > 0
    ? square8(half).loft([square8(half), octa(half * 0.55, 0)], {
        planes: [
          { plane: 'XY', origin: [0, 0, skirtH] },
          { plane: 'XY', origin: [0, 0, t] },
          { plane: 'XY', origin: [60, -40, t + bump] },
        ],
        ruled: true,
      })
    : box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2);
tile.part('grass', grassBody.color(grass));

tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));

return tile.model();
