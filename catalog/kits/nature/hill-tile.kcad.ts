// Original kernelCAD low-poly hill tile: a 2 m x 2 m dirt-edged grass tile
// whose top rises into a faceted mound. The tile edges stay at the tile
// thickness so the hill drops onto flat ground tiles on a 2 m grid.

meta({
  name: 'hill-tile',
  license: 'CC0-1.0',
  title: 'Hill tile',
  description: 'Square 2 m terrain tile with a faceted grassy mound rising from flat edges, optional rock outcrop on top. Knobs: hill height, outcrop, grass, dirt and rock colours.',
  tags: ['tile', 'hill', 'mound', 'terrain', 'grass', 'slope', 'grid', 'nature'],
  kit: 'nature',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'meadow', 'forest'],
  triangleBudget: 160,
});

const heightM = param('heightM', '0.8', { choices: ['0.4', '0.8', '1.2'], label: 'Hill height (m)' });
const outcrop = param('outcrop', 'yes', { choices: ['yes', 'no'], label: 'Rock outcrop' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });
const rockC = param('rock', '#8d8f94', { label: 'Rock' });

presets({
  dry: { grass: '#b3a456', dirt: '#8f6a43' },
  snowy: { grass: '#eef3f6', dirt: '#6f5a48', rock: '#6f757c' },
});

const S = 2000;
const t = 200;
const skirtH = t * 0.7;
const H = Number(heightM.value) * 1000;

const square8 = (a: number) => {
  const pts = [[a, 0], [a, a], [0, a], [-a, a], [-a, 0], [-a, -a], [0, -a], [a, -a]];
  let p = path().moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < 8; k++) p = p.lineTo(pts[k][0], pts[k][1]);
  return p.close();
};
const ring = (r: number, rot: number, salt: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / 8;
    const rr = r * (0.88 + 0.2 * (0.5 + 0.5 * Math.sin(k * 2.7 + salt)));
    return [rr * Math.cos(a), rr * Math.sin(a)];
  };
  let p = path().moveTo(pt(0)[0], pt(0)[1]);
  for (let k = 1; k < 8; k++) p = p.lineTo(pt(k)[0], pt(k)[1]);
  return p.close();
};

const tile = assembly('hill-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
// Grass body: square edges, then three faceted rings climbing to the crest.
const hill = square8(S / 2).loft([square8(S / 2), ring(780, 0.2, 1), ring(520, 0.55, 2), ring(240, 0.1, 3)], {
  planes: [
    { plane: 'XY', origin: [0, 0, skirtH] },
    { plane: 'XY', origin: [0, 0, t] },
    { plane: 'XY', origin: [40, 20, t + H * 0.4] },
    { plane: 'XY', origin: [70, -10, t + H * 0.82] },
    { plane: 'XY', origin: [90, 20, t + H] },
  ],
  ruled: true,
});
tile.part('grass', hill.color(grass));

if (outcrop.value === 'yes') {
  const rr = 260;
  const rock = ring(rr, 0, 5)
    .loft([ring(rr * 0.75, 0.4, 6), ring(rr * 0.3, 0.1, 7)], {
      planes: [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, rr * 0.7] },
        { plane: 'XY', origin: [20, 0, rr * 1.1] },
      ],
      ruled: true,
    })
    .translate(330, -380, t + H * 0.42);
  tile.part('outcrop', rock.color(rockC));
}

return tile.model();
