// Original kernelCAD low-poly path tile: a 2 m x 2 m grass tile with a
// slightly sunken dirt path cut through it (straight, corner, T or cross),
// path ends centred on the tile edges so paths join across a 2 m grid.

meta({
  name: 'path-tile',
  title: 'Path tile',
  description: 'Square 2 m grass tile with a sunken dirt footpath running straight, round a corner, as a T or a crossing. Knobs: layout, path width, grass, path and dirt colours.',
  tags: ['tile', 'path', 'trail', 'road', 'footpath', 'dirt', 'terrain', 'grid', 'nature'],
  kit: 'nature',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'meadow', 'forest'],
  triangleBudget: 160,
});

const layout = param('layout', 'straight', { choices: ['straight', 'corner', 'tee', 'cross'], label: 'Layout' });
const widthM = param('widthM', '0.8', { choices: ['0.6', '0.8', '1.2'], label: 'Path width (m)' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const pathC = param('path', '#b48a5a', { label: 'Path' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  cobble: { path: '#9a9a96' },
  dry: { grass: '#b3a456', path: '#d2b07a' },
  snowy: { grass: '#eef3f6', path: '#b9a58e' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const sink = 25;
const w = (Number(widthM.value) * 1000) / 2;

// Path footprint as a polygon (counter-clockwise), arms reach the tile edges.
// A small bevel on inside corners keeps the low-poly look.
const b = w * 0.5;
const shapes: Record<string, number[][]> = {
  straight: [[-w, -h], [w, -h], [w * 0.8, 0], [w, h], [-w, h], [-w * 1.15, 0]],
  corner: [[-w, -h], [w, -h], [w, -w - b], [w + b, -w], [h, -w], [h, w], [-w, w]],
  tee: [[-w, -h], [w, -h], [w, -w - b], [w + b, -w], [h, -w], [h, w], [-h, w], [-h, -w], [-w - b, -w], [-w, -w - b]],
  cross: [
    [-w, -h], [w, -h], [w, -w - b], [w + b, -w], [h, -w], [h, w], [w + b, w], [w, w + b], [w, h],
    [-w, h], [-w, w + b], [-w - b, w], [-h, w], [-h, -w], [-w - b, -w], [-w, -w - b],
  ],
};
const poly = shapes[layout.value].map(([x, y]) => [x, y] as [number, number]);

const tile = assembly('path-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
const cutter = extrudePolygon(poly, t).translate(0, 0, skirtH - 50);
tile.part('grass', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).subtract(cutter).color(grass));
tile.part('path', extrudePolygon(poly, t - skirtH - sink).translate(0, 0, skirtH).color(pathC));

return tile.model();
