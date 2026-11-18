// Original kernelCAD low-poly sand tile: a 2 m x 2 m sand slab over a darker
// wet-sand base, with wind ripples or a faceted dune on top and a few
// scattered pebbles. Edges sit at the 0.2 m tile height of the nature tiles.

meta({
  name: 'sand-tile',
  license: 'CC0-1.0',
  title: 'Sand tile',
  description: 'Square 2 m beach or desert sand tile with wind ripples or a faceted dune and scattered pebbles. Knobs: relief, pebble count, sand, base and pebble colours.',
  tags: ['tile', 'sand', 'beach', 'desert', 'dune', 'ground', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'beach', 'desert'],
  triangleBudget: 400,
});

const relief = param('relief', 'dune', { choices: ['flat', 'ripples', 'dune'], label: 'Top relief' });
const pebbles = param('pebbles', '3', { choices: ['0', '3', '5'], label: 'Pebbles' });
const sand = param('sand', '#e4cc93', { label: 'Sand' });
const base = param('base', '#b8955f', { label: 'Base edge' });
const pebble = param('pebble', '#8d8a84', { label: 'Pebbles' });

presets({
  desert: { sand: '#e0a964', base: '#b07a45', pebble: '#8a5a3a' },
  white: { sand: '#f2ebd9', base: '#cfc2a3', pebble: '#a9a59c' },
  volcanic: { sand: '#4a4644', base: '#2e2b2a', pebble: '#7a3a2a' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;

const ngon = (r: number, s: number, rot = 0, sx = 1) => {
  let p = path().moveTo(r * sx * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * (0.88 + 0.16 * Math.sin(k * 2.7 + rot));
    p = p.lineTo(rr * sx * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};

const tile = assembly('sand-tile');
tile.part('base', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(base));
tile.part('sand', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).color(sand));

if (relief.value === 'ripples') {
  // Low wind ripples: short shallow ridges in broken staggered rows, each
  // turned a few degrees so the field reads as wind-blown sand.
  let k = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      k++;
      const len = 520 + 260 * (0.5 + 0.5 * Math.sin(k * 2.7));
      const cx = (j === 0 ? -430 : 420) + 120 * Math.sin(k * 1.3);
      const cy = -h + 230 + i * 370 + 60 * Math.sin(k * 3.1);
      const ridge = extrudePolygon([[-140, 0], [140, 0], [40, 26 + 8 * Math.sin(k)]], len)
        .rotateX(90).rotateZ(90).translate(-len / 2, 0, 0).rotateZ(8 * Math.sin(k * 1.7) - 6).translate(cx, cy, t - 2);
      tile.part(`ripple-${k}`, ridge.color(sand));
    }
  }
} else if (relief.value === 'dune') {
  tile.part('dune', ngon(h * 0.85, 8, 0.2, 1.1).loft([ngon(h * 0.55, 8, 0.5, 1.1), ngon(h * 0.2, 6, 0.1, 1.4)], {
    planes: [
      { plane: 'XY', origin: [0, 0, t - 5] },
      { plane: 'XY', origin: [-80, 60, t + 160] },
      { plane: 'XY', origin: [-140, 100, t + 260] },
    ],
    ruled: true,
  }).color(sand));
}

const n = Number(pebbles.value);
const spots: [number, number, number][] = [[640, -620, 120], [-700, 300, 95], [80, 780, 80], [-140, -760, 85], [820, 160, 70]];
for (let i = 0; i < n; i++) {
  const [x, y, r] = spots[i];
  tile.part(`pebble-${i + 1}`, ngon(r, 6, i).loft(ngon(r * 0.5, 5, i + 0.4), { spacing: r * 0.6, ruled: true })
    .translate(x, y, t - 8).color(pebble));
}

return tile.model();
