// Original kernelCAD low-poly snow tile: a 2 m x 2 m snow blanket over frozen
// dirt, with a faceted snow drift, an optional pale ice patch and a couple of
// dark rocks poking through. Edges sit at the 0.2 m tile height.

meta({
  name: 'snow-tile',
  license: 'CC0-1.0',
  title: 'Snow tile',
  description: 'Square 2 m snow-covered ground tile with a faceted drift, optional frozen ice patch and rocks poking through. Knobs: drift size, ice patch, rock count, snow, ice, rock and dirt colours.',
  tags: ['tile', 'snow', 'winter', 'ice', 'tundra', 'ground', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'winter', 'mountain'],
  triangleBudget: 400,
});

const drift = param('drift', 'medium', { choices: ['none', 'small', 'medium', 'large'], label: 'Snow drift' });
const icePatch = param('icePatch', 'yes', { choices: ['yes', 'no'], label: 'Ice patch' });
const rocks = param('rocks', '2', { choices: ['0', '1', '2', '3'], label: 'Rocks' });
const snow = param('snow', '#eef3f7', { label: 'Snow' });
const ice = param('ice', '#a9d4ea', { label: 'Ice' });
const rock = param('rock', '#5f646b', { label: 'Rocks' });
const dirt = param('dirt', '#5d4b3d', { label: 'Frozen dirt edge' });

presets({
  dusk: { snow: '#d9def0', ice: '#8fa9d8', rock: '#4a4c5a' },
  slush: { snow: '#d8d6cf', ice: '#9cb3b8', dirt: '#4a3a2e' },
});

const S = 2000;
const t = 200;
const skirtH = t * 0.6;

const ngon = (r: number, s: number, rot = 0, sy = 1) => {
  let p = path().moveTo(r * Math.cos(rot), r * sy * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * (0.86 + 0.18 * Math.sin(k * 2.3 + rot * 3));
    p = p.lineTo(rr * Math.cos(a), rr * sy * Math.sin(a));
  }
  return p.close();
};

const tile = assembly('snow-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
tile.part('snow', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).color(snow));

const ds = drift.value === 'small' ? 0.6 : drift.value === 'large' ? 1.35 : 1;
if (drift.value !== 'none') {
  // Wind-blown drift: long low mound with a steeper lee side.
  tile.part('drift', ngon(560 * ds, 8, 0.3, 0.55).loft([ngon(380 * ds, 8, 0.6, 0.5), ngon(200 * ds, 6, 0.6, 0.45)], {
    planes: [
      { plane: 'XY', origin: [250, 380, t - 5] },
      { plane: 'XY', origin: [280, 420, t + 120 * ds] },
      { plane: 'XY', origin: [300, 450, t + 180 * ds] },
    ],
    ruled: true,
  }).color(snow));
}
if (icePatch.value === 'yes') {
  tile.part('ice', ngon(420, 9, 0.1, 0.7).extrude(12).translate(-380, -330, t - 4).color(ice));
}
const spots: [number, number, number][] = [[520, -560, 130], [-640, 520, 100], [-120, 720, 75]];
for (let i = 0; i < Number(rocks.value); i++) {
  const [x, y, r] = spots[i];
  tile.part(`rock-${i + 1}`, ngon(r, 6, i * 0.7).loft(ngon(r * 0.45, 5, i + 0.3), { spacing: r * 0.9, ruled: true })
    .translate(x, y, t - 20).color(rock));
}

return tile.model();
